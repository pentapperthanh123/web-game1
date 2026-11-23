import { BOSS_SKILL_VFX, BossSkillVfxType } from '../types/bossSkill';

/**
 * Sustained screen rumble (camera + DOM), separate from the short `triggerScreenShake` kick so the
 * many small hit shakes of a crowd never cut a long quake short.
 */
export const SCREEN_RUMBLE_CONSTANTS = {
  /** Share of the rumble spent swelling in / dying out. */
  ATTACK_RATIO: 0.1,
  RELEASE_RATIO: 0.35,
  /** Camera offset (world units) per unit of intensity. */
  CAMERA_GAIN: 0.2,
  CAMERA_DEPTH_RATIO: 0.5,
  /** Slow sway under the jitter so the quake rolls instead of buzzing. */
  SWAY_RATIO: 0.45,
  SWAY_SPEED_X: 0.021,
  SWAY_SPEED_Y: 0.027,
  /** DOM layer (2D boss, arena art, HUD): px of jitter per unit of intensity. */
  DOM_PX_PER_INTENSITY: 3.5,
  /** The DOM jitter drops to this share for the dying-out part. */
  DOM_TAIL_SCALE: 0.45,
} as const;

/** Short kick of `triggerScreenShake` (camera). */
export const SCREEN_SHAKE_CONSTANTS = {
  DURATION_MS: 500,
  DECAY_RATE: 4.5,
  CAMERA_GAIN: 0.45,
  CAMERA_DEPTH_RATIO: 0.5,
  /** How fast the camera eases back to rest once nothing shakes it. */
  RETURN_LERP: 0.15,
} as const;

/** How hard each archetype shakes the ground (0 = airborne, 1 = full earthquake). */
export const BOSS_SKILL_VFX_QUAKE_WEIGHT: Readonly<Record<BossSkillVfxType, number>> = {
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: 1,
  [BOSS_SKILL_VFX.METEOR_RAIN]: 0.9,
  [BOSS_SKILL_VFX.GROUND_SPIKES]: 0.85,
  [BOSS_SKILL_VFX.NOVA]: 0.8,
  [BOSS_SKILL_VFX.CHARGE_DASH]: 0.7,
  [BOSS_SKILL_VFX.VORTEX]: 0.6,
  [BOSS_SKILL_VFX.VOID_MAELSTROM]: 0.75,
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: 0.5,
  [BOSS_SKILL_VFX.BEAM]: 0.5,
  [BOSS_SKILL_VFX.FIRE_BREATH]: 0.45,
  [BOSS_SKILL_VFX.CHAIN_LIGHTNING]: 0.4,
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: 0.3,
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: 0.3,
};

/** Sound + shake timeline of a boss ultimate, derived from the skill's own VFX layers. */
export const BOSS_ULTIMATE_FEEDBACK = {
  /** Opening kick at the cast. */
  CAST_SHAKE_INTENSITY: 1.6,
  /** The ground keeps rumbling this long after the last VFX layer has ended. */
  RUMBLE_TAIL_MS: 700,
  /** Screen rumble strength at quake weight 1. */
  RUMBLE_INTENSITY: 1.1,
  /** Layers at least this heavy land with a thump and a shake kick. */
  GROUND_KICK_MIN_WEIGHT: 0.8,
  LAYER_KICK_INTENSITY: 1,
  /** The moment the damage lands on the champions. */
  IMPACT_KICK_INTENSITY: 1.4,
  LAYER_SOUND_VOLUME_SCALE: 0.85,
  /** The same sample is not retriggered closer than this (two lightning layers back to back). */
  MIN_SOUND_GAP_MS: 250,
  /** Kicks closer than this merge into the stronger one. */
  MIN_KICK_GAP_MS: 200,
} as const;

/** Procedural earthquake layers (see `audioService.playQuakeRumble` / `playQuakeImpact`). */
export const QUAKE_SFX = {
  SILENCE_GAIN: 0.001,
  MIN_DURATION_S: 0.6,
  ATTACK_S: 0.18,
  RELEASE_RATIO: 0.4,
  /** Filtered noise bed: the body of the rumble (kept above phone-speaker cut-off). */
  NOISE_GAIN: 0.55,
  NOISE_CUTOFF_HZ: 240,
  NOISE_CUTOFF_END_HZ: 110,
  /** Low drone with a harmonic so it still reads on small speakers. */
  SUB_GAIN: 0.3,
  SUB_HZ: 52,
  HARMONIC_GAIN: 0.12,
  HARMONIC_HZ: 104,
  /** Tremolo that makes the bed shudder. */
  TREMOLO_HZ: 9,
  TREMOLO_DEPTH: 0.45,
  /** Cracking rock / falling debris scattered over the rumble. */
  DEBRIS_PER_SECOND: 3,
  DEBRIS_GAIN: 0.14,
  DEBRIS_DURATION_S: 0.16,
  DEBRIS_MIN_HZ: 500,
  DEBRIS_SPREAD_HZ: 1400,
  DEBRIS_PAN_SPREAD: 0.8,
  /** Single ground impact. */
  IMPACT_GAIN: 0.55,
  IMPACT_START_HZ: 130,
  IMPACT_END_HZ: 36,
  IMPACT_DURATION_S: 0.55,
  IMPACT_NOISE_GAIN: 0.35,
  IMPACT_NOISE_START_HZ: 700,
  IMPACT_NOISE_END_HZ: 90,
  IMPACT_NOISE_DURATION_S: 0.32,
} as const;
