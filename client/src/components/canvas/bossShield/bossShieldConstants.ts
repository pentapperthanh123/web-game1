/** Offset of the Boss3DPresence group from COMBAT_VFX_CONSTANTS.BOSS_TARGET (weak-point ring + shield fallback). */
export const BOSS_PRESENCE_OFFSET = {
  Y: -0.1,
  Z: -0.35,
} as const;

/** Tuning for the boss energy-shield force field (Boss3DPresence → BossShieldForceField). */
export const BOSS_SHIELD_FIELD = {
  RADIUS: 1.18,
  /** Offset of the field from the boss presence origin (used for the fallback world position). */
  OFFSET_Y: 0.08,
  OFFSET_Z: 0.08,
  /** Re-read Boss2D's on-screen core marker at most this often (DOM read + unproject). */
  ANCHOR_RESOLVE_INTERVAL_MS: 250,
  /** Exponential follow rate (1/s) toward the latest anchor so the field glides with the boss. */
  ANCHOR_FOLLOW_RATE: 8,
  SPHERE_WIDTH_SEGMENTS: 48,
  SPHERE_HEIGHT_SEGMENTS: 32,

  BASE_COLOR: '#0ea5e9',
  RIM_COLOR: '#bae6fd',

  /** Slow spin (rad/s) so the hex pattern drifts without drawing attention. */
  ROTATION_SPEED: 0.22,
  TILT_SPEED: 0.5,
  TILT_AMPLITUDE: 0.08,

  BREATH_SPEED: 2.4,
  BREATH_AMPLITUDE: 0.025,

  /** Grow-in when the shield is raised. */
  INTRO_DURATION_MS: 420,

  /** Overall opacity at 0% shield HP (100% HP = 1). */
  MIN_STRENGTH_OPACITY: 0.38,
  /** Flicker grows as the shield weakens: occasional dips + fast jitter. */
  FLICKER_DIP_FREQ_A: 7.3,
  FLICKER_DIP_FREQ_B: 12.9,
  FLICKER_DIP_THRESHOLD: 0.55,
  FLICKER_DIP_DEPTH: 0.7,
  FLICKER_JITTER_FREQ: 41,
  FLICKER_JITTER_DEPTH: 0.25,

  /** Hit ripple: a bright ring that travels from the front of the field out to the rim. */
  RIPPLE_DURATION_MS: 520,
  /** Hits arrive constantly in a busy fight; never restart a ripple faster than this. */
  RIPPLE_MIN_INTERVAL_MS: 280,
  HIT_POP_SCALE: 0.04,

  GROUND_RING_OFFSET_Y: -1.06,
  GROUND_RING_DIAMETER: 3.1,
  GROUND_GLOW_DIAMETER: 2.5,
  GROUND_RING_OPACITY: 0.42,
  GROUND_GLOW_OPACITY: 0.14,
  /** Ground ring breathes a little wider than the sphere so the base reads as a projector. */
  GROUND_RING_BREATH_GAIN: 2,
  GROUND_RING_HIT_BOOST: 0.6,
} as const;
