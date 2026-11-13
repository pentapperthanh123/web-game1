import { GIFT_TIER, GIFT_TIER_CONFIG, GiftTier, GiftTierConfig } from '../constants/game';

/** Tiers from highest to lowest so the first match wins. */
const TIERS_DESCENDING: readonly GiftTier[] = [GIFT_TIER.MEGA, GIFT_TIER.BIG, GIFT_TIER.MEDIUM, GIFT_TIER.SMALL];

const resolveTierByCoins = (coins: number): GiftTier =>
  TIERS_DESCENDING.find((candidate) => coins >= GIFT_TIER_CONFIG[candidate].minCoins) ?? GIFT_TIER.SMALL;

/**
 * One source of truth for "how big is this gift". A streak escalates only on the tick whose running
 * total crosses a tier threshold (ten 100-coin roses -> MEGA on the tenth tick, once); the ticks after
 * that fall back to the gift's own value so MEGA cards and boss stagger do not repeat every tick.
 */
export const resolveGiftTier = (coins: number, totalCoins: number): GiftTier => {
  const ownTier = resolveTierByCoins(coins);
  const totalTier = resolveTierByCoins(totalCoins);
  const previousTotalTier = resolveTierByCoins(Math.max(0, totalCoins - coins));
  const hasCrossedThreshold = totalTier !== previousTotalTier;
  if (!hasCrossedThreshold) return ownTier;
  return getGiftTierRank(totalTier) > getGiftTierRank(ownTier) ? totalTier : ownTier;
};

export const getGiftTierConfig = (tier: GiftTier): GiftTierConfig => GIFT_TIER_CONFIG[tier];

/** Rank for comparisons (MEGA > BIG > MEDIUM > SMALL). */
export const getGiftTierRank = (tier: GiftTier): number => TIERS_DESCENDING.length - TIERS_DESCENDING.indexOf(tier);

export const isGiftTierAtLeast = (tier: GiftTier, minimum: GiftTier): boolean =>
  getGiftTierRank(tier) >= getGiftTierRank(minimum);
