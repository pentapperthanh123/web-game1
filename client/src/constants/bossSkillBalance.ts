import { BOSS_SKILL_TIER, BossPhase, BossSkillDefinition, BossSkillTier } from '../types/bossSkill';
import { BOSS_ENRAGED_CONSTANTS } from './game';
import { getBossPhaseRule } from './bossPhases';
import { STATUS_EFFECT_CONSTANTS } from './bossStatusEffects';
import { BOSS_SKILL_HIT_RULES } from './bossSkillVfx';

/**
 * One damage scale for every boss: a skill's strength comes from its position in the list
 * (light / medium / heavy / ultimate); only the theme difficulty makes one boss tougher than another.
 * Champions have 100 HP, so with the default multiplier a light skill takes about 11 HP.
 */
export const BOSS_SKILL_TIER_BASE_DAMAGE: Readonly<Record<BossSkillTier, number>> = {
  [BOSS_SKILL_TIER.LIGHT]: 25,
  [BOSS_SKILL_TIER.MEDIUM]: 45,
  [BOSS_SKILL_TIER.HEAVY]: 70,
  [BOSS_SKILL_TIER.ULTIMATE]: 100,
};

/** Regular skills take their tier from their position; the ultimate is always the last tier. */
export const BOSS_SKILL_REGULAR_TIERS: readonly BossSkillTier[] = [
  BOSS_SKILL_TIER.LIGHT,
  BOSS_SKILL_TIER.MEDIUM,
  BOSS_SKILL_TIER.HEAVY,
];

export const resolveSkillTier = (regularIndex: number, isUltimate: boolean): BossSkillTier => {
  if (isUltimate) return BOSS_SKILL_TIER.ULTIMATE;
  return BOSS_SKILL_REGULAR_TIERS[Math.min(regularIndex, BOSS_SKILL_REGULAR_TIERS.length - 1)];
};

/** Admin multiplier a fresh install starts with ("medium" danger); the old default made bosses harmless. */
export const DEFAULT_SKILL_DAMAGE_MULTIPLIER = 0.45;
/** Default of older builds: a stored value equal to it was never chosen on purpose and is upgraded. */
export const LEGACY_SKILL_DAMAGE_MULTIPLIER = 0.25;

/**
 * Share of the area's champions a skill hits at least, so a crowd of 200 is not hit like a crowd of 10.
 * `targetCount` stays the minimum; the ultimate hits everyone.
 */
export const BOSS_SKILL_CROWD_SHARE: Readonly<Record<BossSkillTier, number>> = {
  [BOSS_SKILL_TIER.LIGHT]: 0.05,
  [BOSS_SKILL_TIER.MEDIUM]: 0.12,
  [BOSS_SKILL_TIER.HEAVY]: 0.25,
  [BOSS_SKILL_TIER.ULTIMATE]: 1,
};

/** Burn / poison total damage as a share of the hit that applied it. */
export const BOSS_SKILL_DOT_RATIO = {
  LIGHT: 0.4,
  MEDIUM: 0.6,
  HEAVY: 0.8,
} as const;

export const BOSS_LIFESTEAL_CAP = {
  /** One cast (all its waves together) heals the boss by at most this share of its max HP. */
  MAX_BOSS_HP_RATIO: 0.03,
} as const;

/** Ultimates built from several layers deal their damage in waves that land with each layer. */
export const BOSS_ULTIMATE_WAVES = {
  /** Damage share of the main layer; the layers after it split the rest evenly. */
  MAIN_WAVE_SHARE: 0.4,
  /** Floating damage numbers per wave; the rest of the champions only flinch (crowds of 300). */
  MAX_HIT_NUMBERS_PER_WAVE: 40,
} as const;

export interface SkillDamageScaleInput {
  /** Admin multiplier (BossSkillConfig.damageMultiplier). */
  damageMultiplier: number;
  /** BOSS_DIFFICULTY_SCALE[theme].skillDamageMultiplier. */
  difficultyMultiplier: number;
  phase: BossPhase;
  isEnraged: boolean;
}

/** Everything that scales a skill's damage except its own base value. */
export const resolveSkillDamageScale = ({
  damageMultiplier,
  difficultyMultiplier,
  phase,
  isEnraged,
}: SkillDamageScaleInput): number => {
  const rageBoost = isEnraged ? BOSS_ENRAGED_CONSTANTS.DAMAGE_BOOST_MULTIPLIER : 1;
  return damageMultiplier * difficultyMultiplier * rageBoost * getBossPhaseRule(phase).skillDamageMultiplier;
};

export const resolveSkillHitDamage = (baseDamage: number, damageScale: number): number =>
  Math.max(1, Math.round(baseDamage * damageScale));

/** Whole-effect burn / poison damage for one hit. */
export const resolveDotTotalDamage = (hitDamage: number, dotRatio: number): number =>
  Math.max(1, Math.round(hitDamage * dotRatio));

/**
 * Damage per tick. Phase 3 stretches the effect, so the total is spread over more ticks instead of
 * growing with the duration.
 */
export const resolveDotTickDamage = (hitDamage: number, dotRatio: number, durationMs: number): number => {
  const tickCount = Math.max(1, Math.floor(durationMs / STATUS_EFFECT_CONSTANTS.DOT_TICK_INTERVAL_MS));
  return Math.max(1, Math.round(resolveDotTotalDamage(hitDamage, dotRatio) / tickCount));
};

/** How many champions of the hit area the skill reaches (area = attacked wing, or everyone for centre/arena). */
export const resolveSkillTargetCount = (
  skill: Pick<BossSkillDefinition, 'tier' | 'targetCount' | 'isUltimate'>,
  areaChampionCount: number
): number => {
  const isHitAll = skill.isUltimate || skill.targetCount >= BOSS_SKILL_HIT_RULES.ALL_TARGETS_COUNT;
  if (isHitAll) return areaChampionCount;
  const crowdTargets = Math.ceil(areaChampionCount * BOSS_SKILL_CROWD_SHARE[skill.tier]);
  return Math.min(areaChampionCount, Math.max(skill.targetCount, crowdTargets));
};
