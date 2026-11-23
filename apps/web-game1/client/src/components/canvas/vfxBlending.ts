import * as THREE from 'three';

/**
 * Additive light that never covers the DOM underneath. The 3D canvas is transparent and sits above
 * the 2D boss sprite; plain `AdditiveBlending` also adds alpha, so stacked glows (a gift's sky beam,
 * laser column, rings) turned the canvas opaque and hid the boss behind a white block, and dim
 * particles left dark smudges. Adding colour only and leaving the canvas alpha untouched keeps every
 * glow a pure light on top of whatever the page shows.
 */
export const COLOR_ONLY_ADDITIVE_PROPS = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
} as const;
