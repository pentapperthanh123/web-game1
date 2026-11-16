import { BOSS_SKILL_VFX, BossSkillVfxParams, BossSkillVfxType } from '../types/bossSkill';

/** How long each archetype stays on screen after the cast (2D + 3D share this). */
export const BOSS_SKILL_VFX_DURATION_MS: Readonly<Record<BossSkillVfxType, number>> = {
  [BOSS_SKILL_VFX.FIRE_BREATH]: 1800,
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: 1100,
  [BOSS_SKILL_VFX.GROUND_SPIKES]: 1200,
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: 900,
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: 1300,
  [BOSS_SKILL_VFX.METEOR_RAIN]: 2200,
  [BOSS_SKILL_VFX.BEAM]: 1400,
  [BOSS_SKILL_VFX.VORTEX]: 1800,
  [BOSS_SKILL_VFX.VOID_MAELSTROM]: 2600,
  [BOSS_SKILL_VFX.CHARGE_DASH]: 900,
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: 1300,
  [BOSS_SKILL_VFX.NOVA]: 1900,
  [BOSS_SKILL_VFX.CHAIN_LIGHTNING]: 1500,
};

const DEFAULT_DURATION_SCALE = 1;

/** Clip length of a skill's main archetype (ultimates may stretch it). */
export const getSkillVfxDurationMs = (vfxType: BossSkillVfxType, params?: BossSkillVfxParams): number =>
  Math.round(BOSS_SKILL_VFX_DURATION_MS[vfxType] * (params?.durationScale ?? DEFAULT_DURATION_SCALE));

/** Time until the last layer of a skill has finished. */
export const getSkillVfxWindowMs = (vfxType: BossSkillVfxType, params?: BossSkillVfxParams): number => {
  const layerEnds = (params?.layers ?? []).map(
    (layer) => (layer.delayMs ?? 0) + BOSS_SKILL_VFX_DURATION_MS[layer.vfxType]
  );
  return Math.max(getSkillVfxDurationMs(vfxType, params), ...layerEnds);
};

/**
 * Share of the main clip after which the effect visibly reaches the champions (bolt lands, wave
 * arrives, spikes erupt). Damage is applied at that moment, not at the cast, so a champion is never
 * knocked out before anything has touched it.
 */
export const BOSS_SKILL_VFX_IMPACT_RATIO: Readonly<Record<BossSkillVfxType, number>> = {
  [BOSS_SKILL_VFX.FIRE_BREATH]: 0.4,
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: 0.55,
  [BOSS_SKILL_VFX.GROUND_SPIKES]: 0.26,
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: 0.2,
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: 0.3,
  [BOSS_SKILL_VFX.METEOR_RAIN]: 0.5,
  [BOSS_SKILL_VFX.BEAM]: 0.3,
  [BOSS_SKILL_VFX.VORTEX]: 0.35,
  [BOSS_SKILL_VFX.VOID_MAELSTROM]: 0.36,
  [BOSS_SKILL_VFX.CHARGE_DASH]: 0.42,
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: 0.16,
  [BOSS_SKILL_VFX.NOVA]: 0.3,
  [BOSS_SKILL_VFX.CHAIN_LIGHTNING]: 0.3,
};

/** Delay between the cast and the moment its damage lands on the champions. */
export const getSkillImpactDelayMs = (vfxType: BossSkillVfxType, params?: BossSkillVfxParams): number =>
  Math.round(getSkillVfxDurationMs(vfxType, params) * BOSS_SKILL_VFX_IMPACT_RATIO[vfxType]);

/** Feedback shown on a champion that takes boss damage. */
export const CHAMPION_HIT_FEEDBACK = {
  /** Particle bursts per impact (the burst queue is small; the damage numbers cover everyone). */
  MAX_BURSTS_PER_IMPACT: 4,
  BURST_INTENSITY: 1,
  ULTIMATE_BURST_INTENSITY: 2,
  DAMAGE_COLOR: '#f87171',
  LETHAL_COLOR: '#ef4444',
  /** Fallback screen position (share of the viewport) when a champion has no live position yet. */
  FALLBACK_LEFT_X_RATIO: 0.25,
  FALLBACK_RIGHT_X_RATIO: 0.75,
  FALLBACK_CENTER_X_RATIO: 0.5,
  FALLBACK_Y_RATIO: 0.65,
  FALLBACK_VIEWPORT_WIDTH: 720,
  FALLBACK_VIEWPORT_HEIGHT: 1280,
} as const;

/**
 * Which champions a skill can hurt, matching where its effect is drawn:
 * - SIDE: random champions of the attacked wing (bolts / orbs / beam land on them)
 * - SIDE_REACH: every champion of the attacked wing within the boss's reach (sweeps)
 * - SIDE_NEAREST: the closest champions of the attacked wing (charge)
 * - CENTER: the champions closest to the boss, both wings (slam, vortex)
 * - ARENA: random champions anywhere (spikes, meteors) or everyone (nova)
 */
