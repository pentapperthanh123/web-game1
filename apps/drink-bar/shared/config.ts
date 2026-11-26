import type { AutoBotPace, DrinkBarConfig } from './types';

export const DRINK_BAR_PORTS = {
  CLIENT: 8070,
  ADMIN: 8071,
  SERVER: 4000,
} as const;

export const DRINK_BAR_SYNC_CHANNEL = 'DRINK_BAR_LIVE_SYNC_V1' as const;

export const DRINK_BAR_SOCKET_EVENTS = {
  SYNC: 'drinkbar:sync',
  STATE: 'drinkbar:state',
} as const;

export const DRINK_BAR_STORAGE_KEYS = {
  LAST_TIKTOK_ID: 'drink_bar_last_tiktok_id',
  ADMIN_PREFS: 'drink_bar_admin_prefs_v1',
} as const;

export const STAGE_METRICS = {
  WIDTH: 720,
  HEIGHT: 1280,
  TARGET_FPS: 30,
  FRAME_INTERVAL_MS: 1000 / 30,
  DEVICE_PIXEL_RATIO: 1,
  MAX_PARTICLES: 60,
  HEADER_TOP_Y: 16,
  HEADER_END_Y: 74,
  SHELF_START_Y: 84,
  SHELF_END_Y: 235,
  LEFT_COL_X: 24,
  LEFT_COL_WIDTH: 224,
  GIFT_CARD_START_Y: 255,
  GIFT_CARD_END_Y: 455,
  QUEUE_CARD_START_Y: 472,
  QUEUE_CARD_END_Y: 745,
  COUNTER_TOP_Y: 660,
  COUNTER_END_Y: 828,
  CUP_LEFT_X: 362,
  CUP_RIGHT_X: 454,
  CUP2_LEFT_X: 498,
  CUP2_RIGHT_X: 590,
  CUP_TOP_Y: 420,
  CUP_BOTTOM_Y: 685,
  BARTENDER_LEFT_X: 270,
  BARTENDER_RIGHT_X: 690,
  BARTENDER_TOP_Y: 375,
  BARTENDER_BOTTOM_Y: 680,
  GUESTS_START_X: 305,
  GUESTS_END_X: 635,
  GUESTS_TOP_Y: 680,
  GUESTS_BOTTOM_Y: 956,
  SAFE_CHAT_START_Y: 960,
} as const;

export const DRINK_BAR_PALETTE = {
  OUTLINE: '#3B2820',
  WALL_TOP: '#FFF5F7',
  WALL_BOTTOM: '#FCE7EE',
  ARCH_TINT: '#F8D7E3',
  SHELF_WOOD: '#D4929D',
  SHELF_HIGHLIGHT: '#EBB6C0',
  COUNTER_TOP: '#D99B9C',
  COUNTER_HIGHLIGHT: '#ECC4CB',
  COUNTER_BODY: '#C48285',
  COUNTER_PANEL: '#B57378',
  CARD_BG: '#FFF9FA',
  CARD_SOFT: '#FDEBF1',
  TEXT_PRIMARY: '#3B2820',
  TEXT_MUTED: '#855E68',
  VIP_GOLD: '#F7C95B',
  VIP_GOLD_LIGHT: '#FFF1C2',
  SIGNATURE_GOLD: '#F4B83E',
  SIGNATURE_GLOW: '#FFE799',
  MINT_BADGE: '#F4A6BE',
  MINT_TEXT: '#7A2840',
  PEACH_BADGE: '#F7C6D7',
  ROSE_ACCENT: '#F48BA3',
  SAFE_ZONE_LINE: '#8C6E5D',
} as const;

