import type { LiveStudioConfig, PortraitStyle } from '../types/studio';

export const STUDIO_PORTS = {
  CLIENT: 8020,
  ADMIN: 8021,
  GATEWAY: 5000,
  FALLBACK_SERVER: 4000,
} as const;

export const SYNC_CHANNEL_NAME = 'portrait_artist_3d_sync' as const;

export const TURN_TIMING_SEC = {
  WALK_IN: 3.0, // Model enters and takes seat while artist welcomes them on blank canvas before sketching starts
  REVEAL: 3.0,
  HANG_UP: 1.0,
  VIP_SPOTLIGHT_HOLD: 2.2,
  LIKE_SPEED_DECAY_DELAY: 4.0,
  MODEL_SPEECH_DURATION: 3.5,
  ARTIST_SPEECH_DURATION: 3.0,
  VIP_HAT_DURATION: 180, // 3 minutes
  PASSERBY_COOLDOWN: 6.0,
} as const;

export const PAINT_PROGRESS_THRESHOLDS = {
  SKETCH_PHASE_END: 0.25,
  COLOR_PHASE_END: 0.75,
  OVER_SHOULDER_START: 0.45,
  OVER_SHOULDER_END: 0.85,
  COMPLETE: 1.0,
} as const;

export const GIFT_TIER_COINS = {
  VIP_MIN: 1,
  STYLE_MIN: 5,
  TROLL_MIN: 10,
  OIL_GOLD_MIN: 20,
  ROYAL_VIP_MIN: 30,
} as const;

export const STUDIO_LIMITS = {
  MAX_VISIBLE_QUEUE: 6,
  MAX_GALLERY_FRAMES: 8,
  MAX_TOTAL_QUEUE_SIZE: 60,
  CANVAS_RESOLUTION: 512,
  TARGET_FPS: 30,
  AVATAR_CACHE_MAX: 32,
  MIN_PAINT_DURATION_SEC: 10,
  MAX_PAINT_DURATION_SEC: 40,
  MIN_SPEED_MULTIPLIER: 1.0,
  MAX_SPEED_MULTIPLIER: 3.5,
} as const;

export const DEFAULT_CHAT_KEYWORDS: readonly string[] = [
  'me',
  'vẽ',
  've',
  'em',
  'tui',
  'draw',
  'paint',
];

export const DEFAULT_LIVE_CONFIG: LiveStudioConfig = {
  locale: 'vi',
  studioName: 'Xưởng Vẽ Nắng Chiều',
  basePaintDurationSec: 20,
  likeSpeedBoostStep: 0.25,
  maxPaintSpeedMultiplier: 3.5,
  chatKeywords: [...DEFAULT_CHAT_KEYWORDS],
  autoChibiFallback: true,
  dynamicCameraEnabled: true,
  defaultStyle: 'sketch',
  micMode: false,
  avatarProxyUrl: '',
  communityLikeGoal: 500,
  gatewayUrl: `http://localhost:${STUDIO_PORTS.GATEWAY}`,
};

export const STYLE_LABELS: Record<PortraitStyle, { vi: string; en: string; badgeColor: string }> = {
  sketch: { vi: 'Phác Họa Chì', en: 'Pencil Sketch', badgeColor: '#64748b' },
  watercolor: { vi: 'Màu Nước', en: 'Watercolor', badgeColor: '#0ea5e9' },
  oil_gold: { vi: 'Sơn Dầu Vàng', en: 'Golden Oil', badgeColor: '#d97706' },
  troll: { vi: 'Vẽ Troll Hài', en: 'Troll Doodle', badgeColor: '#e11d48' },
};

/**
 * Resolves Tier-2 gift style deterministically by coin bracket:
 * 5-9 coins -> watercolor, 10-19 -> troll, 20-29 -> oil_gold.
 */
export function resolveTier2StyleByCoins(coins: number): PortraitStyle {
  if (coins >= GIFT_TIER_COINS.OIL_GOLD_MIN) return 'oil_gold';
  if (coins >= GIFT_TIER_COINS.TROLL_MIN) return 'troll';
  return 'watercolor';
}
