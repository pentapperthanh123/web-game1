export interface EaselCanvasAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
  rotateDeg: number;
  skewXDeg: number;
}

export interface StoolSeatAnchor {
  x: number;
  y: number;
  hipOffsetPx: number;
  spriteWidth: number;
  spriteHeight: number;
}

export interface ArtistAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Local pixel offset of the right forearm/cuff pivot inside `artist-body.png` (222x500). */
  bodyShoulderOffsetX: number;
  bodyShoulderOffsetY: number;
  /** Dimensions & pivot of pre-aligned horizontal `artist-arm.png` (260x240). */
  armWidth: number;
  armHeight: number;
  armPivotX: number;
  armPivotY: number;
  armReachLengthPx: number;
  restAngleDeg: number;
}

export interface GalleryWireConfig {
  y: number;
  sagPx: number;
  startX: number;
  endX: number;
  maxFrames: number;
  frameWidth: number;
  frameHeight: number;
}

export interface SleepingCatAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Local pixel coordinate of the cat's nose inside `sleeping-cat.png` for the anime sleep bubble. */
  noseOffsetX: number;
  noseOffsetY: number;
  /** Local pixel coordinate above the cat's head where floating Zzz & dream bubbles spawn. */
  dreamOriginX: number;
  dreamOriginY: number;
}

export interface QueueSlotAnchor {
  centerX: number;
  feetY: number;
  scale: number;
  baseWidth: number;
  baseHeight: number;
  /** Horizontal offset for the mini name tag so tags never stack or touch the seated model. */
  tagOffsetX: number;
  /** Vertical offset above character head for the mini name tag. */
  tagOffsetY: number;
}

export const CHIBI_STAND_VARIANTS = [
  '/assets/customer-stand.png',
  '/assets/customer-stand-2.png',
  '/assets/customer-stand-3.png',
] as const;

/**
 * Pixel-calibrated 2.5D Anime Stage Coordinates for `bg-studio.png` (720 x 1280).
 */
export const STAGE_25D_CONFIG = {
  WIDTH: 720,
  HEIGHT: 1280,
  TOP_HUD_HEIGHT: 165,
  GIFT_BAR_TOP: 1052,
  SAFE_ZONE_TOP: 1092,
  BUBBLE_HORIZONTAL_PADDING: 20,

  easelCanvas: {
    x: 337,
    y: 448,
    width: 303,
    height: 312,
    rotateDeg: 1.1,
    skewXDeg: -4.65,
  } satisfies EaselCanvasAnchor,

  stoolSeat: {
    x: 242,
    y: 910,
    hipOffsetPx: 158,
    spriteWidth: 105,
    spriteHeight: 254,
  } satisfies StoolSeatAnchor,

  artistAnchor: {
    x: 468,
    y: 524,
    width: 222,
    height: 500,
    bodyShoulderOffsetX: 98,
    bodyShoulderOffsetY: 189,
    armWidth: 260,
    armHeight: 240,
    armPivotX: 200,
    armPivotY: 120,
    armReachLengthPx: 122.1,
    restAngleDeg: 10,
  } satisfies ArtistAnchor,

  galleryWire: {
    y: 206,
    sagPx: 16,
    startX: 235,
    endX: 680,
    maxFrames: 6,
    frameWidth: 72,
    frameHeight: 126,
  } satisfies GalleryWireConfig,

  sleepingCat: {
    x: 22,
    y: 665,
    width: 127,
    height: 72,
    noseOffsetX: 43,
    noseOffsetY: 54,
    dreamOriginX: 50,
    dreamOriginY: 8,
  } satisfies SleepingCatAnchor,

  /**
   * 3-column diagonal queue from front-right (next to lowered stool) to back-left (under cat shelf)
   * with anatomically matched standing height (284px base vs 254px sitting on y=922 stool).
   */
  queueSlots: [
    {
      centerX: 132,
      feetY: 1074,
      scale: 0.86,
      baseWidth: 116,
      baseHeight: 284,
      tagOffsetX: 2,
      tagOffsetY: 0,
    },
    {
      centerX: 86,
      feetY: 1030,
      scale: 0.8,
      baseWidth: 116,
      baseHeight: 284,
      tagOffsetX: -2,
      tagOffsetY: 0,
    },
    {
      centerX: 42,
      feetY: 986,
      scale: 0.74,
      baseWidth: 116,
      baseHeight: 284,
      tagOffsetX: 4,
      tagOffsetY: 0,
    },
  ] satisfies ReadonlyArray<QueueSlotAnchor>,
} as const;

export const STAGE_LAYOUT = {
  WIDTH: STAGE_25D_CONFIG.WIDTH,
  HEIGHT: STAGE_25D_CONFIG.HEIGHT,
  TOP_HUD_HEIGHT: STAGE_25D_CONFIG.TOP_HUD_HEIGHT,
  ACTION_ZONE_TOP: 170,
  ACTION_ZONE_BOTTOM: 1045,
  SAFE_ZONE_TOP: STAGE_25D_CONFIG.SAFE_ZONE_TOP,
  BUBBLE_HORIZONTAL_PADDING: STAGE_25D_CONFIG.BUBBLE_HORIZONTAL_PADDING,
  BUBBLE_MAX_WIDTH: 280,
} as const;
