import { BOSS_SKILL_TIER, BOSS_SKILL_VFX, BossPhase, BossSkillDefinition, BossSkillTier, BossSkillVfxType } from '../types/bossSkill';

/**
 * Mirrors client/src/constants/bossSkillBalance.ts (the admin portal is a separate app): the same
 * numbers, so the preview and the balance table show what the overlay really does. Keep both in sync.
 */

export const BOSS_SKILL_TIER_BASE_DAMAGE: Readonly<Record<BossSkillTier, number>> = {
  [BOSS_SKILL_TIER.LIGHT]: 25,
  [BOSS_SKILL_TIER.MEDIUM]: 45,
  [BOSS_SKILL_TIER.HEAVY]: 70,
  [BOSS_SKILL_TIER.ULTIMATE]: 100,
};

const BOSS_SKILL_REGULAR_TIERS: readonly BossSkillTier[] = [
  BOSS_SKILL_TIER.LIGHT,
  BOSS_SKILL_TIER.MEDIUM,
  BOSS_SKILL_TIER.HEAVY,
];

export const resolveSkillTier = (regularIndex: number, isUltimate: boolean): BossSkillTier => {
  if (isUltimate) return BOSS_SKILL_TIER.ULTIMATE;
  return BOSS_SKILL_REGULAR_TIERS[Math.min(regularIndex, BOSS_SKILL_REGULAR_TIERS.length - 1)];
};

export const DEFAULT_SKILL_DAMAGE_MULTIPLIER = 0.45;
export const LEGACY_SKILL_DAMAGE_MULTIPLIER = 0.25;

export const BOSS_SKILL_CROWD_SHARE: Readonly<Record<BossSkillTier, number>> = {
  [BOSS_SKILL_TIER.LIGHT]: 0.05,
  [BOSS_SKILL_TIER.MEDIUM]: 0.12,
  [BOSS_SKILL_TIER.HEAVY]: 0.25,
  [BOSS_SKILL_TIER.ULTIMATE]: 1,
};

export const BOSS_SKILL_DOT_RATIO = {
  LIGHT: 0.4,
  MEDIUM: 0.6,
  HEAVY: 0.8,
} as const;

export const BOSS_LIFESTEAL_CAP_RATIO = 0.03;
const ALL_TARGETS_COUNT = 999;
const ENRAGED_DAMAGE_BOOST = 1.5;
const PHASE_3_DAMAGE_MULTIPLIER = 1.2;
const PHASE_3_STATUS_DURATION_MULTIPLIER = 1.5;
const CHAMPION_MAX_HP = 100;
const TWO_WINGS = 2;

/** Per-theme `skillDamageMultiplier` (client BOSS_DIFFICULTY_SCALE). */
export const BOSS_DIFFICULTY_SKILL_DAMAGE: Readonly<Record<string, number>> = {
  XU_GIA: 0.75,
  RONG_NUI: 0.9,
  RONG_GIA: 1,
  ELDER_DRAGON: 1,
  BARON: 1,
  VOID_TITAN: 1.2,
};
const DEFAULT_DIFFICULTY = 1;

export const getThemeDamageDifficulty = (theme: string): number =>
  BOSS_DIFFICULTY_SKILL_DAMAGE[theme] ?? DEFAULT_DIFFICULTY;

export interface SkillDamageScaleInput {
  damageMultiplier: number;
  difficultyMultiplier: number;
  phase: BossPhase;
  isEnraged: boolean;
}

export const resolveSkillDamageScale = ({
  damageMultiplier,
  difficultyMultiplier,
  phase,
  isEnraged,
}: SkillDamageScaleInput): number => {
  const rageBoost = isEnraged ? ENRAGED_DAMAGE_BOOST : 1;
  const phaseBoost = phase === 3 ? PHASE_3_DAMAGE_MULTIPLIER : 1;
  return damageMultiplier * difficultyMultiplier * rageBoost * phaseBoost;
};

export const resolveSkillHitDamage = (baseDamage: number, damageScale: number): number =>
  Math.max(1, Math.round(baseDamage * damageScale));

