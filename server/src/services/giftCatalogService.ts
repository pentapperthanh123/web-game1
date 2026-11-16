import { GIFT_CATALOG_ERROR, GIFT_CONFIG_EVENT } from '../constants/giftConfig.js';
import { ServerContext } from '../types/serverState.js';
import { toGiftCatalog } from '../utils/giftConfigSanitizer.js';

const LOG_PREFIX = '[GiftCatalog]';

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Loads the gift list of the connected live room (names, diamond values, icons) for the admin picker.
 * Runs on every successful connect and when the admin asks for a refresh.
 */
export const refreshGiftCatalog = async (ctx: ServerContext): Promise<void> => {
  const connection = ctx.state.tiktokConnection;
  if (!connection || ctx.state.connectionStatus !== 'CONNECTED') {
    ctx.state.giftCatalog = { ...ctx.state.giftCatalog, error: GIFT_CATALOG_ERROR.NOT_CONNECTED };
    ctx.io.emit(GIFT_CONFIG_EVENT.GAME_CATALOG, ctx.state.giftCatalog);
    return;
  }
  try {
    const rawGifts: unknown = await connection.getAvailableGifts();
    ctx.state.giftCatalog = { items: toGiftCatalog(rawGifts), fetchedAt: Date.now(), error: null };
    console.log(`${LOG_PREFIX} loaded ${ctx.state.giftCatalog.items.length} gifts`);
  } catch (error) {
    console.warn(`${LOG_PREFIX} could not load the gift list: ${describeError(error)}`);
    ctx.state.giftCatalog = { ...ctx.state.giftCatalog, error: GIFT_CATALOG_ERROR.FETCH_FAILED };
  }
  ctx.io.emit(GIFT_CONFIG_EVENT.GAME_CATALOG, ctx.state.giftCatalog);
};
