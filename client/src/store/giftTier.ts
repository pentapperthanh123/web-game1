import { GIFT_DURATION_SCALING, GIFT_TIER, GIFT_TIER_CONFIG, GiftTier, GiftTierConfig } from '../constants/game';

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

/**
 * Calculates dynamic banner duration based on tier and coins.
 * For gifts >= 1000 coins, the bigger the reward, the longer the celebration banner stays on screen.
 */
export const resolveBannerDurationMs = (tier: GiftTier, coins = 0): number => {
  const baseDuration = GIFT_TIER_CONFIG[tier].bannerDurationMs;
  if (tier !== GIFT_TIER.MEGA || coins <= 1000) {
    return baseDuration;
  }
  const extraCoins = coins - 1000;
  const extraTime = Math.floor(extraCoins / 1000) * GIFT_DURATION_SCALING.MS_PER_1000_COINS;
  return Math.min(
    GIFT_DURATION_SCALING.MAX_BANNER_DURATION_MS,
    GIFT_DURATION_SCALING.MEGA_BASE_MS + extraTime
  );
};

/** Rank for comparisons (MEGA > BIG > MEDIUM > SMALL). */
export const getGiftTierRank = (tier: GiftTier): number => TIERS_DESCENDING.length - TIERS_DESCENDING.indexOf(tier);

export const isGiftTierAtLeast = (tier: GiftTier, minimum: GiftTier): boolean =>
  getGiftTierRank(tier) >= getGiftTierRank(minimum);
