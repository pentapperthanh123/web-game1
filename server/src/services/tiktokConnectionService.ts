import dotenv from 'dotenv';
import path from 'node:path';
import { refreshGiftCatalog } from './giftCatalogService.js';
import { findGiftRule } from '../utils/giftConfigSanitizer.js';
import { getRandomChampion } from '../constants/champions.js';
import {
  PipelineStatsSummary,
  SimulationResult,
  TIKTOK_CHECK_STATUS,
  TikTokCheckResult,
  TikTokCheckStatusCode,
  TIKTOK_PIPELINE_CONSTANTS,
  TikTokSimulationType,
} from '../constants/tiktok.js';
import { ServerContext } from '../types/serverState.js';
import { TIKTOK_RECONNECT } from '../constants/tiktokReconnect.js';
import { OPS_ALERT_KIND } from '../constants/liveOps.js';
import { ModerationService } from '../moderation/moderationService.js';
import { getErrorMessage, parseCommentCommand } from '../utils/payloadSanitizers.js';
import { ChatRateLimiter } from './chatRateLimiter.js';
import { createConnectionDowntimeTracker } from './connectionDowntimeTracker.js';
import { DuelService } from './duelService.js';
import {
  buildTikTokEventKey,
  EventDeduper,
  TIKTOK_DEDUPE_EVENT_TYPE,
  TikTokDedupeEventType,
  TikTokEventIdentity,
} from './eventDeduper.js';
import { OpsAlertService } from './opsAlertService.js';
import { TikTokLivePipeline } from './tiktokLivePipeline.js';
import { WebcastPushConnection, simplifyObject } from 'tiktok-live-connector/legacy';

interface ProtoMessageRaw {
  method: string;
  payload?: unknown;
  decodedData?: {
    data?: Record<string, unknown>;
  };
}

interface ProtoFetchResultRaw {
  messages?: ProtoMessageRaw[];
}