export const BOSS_SKILL_HIT_AREA = {
  SIDE: 'SIDE',
  SIDE_REACH: 'SIDE_REACH',
  SIDE_NEAREST: 'SIDE_NEAREST',
  CENTER: 'CENTER',
  ARENA: 'ARENA',
} as const;
export type BossSkillHitArea = (typeof BOSS_SKILL_HIT_AREA)[keyof typeof BOSS_SKILL_HIT_AREA];

export const BOSS_SKILL_VFX_HIT_AREA: Readonly<Record<BossSkillVfxType, BossSkillHitArea>> = {
  [BOSS_SKILL_VFX.FIRE_BREATH]: BOSS_SKILL_HIT_AREA.SIDE,
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: BOSS_SKILL_HIT_AREA.SIDE,
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: BOSS_SKILL_HIT_AREA.SIDE,
  [BOSS_SKILL_VFX.BEAM]: BOSS_SKILL_HIT_AREA.SIDE,
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: BOSS_SKILL_HIT_AREA.SIDE_REACH,
  [BOSS_SKILL_VFX.CHARGE_DASH]: BOSS_SKILL_HIT_AREA.SIDE_NEAREST,
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: BOSS_SKILL_HIT_AREA.CENTER,
  [BOSS_SKILL_VFX.VORTEX]: BOSS_SKILL_HIT_AREA.CENTER,
  [BOSS_SKILL_VFX.VOID_MAELSTROM]: BOSS_SKILL_HIT_AREA.CENTER,
  [BOSS_SKILL_VFX.GROUND_SPIKES]: BOSS_SKILL_HIT_AREA.ARENA,
  [BOSS_SKILL_VFX.METEOR_RAIN]: BOSS_SKILL_HIT_AREA.ARENA,
  [BOSS_SKILL_VFX.NOVA]: BOSS_SKILL_HIT_AREA.ARENA,
  [BOSS_SKILL_VFX.CHAIN_LIGHTNING]: BOSS_SKILL_HIT_AREA.SIDE,
};

export const BOSS_SKILL_HIT_RULES = {
  /** A skill with this target count hits everyone in its area. */
  ALL_TARGETS_COUNT: 999,
  /** World X distance from the boss a sweep reaches (champion wings sit around ±1.8). */
  SWEEP_REACH_X: 1.9,
  /** Impact points handed to the VFX; more targets than this still take damage. */
  MAX_IMPACT_POINTS: 16,
} as const;

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
  [BOSS_SKILL_VFX.VOID_MAELSTROM]: 3,
  [BOSS_SKILL_VFX.CHARGE_DASH]: 5,
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: 3,
  [BOSS_SKILL_VFX.NOVA]: 10,
  [BOSS_SKILL_VFX.CHAIN_LIGHTNING]: 5,
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
  [BOSS_SKILL_VFX.VOID_MAELSTROM]: 'animate-boss-vortex-hover',
  [BOSS_SKILL_VFX.CHARGE_DASH]: 'animate-herald-charge',
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: 'animate-boss-slam-center',
  [BOSS_SKILL_VFX.NOVA]: 'animate-boss-slam-center',
  [BOSS_SKILL_VFX.CHAIN_LIGHTNING]: 'animate-boss-beam-rise',
};

/** The charge really travels toward the wing it rams (the boss sprite moves there and back). */
export const BOSS_CHARGE_ANIMATION_CLASS = {
  LEFT: 'animate-herald-charge-left',
  RIGHT: 'animate-herald-charge-right',
} as const;

/**
 * Shared look of every boss skill VFX (2D + 3D): a white-hot core, a boss-coloured glow and a soft halo.
 * Opacities are capped well below 1 so overlapping additive layers never blow out to flat white.
 */
export const BOSS_SKILL_VFX_STYLE = {
  CORE_COLOR: '#ffffff',
  MAX_CORE_OPACITY: 0.85,
  MAX_GLOW_OPACITY: 0.7,
  MAX_HALO_OPACITY: 0.32,
  MAX_DECAL_OPACITY: 0.5,
  MAX_FLASH_OPACITY: 0.6,
  /** Per-layer opacity multipliers applied on top of the effect envelope. */
  LAYER_OPACITY: {
    CORE: 1,
    GLOW: 0.6,
    HALO: 0.28,
  },
} as const;

/** Alpha suffixes (hex) for the 2D overlay gradients — the 2D layer sits under the 3D one, so it stays soft. */
export const BOSS_SKILL_VFX_2D_ALPHA = {
  STRONG: 'cc',
  MEDIUM: '88',
  SOFT: '44',
  FAINT: '22',
} as const;

/** Cap applied to every 2D skill overlay wrapper; keyframes animate up to 1, this keeps them premium, not blown out. */
export const BOSS_SKILL_VFX_2D_MAX_OPACITY = 0.82;
