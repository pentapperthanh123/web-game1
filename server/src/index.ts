import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { DEFAULT_DUEL_STATE } from './constants/series.js';
import { registerConfigRoutes } from './routes/configRoutes.js';
import { registerPlayerLeaderboardRoutes } from './routes/playerLeaderboardRoutes.js';
import { registerTikTokRoutes } from './routes/tiktokRoutes.js';
import { registerCasterRoutes } from './routes/casterRoutes.js';
import { createCasterTtsService } from './services/caster/casterTtsService.js';
import { createTtsProvider } from './services/caster/ttsProviders.js';
import {
  installSocketAdminAuth,
  logAdminAuthMode,
  requireAdminForApiWrites,
  resolveCorsOrigin,
} from './security/adminAuth.js';
import { OPS_ALERT_KIND } from './constants/liveOps.js';
import { DEFAULT_USE_USER_AVATAR } from './constants/tiktok.js';
import { createModerationService } from './moderation/moderationService.js';
import { createDuelService } from './services/duelService.js';
import { createLiveOpsService } from './services/liveOpsService.js';
import { createOpsAlertService } from './services/opsAlertService.js';
import { createPlayerProfileService } from './services/playerProfileService.js';
import { createTikTokConnectionService } from './services/tiktokConnectionService.js';
import { registerSocketHub } from './socket/registerSocketHub.js';
import {
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

const state: ServerState = {
  overlayVisibility: loadOverlayVisibilityFromDisk(),
  teamConfig: loadTeamConfigFromDisk(),
  seriesConfig: loadSeriesConfigFromDisk(),
  silverScrapesDuelState: { ...DEFAULT_DUEL_STATE },
  gameTheme: 'BARON',
  bossSkillConfig: { ...DEFAULT_BOSS_SKILL_CONFIG },
  autoProBattleConfig: { ...DEFAULT_AUTO_PRO_BATTLE_CONFIG },
  championDamageMultiplier: 1,
  useUserAvatar: DEFAULT_USE_USER_AVATAR,
  participationRuleConfig: { ...DEFAULT_PARTICIPATION_RULE_CONFIG },
  chatLimitConfig: liveOpsConfig.chatLimitConfig,
  casterConfig: liveOpsConfig.casterConfig,
  tiktokUsername: '',
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
const casterTts = createCasterTtsService({
  provider: createTtsProvider(process.env),
  getCasterConfig: () => ctx.state.casterConfig,
  containsBlocked: (text) => moderation.containsBlocked(text),
});
registerCasterRoutes(app, casterTts);
console.log(`[CasterTTS] voice provider: ${casterTts.providerName}`);
registerPlayerLeaderboardRoutes(app, playerProfileService);
registerSocketHub(ctx, duelService, tiktokService, playerProfileService, liveOpsService);

attachServerLifecycle(httpServer, io, PORT, () => {
  tiktokService.disconnectOnShutdown();
  playerProfileService.flush();
});

httpServer.listen(PORT, () => {
  logServerListeningBanner(PORT);
  void opsAlerts.sendOpsAlert(OPS_ALERT_KIND.SERVER_START);
});
