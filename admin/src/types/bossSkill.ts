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
  CHARGE_DASH: 'CHARGE_DASH',
  SEISMIC_SLAM: 'SEISMIC_SLAM',
  NOVA: 'NOVA',
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

export interface BossSkillVfxParams {
  secondaryColor?: string;
  count?: number;
  scale?: number;
}

export interface BossSkillStatusEffect {
  type: BossStatusEffectType;
  durationMs: number;
  tickDamage?: number;
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

export type BossSkillDefinition = BossSkillBase & BossSkillEffectProfile;

export interface BossSkillConfig {
  autoAttackEnabled: boolean;
  intervalMs: number;
  damageMultiplier: number;
  mode: BossSkillMode;
  randomIntervalEnabled: boolean;
  /** When true the ultimate stays locked until phase 2. */
  phaseLockEnabled: boolean;
}
