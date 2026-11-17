import { GIFT_DURATION_SCALING, GIFT_TIER, GIFT_TIER_CONFIG, GiftTier, GiftTierConfig } from '../constants/game';
import {
  GIFT_FIREWORK,
  GIFT_MEGA_GRADE,
  GIFT_MEGA_GRADE_CONFIG,
  GIFT_MEGA_GRADES_DESCENDING,
  GiftMegaGrade,
  GiftMegaGradeConfig,
} from '../constants/giftPresentation';
import { GiftAnnouncement } from '../types/game';

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
 * Scales smoothly from MEGA baseline (199 coins) up to the 1000-coin LEGEND cap.
 */
export const resolveBannerDurationMs = (tier: GiftTier, coins = 0): number => {
  const config = GIFT_TIER_CONFIG[tier];
  if (tier !== GIFT_TIER.MEGA || coins <= config.minCoins) {
    return config.bannerDurationMs;
  }
  const maxCoins = GIFT_MEGA_GRADE_CONFIG.LEGEND.minCoins;
  const cappedCoins = Math.min(maxCoins, coins);
  const progress = (cappedCoins - config.minCoins) / Math.max(1, maxCoins - config.minCoins);
  const extraTime = Math.round(progress * (GIFT_DURATION_SCALING.MAX_BANNER_DURATION_MS - config.bannerDurationMs));
  return Math.min(GIFT_DURATION_SCALING.MAX_BANNER_DURATION_MS, config.bannerDurationMs + extraTime);
};

/** Rank for comparisons (MEGA > BIG > MEDIUM > SMALL). */
export const getGiftTierRank = (tier: GiftTier): number => TIERS_DESCENDING.length - TIERS_DESCENDING.indexOf(tier);

export const isGiftTierAtLeast = (tier: GiftTier, minimum: GiftTier): boolean =>
  getGiftTierRank(tier) >= getGiftTierRank(minimum);

/** Grade inside the MEGA tier: the celebration keeps growing with the coin value. */
export const resolveMegaGrade = (coins: number): GiftMegaGrade =>
  GIFT_MEGA_GRADES_DESCENDING.find((grade) => coins >= GIFT_MEGA_GRADE_CONFIG[grade].minCoins) ?? GIFT_MEGA_GRADE.ROYAL;

export const getMegaGradeConfig = (coins: number): GiftMegaGradeConfig => GIFT_MEGA_GRADE_CONFIG[resolveMegaGrade(coins)];

/** Coins a banner celebrates: the streak's running total when known, else the single gift. */
export const resolveAnnouncementCoins = (banner: GiftAnnouncement): number => banner.totalCoins ?? banner.coins ?? 0;

/**
 * A smaller gift must not cut a bigger celebration short: the running banner stays until its own
 * duration ends unless the incoming one is at least the same tier.
 */
export const pickGiftBanner = (
  current: GiftAnnouncement | null,
  incoming: GiftAnnouncement | null,
  now: number
): GiftAnnouncement | null => {
  if (!incoming) return current;
  if (!current) return incoming;
  const isCurrentBigger = getGiftTierRank(current.tier) > getGiftTierRank(incoming.tier);
  const currentEndsAt = current.timestamp + resolveBannerDurationMs(current.tier, resolveAnnouncementCoins(current));
  return isCurrentBigger && now < currentEndsAt ? current : incoming;
};

/** Firework shells for the gift: none below BIG, a couple for BIG, the grade's count for MEGA. */
export const resolveFireworkShellCount = (tier: GiftTier, coins: number): number => {
  if (tier === GIFT_TIER.MEGA) return getMegaGradeConfig(coins).fireworkShellCount;
  if (tier === GIFT_TIER.BIG) return GIFT_FIREWORK.BIG_SHELL_COUNT;
  return 0;
};
