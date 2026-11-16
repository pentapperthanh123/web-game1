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
