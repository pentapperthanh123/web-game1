import type { Socket } from 'socket.io';
import {
  CasterConfig,
  ChatLimitConfig,
  LIVE_OPS_ADMIN_ROOM,
  LIVE_OPS_EVENT,
  OPS_ALERT_KIND,
} from '../constants/liveOps.js';
import { ModerationService } from '../moderation/moderationService.js';
import { ModerationData } from '../moderation/moderationStore.js';
import { saveLiveOpsConfigToDisk } from '../storage/jsonFileStore.js';
import { ServerContext } from '../types/serverState.js';
import { pickCasterConfigPatch, pickChatLimitPatch } from '../utils/liveOpsSanitizers.js';
import { OpsAlertResult, OpsAlertService } from './opsAlertService.js';

/**
 * Admin-facing live operations: chat limits, caster switches (incl. the name-reading kill
 * switch), the blocklist / alias editor and the Telegram test alert.
 */

export interface LiveOpsAdminState {
  chatLimitConfig: ChatLimitConfig;
  casterConfig: CasterConfig;
  moderation: ModerationData;
  opsAlert: { isConfigured: boolean };
}

export interface ModerationUpdateAck {
  rejectedAliases: string[];
}

export interface LiveOpsService {
  registerSocketHandlers(socket: Socket): void;
}

type AckCallback<T> = (response: T) => void;

const isAckCallback = <T>(candidate: unknown): candidate is AckCallback<T> => typeof candidate === 'function';

export function createLiveOpsService(
  ctx: ServerContext,
  moderation: ModerationService,
  opsAlerts: OpsAlertService
): LiveOpsService {
  const buildAdminState = (): LiveOpsAdminState => ({
    chatLimitConfig: ctx.state.chatLimitConfig,
    casterConfig: ctx.state.casterConfig,
    moderation: moderation.getSnapshot(),
    opsAlert: { isConfigured: opsAlerts.isConfigured },
  });

  const broadcastAdminState = (): void => {
    ctx.io.to(LIVE_OPS_ADMIN_ROOM).emit(LIVE_OPS_EVENT.ADMIN_STATE, buildAdminState());
  };

  const persistConfig = (): void => {
    saveLiveOpsConfigToDisk({
      chatLimitConfig: ctx.state.chatLimitConfig,
      casterConfig: ctx.state.casterConfig,
    });
  };

  const handleChatLimits = (rawPayload: unknown): void => {
    const patch = pickChatLimitPatch(rawPayload);
    if (Object.keys(patch).length === 0) return;
    ctx.state.chatLimitConfig = { ...ctx.state.chatLimitConfig, ...patch };
    persistConfig();
    broadcastAdminState();
  };

  const handleCasterConfig = (rawPayload: unknown): void => {
    const patch = pickCasterConfigPatch(rawPayload);
    if (Object.keys(patch).length === 0) return;
    ctx.state.casterConfig = { ...ctx.state.casterConfig, ...patch };
    persistConfig();
    ctx.io.emit(LIVE_OPS_EVENT.GAME_CASTER_CONFIG, ctx.state.casterConfig);
    broadcastAdminState();
  };

  const handleModerationUpdate = (rawPayload: unknown, ack: unknown): void => {
    const { rejectedAliases } = moderation.applyUpdate(rawPayload);
    broadcastAdminState();
    if (isAckCallback<ModerationUpdateAck>(ack)) ack({ rejectedAliases });
  };

  const handleTestAlert = async (ack: unknown): Promise<void> => {
    const result = await opsAlerts.sendOpsAlert(OPS_ALERT_KIND.TEST);
    if (isAckCallback<OpsAlertResult>(ack)) ack(result);
  };

  const registerSocketHandlers = (socket: Socket): void => {
    socket.emit(LIVE_OPS_EVENT.GAME_CASTER_CONFIG, ctx.state.casterConfig);
    if (socket.data.isAdmin === true) {
      void socket.join(LIVE_OPS_ADMIN_ROOM);
      socket.emit(LIVE_OPS_EVENT.ADMIN_STATE, buildAdminState());
    }

    socket.on(LIVE_OPS_EVENT.ADMIN_REQUEST_STATE, () => {
      socket.emit(LIVE_OPS_EVENT.ADMIN_STATE, buildAdminState());
    });
    socket.on(LIVE_OPS_EVENT.ADMIN_CHAT_LIMITS, handleChatLimits);
    socket.on(LIVE_OPS_EVENT.ADMIN_CASTER_CONFIG, handleCasterConfig);
    socket.on(LIVE_OPS_EVENT.ADMIN_MODERATION_UPDATE, handleModerationUpdate);
    socket.on(LIVE_OPS_EVENT.ADMIN_OPS_ALERT_TEST, (_payload: unknown, ack: unknown) => {
      void handleTestAlert(ack);
    });
  };

  return { registerSocketHandlers };
}
