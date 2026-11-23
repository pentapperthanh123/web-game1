import { CSSProperties } from 'react';
import { Droplets, Flame, LucideIcon, Skull, Sparkles, Wind, Zap } from 'lucide-react';
import {
  BOSS_SKILL_CSS_VAR,
  BOSS_SKILL_FALLBACK_ICON,
  BOSS_SKILL_PANEL_ALPHA,
} from '../../../constants/bossSkillPanel';

/** `iconName` values used in `constants/bossSkills.ts`. */
const SKILL_ICONS: Readonly<Record<string, LucideIcon>> = { Droplets, Flame, Skull, Sparkles, Wind, Zap };

export const getSkillIcon = (iconName: string): LucideIcon =>
  SKILL_ICONS[iconName] ?? SKILL_ICONS[BOSS_SKILL_FALLBACK_ICON];

/** Colour variables for one skill / boss; the CSS file does the rest. */
export const buildSkillColorVars = (color: string): CSSProperties =>
  ({
    [BOSS_SKILL_CSS_VAR.COLOR]: color,
    [BOSS_SKILL_CSS_VAR.BORDER]: `${color}${BOSS_SKILL_PANEL_ALPHA.BORDER}`,
    [BOSS_SKILL_CSS_VAR.GLOW]: `${color}${BOSS_SKILL_PANEL_ALPHA.GLOW}`,
    [BOSS_SKILL_CSS_VAR.FILL]: `${color}${BOSS_SKILL_PANEL_ALPHA.FILL}`,
  }) as CSSProperties;
