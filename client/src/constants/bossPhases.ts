import { BossPhase } from '../types/bossSkill';
import { BOSS_MECHANICS_CONSTANTS } from './game';

export interface BossPhaseRule {
  /** Probability of picking the ultimate in RANDOM_WEIGHTED mode. */
  ultimateChance: number;
  /** Ultimate cannot be cast in this phase while `phaseLockEnabled` is on. */
  isUltimateLocked: boolean;
  skillDamageMultiplier: number;
  /** Multiplies the auto-cast interval (< 1 = faster). */
  intervalMultiplier: number;
  statusDurationMultiplier: number;
  labelVi: string;
  labelEn: string;
}

export const BOSS_PHASE = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
} as const satisfies Record<string, BossPhase>;

export const BOSS_PHASE_RULES: Readonly<Record<BossPhase, BossPhaseRule>> = {
  1: {
    ultimateChance: 0.1,
    isUltimateLocked: true,
    skillDamageMultiplier: 1,
    intervalMultiplier: 1,
    statusDurationMultiplier: 1,
    labelVi: 'Giai đoạn 1',
    labelEn: 'Phase 1',
  },
  2: {
    ultimateChance: 0.1,
    isUltimateLocked: false,
    skillDamageMultiplier: 1,
    intervalMultiplier: 1,
    statusDurationMultiplier: 1,
    labelVi: 'Giai đoạn 2 · Thức tỉnh',
    labelEn: 'Phase 2 · Awakened',
  },
  3: {
    ultimateChance: 0.25,
    isUltimateLocked: false,
    skillDamageMultiplier: 1.2,
    intervalMultiplier: 0.8,
    statusDurationMultiplier: 1.5,
    labelVi: 'Giai đoạn 3 · Tận thế',
    labelEn: 'Phase 3 · Cataclysm',
  },
};

/** Base odds for skills 1-3 in RANDOM_WEIGHTED mode; the leftover goes to the ultimate. */
export const BOSS_SKILL_BASE_WEIGHTS = [4, 3, 2] as const;

export const BOSS_PHASE_SHIFT_BANNER_MS = 2800;

/** Same thresholds as the armour-crack visuals, so gameplay and art escalate together. */
export const resolveBossPhase = (bossHp: number, bossMaxHp: number): BossPhase => {
  if (bossMaxHp <= 0) return BOSS_PHASE.ONE;
  const ratio = bossHp / bossMaxHp;
  if (ratio <= BOSS_MECHANICS_CONSTANTS.PHASES.PHASE_3_THRESHOLD_PERCENT) return BOSS_PHASE.THREE;
  if (ratio <= BOSS_MECHANICS_CONSTANTS.PHASES.PHASE_2_THRESHOLD_PERCENT) return BOSS_PHASE.TWO;
  return BOSS_PHASE.ONE;
};

export const getBossPhaseRule = (phase: BossPhase): BossPhaseRule => BOSS_PHASE_RULES[phase];
