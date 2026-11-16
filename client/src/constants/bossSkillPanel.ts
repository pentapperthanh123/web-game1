/** Alpha suffixes appended to 6-digit hex colours (kept in JS: `color-mix` is too new for older OBS). */
export const BOSS_SKILL_PANEL_ALPHA = {
  BORDER: '8c',
  GLOW: '59',
  FILL: '26',
} as const;

/** CSS custom properties consumed by `bossSkills.css`. */
export const BOSS_SKILL_CSS_VAR = {
  COLOR: '--boss-skill-color',
  BORDER: '--boss-skill-border',
  GLOW: '--boss-skill-glow',
  FILL: '--boss-skill-fill',
} as const;

export const BOSS_SKILL_FALLBACK_ICON = 'Zap';

/**
 * Ultimate callout title: one line whatever the skill name ("HƯ VÔ KHẢI HUYỀN: TẬN DIỆT" used to wrap
 * and push the boss-name label onto the arena nameplate). Font size shrinks with the name length.
 */
export const ULTIMATE_CALLOUT_TITLE = {
  /** Usable callout width (max-w-sm = 384px, minus side padding). */
  AVAILABLE_WIDTH_PX: 360,
  /** Average glyph width of the black italic uppercase title, as a share of the font size. */
  GLYPH_WIDTH_RATIO: 0.64,
  MIN_FONT_PX: 15,
  MAX_FONT_PX: 30,
} as const;

export const resolveUltimateTitleFontPx = (title: string): number => {
  const fittedPx = ULTIMATE_CALLOUT_TITLE.AVAILABLE_WIDTH_PX / (Math.max(1, title.length) * ULTIMATE_CALLOUT_TITLE.GLYPH_WIDTH_RATIO);
  return Math.round(Math.min(ULTIMATE_CALLOUT_TITLE.MAX_FONT_PX, Math.max(ULTIMATE_CALLOUT_TITLE.MIN_FONT_PX, fittedPx)));
};
