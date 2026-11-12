import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { DEFAULT_DUEL_STATE } from './constants/series.js';
import { registerConfigRoutes } from './routes/configRoutes.js';
import { registerTikTokRoutes } from './routes/tiktokRoutes.js';
import { createDuelService } from './services/duelService.js';
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
  ServerContext,
  ServerState,
} from './types/serverState.js';
import { attachServerLifecycle, logServerListeningBanner } from './utils/serverLifecycle.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  maxHttpBufferSize: 5e6,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const state: ServerState = {
  overlayVisibility: loadOverlayVisibilityFromDisk(),
  teamConfig: loadTeamConfigFromDisk(),
  seriesConfig: loadSeriesConfigFromDisk(),
  silverScrapesDuelState: { ...DEFAULT_DUEL_STATE },
  gameTheme: 'BARON',
  bossSkillConfig: { ...DEFAULT_BOSS_SKILL_CONFIG },
  autoProBattleConfig: { ...DEFAULT_AUTO_PRO_BATTLE_CONFIG },
  championDamageMultiplier: 1,
  tiktokUsername: '',
  connectionStatus: 'DISCONNECTED',
  lastErrorMessage: '',
  tiktokConnection: null,
};

const ctx: ServerContext = { io, state };
const duelService = createDuelService(ctx);
const tiktokService = createTikTokConnectionService(ctx, duelService);

registerConfigRoutes(app, ctx);
registerTikTokRoutes(app, ctx, tiktokService);
registerSocketHub(ctx, duelService, tiktokService);

attachServerLifecycle(httpServer, io, PORT, () => {
  tiktokService.disconnectOnShutdown();
});

httpServer.listen(PORT, () => logServerListeningBanner(PORT));
