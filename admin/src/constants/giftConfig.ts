/** Per-gift rules; mirrors server/src/constants/giftConfig.ts (the server validates everything again). */
export const GIFT_EFFECT = {
  NONE: 'NONE',
  SUMMON_CHAMPION: 'SUMMON_CHAMPION',
  HEAL_TEAM: 'HEAL_TEAM',
  STUN_BOSS: 'STUN_BOSS',
  FULL_FURY: 'FULL_FURY',
  BATTLE_FRENZY: 'BATTLE_FRENZY',
  AEGIS_BARRIER: 'AEGIS_BARRIER',
} as const;
export type GiftEffect = (typeof GIFT_EFFECT)[keyof typeof GIFT_EFFECT];

export type GiftTeamSlot = 'BLG' | 'GENG';

export interface GiftRule {
  giftId: string;
  name: string;
  coins: number;
  imageUrl: string;
  team: GiftTeamSlot | null;
  showOnOverlay: boolean;
  damageMultiplier: number;
  effect: GiftEffect;
  effectChampion: string;
}

export interface GiftCatalogItem {
  giftId: string;
  name: string;
  coins: number;
  imageUrl: string;
}

export interface GiftCatalogState {
  items: GiftCatalogItem[];
  fetchedAt: number;
  error: string | null;
}

export const GIFT_CONFIG_EVENT = {
  SAVE: 'admin:gift-config',
  FETCH_CATALOG: 'admin:gift-catalog-fetch',
  CONFIG: 'game:gift-config',
  CATALOG: 'game:gift-catalog',
} as const;

export const GIFT_CATALOG_ERROR_LABEL: Readonly<Record<string, string>> = {
  NOT_CONNECTED: 'Chưa kết nối phòng live — hãy Kết Nối Live trước rồi tải lại.',
  FETCH_FAILED: 'TikTok không trả về danh sách quà, thử lại sau.',
};

export const GIFT_EFFECT_OPTIONS: readonly { value: GiftEffect; label: string }[] = [
  { value: GIFT_EFFECT.NONE, label: 'Không có' },
  { value: GIFT_EFFECT.SUMMON_CHAMPION, label: 'Triệu hồi tướng' },
  { value: GIFT_EFFECT.HEAL_TEAM, label: 'Hồi máu cả đội' },
  { value: GIFT_EFFECT.STUN_BOSS, label: 'Làm choáng boss' },
  { value: GIFT_EFFECT.FULL_FURY, label: 'Đầy Nộ tuyển thủ' },
  { value: GIFT_EFFECT.BATTLE_FRENZY, label: 'Cuồng nộ (+40% tốc đánh & nộ)' },
  { value: GIFT_EFFECT.AEGIS_BARRIER, label: 'Lá chắn Aegis (Hồi phục & Choáng boss)' },
];

export const GIFT_CONFIG_UI = {
  MIN_MULTIPLIER: 0,
  MAX_MULTIPLIER: 5,
  MULTIPLIER_STEP: 0.1,
  DEFAULT_MULTIPLIER: 1,
  MAX_RULES: 60,
  CATALOG_PREVIEW_LIMIT: 120,
  DAMAGE_PER_COIN: 120,
} as const;

export const createRuleFromCatalog = (item: GiftCatalogItem): GiftRule => ({
  giftId: item.giftId,
  name: item.name,
  coins: item.coins,
  imageUrl: item.imageUrl,
  team: null,
  showOnOverlay: true,
  damageMultiplier: GIFT_CONFIG_UI.DEFAULT_MULTIPLIER,
  effect: GIFT_EFFECT.NONE,
  effectChampion: '',
});

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

export const isGiftRuleList = (value: unknown): value is { rules: GiftRule[] } =>
  isRecord(value) && Array.isArray(value.rules);

export const isGiftCatalogState = (value: unknown): value is GiftCatalogState =>
  isRecord(value) && Array.isArray(value.items) && typeof value.fetchedAt === 'number';
