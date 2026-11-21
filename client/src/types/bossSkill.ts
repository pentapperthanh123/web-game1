export type BossSkillMode = 'RANDOM_WEIGHTED' | 'RANDOM_EQUAL' | 'ROTATION';

/** Boss escalates through 3 phases as its HP drops (see `constants/bossPhases.ts`). */
export type BossPhase = 1 | 2 | 3;

/** Shared VFX archetypes; every skill maps to one and parameterises it by colour/scale. */
export const BOSS_SKILL_VFX = {
  FIRE_BREATH: 'FIRE_BREATH',
  PROJECTILE_ARC: 'PROJECTILE_ARC',
  GROUND_SPIKES: 'GROUND_SPIKES',
  CRESCENT_SWEEP: 'CRESCENT_SWEEP',
  LIGHTNING_STRIKE: 'LIGHTNING_STRIKE',
  METEOR_RAIN: 'METEOR_RAIN',
  BEAM: 'BEAM',
  VORTEX: 'VORTEX',
  /** High-tier vortex (Baron, Void Titan): a black hole with an accretion disk that drains the champions. */
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

/** Extra archetype played on top of a skill's main VFX (ultimates are built from several). */
export interface BossSkillVfxLayer {
  vfxType: BossSkillVfxType;
  /** Start delay after the cast. */
  delayMs?: number;
  count?: number;
  scale?: number;
  color?: string;
  secondaryColor?: string;
}

/** Floor position (world x, z) of a champion the skill hits; effects land there. */
export type BossSkillImpactPoint = readonly [x: number, z: number];

/** Full 3D position (world x, y, z) of a champion the skill hits. */
export type BossSkillImpactPosition = readonly [x: number, y: number, z: number];

export interface BossSkillVfxParams {
  secondaryColor?: string;
  /** Additional archetypes layered over the main one (3D). */
  layers?: readonly BossSkillVfxLayer[];
  /** Stretches the main archetype's clip (1 = default length). */
  durationScale?: number;
  /** Number of projectiles / bolts / spikes; archetype-specific default when omitted. */
  count?: number;
  /** Relative size multiplier of the effect (1 = default). */
  scale?: number;
  /** Dragons also breathe fire from the jaw while this skill plays; 3D VFX start at the mouth. */
  isMouthBreath?: boolean;
}

export interface BossSkillStatusEffect {
  type: BossStatusEffectType;
  durationMs: number;
  /**
   * BURN / POISON: total damage over the whole effect as a share of the hit that applied it.
   * The per-tick amount is derived at cast time, so it follows the same multipliers as the hit.
   */
  dotRatio?: number;
  /** LIFESTEAL: fraction of dealt damage the boss heals. */
  ratio?: number;
}

/** Presentation + mechanics layer attached to a skill (`constants/bossSkillEffects.ts`). */
export interface BossSkillEffectProfile {
  vfxType: BossSkillVfxType;
  vfxParams?: BossSkillVfxParams;
  statusEffect?: BossSkillStatusEffect;
  /** Skill is unavailable until the boss reaches this phase (when phase lock is on). */
  minPhase?: BossPhase;
}

/** Raw skill data as authored per boss. */
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

export interface ActiveBossSkillBanner {
  skillId: string;
  skillName: string;
  vietnameseName: string;
  damage: number;
  color: string;
  isUltimate: boolean;
  bossName: string;
  timestamp: number;
  iconName?: string;
  targetTeam?: 'BLG' | 'GENG' | 'ALL';
  vfxType: BossSkillVfxType;
  vfxParams?: BossSkillVfxParams;
  statusEffectType?: BossStatusEffectType;
  /** Where the damaged champions stand, so the VFX lands on the champions it hurts. */
  impactPoints?: readonly BossSkillImpactPoint[];
  /** 3D position (world x, y, z) of each targeted champion at cast time. */
  impactPositions?: readonly BossSkillImpactPosition[];
  /** IDs of the targeted minions so 3D tracking VFX can track their live positions. */
  targetedMinionIds?: readonly string[];
}
