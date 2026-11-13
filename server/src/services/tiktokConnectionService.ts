import { WebcastPushConnection } from 'tiktok-live-connector';
import { getRandomChampion } from '../constants/champions.js';
import {
  PipelineStatsSummary,
  SimulationResult,
  TIKTOK_PIPELINE_CONSTANTS,
  TikTokSimulationType,
} from '../constants/tiktok.js';
import { ServerContext } from '../types/serverState.js';
import { TIKTOK_RECONNECT } from '../constants/tiktokReconnect.js';
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
    getParticipationRules: () => ctx.state.participationRuleConfig,
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
        const userAvatarUrl =
          typeof src.userAvatarUrl === 'string' ? src.userAvatarUrl : undefined;
        const res = tiktokPipeline.handleChat({ uniqueId, nickname, userAvatarUrl, comment });
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
        userAvatarUrl: data.profilePictureUrl,
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

  const reconnectState: { timer: NodeJS.Timeout | null; isConnectionWanted: boolean } = {
    timer: null,
    isConnectionWanted: false,
  };

  const emitStatus = (extra: Record<string, unknown> = {}): void => {
    ctx.io.emit('tiktok:status', {
      status: ctx.state.connectionStatus,
      username: ctx.state.tiktokUsername,
      attempt: ctx.state.reconnectAttempt,
      nextRetryAt: ctx.state.nextRetryAt,
      ...extra,
    });
  };

  const cancelPendingReconnect = (): void => {
    if (reconnectState.timer) {
      clearTimeout(reconnectState.timer);
      reconnectState.timer = null;
    }
    ctx.state.reconnectAttempt = 0;
    ctx.state.nextRetryAt = null;
  };

  const releaseConnection = (): void => {
    const connection = ctx.state.tiktokConnection;
    if (!connection) return;
    ctx.state.tiktokConnection = null;
    connection.removeAllListeners();
    try {
      connection.disconnect();
    } catch (err: unknown) {
      console.warn('[TikTok Live] Error while releasing connection:', getErrorMessage(err, 'unknown'));
    }
  };

  const computeReconnectDelayMs = (attempt: number): number => {
    const exponent = Math.max(0, attempt - 1);
    const baseDelay = Math.min(
      TIKTOK_RECONNECT.BASE_DELAY_MS * TIKTOK_RECONNECT.BACKOFF_FACTOR ** exponent,
      TIKTOK_RECONNECT.MAX_DELAY_MS
    );
    const jitterFactor = 1 + (Math.random() * 2 - 1) * TIKTOK_RECONNECT.JITTER_RATIO;
    return Math.round(baseDelay * jitterFactor);
  };

  // Forward declaration so openConnection and scheduleReconnect can reference each other.
  let openConnection: (username: string) => void = () => undefined;

  const scheduleReconnect = (reason: string): void => {
    if (!reconnectState.isConnectionWanted || reconnectState.timer) return;
    releaseConnection();
    ctx.state.reconnectAttempt += 1;
    const delayMs = computeReconnectDelayMs(ctx.state.reconnectAttempt);
    ctx.state.nextRetryAt = Date.now() + delayMs;
    ctx.state.connectionStatus = 'RECONNECTING';
    ctx.state.lastErrorMessage = reason;
    console.warn(
      `[TikTok Live] ${reason}. Reconnect attempt ${ctx.state.reconnectAttempt} in ${delayMs}ms`
    );
    emitStatus({ error: reason });
    reconnectState.timer = setTimeout(() => {
      reconnectState.timer = null;
      openConnection(ctx.state.tiktokUsername);
    }, delayMs);
  };

  const attachLifecycleListeners = (connection: WebcastPushConnection): void => {
    const isCurrent = (): boolean => ctx.state.tiktokConnection === connection;
    connection.on('disconnected', () => {
      if (isCurrent()) scheduleReconnect('TikTok connection dropped');
    });
    connection.on('streamEnd', () => {
      if (isCurrent()) scheduleReconnect('TikTok stream ended');
    });
    connection.on('error', (err: unknown) => {
      console.error('[TikTok Live] Connection error event:', getErrorMessage(err, 'unknown'));
    });
  };

  const handleConnectSuccess = (connection: WebcastPushConnection, roomId: string): void => {
    if (ctx.state.tiktokConnection !== connection) return;
    cancelPendingReconnect();
    ctx.state.connectionStatus = 'CONNECTED';
    ctx.state.lastErrorMessage = '';
    console.log(`[TikTok Live] Connected to room ID: ${roomId}`);
    emitStatus({ roomId });
  };

  const handleConnectFailure = (connection: WebcastPushConnection, err: unknown): void => {
    if (ctx.state.tiktokConnection !== connection) return;
    const message = getErrorMessage(err, 'Failed to connect to TikTok Live room');
    console.error('[TikTok Live] Connection error:', message);
    scheduleReconnect(message);
  };

  openConnection = (username: string): void => {
    releaseConnection();
    const connection = new WebcastPushConnection(username, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: TIKTOK_RECONNECT.REQUEST_POLLING_INTERVAL_MS,
    });
    ctx.state.tiktokConnection = connection;
    attachRoomListeners(connection);
    attachLifecycleListeners(connection);
    connection
      .connect()
      .then((roomState) => handleConnectSuccess(connection, roomState.roomId))
      .catch((err: unknown) => handleConnectFailure(connection, err));
  };

  const connectToRoom = (rawUsername: string): { cleanUsername: string } => {
    const cleanUsername = rawUsername.replace(/^@/, '').trim();
    cancelPendingReconnect();
    reconnectState.isConnectionWanted = true;

    ctx.state.tiktokUsername = cleanUsername;
    ctx.state.connectionStatus = 'CONNECTING';
    ctx.state.lastErrorMessage = '';
    emitStatus();

    resetStats();
    openConnection(cleanUsername);
    return { cleanUsername };
  };

  const disconnectFromRoom = (): void => {
    reconnectState.isConnectionWanted = false;
    cancelPendingReconnect();
    releaseConnection();
    ctx.state.connectionStatus = 'DISCONNECTED';
    ctx.state.tiktokUsername = '';
    emitStatus();
  };

  const disconnectOnShutdown = (): void => {
    reconnectState.isConnectionWanted = false;
    cancelPendingReconnect();
    releaseConnection();
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
