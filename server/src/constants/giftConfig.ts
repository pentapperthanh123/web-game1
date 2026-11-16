import type { TeamSlotKey } from './teams.js';

/**
 * Per-gift rules set in the admin portal (persisted in data/gift_config.json).
 * A rule matches a TikTok gift by id, or by name for simulated gifts that carry no id.
 */
export const GIFT_EFFECT = {
  NONE: 'NONE',
  /** Summons one specific champion for the donor (on top of the usual elite). */
  SUMMON_CHAMPION: 'SUMMON_CHAMPION',
  /** Fully heals every champion of the donor's team. */
  HEAL_TEAM: 'HEAL_TEAM',
  /** Stuns the boss: it cannot cast skills for a few seconds. */
  STUN_BOSS: 'STUN_BOSS',
  /** Fills the fury of every pro of the donor's team (next attack is an ultimate). */
  FULL_FURY: 'FULL_FURY',
} as const;
export type GiftEffect = (typeof GIFT_EFFECT)[keyof typeof GIFT_EFFECT];

export interface GiftRule {
  /** TikTok gift id as a string ('' for a manual rule matched by name only). */
  giftId: string;
  name: string;
  /** Diamond value of one gift, as listed by TikTok (display only; damage uses the real event value). */
  coins: number;
  imageUrl: string;
  /** Sending this gift joins / supports this team, whatever the viewer chatted before. */
  team: TeamSlotKey | null;
  showOnOverlay: boolean;
  damageMultiplier: number;
  effect: GiftEffect;
  /** Champion for SUMMON_CHAMPION. */
  effectChampion: string;
}

export interface GiftConfigState {
  rules: GiftRule[];
}

/** One gift of the live room's gift list (TikTok `gift/list`). */
export interface GiftCatalogItem {
  giftId: string;
  name: string;
  coins: number;
  imageUrl: string;
}

export interface GiftCatalogState {
  items: GiftCatalogItem[];
  fetchedAt: number;
  /** Set when the list could not be loaded (not connected, TikTok error). */
  error: string | null;
}

/** What the overlay needs to apply a rule to a gift event. */
export interface GiftRulePayload {
  damageMultiplier: number;
  effect: GiftEffect;
  effectChampion: string;
}

export const GIFT_CONFIG_LIMITS = {
  MAX_RULES: 60,
  MIN_DAMAGE_MULTIPLIER: 0,
  MAX_DAMAGE_MULTIPLIER: 5,
  DEFAULT_DAMAGE_MULTIPLIER: 1,
  MULTIPLIER_DECIMALS: 2,
  MAX_COINS: 100_000,
  MAX_NAME_LENGTH: 40,
  MAX_ID_LENGTH: 40,
  MAX_CHAMPION_LENGTH: 30,
  MAX_URL_LENGTH: 600,
  MAX_CATALOG_ITEMS: 400,
} as const;

export const GIFT_CONFIG_EVENT = {
  /** Admin → server: replace the whole rule list. */
  ADMIN_SAVE: 'admin:gift-config',
  /** Admin → server: reload the live room's gift list. */
  ADMIN_FETCH_CATALOG: 'admin:gift-catalog-fetch',
  /** Server → everyone: current rules (the overlay uses them for its gift board). */
  GAME_CONFIG: 'game:gift-config',
  /** Server → everyone: the live room's gift list (admin portal picker). */
  GAME_CATALOG: 'game:gift-catalog',
} as const;

export const GIFT_CATALOG_ERROR = {
  NOT_CONNECTED: 'NOT_CONNECTED',
  FETCH_FAILED: 'FETCH_FAILED',
} as const;