export const GAMEPLAY_LIMITS = {
  DEFAULT_BREW_DURATION_SEC: 18,
  MIN_BREW_DURATION_SEC: 12,
  MAX_BREW_DURATION_SEC: 30,
  SHOWCASE_DURATION_MS: 1800,
  LIKE_BATCH_INTERVAL_MS: 200,
  LIKE_PROGRESS_PER_HEART: 0.75,
  LIKE_MAX_BATCH_PROGRESS: 6.5,
  SPEED_BOOST_DURATION_MS: 3200,
  SPEED_BOOST_MULTIPLIER: 1.65,
  WAVE_DURATION_MS: 2500,
  DANCE_SMALL_DURATION_MS: 3500,
  DANCE_MEDIUM_DURATION_MS: 5000,
  DANCE_LARGE_DURATION_MS: 7000,
  DANCE_MAX_DURATION_MS: 8000,
  DANCE_TRANSITION_MS: 200,
  SPEECH_MAX_CHARS: 24,
  SPEECH_TTL_MS: 3200,
  GUEST_BUBBLE_MAX_CHARS: 26,
  GUEST_BUBBLE_TTL_MS: 3800,
  MAX_SHELF_ITEMS: 4,
  MAX_VISIBLE_QUEUE: 3,
  MAX_QUEUE_TOTAL: 40,
  MAX_GUEST_SLOTS: 24,
  MIC_MODE_VOLUME_GAIN: 0.3,
  NORMAL_VOLUME_GAIN: 0.85,
  DEFAULT_CAPACITY_ML: 1500,
  MIN_CAPACITY_ML: 1000,
  MAX_CAPACITY_ML: 3000,
  CAPACITY_STEP_ML: 250,
  COST_PER_DRINK_ML: 250,
  LOW_STOCK_THRESHOLD_ML: 250,
  GIFT_RESUPPLY_ML: 500,
  AUTO_RESTOCK_DELAY_MS: 45000,
} as const;

export const GIFT_TIER_THRESHOLDS = {
  SMALL_MIN: 1,
  SMALL_MAX: 4,
  MEDIUM_MIN: 5,
  MEDIUM_MAX: 29,
  LARGE_MIN: 30,
} as const;

export const DEFAULT_DRINK_BAR_CONFIG: DrinkBarConfig = {
  language: 'VI',
  brewDurationSec: GAMEPLAY_LIMITS.DEFAULT_BREW_DURATION_SEC,
  sfxEnabled: true,
  sfxMusicEnabled: true,
  masterVolume: 0.85,
  micMode: false,
  showSafeZone: false,
  defaultCapacityMl: GAMEPLAY_LIMITS.DEFAULT_CAPACITY_ML,
  autoRestockEnabled: true,
  unlimitedInventory: false,
};

export interface AutoBotPaceConfig {
  intervalMs: number;
  orderChance: number;
  flavorChatChance: number;
  likeChance: number;
  smallGiftChance: number;
  mediumGiftChance: number;
  largeGiftChance: number;
}

export const AUTOBOT_PACE_PRESETS: Record<AutoBotPace, AutoBotPaceConfig> = {
  SLOW: {
    intervalMs: 2800,
    orderChance: 0.28,
    flavorChatChance: 0.22,
    likeChance: 0.26,
    smallGiftChance: 0.13,
    mediumGiftChance: 0.08,
    largeGiftChance: 0.03,
  },
  NORMAL: {
    intervalMs: 1650,
    orderChance: 0.26,
    flavorChatChance: 0.2,
    likeChance: 0.26,
    smallGiftChance: 0.14,
    mediumGiftChance: 0.09,
    largeGiftChance: 0.05,
  },
  FAST: {
    intervalMs: 900,
    orderChance: 0.24,
    flavorChatChance: 0.18,
    likeChance: 0.28,
    smallGiftChance: 0.14,
    mediumGiftChance: 0.1,
    largeGiftChance: 0.06,
  },
};

export const DEMO_BOT_NAMES: readonly string[] = [
  'Minh Anh',
  'Gia Huy',
  'Linh Chi',
  'Hoàng Nam',
  'Bảo Ngọc',
  'Tuấn Kiệt',
  'Khánh Vy',
  'Quốc Bảo',
  'Mai Phương',
  'Đức Anh',
  'Hà My',
  'Nhật Minh',
  'Thảo Nhi',
  'Khả Hân',
  'Phúc Lâm',
  'Yến Nhi',
];