// Defensive runtime patch for tiktok-live-connector@2.5.0 legacy adapter
// Prevents TypeError: Cannot read properties of undefined (reading 'map') when ranksList / emotes is missing
(WebcastPushConnection.prototype as unknown as Record<string, unknown>).processProtoMessageFetchResult = async function (
  fetchResult: ProtoFetchResultRaw
): Promise<void> {
  if (!fetchResult?.messages || !Array.isArray(fetchResult.messages)) return;

  const instance = this as unknown as {
    emit: (event: string, ...args: unknown[]) => boolean;
    disconnect: () => Promise<void>;
    availableGifts?: Array<{ id: string | number }>;
  };

  fetchResult.messages.forEach((message) => {
    try {
      instance.emit('rawData', message.method, message.payload);
    } catch {
      // Ignore rawData emit error
    }
  });

  fetchResult.messages.forEach((message) => {
    try {
      const data = (message.decodedData?.data || {}) as Record<string, unknown>;

      // Safeguard missing arrays that legacy data-converter assumes are always present
      if (message.method === 'WebcastRoomUserSeqMessage' && !Array.isArray(data.ranksList)) {
        data.ranksList = [];
      }
      if (message.method === 'WebcastChatMessage' && !Array.isArray(data.emotes)) {
        data.emotes = [];
      }
      if (message.method === 'WebcastEmoteChatMessage' && !Array.isArray(data.emoteList)) {
        data.emoteList = [];
      }
      if (message.method === 'WebcastLinkMicBattle' && (!data.anchorsInfo || typeof data.anchorsInfo !== 'object')) {
        data.anchorsInfo = {};
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const simplifiedObj = simplifyObject(message.method as any, data) as Record<string, unknown>;
      instance.emit('decodedData', message.method, simplifiedObj, message.payload);

      switch (message.method) {
        case 'WebcastControlMessage': {
          const action = (message.decodedData?.data as Record<string, unknown> | undefined)?.action;
          if (typeof action === 'number' && [3, 4].includes(action)) {
            instance.emit('streamEnd', { action });
            void instance.disconnect().catch(() => {});
          }
          break;
        }
        case 'WebcastRoomUserSeqMessage':
          instance.emit('roomUser', simplifiedObj);
          break;
        case 'WebcastChatMessage':
          if (!simplifiedObj.comment && typeof simplifiedObj.content === 'string') {
            simplifiedObj.comment = simplifiedObj.content;
          }
          instance.emit('chat', simplifiedObj);
          break;
        case 'WebcastMemberMessage':
          instance.emit('member', simplifiedObj);
          break;
        case 'WebcastGiftMessage': {
          if (Array.isArray(instance.availableGifts) && simplifiedObj.giftId) {
            simplifiedObj.extendedGiftInfo = instance.availableGifts.find((x) => x.id === simplifiedObj.giftId);
          }
          instance.emit('gift', simplifiedObj);
          break;
        }
        case 'WebcastSocialMessage': {
          instance.emit('social', simplifiedObj);
          const displayType = typeof simplifiedObj.displayType === 'string' ? simplifiedObj.displayType : '';
          if (displayType.includes('follow')) instance.emit('follow', simplifiedObj);
          if (displayType.includes('share')) instance.emit('share', simplifiedObj);
          break;
        }
        case 'WebcastLikeMessage':
          if (simplifiedObj.likeCount === undefined && typeof simplifiedObj.count === 'number') {
            simplifiedObj.likeCount = simplifiedObj.count;
          }
          instance.emit('like', simplifiedObj);
          break;
        case 'WebcastQuestionNewMessage':
          instance.emit('questionNew', simplifiedObj);
          break;
        case 'WebcastLinkMicBattle':
          instance.emit('linkMicBattle', simplifiedObj);
          break;
        case 'WebcastLinkMicArmies':
          instance.emit('linkMicArmies', simplifiedObj);
          break;
        case 'WebcastLiveIntroMessage':
          instance.emit('liveIntro', simplifiedObj);
          break;
        case 'WebcastEmoteChatMessage':
          instance.emit('emote', simplifiedObj);
          break;
        case 'WebcastBarrageMessage': {
          instance.emit('barrage', simplifiedObj);
          const content = simplifiedObj.content as Record<string, unknown> | undefined;
          const commonBarrage = simplifiedObj.commonBarrageContent as Record<string, unknown> | undefined;
          const displayTypes = [
            content?.displayType,
            commonBarrage?.displayType,
            simplifiedObj.displayType,
          ]
            .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)
            .map((v) => v.toLowerCase());
          if (displayTypes.some((v) => v.includes('ttlive_superfan_commentnotif_superfanjoined'))) {
            instance.emit('superFanJoin', simplifiedObj);
          } else if (displayTypes.some((v) => v.includes('ttlive_superfan'))) {
            instance.emit('superFan', simplifiedObj);
          }
          break;
        }
        case 'WebcastEnvelopeMessage': {
          instance.emit('envelope', simplifiedObj);
          const dt = typeof simplifiedObj.displayType === 'string' ? simplifiedObj.displayType.toLowerCase() : '';
          const envInfo = simplifiedObj.envelopeInfo as Record<string, unknown> | undefined;
          if (dt.includes('ttlive_superfanbox') || envInfo?.businessType === 19) {
            instance.emit('superFanBox', simplifiedObj);
          }
          break;
        }
      }
    } catch (msgErr: unknown) {
      console.warn(
        `[TikTok Live] Skipped malformed ${message.method} message:`,
        getErrorMessage(msgErr, 'Failed to parse message')
      );
    }
  });
};

const VALID_SIM_ACTIONS: readonly TikTokSimulationType[] = [
  'chat',
  'like',
  'gift',
  'follow',
  'share',
];

