/**
 * Tuning for the tiered gift celebration (DOM cards, 3D fireworks / fountains, layered sound).
 * Rule of thumb: every step up (SMALL → MEDIUM → BIG → MEGA → MEGA grades) adds a layer, never removes one.
 */

import { GIFT_TIER, GiftTier } from './game';
import { SFX_EVENT, SfxEventName } from './sfx';

/** MEGA gifts keep growing above 1,000 coins: each grade adds crowns, fireworks, confetti and meteors. */
export const GIFT_MEGA_GRADE = {
  ROYAL: 'ROYAL',
  MYTHIC: 'MYTHIC',
  LEGEND: 'LEGEND',
} as const;
export type GiftMegaGrade = (typeof GIFT_MEGA_GRADE)[keyof typeof GIFT_MEGA_GRADE];

export interface GiftMegaGradeConfig {
  minCoins: number;
  /** Crowns on each side of the crest. */
  crownCount: number;
  confettiCount: number;
  fireworkShellCount: number;
  /** Extra meteors on top of the MEGA tier's own count. */
  bonusMeteorCount: number;
  /** Multiplier on the 3D sky beam / floor rings. */
  beamScale: number;
  crestKey: string;
  crestFallback: string;
}

export const GIFT_MEGA_GRADE_CONFIG: Readonly<Record<GiftMegaGrade, GiftMegaGradeConfig>> = {
  [GIFT_MEGA_GRADE.ROYAL]: {
    minCoins: 199,
    crownCount: 1,
    confettiCount: 28,
    fireworkShellCount: 4,
    bonusMeteorCount: 0,
    beamScale: 1,
    crestKey: 'Gift.megaCrest',
    crestFallback: 'ĐẠI GIA {{team}}',
  },
  [GIFT_MEGA_GRADE.MYTHIC]: {
    minCoins: 500,
    crownCount: 2,
    confettiCount: 40,
    fireworkShellCount: 6,
    bonusMeteorCount: 6,
    beamScale: 1.2,
    crestKey: 'Gift.mythicCrest',
    crestFallback: 'SIÊU ĐẠI GIA {{team}}',
  },
  [GIFT_MEGA_GRADE.LEGEND]: {
    minCoins: 1000,
    crownCount: 3,
    confettiCount: 56,
    fireworkShellCount: 9,
    bonusMeteorCount: 12,
    beamScale: 1.4,
    crestKey: 'Gift.legendCrest',
    crestFallback: 'HUYỀN THOẠI {{team}}',
  },
};

/** Highest first so the first match wins. */
export const GIFT_MEGA_GRADES_DESCENDING: readonly GiftMegaGrade[] = [
  GIFT_MEGA_GRADE.LEGEND,
  GIFT_MEGA_GRADE.MYTHIC,
  GIFT_MEGA_GRADE.ROYAL,
];

export const GIFT_CELEBRATION_COLORS = {
  GOLD: '#fbbf24',
  GOLD_LIGHT: '#fde68a',
  WHITE: '#ffffff',
  CYAN: '#22d3ee',
  ROSE: '#fb7185',
} as const;

/** DOM sparkle stars that pop out of a gift card (per tier). */
export const GIFT_SPARKLE_COUNT: Readonly<Record<GiftTier, number>> = {
  [GIFT_TIER.SMALL]: 0,
  [GIFT_TIER.MEDIUM]: 6,
  [GIFT_TIER.BIG]: 12,
  [GIFT_TIER.MEGA]: 18,
};

export const GIFT_BIG_CONFETTI_COUNT = 18;

/** 3D firework shells above the arena. BIG gets a couple, MEGA gets its grade's count. */
export const GIFT_FIREWORK = {
  BIG_SHELL_COUNT: 2,
  MAX_SHELL_COUNT: 9,
  SPARKS_PER_SHELL: 36,
  FIRST_SHELL_DELAY_MS: 350,
  SHELL_INTERVAL_MS: 380,
  SHELL_LIFE_MS: 1250,
  BURST_RADIUS: 1.25,
  /** How far sparks sag by the end of their life. */
  DROOP: 0.55,
  SPARK_SIZE: 0.035,
  CENTER_X_SPREAD: 1.8,
  CENTER_Y_MIN: 1.7,
  CENTER_Y_SPREAD: 2.5,
  CENTER_Z: -0.4,
} as const;

/** 3D spark fountain at the donor's team wing: more sparks, faster and taller with each tier. */
export interface GiftFountainConfig {
  sparkCount: number;
  speedScale: number;
}

export const GIFT_FOUNTAIN_MAX_SPARKS = 120;

export const GIFT_FOUNTAIN_CONFIG: Readonly<Partial<Record<GiftTier, GiftFountainConfig>>> = {
  [GIFT_TIER.MEDIUM]: { sparkCount: 40, speedScale: 1 },
  [GIFT_TIER.BIG]: { sparkCount: 80, speedScale: 1.2 },
  [GIFT_TIER.MEGA]: { sparkCount: GIFT_FOUNTAIN_MAX_SPARKS, speedScale: 1.45 },
};

export interface GiftSoundLayer {
  event: SfxEventName;
  delayMs: number;
  volumeScale: number;
  rateScale: number;
}

/**
 * Layered sound per tier: each tier keeps a signature sound and stacks sparkle / impact / orchestra
 * layers on top, so a bigger gift is audibly richer, not just louder.
 */
export const GIFT_SOUND_LAYERS: Readonly<Record<GiftTier, readonly GiftSoundLayer[]>> = {
  [GIFT_TIER.SMALL]: [{ event: SFX_EVENT.SCORE_UP, delayMs: 0, volumeScale: 1, rateScale: 1 }],
  [GIFT_TIER.MEDIUM]: [
    { event: SFX_EVENT.GIFT_MEDIUM, delayMs: 0, volumeScale: 1, rateScale: 1 },
    { event: SFX_EVENT.SCORE_UP, delayMs: 140, volumeScale: 0.7, rateScale: 1.2 },
  ],
  [GIFT_TIER.BIG]: [
    { event: SFX_EVENT.BIG_DONATE, delayMs: 0, volumeScale: 1, rateScale: 1 },
    { event: SFX_EVENT.GIFT_MEDIUM, delayMs: 160, volumeScale: 0.9, rateScale: 1.1 },
    { event: SFX_EVENT.COMBO_LEVEL_UP, delayMs: 380, volumeScale: 0.75, rateScale: 1 },
  ],
  [GIFT_TIER.MEGA]: [
    { event: SFX_EVENT.GIFT_MEGA, delayMs: 0, volumeScale: 1, rateScale: 1 },
    { event: SFX_EVENT.BIG_DONATE, delayMs: 0, volumeScale: 0.8, rateScale: 0.9 },
    { event: SFX_EVENT.GIFT_MEDIUM, delayMs: 220, volumeScale: 1, rateScale: 1.15 },
    { event: SFX_EVENT.COMBO_LEVEL_UP, delayMs: 620, volumeScale: 0.9, rateScale: 1 },
  ],
};

/** A growing streak climbs in pitch (slot-machine feel) for the small tiers. */
export const GIFT_STREAK_PITCH = {
  STEP_PER_STREAK: 0.03,
  MAX_RATE: 1.45,
} as const;