export const resolveDotTotalDamage = (hitDamage: number, dotRatio: number): number =>
  Math.max(1, Math.round(hitDamage * dotRatio));

const SIDE_VFX: ReadonlySet<BossSkillVfxType> = new Set([
  BOSS_SKILL_VFX.PROJECTILE_ARC,
  BOSS_SKILL_VFX.LIGHTNING_STRIKE,
  BOSS_SKILL_VFX.BEAM,
  BOSS_SKILL_VFX.CRESCENT_SWEEP,
  BOSS_SKILL_VFX.CHARGE_DASH,
  BOSS_SKILL_VFX.CHAIN_LIGHTNING,
]);

/** Champions inside the area a skill hurts: the attacked wing for one-sided effects, else everyone. */
export const resolveAreaChampionCount = (skill: BossSkillDefinition, totalChampions: number): number => {
  if (skill.isUltimate) return totalChampions;
  const isOneSided = SIDE_VFX.has(skill.vfxType);
  return isOneSided ? Math.ceil(totalChampions / TWO_WINGS) : totalChampions;
};

export const resolveSkillTargetCount = (skill: BossSkillDefinition, areaChampionCount: number): number => {
  if (skill.isUltimate || skill.targetCount >= ALL_TARGETS_COUNT) return areaChampionCount;
  const crowdTargets = Math.ceil(areaChampionCount * BOSS_SKILL_CROWD_SHARE[skill.tier]);
  return Math.min(areaChampionCount, Math.max(skill.targetCount, crowdTargets));
};

export interface SkillBalanceRow {
  skill: BossSkillDefinition;
  /** HP a champion loses to the hit, in the calmest and the harshest conditions. */
  hitDamageCalm: number;
  hitDamageWorst: number;
  /** Burn / poison total on top of the hit (0 when the skill has none). */
  dotTotalCalm: number;
  dotTotalWorst: number;
  /** Champions hit for each crowd size. */
  targetsByCrowd: readonly number[];
}

/** Crowd sizes the balance table is computed for (total champions on the arena). */
export const BALANCE_TABLE_CROWD_SIZES: readonly number[] = [10, 50, 200];

const dotRatioOf = (skill: BossSkillDefinition): number => skill.statusEffect?.dotRatio ?? 0;

/** One row per skill of a boss: damage (calm → worst: phase 3 + enraged), DOT and targets per crowd. */
export const buildSkillBalanceRows = (
  skills: readonly BossSkillDefinition[],
  theme: string,
  damageMultiplier: number
): SkillBalanceRow[] => {
  const difficultyMultiplier = getThemeDamageDifficulty(theme);
  const calmScale = resolveSkillDamageScale({ damageMultiplier, difficultyMultiplier, phase: 1, isEnraged: false });
  const worstScale = resolveSkillDamageScale({ damageMultiplier, difficultyMultiplier, phase: 3, isEnraged: true });
  return skills.map((skill) => {
    const hitDamageCalm = resolveSkillHitDamage(skill.baseDamage, calmScale);
    const hitDamageWorst = resolveSkillHitDamage(skill.baseDamage, worstScale);
    const ratio = dotRatioOf(skill);
    return {
      skill,
      hitDamageCalm,
      hitDamageWorst,
      dotTotalCalm: ratio > 0 ? resolveDotTotalDamage(hitDamageCalm, ratio) : 0,
      dotTotalWorst: ratio > 0 ? resolveDotTotalDamage(hitDamageWorst, ratio) : 0,
      targetsByCrowd: BALANCE_TABLE_CROWD_SIZES.map((crowd) =>
        resolveSkillTargetCount(skill, resolveAreaChampionCount(skill, crowd))
      ),
    };
  });
};

/** Share of a champion's HP, for display. */
export const toChampionHpPercent = (damage: number): number => Math.round((damage / CHAMPION_MAX_HP) * 100);

export { PHASE_3_STATUS_DURATION_MULTIPLIER };
