import { WebcastPushConnection } from 'tiktok-live-connector';
import { getRandomChampion } from '../constants/champions.js';
import {
  PipelineStatsSummary,
  SimulationResult,
  TIKTOK_PIPELINE_CONSTANTS,
  TikTokSimulationType,
} from '../constants/tiktok.js';
import { ServerContext } from '../types/serverState.js';
import { getErrorMessage, parseCommentCommand } from '../utils/payloadSanitizers.js';
import { DuelService } from './duelService.js';
import { TikTokLivePipeline } from './tiktokLivePipeline.js';

const VALID_SIM_ACTIONS: readonly TikTokSimulationType[] = [
  'chat',
  'like',
  'gift',
  'follow',
  'share',
];

export interface TikTokConnectionService {
  getStats: () => PipelineStatsSummary;
  resetStats: () => PipelineStatsSummary;
  updateScoreHint: (leftScore: number, rightScore: number) => void;
  runSimulation: (rawPayload: unknown) => SimulationResult | null;
  connectToRoom: (rawUsername: string) => { cleanUsername: string };
  disconnectFromRoom: () => void;
  disconnectOnShutdown: () => void;
}

/**
 * Creates the TikTok Live connection, event pipeline, and simulation service.
 */
export function createTikTokConnectionService(
  ctx: ServerContext,
  duelService: DuelService
): TikTokConnectionService {
  const tiktokPipeline = new TikTokLivePipeline({
    getActiveTeams: () => ctx.state.teamConfig.activeTeams,
    parseComment: (comment) => parseCommentCommand(comment, ctx.state.teamConfig.activeTeams),
    getRandomChampionName: () => getRandomChampion().name,
    onDuelContribution: (team, deltaPercent, event) =>
      duelService.applyDuelContribution(team, deltaPercent, event),
    emit: (eventName, payload) => {
      ctx.io.emit(eventName, payload);
    },
  });

  const getStats = (): PipelineStatsSummary => tiktokPipeline.getStats();

  const resetStats = (): PipelineStatsSummary => {
    tiktokPipeline.resetSessionTrackers();
    const stats = tiktokPipeline.getStats();
    ctx.io.emit('tiktok:pipeline-stats', stats);
    return stats;
  };

  const updateScoreHint = (leftScore: number, rightScore: number): void => {
    tiktokPipeline.updateTeamScoreBalance(leftScore, rightScore);
  };

  const runSimulation = (rawPayload: unknown): SimulationResult | null => {
    if (!rawPayload || typeof rawPayload !== 'object') return null;
    const src = rawPayload as Record<string, unknown>;
    const action = typeof src.action === 'string' ? (src.action as TikTokSimulationType) : null;
    if (!action || !VALID_SIM_ACTIONS.includes(action)) return null;

    const uniqueId = typeof src.uniqueId === 'string' ? src.uniqueId : undefined;
    const nickname =
      typeof src.nickname === 'string' && src.nickname.trim() ? src.nickname.trim() : 'Fan_Test';
    const explicitTeam =
      src.explicitTeam === 'BLG' || src.explicitTeam === 'GENG' ? src.explicitTeam : undefined;

    let outcome: SimulationResult;

    switch (action) {
      case 'chat': {
        const comment = typeof src.comment === 'string' ? src.comment : '';
        const res = tiktokPipeline.handleChat({ uniqueId, nickname, comment });
        outcome = {
          accepted: true,
          action,
          team: res.team,
          source: res.source,
          championName: res.championName,
          stats: tiktokPipeline.getStats(),
        };
        break;
      }
      case 'gift': {
        const giftId =
          typeof src.giftId === 'string' || typeof src.giftId === 'number' ? src.giftId : undefined;
        const res = tiktokPipeline.handleGift({
          uniqueId,
          nickname,
          giftId,
          giftName: typeof src.giftName === 'string' ? src.giftName : 'Hoa Hồng',
          diamondCount: typeof src.diamondCount === 'number' ? src.diamondCount : 1,
          giftType:
            typeof src.giftType === 'number'
              ? src.giftType
              : TIKTOK_PIPELINE_CONSTANTS.STREAK_GIFT_TYPE,
          repeatCount: typeof src.repeatCount === 'number' ? src.repeatCount : 1,
          repeatEnd: typeof src.repeatEnd === 'boolean' ? src.repeatEnd : false,
          explicitTeam,
        });
        outcome = {
          accepted: res.accepted,
          action,
          team: res.team,
          source: res.source,
          deltaCoins: res.deltaCoins,
          streakCount: res.streakCount,
          reason: res.reason,
          stats: tiktokPipeline.getStats(),
        };
        break;
      }
      case 'like': {
        const res = tiktokPipeline.handleLike({
          uniqueId,
          nickname,
          likeCount: typeof src.likeCount === 'number' ? src.likeCount : 5,
          explicitTeam,
        });
        outcome = {
          accepted: true,
          action,
          team: res.team,
          source: res.source,
          stats: tiktokPipeline.getStats(),
        };
        break;
      }
      case 'follow': {
        const res = tiktokPipeline.handleFollow({ uniqueId, nickname, explicitTeam });
        outcome = {
          accepted: res.accepted,
          action,
          team: res.team,
          source: res.source,
          championName: res.championName,
          reason: res.reason,
          stats: tiktokPipeline.getStats(),
        };
        break;
      }
      case 'share': {
        const res = tiktokPipeline.handleShare({ uniqueId, nickname, explicitTeam });
        outcome = {
          accepted: res.accepted,
          action,
          team: res.team,
          source: res.source,
          reason: res.reason,
          stats: tiktokPipeline.getStats(),
        };
        break;
      }
    }

    ctx.io.emit('tiktok:pipeline-stats', outcome.stats);
    return outcome;
  };

  const attachRoomListeners = (connection: WebcastPushConnection): void => {
    connection.on('chat', (data) => {
      tiktokPipeline.handleChat({
        uniqueId: data.uniqueId,
        nickname: data.nickname,
        comment: data.comment || '',
      });
      ctx.io.emit('tiktok:pipeline-stats', tiktokPipeline.getStats());
    });

    connection.on('gift', (data) => {
      tiktokPipeline.handleGift({
        uniqueId: data.uniqueId,
        nickname: data.nickname,
        giftId: data.giftId,
        giftName: data.giftName,
        diamondCount: data.diamondCount,
        giftType: data.giftType,
        repeatCount: data.repeatCount,
        repeatEnd: data.repeatEnd,
      });
      ctx.io.emit('tiktok:pipeline-stats', tiktokPipeline.getStats());
    });

    connection.on('like', (data) => {
      tiktokPipeline.handleLike({
        uniqueId: data.uniqueId,
        nickname: data.nickname,
        likeCount: data.likeCount,
      });
    });

    connection.on('follow', (data) => {
      tiktokPipeline.handleFollow({
        uniqueId: data.uniqueId,
        nickname: data.nickname,
      });
      ctx.io.emit('tiktok:pipeline-stats', tiktokPipeline.getStats());
    });

    connection.on('share', (data) => {
      tiktokPipeline.handleShare({
        uniqueId: data.uniqueId,
        nickname: data.nickname,
      });
      ctx.io.emit('tiktok:pipeline-stats', tiktokPipeline.getStats());
    });
  };

  const connectToRoom = (rawUsername: string): { cleanUsername: string } => {
    const cleanUsername = rawUsername.replace(/^@/, '').trim();

    if (ctx.state.tiktokConnection) {
      ctx.state.tiktokConnection.disconnect();
    }

    ctx.state.tiktokUsername = cleanUsername;
    ctx.state.connectionStatus = 'CONNECTING';
    ctx.state.lastErrorMessage = '';
    ctx.io.emit('tiktok:status', {
      status: ctx.state.connectionStatus,
      username: cleanUsername,
    });

    const connection = new WebcastPushConnection(cleanUsername, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 1000,
    });
    ctx.state.tiktokConnection = connection;

    connection
      .connect()
      .then((state) => {
        ctx.state.connectionStatus = 'CONNECTED';
        console.log(`[TikTok Live] Connected to room ID: ${state.roomId}`);
        ctx.io.emit('tiktok:status', {
          status: ctx.state.connectionStatus,
          username: cleanUsername,
          roomId: state.roomId,
        });
      })
      .catch((err: unknown) => {
        ctx.state.connectionStatus = 'ERROR';
        ctx.state.lastErrorMessage = getErrorMessage(err, 'Failed to connect to TikTok Live room');
        console.error('[TikTok Live] Connection error:', ctx.state.lastErrorMessage);
        ctx.io.emit('tiktok:status', {
          status: ctx.state.connectionStatus,
          username: cleanUsername,
          error: ctx.state.lastErrorMessage,
        });
      });

    resetStats();
    attachRoomListeners(connection);

    return { cleanUsername };
  };

  const disconnectFromRoom = (): void => {
    if (ctx.state.tiktokConnection) {
      ctx.state.tiktokConnection.disconnect();
      ctx.state.tiktokConnection = null;
    }
    ctx.state.connectionStatus = 'DISCONNECTED';
    ctx.state.tiktokUsername = '';
    ctx.io.emit('tiktok:status', { status: ctx.state.connectionStatus });
  };

  const disconnectOnShutdown = (): void => {
    if (!ctx.state.tiktokConnection) {
      return;
    }
    try {
      ctx.state.tiktokConnection.disconnect();
    } catch {
      // Ignore disconnect errors on shutdown
    }
    ctx.state.tiktokConnection = null;
  };

  return {
    getStats,
    resetStats,
    updateScoreHint,
    runSimulation,
    connectToRoom,
    disconnectFromRoom,
    disconnectOnShutdown,
  };
}
