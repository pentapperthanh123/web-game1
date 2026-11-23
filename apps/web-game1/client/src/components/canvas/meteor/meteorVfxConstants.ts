/** Tuning for MeteorShower3D: falling meteors (warning → burning head → trail) and their landing impacts. */
export const METEOR_VFX = {
  /** Falling meteors drawn at once (store keeps ~12 + a fresh rain). */
  FALL_CAPACITY: 40,
  /** Landed impacts kept alive locally — the store prunes a meteor ~300ms after it lands. */
  IMPACT_CAPACITY: 24,
  /** A meteor is turned into an impact only if we see it within this window after landing. */
  LANDING_REGISTER_WINDOW_MS: 260,
  DEFAULT_CORE_COLOR: '#ffffff',

  /** Slight acceleration on the way down (1 = linear). */
  FALL_EASE_POWER: 1.25,

  MARKER_LIFT: 0.04,
  MARKER_MIN_SCALE: 0.45,
  MARKER_MAX_SCALE: 1.9,
  MARKER_MIN_INTENSITY: 0.3,
  MARKER_PULSE_SPEED: 14,
  MARKER_PULSE_DEPTH: 0.18,
  MARKER_RING_OPACITY: 0.75,
  MARKER_FILL_OPACITY: 0.32,
  MARKER_FILL_SCALE_RATIO: 0.8,

  HEAD_CORE_RADIUS: 0.2,
  HEAD_CORE_OPACITY: 0.85,
  /** How much of the boss colour bleeds into the white-hot rock. */
  HEAD_CORE_TINT: 0.3,
  HEAD_SPIN_SPEED: 9,
  HEAD_GLOW_SIZE: 1.25,
  HEAD_GLOW_OPACITY: 0.7,
  HEAD_GLOW_FLICKER_SPEED: 31,
  HEAD_GLOW_FLICKER_DEPTH: 0.08,
  /** Head fades in over the first slice of the fall so it does not pop at the top of the screen. */
  HEAD_FADE_IN_PORTION: 0.12,

  TRAIL_OUTER_LENGTH: 2.8,
  TRAIL_OUTER_RADIUS: 0.32,
  TRAIL_OUTER_OPACITY: 0.7,
  TRAIL_INNER_LENGTH: 1.7,
  TRAIL_INNER_RADIUS: 0.14,
  TRAIL_INNER_OPACITY: 0.8,
  /** Trail never extends further back than this fraction of the distance already travelled. */
  TRAIL_TRAVEL_RATIO: 0.9,
  TRAIL_FLICKER_SPEED: 27,
  TRAIL_FLICKER_DEPTH: 0.1,
  TRAIL_RADIAL_SEGMENTS: 10,
  TRAIL_HEIGHT_SEGMENTS: 6,
  /** Brightness falloff exponent from the head (1) to the tail tip (0). */
  TRAIL_FALLOFF_POWER: 1.6,

  IMPACT_LIFETIME_MS: 1500,
  IMPACT_FLASH_MS: 260,
  IMPACT_FLASH_LIFT: 0.3,
  IMPACT_FLASH_MIN_SCALE: 0.8,
  IMPACT_FLASH_MAX_SCALE: 2.8,
  IMPACT_FLASH_OPACITY: 0.6,
  IMPACT_SHOCKWAVE_MS: 700,
  IMPACT_SHOCKWAVE_MIN_SCALE: 0.4,
  IMPACT_SHOCKWAVE_MAX_SCALE: 3.6,
  IMPACT_SHOCKWAVE_OPACITY: 0.75,
  IMPACT_SCORCH_ATTACK_MS: 90,
  IMPACT_SCORCH_SCALE: 1.9,
  IMPACT_SCORCH_GROWTH: 0.25,
  IMPACT_SCORCH_OPACITY: 0.55,

  SPARKS_PER_IMPACT: 7,
  SPARK_MS: 820,
  SPARK_MIN_SPEED: 2.6,
  SPARK_MAX_SPEED: 4.6,
  SPARK_MIN_ELEVATION: 0.45,
  SPARK_MAX_ELEVATION: 1.15,
  SPARK_GRAVITY: -9,
  SPARK_LENGTH: 0.28,
  SPARK_THICKNESS: 0.05,
  SPARK_OPACITY: 0.85,
  /** Rotates each impact's spark fan so neighbouring impacts never look identical. */
  SPARK_FAN_OFFSET: 2.399963,
  SPARK_ANGLE_JITTER: 0.5,
  SPARK_WHITE_MIX: 0.45,
} as const;
