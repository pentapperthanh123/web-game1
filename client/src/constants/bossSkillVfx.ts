import { BOSS_SKILL_VFX, BossSkillVfxType } from '../types/bossSkill';

/** How long each archetype stays on screen after the cast (2D + 3D share this). */
export const BOSS_SKILL_VFX_DURATION_MS: Readonly<Record<BossSkillVfxType, number>> = {
  [BOSS_SKILL_VFX.FIRE_BREATH]: 1500,
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: 1100,
  [BOSS_SKILL_VFX.GROUND_SPIKES]: 1200,
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: 900,
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: 1300,
  [BOSS_SKILL_VFX.METEOR_RAIN]: 2200,
  [BOSS_SKILL_VFX.BEAM]: 1400,
  [BOSS_SKILL_VFX.VORTEX]: 1800,
  [BOSS_SKILL_VFX.CHARGE_DASH]: 900,
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: 1300,
  [BOSS_SKILL_VFX.NOVA]: 1900,
};

/** Default element counts when a skill does not override `vfxParams.count`. */
export const BOSS_SKILL_VFX_DEFAULT_COUNT: Readonly<Record<BossSkillVfxType, number>> = {
  [BOSS_SKILL_VFX.FIRE_BREATH]: 8,
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: 4,
  [BOSS_SKILL_VFX.GROUND_SPIKES]: 6,
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: 1,
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: 3,
  [BOSS_SKILL_VFX.METEOR_RAIN]: 6,
  [BOSS_SKILL_VFX.BEAM]: 1,
  [BOSS_SKILL_VFX.VORTEX]: 3,
  [BOSS_SKILL_VFX.CHARGE_DASH]: 5,
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: 3,
  [BOSS_SKILL_VFX.NOVA]: 10,
};

export const BOSS_METEOR_RAIN_CONSTANTS = {
  DEFAULT_COUNT: 6,
  SPREAD_X: 7,
  SPREAD_Z: 3,
  START_HEIGHT: 7.5,
  GROUND_Y: -1.6,
  /** Delay between consecutive meteors so they do not land as one blob. */
  STAGGER_MS: 110,
  FALL_DURATION_S: 1.1,
  /** Previously spawned meteors kept in the pool when a new rain starts. */
  POOL_KEEP: 12,
} as const;

export const BOSS_PHASE_SHIFT_SHAKE_INTENSITY = 1.2;

/** Boss sprite animation per archetype (CSS classes in index.css). */
export const BOSS_SKILL_VFX_ANIMATION_CLASS: Readonly<Record<BossSkillVfxType, string>> = {
  [BOSS_SKILL_VFX.FIRE_BREATH]: 'animate-boss-spit',
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: 'animate-boss-spit',
  [BOSS_SKILL_VFX.GROUND_SPIKES]: 'animate-boss-stomp',
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: 'animate-boss-sweep',
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: 'animate-boss-sky-call',
  [BOSS_SKILL_VFX.METEOR_RAIN]: 'animate-boss-sky-call',
  [BOSS_SKILL_VFX.BEAM]: 'animate-boss-beam-rise',
  [BOSS_SKILL_VFX.VORTEX]: 'animate-boss-vortex-hover',
  [BOSS_SKILL_VFX.CHARGE_DASH]: 'animate-herald-charge',
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: 'animate-boss-slam-center',
  [BOSS_SKILL_VFX.NOVA]: 'animate-boss-slam-center',
};
