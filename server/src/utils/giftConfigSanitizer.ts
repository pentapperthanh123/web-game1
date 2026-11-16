import {
  GIFT_CONFIG_LIMITS,
  GIFT_EFFECT,
  GiftCatalogItem,
  GiftConfigState,
  GiftEffect,
  GiftRule,
} from '../constants/giftConfig.js';
import type { TeamSlotKey } from '../constants/teams.js';

const TEAM_SLOTS: ReadonlySet<string> = new Set<TeamSlotKey>(['BLG', 'GENG']);
const EFFECTS: ReadonlySet<string> = new Set(Object.values(GIFT_EFFECT));
const HTTPS_PREFIX = 'https://';

const toText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const toGiftId = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  return toText(value, GIFT_CONFIG_LIMITS.MAX_ID_LENGTH);
};

const toCoins = (value: unknown): number => {
  const coins = Math.round(Number(value));
  if (!Number.isFinite(coins) || coins < 0) return 0;
  return Math.min(GIFT_CONFIG_LIMITS.MAX_COINS, coins);
};

/** Only https image links (TikTok CDN); anything else is dropped. */
const toImageUrl = (value: unknown): string => {
  const url = toText(value, GIFT_CONFIG_LIMITS.MAX_URL_LENGTH);
  return url.startsWith(HTTPS_PREFIX) ? url : '';
};

const toMultiplier = (value: unknown): number => {
  const multiplier = Number(value);
  if (!Number.isFinite(multiplier)) return GIFT_CONFIG_LIMITS.DEFAULT_DAMAGE_MULTIPLIER;
  const clamped = Math.min(GIFT_CONFIG_LIMITS.MAX_DAMAGE_MULTIPLIER, Math.max(GIFT_CONFIG_LIMITS.MIN_DAMAGE_MULTIPLIER, multiplier));
  return Number(clamped.toFixed(GIFT_CONFIG_LIMITS.MULTIPLIER_DECIMALS));
};

const toTeam = (value: unknown): TeamSlotKey | null =>
  typeof value === 'string' && TEAM_SLOTS.has(value) ? (value as TeamSlotKey) : null;

const toEffect = (value: unknown): GiftEffect =>
  typeof value === 'string' && EFFECTS.has(value) ? (value as GiftEffect) : GIFT_EFFECT.NONE;

const toRule = (raw: unknown): GiftRule | null => {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const giftId = toGiftId(source.giftId);
  const name = toText(source.name, GIFT_CONFIG_LIMITS.MAX_NAME_LENGTH);
  if (!giftId && !name) return null;
  const effect = toEffect(source.effect);
  return {
    giftId,
    name,
    coins: toCoins(source.coins),
    imageUrl: toImageUrl(source.imageUrl),
    team: toTeam(source.team),
    showOnOverlay: source.showOnOverlay === true,
    damageMultiplier: toMultiplier(source.damageMultiplier),
    effect,
    effectChampion: effect === GIFT_EFFECT.SUMMON_CHAMPION ? toText(source.effectChampion, GIFT_CONFIG_LIMITS.MAX_CHAMPION_LENGTH) : '',
  };
};

/** Validates an admin payload / the file on disk; duplicates (same id, or same name without id) keep the first. */
export const sanitizeGiftConfig = (raw: unknown): GiftConfigState => {
  const rawRules = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).rules : undefined;
  if (!Array.isArray(rawRules)) return { rules: [] };
  const seen = new Set<string>();
  const rules: GiftRule[] = [];
  for (const candidate of rawRules) {
    const rule = toRule(candidate);
    if (!rule) continue;
    const key = rule.giftId || `name:${rule.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push(rule);
    if (rules.length >= GIFT_CONFIG_LIMITS.MAX_RULES) break;
  }
  return { rules };
};

interface RawTikTokGift {
  id?: unknown;
  name?: unknown;
  diamond_count?: unknown;
  image?: { url_list?: unknown };
}

const firstUrl = (urlList: unknown): string => (Array.isArray(urlList) ? toImageUrl(urlList[0]) : '');

/** TikTok `gift/list` entries → catalog items, cheapest first. */
export const toGiftCatalog = (rawGifts: unknown): GiftCatalogItem[] => {
  if (!Array.isArray(rawGifts)) return [];
  return rawGifts
    .map((raw: RawTikTokGift): GiftCatalogItem => ({
      giftId: toGiftId(raw?.id),
      name: toText(raw?.name, GIFT_CONFIG_LIMITS.MAX_NAME_LENGTH),
      coins: toCoins(raw?.diamond_count),
      imageUrl: firstUrl(raw?.image?.url_list),
    }))
    .filter((item) => item.giftId && item.name)
    .sort((left, right) => left.coins - right.coins)
    .slice(0, GIFT_CONFIG_LIMITS.MAX_CATALOG_ITEMS);
};

/** The rule for a gift event: by TikTok id first, then by name (simulated gifts have no id). */
export const findGiftRule = (config: GiftConfigState, giftId: unknown, giftName: unknown): GiftRule | null => {
  const id = toGiftId(giftId);
  if (id) {
    const byId = config.rules.find((rule) => rule.giftId === id);
    if (byId) return byId;
  }
  const name = typeof giftName === 'string' ? giftName.trim().toLowerCase() : '';
  if (!name) return null;
  return config.rules.find((rule) => rule.name.toLowerCase() === name) ?? null;
};
