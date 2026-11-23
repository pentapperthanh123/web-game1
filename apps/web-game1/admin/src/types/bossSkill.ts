export type BossSkillMode = 'RANDOM_WEIGHTED' | 'RANDOM_EQUAL' | 'ROTATION';

/** Boss escalates through 3 phases as its HP drops. */
export type BossPhase = 1 | 2 | 3;

/** Shared VFX archetypes; every skill maps to one and parameterises it by colour/scale. */
export const BOSS_SKILL_VFX = {
  PROJECTILE_ARC: 'PROJECTILE_ARC',
  GROUND_SPIKES: 'GROUND_SPIKES',
  CRESCENT_SWEEP: 'CRESCENT_SWEEP',
  LIGHTNING_STRIKE: 'LIGHTNING_STRIKE',
  METEOR_RAIN: 'METEOR_RAIN',
  BEAM: 'BEAM',
  VORTEX: 'VORTEX',
  VOID_MAELSTROM: 'VOID_MAELSTROM',
  CHARGE_DASH: 'CHARGE_DASH',
  SEISMIC_SLAM: 'SEISMIC_SLAM',
  NOVA: 'NOVA',
  CHAIN_LIGHTNING: 'CHAIN_LIGHTNING',
} as const;

export type BossSkillVfxType = (typeof BOSS_SKILL_VFX)[keyof typeof BOSS_SKILL_VFX];

export const BOSS_STATUS_EFFECT = {
  BURN: 'BURN',
  POISON: 'POISON',
  STUN: 'STUN',
  WEAKEN: 'WEAKEN',
  LIFESTEAL: 'LIFESTEAL',
} as const;

export type BossStatusEffectType = (typeof BOSS_STATUS_EFFECT)[keyof typeof BOSS_STATUS_EFFECT];

/** Power class of a skill: its position in the boss's list (1st-3rd regular skill, then the ultimate). */
export const BOSS_SKILL_TIER = {
  LIGHT: 'LIGHT',
  MEDIUM: 'MEDIUM',
  HEAVY: 'HEAVY',
  ULTIMATE: 'ULTIMATE',
} as const;

export type BossSkillTier = (typeof BOSS_SKILL_TIER)[keyof typeof BOSS_SKILL_TIER];

export interface BossSkillVfxLayer {
  vfxType: BossSkillVfxType;
  delayMs?: number;
  count?: number;
  scale?: number;
  color?: string;
  secondaryColor?: string;
}

export interface BossSkillVfxParams {
  secondaryColor?: string;
  count?: number;
  scale?: number;
  durationScale?: number;
  isMouthBreath?: boolean;
  layers?: readonly BossSkillVfxLayer[];
}

export interface BossSkillStatusEffect {
  type: BossStatusEffectType;
  durationMs: number;
  /** BURN / POISON: total damage as a share of the hit that applied it. */
  dotRatio?: number;
  ratio?: number;
}

export interface BossSkillEffectProfile {
  vfxType: BossSkillVfxType;
  vfxParams?: BossSkillVfxParams;
  statusEffect?: BossSkillStatusEffect;
  minPhase?: BossPhase;
}

export interface BossSkillBase {
  id: string;
  name: string;
  vietnameseName: string;
  iconName: string;
  baseDamage: number;
  targetCount: number; // 1, 3, 5, or 999 (all)
  isUltimate: boolean;
  color: string;
  description: string;
}

export type BossSkillDefinition = BossSkillBase & BossSkillEffectProfile & { tier: BossSkillTier };

export interface BossSkillConfig {
  autoAttackEnabled: boolean;
  intervalMs: number;
  damageMultiplier: number;
  mode: BossSkillMode;
  randomIntervalEnabled: boolean;
  /** When true the ultimate stays locked until phase 2. */
  phaseLockEnabled: boolean;
}
