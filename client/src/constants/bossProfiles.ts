import { BossSkillDefinition } from '../types/bossSkill';
import { BOSS_SKILLS_MAP } from './bossSkills';
import { BOSS_DIFFICULTY_SCALE, GAME_THEME, GameThemeType, THEME_CONFIGS } from './game';

/**
 * Everything the HUD needs to know about one boss, read from the config files
 * (`THEME_CONFIGS`, `BOSS_DIFFICULTY_SCALE`, `BOSS_SKILLS_MAP`).
 * The store only keeps `gameTheme`; the profile is looked up from it, so name, HP scale,
 * colours and skills always switch together and can never go out of sync.
 */
export interface BossProfile {
  theme: GameThemeType;
  bossName: string;
  /** i18n key of the boss name (fallback: `bossName`). */
  nameI18nKey: string;
  hpMultiplier: number;
  themeColor: string;
  accentColor: string;
  skills: readonly BossSkillDefinition[];
}

const buildBossProfile = (theme: GameThemeType): BossProfile => {
  const themeConfig = THEME_CONFIGS[theme];
  return {
    theme,
    bossName: themeConfig.bossName,
    nameI18nKey: themeConfig.i18nKey,
    hpMultiplier: BOSS_DIFFICULTY_SCALE[theme].hpMultiplier,
    themeColor: themeConfig.colors.primaryHex,
    accentColor: themeConfig.colors.secondaryHex,
    skills: BOSS_SKILLS_MAP[theme],
  };
};

/** Built once at start-up: lookups return the same object, so React selectors stay stable. */
export const BOSS_PROFILES: Readonly<Record<GameThemeType, BossProfile>> = Object.values(GAME_THEME).reduce(
  (profiles, theme) => ({ ...profiles, [theme]: buildBossProfile(theme) }),
  {} as Record<GameThemeType, BossProfile>
);

export const getBossProfile = (theme: GameThemeType): BossProfile =>
  BOSS_PROFILES[theme] ?? BOSS_PROFILES[GAME_THEME.BARON];

const HP_MULTIPLIER_DECIMALS = 2;

/** 0.5 → "0.5", 1 → "1.0", 0.85 → "0.85" (as shown on the HUD badge). */
export const formatHpMultiplier = (hpMultiplier: number): string => {
  const rounded = Number(hpMultiplier.toFixed(HP_MULTIPLIER_DECIMALS));
  return Number.isInteger(rounded * 10) ? rounded.toFixed(1) : String(rounded);
};
