import { BOSS_SKILL_VFX_IMPACT_RATIO } from '../../../../constants/bossSkillVfx';
import { BOSS_SKILL_VFX } from '../../../../types/bossSkill';
import { BOSS_3D_ANCHORS } from '../bossSkill3DShared';

/** Clip timeline (fraction of the cast): form → full maelstrom → collapse → detonation. */
export const MAELSTROM_TIMELINE = {
  FORM_END: 0.18,
  /** Champions start being drained when the damage lands. */
  DRAIN_START: BOSS_SKILL_VFX_IMPACT_RATIO[BOSS_SKILL_VFX.VOID_MAELSTROM],
  DRAIN_END: 0.8,
  COLLAPSE_START: 0.72,
  EXPLODE_AT: 0.86,
} as const;

/**
 * Skill `scale` (1.7–2.2 on these bosses) grows the effect only partly, so the black hole stays a
 * focal point in the arena instead of washing the whole portrait screen.
 */
export const MAELSTROM_SIZE = {
  SCALE_DAMPING: 0.4,
  MIN_FACTOR: 1,
  MAX_FACTOR: 1.45,
} as const;

/** Where the singularity hangs: above the arena centre, in front of the boss. */
export const MAELSTROM_CORE_POSITION = [0, BOSS_3D_ANCHORS.GROUND_Y + 1.35, 0.9] as const;

export const MAELSTROM_CORE = {
  SIZE: 0.85,
  FORM_OVERSHOOT_START: 0.15,
  PULSE_RATE: 0.009,
  PULSE_AMPLITUDE: 0.06,
  COLLAPSED_SIZE: 0.3,
  MAX_DARKNESS: 0.92,
  PHOTON_RING_RATIO: 1.08,
  PHOTON_FLICKER_RATE: 0.031,
  PHOTON_FLICKER_AMPLITUDE: 0.18,
  HALO_RATIO: 3.2,
  HALO_OPACITY: 0.35,
  /** The photon ring burns brighter while the disk falls in. */
  COLLAPSE_GLOW_GAIN: 0.6,
} as const;

/** Thin relativistic jets out of the poles while the maelstrom is at full strength. */
export const MAELSTROM_JETS = {
  UP_LENGTH: 2.8,
  CORE_WIDTH: 0.05,
  GLOW_WIDTH: 0.16,
  /** Outer haze of a jet, as a multiple of the core width. */
  HALO_WIDTH_RATIO: 4,
  FLICKER_RATE: 0.06,
  FLICKER_AMPLITUDE: 0.25,
  ATTACK_END: 0.3,
  RELEASE_START: 0.75,
} as const;

/** Accretion disk: particles on spiral arms that drift inward and orbit faster near the core. */
export const MAELSTROM_DISK = {
  PARTICLE_COUNT: 220,
  ARM_COUNT: 3,
  INNER_RADIUS: 0.42,
  OUTER_RADIUS: 1.9,
  /** Tilt toward the camera so the disk reads as a wide ellipse around the core. */
  TILT: 0.42,
  DRIFT_PER_SECOND: 0.32,
  ORBIT_SPEED: 2.4,
  ORBIT_FALLOFF_POWER: 1.2,
  SPIRAL_TWIST: 2.6,
  ARM_JITTER: 0.55,
  HEIGHT_JITTER: 0.06,
  MIN_SIZE: 0.07,
  SIZE_RANGE: 0.1,
  FADE_IN_SPAN: 0.12,
  FADE_OUT_START: 0.9,
  MIN_BRIGHTNESS: 0.4,
  /** Disk radius left when it has fallen into the core. */
  COLLAPSED_RADIUS_RATIO: 0.12,
} as const;

/** Continuous disk body in the particles' plane (diameters in world units before the size factor). */
export const MAELSTROM_DISK_BANDS = {
  INNER_DIAMETER: 2.6,
  OUTER_DIAMETER: 4.2,
  /** White-hot ring hugging the event horizon. */
  EDGE_DIAMETER: 1.35,
  INNER_SPIN: 3.2,
  OUTER_SPIN: 1.7,
  ATTACK_END: 0.2,
} as const;

/** Life streams pulled out of every hurt champion into the core (the void heals on it). */
export const MAELSTROM_DRAIN = {
  MAX_POINTS: 6,
  PER_POINT: 7,
  LIFE_MS: 760,
  START_HEIGHT: 0.35,
  ACCELERATION_POWER: 1.6,
  CURL_RADIUS: 0.35,
  CURL_TURNS: 1.5,
  CURL_VERTICAL_RATIO: 0.5,
  MIN_SIZE: 0.07,
  SIZE_GROW: 0.07,
  IMPACT_BURST_SIZE: 1.1,
} as const;

/** Detonation when the disk has fallen in. */
export const MAELSTROM_BURST = {
  PARTICLE_COUNT: 48,
  MIN_SPEED: 1.6,
  SPEED_RANGE: 2.4,
  VERTICAL_RATIO: 0.45,
  SIZE: 0.16,
  SHRINK: 0.5,
  FLASH_SIZE: 3.4,
  FLASH_SPAN: 0.35,
  SHOCK_RING_MAX: 6,
  SKY_RING_MAX: 4.4,
  RING_MIN: 0.4,
} as const;

/** Floor under the core: a rotating spiral, a glow and a dark gravity well. */
export const MAELSTROM_GROUND = {
  SPIRAL_SIZE: 4.4,
  SPIRAL_SPIN: 1.6,
  SPIRAL_OPACITY: 0.5,
  GLOW_SIZE: 2.4,
  WELL_SIZE: 3.4,
  WELL_DARKNESS: 0.45,
  COLLAPSE_SHRINK: 0.55,
} as const;

/** Particle colour ramp: white-hot at the core, then secondary, then the skill colour. */
export const MAELSTROM_RAMP = {
  HOT_END: 0.18,
  MID_END: 0.55,
  MAX_BRIGHTNESS: 1,
} as const;

export const RANDOMS_PER_PARTICLE = 4;
export const MS_PER_SECOND = 1000;

/** Damped size factor for a skill scale. */
export const resolveMaelstromSize = (scale: number): number =>
  Math.min(
    MAELSTROM_SIZE.MAX_FACTOR,
    Math.max(MAELSTROM_SIZE.MIN_FACTOR, 1 + (scale - 1) * MAELSTROM_SIZE.SCALE_DAMPING),
  );
