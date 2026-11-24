import { GIFT_TIER_COINS } from '../../../shared/constants/clashConfig';
import type { PushMultipliers, PushTier } from '../../../shared/types/clash';

/** Gift tier from the total coins of one gift event (coin value × repeat count). */
export function resolveGiftTier(totalCoins: number): PushTier {
  if (totalCoins >= GIFT_TIER_COINS.LARGE) return 'LARGE';
  if (totalCoins >= GIFT_TIER_COINS.MEDIUM) return 'MEDIUM';
  return 'SMALL';
}

/** Push % for a gift event: proportional to coins (no cap), rounded to 0.1. */
export function resolveGiftPushPercent(totalCoins: number, multipliers: PushMultipliers): number {
  return Math.round(Math.max(1, totalCoins) * multipliers.giftPushPerCoin * 10) / 10;
}

/** Emoji stand-ins for common TikTok gifts (the live event carries no gift image). */
const GIFT_ICONS: Record<string, string> = {
  rose: '🌹',
  tiktok: '🎵',
  'finger heart': '🫰',
  'hand heart': '🫶',
  'heart me': '💗',
  heart: '❤️',
  'love you': '💕',
  doughnut: '🍩',
  'ice cream cone': '🍦',
  coffee: '☕',
  gg: '🎮',
  perfume: '🧴',
  cap: '🧢',
  sunglasses: '🕶️',
  'mirror ball': '🪩',
  'hand wave': '👋',
  corgi: '🐶',
  panda: '🐼',
  swan: '🦢',
  rainbow: '🌈',
  fireworks: '🎆',
  crown: '👑',
  hat: '🎩',
  diamond: '💎',
  'money gun': '💸',
  rocket: '🚀',
  'sports car': '🏎️',
  train: '🚂',
  galaxy: '🌌',
  lion: '🦁',
  universe: '🪐',
  star: '⭐',
};

const TIER_FALLBACK_ICONS: Record<PushTier, string> = {
  SMALL: '🎁',
  MEDIUM: '💝',
  LARGE: '💎',
};

export function resolveGiftIcon(giftName: string, tier: PushTier): string {
  return GIFT_ICONS[normalizeGiftName(giftName)] ?? TIER_FALLBACK_ICONS[tier];
}

export type GiftMenuKey = 'rose' | 'fingerHeart' | 'doughnut';

export interface GiftMenuItem {
  key: GiftMenuKey;
  /** Lower-case TikTok gift name used to match incoming gift events. */
  matchName: string;
  icon: string;
  coins: number;
  tier: PushTier;
}

/** One reference gift per push tier, always listed in the gift panel (grey until received). */
export const GIFT_MENU: readonly GiftMenuItem[] = [
  { key: 'rose', matchName: 'rose', icon: '🌹', coins: 1, tier: 'SMALL' },
  { key: 'fingerHeart', matchName: 'finger heart', icon: '🫰', coins: 5, tier: 'MEDIUM' },
  { key: 'doughnut', matchName: 'doughnut', icon: '🍩', coins: 30, tier: 'LARGE' },
];

export function normalizeGiftName(giftName: string): string {
  return giftName.trim().toLowerCase();
}
