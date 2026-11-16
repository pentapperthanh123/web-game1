import type { Socket } from 'socket.io';
import { GIFT_CONFIG_EVENT } from '../constants/giftConfig.js';
import { refreshGiftCatalog } from '../services/giftCatalogService.js';
import { saveGiftConfigToDisk } from '../storage/jsonFileStore.js';
import { ServerContext } from '../types/serverState.js';
import { sanitizeGiftConfig } from '../utils/giftConfigSanitizer.js';

/** Gift rules (admin-only writes, prefixed `admin:`) and the live room's gift list. */
export const registerGiftConfigHandlers = (socket: Socket, ctx: ServerContext): void => {
  socket.emit(GIFT_CONFIG_EVENT.GAME_CONFIG, ctx.state.giftConfig);
  socket.emit(GIFT_CONFIG_EVENT.GAME_CATALOG, ctx.state.giftCatalog);

  socket.on(GIFT_CONFIG_EVENT.ADMIN_SAVE, (payload: unknown) => {
    ctx.state.giftConfig = sanitizeGiftConfig(payload);
    saveGiftConfigToDisk(ctx.state.giftConfig);
    ctx.io.emit(GIFT_CONFIG_EVENT.GAME_CONFIG, ctx.state.giftConfig);
  });

  socket.on(GIFT_CONFIG_EVENT.ADMIN_FETCH_CATALOG, () => {
    void refreshGiftCatalog(ctx);
  });
};
