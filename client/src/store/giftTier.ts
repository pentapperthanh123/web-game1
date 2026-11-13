import { GIFT_TIER, GIFT_TIER_CONFIG, GiftTier, GiftTierConfig } from '../constants/game';

/** Tiers from highest to lowest so the first match wins. */
const TIERS_DESCENDING: readonly GiftTier[] = [GIFT_TIER.MEGA, GIFT_TIER.BIG, GIFT_TIER.MEDIUM, GIFT_TIER.SMALL];

/**
 * One source of truth for "how big is this gift": a streak escalates by its running total,
 * so ten 100-coin roses reach MEGA on the tenth tick.
 */
export const resolveGiftTier = (coins: number, totalCoins: number): GiftTier => {
  const effectiveCoins = Math.max(coins, totalCoins);
  const tier = TIERS_DESCENDING.find((candidate) => effectiveCoins >= GIFT_TIER_CONFIG[candidate].minCoins);
  return tier ?? GIFT_TIER.SMALL;
};

export const getGiftTierConfig = (tier: GiftTier): GiftTierConfig => GIFT_TIER_CONFIG[tier];

/** Rank for comparisons (MEGA > BIG > MEDIUM > SMALL). */
export const getGiftTierRank = (tier: GiftTier): number => TIERS_DESCENDING.length - TIERS_DESCENDING.indexOf(tier);

export const isGiftTierAtLeast = (tier: GiftTier, minimum: GiftTier): boolean =>
  getGiftTierRank(tier) >= getGiftTierRank(minimum);
