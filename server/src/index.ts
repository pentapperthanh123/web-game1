import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { DEFAULT_DUEL_STATE } from './constants/series.js';
import { registerConfigRoutes } from './routes/configRoutes.js';
import { registerPlayerLeaderboardRoutes } from './routes/playerLeaderboardRoutes.js';
import { registerTikTokRoutes } from './routes/tiktokRoutes.js';
import {
  installSocketAdminAuth,
  logAdminAuthMode,
  requireAdminForApiWrites,
  resolveCorsOrigin,
} from './security/adminAuth.js';
import { createDuelService } from './services/duelService.js';
import { createPlayerProfileService } from './services/playerProfileService.js';
import { createTikTokConnectionService } from './services/tiktokConnectionService.js';
import { registerSocketHub } from './socket/registerSocketHub.js';
import {
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

const state: ServerState = {
  overlayVisibility: loadOverlayVisibilityFromDisk(),
  teamConfig: loadTeamConfigFromDisk(),
  seriesConfig: loadSeriesConfigFromDisk(),
  silverScrapesDuelState: { ...DEFAULT_DUEL_STATE },
  gameTheme: 'BARON',
  bossSkillConfig: { ...DEFAULT_BOSS_SKILL_CONFIG },
  autoProBattleConfig: { ...DEFAULT_AUTO_PRO_BATTLE_CONFIG },
  championDamageMultiplier: 1,
  useUserAvatar: true,
  participationRuleConfig: { ...DEFAULT_PARTICIPATION_RULE_CONFIG },
  tiktokUsername: '',
  connectionStatus: 'DISCONNECTED',
  lastErrorMessage: '',
  reconnectAttempt: 0,
  nextRetryAt: null,
  tiktokConnection: null,
};

const ctx: ServerContext = { io, state };
const duelService = createDuelService(ctx);
const tiktokService = createTikTokConnectionService(ctx, duelService);
const playerProfileService = createPlayerProfileService(ctx);

registerConfigRoutes(app, ctx);
registerTikTokRoutes(app, ctx, tiktokService);
registerPlayerLeaderboardRoutes(app, playerProfileService);
registerSocketHub(ctx, duelService, tiktokService, playerProfileService);

attachServerLifecycle(httpServer, io, PORT, () => {
  tiktokService.disconnectOnShutdown();
  playerProfileService.flush();
});

httpServer.listen(PORT, () => logServerListeningBanner(PORT));
