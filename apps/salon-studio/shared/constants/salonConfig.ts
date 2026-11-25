import type { AutoBotPace } from '../types/salon.js';

export const SALON_PORTS = {
  CLIENT: 8060,
  ADMIN: 8061,
  SERVER: 4000,
  GATEWAY: 5000,
} as const;

export const SALON_SYNC_CHANNEL = 'SALON_STUDIO_SYNC_BUS' as const;

export const SALON_STORAGE_KEYS = {
  LAST_TIKTOK_ID: 'salon_studio_last_tiktok_id',
  ADMIN_PREFS: 'salon_studio_admin_prefs',
} as const;

export const STAGE_METRICS = {
  WIDTH: 720,
  HEIGHT: 1280,
  TOP_ZONE_END_Y: 230,
  WORK_ZONE_START_Y: 235,
  WORK_ZONE_END_Y: 960,
  SAFE_BOTTOM_START_Y: 965,
  TARGET_FPS: 30,
  FRAME_INTERVAL_MS: 1000 / 30,
  DEVICE_PIXEL_RATIO: 1,
  MAX_PARTICLES: 60,
} as const;

export const GAMEPLAY_LIMITS = {
  DEFAULT_TURN_DURATION_SEC: 20,
  MIN_TURN_DURATION_SEC: 12,
  MAX_TURN_DURATION_SEC: 30,
  COMPLETION_SHOWCASE_MS: 2400,
  CHAT_COOLDOWN_PER_USER_MS: 1500,
  LIKE_BATCH_INTERVAL_MS: 200,
  LIKE_PROGRESS_PER_HEART: 0.9,
  LIKE_MAX_BATCH_PROGRESS: 8,
  STYLIST_BOOST_MS: 1400,
  MAX_QUEUE_SIZE: 30,
  MAX_WALL_ITEMS: 5,
  MAX_AUDIENCE_BUBBLES: 3,
  AUDIENCE_BUBBLE_TTL_MS: 5200,
  THANK_YOU_TOAST_TTL_MS: 3600,
  INITIAL_WATCHING_COUNT: 18,
} as const;

export const GIFT_TIERS = {
  SMALL_MIN_COINS: 1,
  SMALL_MAX_COINS: 4,
  MEDIUM_MIN_COINS: 5,
  MEDIUM_MAX_COINS: 29,
  LARGE_MIN_COINS: 30,
} as const;

export const CHAT_KEYWORDS = {
  QUEUE_JOIN: ['toc', 'tóc', 'hair', 'nail', 'mong', 'móng', 'cat', 'cắt', 'me', 'play'],
  SERVICE_HAIR: ['toc', 'tóc', 'hair', 'cat', 'cắt'],
  SERVICE_NAIL: ['nail', 'mong', 'móng'],
  COLORS: {
    pink: ['hong', 'hồng', 'pink'],
    gold: ['vang', 'vàng', 'gold', 'blonde'],
    blue: ['xanh', 'blue', 'mint'],
    purple: ['tim', 'tím', 'purple'],
    black: ['den', 'đen', 'black'],
  },
  STYLES: {
    curly: ['xoan', 'xoăn', 'curly'],
    cool: ['ngau', 'ngầu', 'cool'],
    long: ['dai', 'dài', 'long'],
    short: ['ngan', 'ngắn', 'short'],
  },
} as const;

export const SALON_PALETTE = {
  OUTLINE: '#3A2825',
  CREAM_BG: '#FFF7EE',
  WARM_WALL: '#FFEFE3',
  BLUSH_PINK: '#FFD4E2',
  CORAL_ROSE: '#FF8FA8',
  MINT_PASTEL: '#C9F2E3',
  MINT_DEEP: '#42B38B',
  HONEY_GOLD: '#FFD56B',
  HONEY_DEEP: '#E09A1F',
  PEACH_SOFT: '#FFE1C6',
  CHAIR_LEATHER: '#FFACC2',
  CHAIR_SHADOW: '#E97F9C',
  VELVET_PILLOW: '#F9C3D5',
  VELVET_TRIM: '#FFDF88',
  WOOD_LIGHT: '#E7BC91',
  WOOD_DARK: '#C89262',
  TEXT_DARK: '#3A2825',
  TEXT_MUTED: '#7D6059',
} as const;

export interface AutoBotPresetConfig {
  labelVi: string;
  labelEn: string;
  intervalMs: number;
  queueChance: number;
  styleChatChance: number;
  likeChance: number;
  smallGiftChance: number;
  mediumTrollChance: number;
  largeRoyalChance: number;
  joinChance: number;
}

export const AUTOBOT_PACE_PRESETS: Record<AutoBotPace, AutoBotPresetConfig> = {
  SLOW: {
    labelVi: 'Chậm (Thư giãn)',
    labelEn: 'Slow',
    intervalMs: 2600,
    queueChance: 0.24,
    styleChatChance: 0.26,
    likeChance: 0.24,
    smallGiftChance: 0.12,
    mediumTrollChance: 0.06,
    largeRoyalChance: 0.03,
    joinChance: 0.05,
  },
  NORMAL: {
    labelVi: 'Vừa (Sôi nổi)',
    labelEn: 'Normal',
    intervalMs: 1450,
    queueChance: 0.22,
    styleChatChance: 0.24,
    likeChance: 0.24,
    smallGiftChance: 0.14,
    mediumTrollChance: 0.09,
    largeRoyalChance: 0.04,
    joinChance: 0.03,
  },
  BURST: {
    labelVi: 'Nhanh (Cao điểm)',
    labelEn: 'Burst',
    intervalMs: 750,
    queueChance: 0.2,
    styleChatChance: 0.2,
    likeChance: 0.26,
    smallGiftChance: 0.16,
    mediumTrollChance: 0.11,
    largeRoyalChance: 0.05,
    joinChance: 0.02,
  },
};
