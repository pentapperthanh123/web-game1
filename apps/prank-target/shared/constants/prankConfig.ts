import type { ActionBadgeConfig, PrankActionType } from '../types/prank.js';

export const PRANK_PORTS = {
  CLIENT: 8040,
  ADMIN: 8041,
  GATEWAY: 5000,
  SERVER: 4000,
} as const;

export const PRANK_SYNC_CHANNEL = 'PRANK_TARGET_SYNC_BUS';

export const PERFORMANCE_3D_LIMITS = {
  STAGE_WIDTH: 720,
  STAGE_HEIGHT: 1280,
  TARGET_FPS: 30,
  FRAME_INTERVAL_MS: 1000 / 30, // 33.33ms
  MAX_PARTICLES: 60,
  MAX_PROJECTILES: 6,
  MAX_ATTACHMENTS: 8,
  MAX_DECALS: 8,
  ATTACHMENT_LIFETIME_MS: 10000, // 8-12 seconds
  DEFAULT_DECAL_LIFETIME_MS: 10000,
  CHAT_COOLDOWN_PER_USER_MS: 2500, // 2.5s per userId anti-spam
  LIKE_BATCH_INTERVAL_MS: 200,
} as const;

export const PERFORMANCE_LIMITS = PERFORMANCE_3D_LIMITS;

export const RAGE_THRESHOLDS = {
  CHILL_MAX: 30,
  ANNOYED_MAX: 70,
  FURIOUS_MAX: 99,
  MELTDOWN_TRIGGER: 100,
  MELTDOWN_RESET_VALUE: 0, // Reset to 0% as per Section 3
  MELTDOWN_DURATION_MS: 3000,
  INACTIVITY_DECAY_DELAY_MS: 4000,
  DECAY_RATE_PER_SEC: 1.5,
} as const;

export const DEFAULT_KEYWORD_MAP: Record<PrankActionType, string[]> = {
  EGG: ['egg', 'trung', 'trứng', '1'],
  WIND: ['wind', 'gio', 'gió', '2'],
  CAKE: ['cake', 'banh', 'bánh', '3'],
  BALL: ['ball', 'bong', 'bóng', '4'],
  MILK: ['milk', 'sua', 'sữa', '5'],
  TAUNT: ['wtf', 'haha', 'lol', 'kaka'],
  SURPRISE: ['surprise', 'box', 'gift', 'qua', 'quà'],
};

// 3 Left Badges: EGG, CAKE, MILK
export const BADGE_ITEMS_LEFT: ActionBadgeConfig[] = [
  {
    id: 'badge-egg',
    action: 'EGG',
    icon: '🥚',
    labelEn: 'EGG',
    labelVi: 'TRỨNG',
    subTextEn: '"egg" / 1',
    subTextVi: '"trung" / 1',
    requiredCoins: 1,
    keywords: DEFAULT_KEYWORD_MAP.EGG,
  },
  {
    id: 'badge-cake',
    action: 'CAKE',
    icon: '🎂',
    labelEn: 'CAKE',
    labelVi: 'ÚP BÁNH',
    subTextEn: '"cake" / 3',
    subTextVi: '"banh" / 3',
    requiredCoins: 3,
    keywords: DEFAULT_KEYWORD_MAP.CAKE,
  },
  {
    id: 'badge-milk',
    action: 'MILK',
    icon: '🥛',
    labelEn: 'MILK',
    labelVi: 'TẠT SỮA',
    subTextEn: '"milk" / 2',
    subTextVi: '"sua" / 2',
    requiredCoins: 2,
    keywords: DEFAULT_KEYWORD_MAP.MILK,
  },
];

// 3 Right Badges: WIND, BALL, SURPRISE
export const BADGE_ITEMS_RIGHT: ActionBadgeConfig[] = [
  {
    id: 'badge-wind',
    action: 'WIND',
    icon: '💨',
    labelEn: 'WIND',
    labelVi: 'THỔI GIÓ',
    subTextEn: '"wind" / 1',
    subTextVi: '"gio" / 1',
    requiredCoins: 1,
    keywords: DEFAULT_KEYWORD_MAP.WIND,
  },
  {
    id: 'badge-ball',
    action: 'BALL',
    icon: '🏀',
    labelEn: 'BALL',
    labelVi: 'NÉM BÓNG',
    subTextEn: '"ball" / 2',
    subTextVi: '"bong" / 2',
    requiredCoins: 2,
    keywords: DEFAULT_KEYWORD_MAP.BALL,
  },
  {
    id: 'badge-surprise',
    action: 'SURPRISE',
    icon: '🎁',
    labelEn: 'SURPRISE',
    labelVi: 'BẤT NGỜ',
    subTextEn: '5+ Coins',
    subTextVi: '5+ Xu',
    requiredCoins: 5,
    keywords: DEFAULT_KEYWORD_MAP.SURPRISE,
  },
];
