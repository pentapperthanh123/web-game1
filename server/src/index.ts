import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { DEFAULT_DUEL_STATE, getBossThemeForRound } from './constants/series.js';
import { registerConfigRoutes } from './routes/configRoutes.js';
import { registerPlayerLeaderboardRoutes } from './routes/playerLeaderboardRoutes.js';
import { registerTikTokRoutes } from './routes/tiktokRoutes.js';
import { registerCasterRoutes, registerCasterSocketHandlers } from './routes/casterRoutes.js';
import { createCasterTtsService } from './services/caster/casterTtsService.js';
import { createTtsProviderChain } from './services/caster/ttsProviders.js';
import {
  installSocketAdminAuth,
  logAdminAuthMode,
  requireAdminForApiWrites,
  resolveCorsOrigin,
} from './security/adminAuth.js';
import { OPS_ALERT_KIND } from './constants/liveOps.js';
import { DEFAULT_TIKTOK_USERNAME, DEFAULT_USE_USER_AVATAR } from './constants/tiktok.js';
import { createModerationService } from './moderation/moderationService.js';
import { createDuelService } from './services/duelService.js';
import { createLiveOpsService } from './services/liveOpsService.js';
import { createOpsAlertService } from './services/opsAlertService.js';
import { createPlayerProfileService } from './services/playerProfileService.js';
import { createTikTokConnectionService } from './services/tiktokConnectionService.js';
import { registerSocketHub } from './socket/registerSocketHub.js';
import {
  loadGiftConfigFromDisk,
  loadLiveOpsConfigFromDisk,
  loadOverlayVisibilityFromDisk,
  loadSeriesConfigFromDisk,
  loadTeamConfigFromDisk,
} from './storage/jsonFileStore.js';
import {
  DEFAULT_AUTO_PRO_BATTLE_CONFIG,
  DEFAULT_BOSS_SKILL_CONFIG,
  DEFAULT_PARTICIPATION_RULE_CONFIG,
  ServerContext,
  ServerState,
} from './types/serverState.js';
import { attachServerLifecycle, logServerListeningBanner } from './utils/serverLifecycle.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const corsOrigin = resolveCorsOrigin();
logAdminAuthMode();

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '5mb' }));
app.use(requireAdminForApiWrites);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  maxHttpBufferSize: 5e6,
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});
installSocketAdminAuth(io);

const liveOpsConfig = loadLiveOpsConfigFromDisk();
const initialTikTokUsername = (process.env.TIKTOK_USERNAME || DEFAULT_TIKTOK_USERNAME)
  .trim()
  .replace(/^@+/, '');

const initialSeriesConfig = loadSeriesConfigFromDisk();
const initialGameTheme = getBossThemeForRound(
  initialSeriesConfig.currentRound,
  initialSeriesConfig.format
);

const state: ServerState = {
  overlayVisibility: loadOverlayVisibilityFromDisk(),
  teamConfig: loadTeamConfigFromDisk(),
  seriesConfig: initialSeriesConfig,
  silverScrapesDuelState: { ...DEFAULT_DUEL_STATE },
  gameTheme: initialGameTheme,
  bossSkillConfig: { ...DEFAULT_BOSS_SKILL_CONFIG },
  autoProBattleConfig: { ...DEFAULT_AUTO_PRO_BATTLE_CONFIG },
  championDamageMultiplier: 1,
  championshipTally: null,
  giftConfig: loadGiftConfigFromDisk(),
  giftCatalog: { items: [], fetchedAt: 0, error: null },
  useUserAvatar: DEFAULT_USE_USER_AVATAR,
  participationRuleConfig: { ...DEFAULT_PARTICIPATION_RULE_CONFIG },
  chatLimitConfig: liveOpsConfig.chatLimitConfig,
  casterConfig: liveOpsConfig.casterConfig,
  tiktokUsername: initialTikTokUsername,
  connectionStatus: 'DISCONNECTED',
  lastErrorMessage: '',
  reconnectAttempt: 0,
  nextRetryAt: null,
  tiktokConnection: null,
};

const ctx: ServerContext = { io, state };
const moderation = createModerationService();
const opsAlerts = createOpsAlertService();
const duelService = createDuelService(ctx);
const tiktokService = createTikTokConnectionService(ctx, duelService, { moderation, opsAlerts });
const playerProfileService = createPlayerProfileService(ctx);
const liveOpsService = createLiveOpsService(ctx, moderation, opsAlerts);

registerConfigRoutes(app, ctx);
registerTikTokRoutes(app, ctx, tiktokService);
// server/ (this file runs from server/src with tsx or server/dist when built)
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const casterTts = createCasterTtsService({
  providers: createTtsProviderChain(process.env, SERVER_ROOT),
  serverRoot: SERVER_ROOT,
  getCasterConfig: () => ctx.state.casterConfig,
  containsBlocked: (text) => moderation.containsBlocked(text),
});
registerCasterRoutes(app, casterTts);
registerCasterSocketHandlers(io, casterTts);
console.log(`[CasterTTS] voice: ${casterTts.providerName}${casterTts.fallbackName ? ` (fallback ${casterTts.fallbackName})` : ''}`);
registerPlayerLeaderboardRoutes(app, playerProfileService);
registerSocketHub(ctx, duelService, tiktokService, playerProfileService, liveOpsService);

attachServerLifecycle(httpServer, io, PORT, () => {
  tiktokService.disconnectOnShutdown();
  playerProfileService.flush();
});

httpServer.listen(PORT, () => {
  logServerListeningBanner(PORT);
  void opsAlerts.sendOpsAlert(OPS_ALERT_KIND.SERVER_START);

  if (process.env.AUTO_CONNECT_TIKTOK === 'true' && initialTikTokUsername) {
    console.log(`[TikTok Live] AUTO_CONNECT_TIKTOK is enabled. Auto-connecting to @${initialTikTokUsername}...`);
    tiktokService.connectToRoom(initialTikTokUsername);
  }
});