function formatTikTokErrorMessage(rawMessage: string, username: string): string {
  if (rawMessage.includes('19881007') || rawMessage.includes('user_not_found')) {
    return `Kênh @${username} chưa phát Live (hoặc không tìm thấy TikTok ID)`;
  }
  if (rawMessage.includes('LIVE has ended') || rawMessage.includes('offline')) {
    return `Kênh @${username} hiện đang không phát Live (LIVE has ended)`;
  }
  if (rawMessage.includes('blocked') || rawMessage.includes('SlardarWAF')) {
    return `TikTok chặn truy cập tạm thời (cần thử lại sau)`;
  }
  if (rawMessage.includes('timeout')) {
    return `Quá thời gian chờ phản hồi từ TikTok (Timeout). Đang tự động kết nối lại...`;
  }
  return rawMessage;
}

function cleanTikTokInput(input: string): { cleanUsername: string; directRoomId?: string } {
  let trimmed = input.trim();
  const urlMatch = trimmed.match(/tiktok\.com\/@([^/?#]+)/i);
  if (urlMatch) {
    trimmed = urlMatch[1];
  }
  if (/^\d{15,22}$/.test(trimmed)) {
    return { cleanUsername: trimmed, directRoomId: trimmed };
  }
  const cleanUsername = trimmed.replace(/^@+/, '').replace(/\/+$/, '');
  return { cleanUsername };
}

function resolveTikTokSessionId(): string | undefined {
  dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
  const sessionId = process.env.TIKTOK_SESSION_ID?.trim();
  return sessionId && sessionId.length > 0 ? sessionId : undefined;
}

export interface TikTokConnectionService {
  getStats: () => PipelineStatsSummary;
  resetStats: () => PipelineStatsSummary;
  getPipeline: () => TikTokLivePipeline;
  updateScoreHint: (leftScore: number, rightScore: number) => void;
  runSimulation: (rawPayload: unknown) => SimulationResult | null;
  connectToRoom: (rawUsername: string) => { cleanUsername: string };
  checkConnection: (rawUsername?: string) => Promise<TikTokCheckResult>;
  disconnectFromRoom: () => void;
  disconnectOnShutdown: () => void;
}

export interface TikTokConnectionDeps {
  moderation: ModerationService;
  opsAlerts: OpsAlertService;
}

/**
 * Viewer avatar from a simplified TikTok event. tiktok-live-connector@2.5.0's legacy adapter passes
 * `avatarLarge` (an object `{ urlList }`) to a helper expecting an array, so `profilePictureUrl` is
 * always null; the same URL survives in `userDetails.profilePictureUrls`.
 */
const extractAvatarUrlFromTikTokEvent = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const raw = data as { profilePictureUrl?: unknown; userDetails?: { profilePictureUrls?: unknown } };
  const candidates = [raw.profilePictureUrl, raw.userDetails?.profilePictureUrls];
  const url = candidates.find((value): value is string => typeof value === 'string' && value.startsWith('http'));
  return url;
};

const extractFansLevelFromTikTokEvent = (data: unknown): number => {
  if (!data || typeof data !== 'object') return 0;
  const raw = data as Record<string, unknown>;
  const fansClub = raw.fansClub as Record<string, unknown> | undefined;
  if (fansClub && typeof fansClub.fansLevel === 'number' && fansClub.fansLevel > 0) {
    return fansClub.fansLevel;
  }
  if (typeof raw.fansLevel === 'number' && raw.fansLevel > 0) {
    return raw.fansLevel;
  }
  if (typeof raw.badgeLevel === 'number' && raw.badgeLevel > 0) {
    return raw.badgeLevel;
  }
  if (Array.isArray(raw.userBadges)) {
    for (const badge of raw.userBadges) {
      if (badge && typeof badge === 'object' && typeof (badge as Record<string, unknown>).level === 'number') {
        const lvl = (badge as Record<string, unknown>).level as number;
        if (lvl > 0) return lvl;
      }
    }
  }
  return 0;
};

/**
 * Creates the TikTok Live connection, event pipeline, and simulation service.
 */
export function createTikTokConnectionService(
  ctx: ServerContext,
  duelService: DuelService,
  deps: TikTokConnectionDeps
): TikTokConnectionService {
  const eventDeduper = new EventDeduper();
  const downtimeTracker = createConnectionDowntimeTracker({
    opsAlerts: deps.opsAlerts,
    getUsername: () => ctx.state.tiktokUsername,
  });

  const parseCommentWithAliases = (comment: string) => {
    const parsed = parseCommentCommand(comment, ctx.state.teamConfig.activeTeams);
    if (parsed.champion) return parsed;
    const aliasChampion = deps.moderation.findAliasChampion(comment);
    return aliasChampion ? { ...parsed, champion: aliasChampion } : parsed;
  };

  const tiktokPipeline = new TikTokLivePipeline({
    getActiveTeams: () => ctx.state.teamConfig.activeTeams,
    getParticipationRules: () => ctx.state.participationRuleConfig,
    findGiftRule: (giftId, giftName) => findGiftRule(ctx.state.giftConfig, giftId, giftName),
    parseComment: parseCommentWithAliases,
    getRandomChampionName: () => getRandomChampion().name,
    onDuelContribution: (team, deltaPercent, event) =>
      duelService.applyDuelContribution(team, deltaPercent, event),
    emit: (eventName, payload) => {
      ctx.io.emit(eventName, payload);
    },
    textModerator: deps.moderation.createViewerTextModerator(() => ctx.state.casterConfig),
    summonLimiter: new ChatRateLimiter(() => ctx.state.chatLimitConfig),
    getDuplicateEventCount: () => eventDeduper.getDuplicateCount(),
  });

  /** True when the connector delivered this exact event already (retry / reconnect replay). */
  const isDuplicateEvent = (eventType: TikTokDedupeEventType, identity: TikTokEventIdentity): boolean =>
    eventDeduper.isDuplicate(buildTikTokEventKey(eventType, identity), Date.now());

  const getStats = (): PipelineStatsSummary => tiktokPipeline.getStats();

  const resetStats = (): PipelineStatsSummary => {
    eventDeduper.reset();
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
          accepted: !res.blockedReason,
          action,
          team: res.team,
          source: res.source,
          championName: res.championName,
          reason: res.blockedReason,
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
      try {
        if (isDuplicateEvent(TIKTOK_DEDUPE_EVENT_TYPE.CHAT, data)) return;
        const uniqueId = String(data.uniqueId || data.userId || 'anonymous');
        const nickname = String(data.nickname || uniqueId);
        const comment = String(data.comment || data.content || '').trim();
        // TikTok's own delivery delay (comment sent → reached this server); our pipeline adds ~ms.
        const sentAtMs = Number(data.createTime);
        const lagLabel = sentAtMs > 0 ? ` (TikTok→server ${Date.now() - sentAtMs}ms)` : '';
        console.log(`[TikTok Live] 💬 Chat from @${uniqueId}: "${comment}"${lagLabel}`);
        tiktokPipeline.handleChat({
          uniqueId,
          nickname,
          userAvatarUrl: extractAvatarUrlFromTikTokEvent(data),
          comment,
          fansLevel: extractFansLevelFromTikTokEvent(data),
        });
        ctx.io.emit('tiktok:pipeline-stats', tiktokPipeline.getStats());
      } catch (err: unknown) {
        console.error('[TikTok Live] Error processing chat event:', getErrorMessage(err, 'unknown'));
      }
    });

    connection.on('gift', (data) => {
      try {
        if (isDuplicateEvent(TIKTOK_DEDUPE_EVENT_TYPE.GIFT, data)) return;
        const uniqueId = String(data.uniqueId || data.userId || 'anonymous');
        const nickname = String(data.nickname || uniqueId);
        const giftId = data.giftId || (data.gift as Record<string, unknown> | undefined)?.gift_id || '';
        const giftName = data.giftName || (data.extendedGiftInfo as Record<string, unknown> | undefined)?.name || 'Gift';
        console.log(`[TikTok Live] 🎁 Gift from @${uniqueId}: ${giftName} x${data.repeatCount || 1}`);
        tiktokPipeline.handleGift({
          uniqueId,
          nickname,
          userAvatarUrl: extractAvatarUrlFromTikTokEvent(data),
          giftId,
          giftName,
          diamondCount: data.diamondCount,
          giftType: data.giftType,
          repeatCount: data.repeatCount,
          repeatEnd: data.repeatEnd,
          fansLevel: extractFansLevelFromTikTokEvent(data),
        });
        ctx.io.emit('tiktok:pipeline-stats', tiktokPipeline.getStats());
      } catch (err: unknown) {
        console.error('[TikTok Live] Error processing gift event:', getErrorMessage(err, 'unknown'));
      }
    });

    connection.on('like', (data) => {
      try {
        if (isDuplicateEvent(TIKTOK_DEDUPE_EVENT_TYPE.LIKE, data)) return;
        const uniqueId = String(data.uniqueId || data.userId || 'anonymous');
        const nickname = String(data.nickname || uniqueId);
        const rawCount = typeof data.likeCount === 'number' ? data.likeCount : typeof data.count === 'number' ? data.count : 1;
        tiktokPipeline.handleLike({
          uniqueId,
          nickname,
          userAvatarUrl: extractAvatarUrlFromTikTokEvent(data),
          likeCount: rawCount,
        });
      } catch (err: unknown) {
        console.error('[TikTok Live] Error processing like event:', getErrorMessage(err, 'unknown'));
      }
    });

    connection.on('follow', (data) => {
      try {
        if (isDuplicateEvent(TIKTOK_DEDUPE_EVENT_TYPE.FOLLOW, data)) return;
        tiktokPipeline.handleFollow({
          uniqueId: data.uniqueId,
          nickname: data.nickname,
        });
        ctx.io.emit('tiktok:pipeline-stats', tiktokPipeline.getStats());
      } catch (err: unknown) {
        console.error('[TikTok Live] Error processing follow event:', getErrorMessage(err, 'unknown'));
      }
    });

    connection.on('share', (data) => {
      try {
        if (isDuplicateEvent(TIKTOK_DEDUPE_EVENT_TYPE.SHARE, data)) return;
        tiktokPipeline.handleShare({
          uniqueId: data.uniqueId,
          nickname: data.nickname,
        });
        ctx.io.emit('tiktok:pipeline-stats', tiktokPipeline.getStats());
      } catch (err: unknown) {
        console.error('[TikTok Live] Error processing share event:', getErrorMessage(err, 'unknown'));
      }
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
      error: ctx.state.lastErrorMessage || undefined,
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

  let lastResolvedRoomId: string | undefined = undefined;

  // Forward declaration so openConnection and scheduleReconnect can reference each other.
  let openConnection: (username: string, directRoomId?: string) => Promise<void> = async () => undefined;

  const scheduleReconnect = (reason: string): void => {
    if (!reconnectState.isConnectionWanted || reconnectState.timer) return;
    downtimeTracker.markDown(reason);
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
      void openConnection(ctx.state.tiktokUsername, lastResolvedRoomId);
    }, delayMs);
  };

  const attachLifecycleListeners = (connection: WebcastPushConnection): void => {
    const isCurrent = (): boolean => ctx.state.tiktokConnection === connection;
    connection.on('disconnected', () => {
      if (isCurrent()) scheduleReconnect('TikTok connection dropped');
    });
    connection.on('streamEnd', () => {
      if (!isCurrent()) return;
      void deps.opsAlerts.sendOpsAlert(OPS_ALERT_KIND.STREAM_END, `@${ctx.state.tiktokUsername}`);
      console.log(`[TikTok Live] Stream ended for @${ctx.state.tiktokUsername}. Stopping auto-reconnect.`);
      reconnectState.isConnectionWanted = false;
      cancelPendingReconnect();
      downtimeTracker.cancel();
      releaseConnection();
      ctx.state.connectionStatus = 'DISCONNECTED';
      ctx.state.lastErrorMessage = 'TikTok stream ended';
      emitStatus();
    });
    connection.on('error', (err: unknown) => {
      console.error('[TikTok Live] Connection error event:', getErrorMessage(err, 'unknown'));
    });
  };

  const handleConnectSuccess = (connection: WebcastPushConnection, roomId: string): void => {
    if (ctx.state.tiktokConnection !== connection) return;
    cancelPendingReconnect();
    downtimeTracker.markUp();
    ctx.state.connectionStatus = 'CONNECTED';
    ctx.state.lastErrorMessage = '';
    console.log(`[TikTok Live] Connected to room ID: ${roomId}`);
    emitStatus({ roomId });
    // Real gift names / prices / icons for the admin gift config
    void refreshGiftCatalog(ctx);
  };

  const handleConnectFailure = (connection: WebcastPushConnection, err: unknown): void => {
    if (ctx.state.tiktokConnection !== connection) return;
    const rawMessage = getErrorMessage(err, 'Failed to connect to TikTok Live room');
    const userFriendlyError = formatTikTokErrorMessage(rawMessage, ctx.state.tiktokUsername);
    console.error(`[TikTok Live] Connection error: ${rawMessage}`);

    const isOfflineOrNotFound =
      rawMessage.includes('19881007') ||
      rawMessage.includes('user_not_found') ||
      rawMessage.includes('LIVE has ended') ||
      rawMessage.includes('offline') ||
      rawMessage.includes('UserOffline');

    if (isOfflineOrNotFound && ctx.state.reconnectAttempt >= TIKTOK_RECONNECT.MAX_OFFLINE_ATTEMPTS) {
      console.warn(
        `[TikTok Live] Channel is offline/not found. Reconnect halted after ${ctx.state.reconnectAttempt} attempts.`
      );
      reconnectState.isConnectionWanted = false;
      cancelPendingReconnect();
      releaseConnection();
      ctx.state.connectionStatus = 'DISCONNECTED';
      ctx.state.lastErrorMessage = userFriendlyError;
      emitStatus({ error: userFriendlyError });
      return;
    }

    scheduleReconnect(userFriendlyError);
  };

  openConnection = async (username: string, directRoomId?: string): Promise<void> => {
    releaseConnection();
    const effectiveUsername =
      /^\d{15,22}$/.test(username) && ctx.state.tiktokUsername && !/^\d{15,22}$/.test(ctx.state.tiktokUsername)
        ? ctx.state.tiktokUsername
        : username;
    const sessionId = resolveTikTokSessionId();
    const connection = new WebcastPushConnection(effectiveUsername, {
      processInitialData: false,
      enableExtendedGiftInfo: false,
      ...(sessionId
        ? {
            session: {
              cookie: {
                type: 'cookie' as const,
                value: {
                  sessionId,
                  ttTargetIdc: 'useast1a',
                },
              },
            },
          }
        : {}),
    });
    ctx.state.tiktokConnection = connection;
    attachRoomListeners(connection);
    attachLifecycleListeners(connection);

    let targetRoomId = directRoomId || lastResolvedRoomId;
    if (!targetRoomId) {
      try {
        const info = (await connection.fetchRoomInfo()) as Record<string, unknown> | undefined;
        const rawData = info?.data && typeof info.data === 'object' ? (info.data as Record<string, unknown>) : info;
        const rawId = rawData?.id_str;
        const resolvedId =
          typeof rawId === 'string' && rawId.length > 0
            ? rawId
            : typeof rawData?.id === 'number' || typeof rawData?.id === 'string'
              ? String(rawData.id)
              : undefined;
        if (resolvedId) {
          targetRoomId = resolvedId;
          lastResolvedRoomId = resolvedId;
        }
      } catch {
        // Fallback to internal room resolution in connection.connect()
      }
    } else {
      lastResolvedRoomId = targetRoomId;
    }

    connection
      .connect(targetRoomId)
      .then((roomState) => handleConnectSuccess(connection, roomState?.roomId || targetRoomId || ''))
      .catch((err: unknown) => handleConnectFailure(connection, err));
  };

  const connectToRoom = (rawUsername: string): { cleanUsername: string } => {
    const { cleanUsername, directRoomId } = cleanTikTokInput(rawUsername);
    cancelPendingReconnect();
    downtimeTracker.cancel();
    reconnectState.isConnectionWanted = true;
    lastResolvedRoomId = directRoomId;

    if (directRoomId && (!ctx.state.tiktokUsername || /^\d{15,22}$/.test(ctx.state.tiktokUsername))) {
      ctx.state.tiktokUsername = 'bap.daily.lifestyle99';
    } else if (!directRoomId) {
      ctx.state.tiktokUsername = cleanUsername;
    }
    ctx.state.connectionStatus = 'CONNECTING';
    ctx.state.lastErrorMessage = '';
    emitStatus();

    resetStats();
    void openConnection(cleanUsername, directRoomId);
    return { cleanUsername: ctx.state.tiktokUsername };
  };

  const disconnectFromRoom = (): void => {
    lastResolvedRoomId = undefined;
    reconnectState.isConnectionWanted = false;
    cancelPendingReconnect();
    downtimeTracker.cancel();
    releaseConnection();
    ctx.state.connectionStatus = 'DISCONNECTED';
    ctx.state.lastErrorMessage = '';
    emitStatus();
  };

  const disconnectOnShutdown = (): void => {
    reconnectState.isConnectionWanted = false;
    cancelPendingReconnect();
    downtimeTracker.cancel();
    releaseConnection();
  };

  const checkConnection = async (rawUsername?: string): Promise<TikTokCheckResult> => {
    const targetInput = rawUsername && rawUsername.trim() ? rawUsername.trim() : ctx.state.tiktokUsername;
    const { cleanUsername, directRoomId } = cleanTikTokInput(targetInput);
    const startMs = Date.now();
    const connectorVersion = '2.5.0';
    const checkedAt = Date.now();

    if (!cleanUsername) {
      return {
        success: false,
        status: TIKTOK_CHECK_STATUS.ERROR,
        username: '',
        isLive: false,
        latencyMs: 0,
        connectorVersion,
        message: 'Vui lòng nhập Username hoặc Link livestream TikTok để kiểm tra cấu hình.',
        checkedAt,
      };
    }

    const hasActiveConnection = Boolean(
      ctx.state.tiktokConnection && ctx.state.connectionStatus === 'CONNECTED'
    );

    try {
      const sessionId = resolveTikTokSessionId();
      const probeConnection = new WebcastPushConnection(cleanUsername, {
        processInitialData: false,
        enableExtendedGiftInfo: false,
        ...(sessionId
          ? {
              session: {
                cookie: {
                  type: 'cookie' as const,
                  value: {
                    sessionId,
                    ttTargetIdc: 'useast1a',
                  },
                },
              },
            }
          : {}),
      });

      const isLive = await probeConnection.fetchIsLive();
      let rawData: Record<string, unknown> | undefined;
      try {
        const info = (await probeConnection.fetchRoomInfo()) as Record<string, unknown> | undefined;
        rawData = info?.data && typeof info.data === 'object' ? (info.data as Record<string, unknown>) : info;
      } catch {
        // Fallback if fetchRoomInfo fails
      }

      const latencyMs = Date.now() - startMs;
      const rawStatus = typeof rawData?.status === 'number' ? rawData.status : (isLive ? 2 : 4);
      const rawId = rawData?.id_str || (rawData?.id ? String(rawData.id) : directRoomId);
      const roomId = typeof rawId === 'string' ? rawId : undefined;
      const title = typeof rawData?.title === 'string' ? rawData.title : undefined;
      const owner =
        rawData?.owner && typeof rawData.owner === 'object' ? (rawData.owner as Record<string, unknown>) : null;
      const streamerNickname = typeof owner?.nickname === 'string' ? owner.nickname : undefined;
      const viewerCount = typeof rawData?.user_count === 'number' ? rawData.user_count : undefined;

      if (isLive) {
        return {
          success: true,
          status: TIKTOK_CHECK_STATUS.LIVE,
          username: cleanUsername,
          roomId,
          title,
          streamerNickname,
          viewerCount,
          isLive: true,
          latencyMs,
          connectorVersion,
          message: `Kênh @${cleanUsername} đang PHÁT TRỰC TIẾP! Cấu hình tiktok-live-connector sẵn sàng bắt tương tác.`,
          checkedAt,
          details: {
            rawStatus,
            activeSessionStatus: ctx.state.connectionStatus,
            hasActiveConnection,
            activeRoomId: hasActiveConnection ? roomId : undefined,
          },
        };
      }

      return {
        success: true,
        status: TIKTOK_CHECK_STATUS.OFFLINE,
        username: cleanUsername,
        roomId,
        title,
        streamerNickname,
        viewerCount: 0,
        isLive: false,
        latencyMs,
        connectorVersion,
        message: `Kênh @${cleanUsername} tồn tại nhưng đang NGOẠI TUYẾN (Chưa phát Live). Hãy bật Live trên TikTok trước khi bấm Kết Nối.`,
        checkedAt,
        details: {
          rawStatus,
          activeSessionStatus: ctx.state.connectionStatus,
          hasActiveConnection,
        },
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startMs;
      const rawMessage = getErrorMessage(err, 'Lỗi không xác định khi kết nối TikTok Live API');
      let status: TikTokCheckStatusCode = TIKTOK_CHECK_STATUS.ERROR;
      let message = rawMessage;

      if (
        rawMessage.includes('19881007') ||
        rawMessage.includes('user_not_found') ||
        rawMessage.includes('LIVE has ended') ||
        rawMessage.includes('offline') ||
        rawMessage.includes('UserOffline')
      ) {
        status = TIKTOK_CHECK_STATUS.OFFLINE;
        message = `Kênh @${cleanUsername} hiện đang NGOẠI TUYẾN (Chưa phát Live trên TikTok). Thư viện tiktok-live-connector kết nối tốt. Hãy mở ứng dụng TikTok và Bắt Đầu Phát Live trước khi bấm [Kết Nối Live].`;
      } else if (
        rawMessage.includes('blocked') ||
        rawMessage.includes('SlardarWAF') ||
        rawMessage.includes('403')
      ) {
        status = TIKTOK_CHECK_STATUS.BLOCKED;
        message = `TikTok tạm thời chặn IP / WAF (do gửi request dồn dập hoặc cần Captcha). Thử lại sau 2-3 phút hoặc cấu hình TIKTOK_SESSION_ID.`;
      } else if (
        rawMessage.includes('timeout') ||
        rawMessage.includes('ETIMEDOUT') ||
        rawMessage.includes('ECONNRESET')
      ) {
        status = TIKTOK_CHECK_STATUS.ERROR;
        message = `Quá thời gian kết nối (Timeout) đến máy chủ TikTok. Kiểm tra kết nối mạng của máy chủ.`;
      } else {
        message = formatTikTokErrorMessage(rawMessage, cleanUsername);
      }

      return {
        success: status === TIKTOK_CHECK_STATUS.OFFLINE,
        status,
        username: cleanUsername,
        isLive: false,
        latencyMs,
        connectorVersion,
        message,
        checkedAt,
        details: {
          activeSessionStatus: ctx.state.connectionStatus,
          hasActiveConnection,
        },
      };
    }
  };

  return {
    getStats,
    resetStats,
    getPipeline: () => tiktokPipeline,
    updateScoreHint,
    runSimulation,
    connectToRoom,
    checkConnection,
    disconnectFromRoom,
    disconnectOnShutdown,
  };
}
