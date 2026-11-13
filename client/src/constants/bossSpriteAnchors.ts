import { GAME_THEME, GameThemeType } from './game';

/**
 * Anchor points measured on each boss sprite, as percentages of the square sprite
 * box the <img> is drawn into with `object-contain` (letterboxing of non-square
 * art is already folded into the numbers). Measured on 2026-11-13 with a pixel grid.
 *
 * Normal and enraged art are different drawings: the head can sit elsewhere and
 * even face the other way, so each form has its own anchors and facing.
 */
export interface SpriteAnchorPoint {
  leftPercent: number;
  topPercent: number;
}

export interface BossSpriteFormAnchors {
  /** Where breath / spit leaves the jaw. */
  mouth: SpriteAnchorPoint;
  /** Where eye beams start. */
  eye: SpriteAnchorPoint;
  /** Centre of mass, used for novas and body-centred bursts. */
  core: SpriteAnchorPoint;
  /** True when the head in the source art points to the right. */
  isNativeFacingRight: boolean;
}

export interface BossSpriteAnchorSet {
  normal: BossSpriteFormAnchors;
  enraged: BossSpriteFormAnchors;
}

/** DOM ids of the invisible markers Boss2D renders at the anchors above. */
export const BOSS_ANCHOR_ELEMENT_ID = {
  MOUTH: 'boss-anchor-mouth',
  EYE: 'boss-anchor-eye',
  CORE: 'boss-anchor-core',
} as const;

const CENTER_CORE: SpriteAnchorPoint = { leftPercent: 50, topPercent: 52 };

export const BOSS_SPRITE_ANCHORS: Readonly<Record<GameThemeType, BossSpriteAnchorSet>> = {
  [GAME_THEME.ELDER_DRAGON]: {
    normal: {
      mouth: { leftPercent: 58.6, topPercent: 39.3 },
      eye: { leftPercent: 56.5, topPercent: 34.5 },
      core: { leftPercent: 50, topPercent: 52 },
      isNativeFacingRight: true,
    },
    enraged: {
      mouth: { leftPercent: 32.8, topPercent: 45.5 },
      eye: { leftPercent: 35.5, topPercent: 39.5 },
      core: { leftPercent: 44, topPercent: 58 },
      isNativeFacingRight: false,
    },
  },
  [GAME_THEME.RONG_GIA]: {
    normal: {
      mouth: { leftPercent: 62.5, topPercent: 39.1 },
      eye: { leftPercent: 60, topPercent: 34 },
      core: { leftPercent: 54, topPercent: 55 },
      isNativeFacingRight: true,
    },
    enraged: {
      mouth: { leftPercent: 70.3, topPercent: 46.9 },
      eye: { leftPercent: 66, topPercent: 41 },
      core: { leftPercent: 55, topPercent: 60 },
      isNativeFacingRight: true,
    },
  },
  [GAME_THEME.RONG_NUI]: {
    normal: {
      mouth: { leftPercent: 19, topPercent: 54.2 },
      eye: { leftPercent: 23, topPercent: 47.5 },
      core: { leftPercent: 45, topPercent: 58 },
      isNativeFacingRight: false,
    },
    enraged: {
      mouth: { leftPercent: 16.1, topPercent: 56.6 },
      eye: { leftPercent: 20.5, topPercent: 49.5 },
      core: { leftPercent: 45, topPercent: 60 },
      isNativeFacingRight: false,
    },
  },
  [GAME_THEME.BARON]: {
    normal: {
      mouth: { leftPercent: 45, topPercent: 43 },
      eye: { leftPercent: 45, topPercent: 28 },
      core: CENTER_CORE,
      isNativeFacingRight: false,
    },
    enraged: {
      mouth: { leftPercent: 37, topPercent: 45 },
      eye: { leftPercent: 35, topPercent: 30 },
      core: CENTER_CORE,
      isNativeFacingRight: false,
    },
  },
  [GAME_THEME.VOID_TITAN]: {
    normal: {
      mouth: { leftPercent: 50, topPercent: 40 },
      eye: { leftPercent: 50, topPercent: 30 },
      core: { leftPercent: 50, topPercent: 45 },
      isNativeFacingRight: false,
    },
    enraged: {
      mouth: { leftPercent: 50, topPercent: 40 },
      eye: { leftPercent: 50, topPercent: 30 },
      core: { leftPercent: 50, topPercent: 45 },
      isNativeFacingRight: false,
    },
  },
  [GAME_THEME.XU_GIA]: {
    normal: {
      mouth: { leftPercent: 60, topPercent: 40 },
      eye: { leftPercent: 64, topPercent: 28 },
      core: CENTER_CORE,
      isNativeFacingRight: false,
    },
    enraged: {
      mouth: { leftPercent: 66, topPercent: 42 },
      eye: { leftPercent: 73, topPercent: 32 },
      core: CENTER_CORE,
      isNativeFacingRight: false,
    },
  },
};

/** Anchors for the sprite actually on screen (enraged art only when the theme has one). */
export const getBossSpriteAnchors = (theme: GameThemeType, isEnragedArtShown: boolean): BossSpriteFormAnchors => {
  const anchorSet = BOSS_SPRITE_ANCHORS[theme] ?? BOSS_SPRITE_ANCHORS[GAME_THEME.BARON];
  return isEnragedArtShown ? anchorSet.enraged : anchorSet.normal;
};
