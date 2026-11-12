import { BossSkillConfig } from '../types/bossSkill';
import {
  AutoProBattleConfig,
  AutoSummonConfig,
  OverlayVisibility,
} from '../types/game';
import { TeamConfigState } from '../types/team';
import {
  BOSS_SKILL_STORAGE_KEY,
  DEFAULT_BOSS_SKILL_CONFIG,
} from '../constants/bossSkills';
import {
  AUTO_PRO_STORAGE_KEY,
  AUTO_SUMMON_STORAGE_KEY,
  DEFAULT_AUTO_PRO_BATTLE_CONFIG,
  DEFAULT_AUTO_SUMMON_CONFIG,
  DEFAULT_OVERLAY_VISIBILITY,
  GAME_THEME,
  GameThemeType,
  OVERLAY_STORAGE_KEY,
  TEAM_KEY,
  THEME_STORAGE_KEY,
} from '../constants/game';
import {
  TEAM_CONFIG_STORAGE_KEY,
  createDefaultTeamConfig,
  sanitizeTeamConfigState,
} from '../constants/teams';

/** Reads the persisted game theme from localStorage, falling back to Baron. */
export const getStoredGameTheme = (): GameThemeType => {
  if (typeof window === 'undefined') return GAME_THEME.BARON;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY) as GameThemeType | null;
    if (raw && Object.values(GAME_THEME).includes(raw)) {
      return raw;
    }
    return GAME_THEME.BARON;
  } catch {
    return GAME_THEME.BARON;
  }
};

/** Persists the active game theme to localStorage. */
export const persistGameTheme = (theme: GameThemeType): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage quota errors
  }
};

/** Reads the persisted boss skill configuration from localStorage. */
export const getStoredBossSkillConfig = (): BossSkillConfig => {
  if (typeof window === 'undefined') return DEFAULT_BOSS_SKILL_CONFIG;
  try {
    const raw = localStorage.getItem(BOSS_SKILL_STORAGE_KEY);
    if (!raw) return DEFAULT_BOSS_SKILL_CONFIG;
    return { ...DEFAULT_BOSS_SKILL_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BOSS_SKILL_CONFIG;
  }
};

/** Persists the boss skill configuration to localStorage. */
export const persistBossSkillConfig = (config: BossSkillConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BOSS_SKILL_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
};

/** Reads the persisted overlay visibility settings from localStorage. */
export const getStoredOverlayVisibility = (): OverlayVisibility => {
  if (typeof window === 'undefined') return DEFAULT_OVERLAY_VISIBILITY;
  try {
    const raw = localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) return DEFAULT_OVERLAY_VISIBILITY;
    const parsed = JSON.parse(raw) as Partial<OverlayVisibility>;
    return { ...DEFAULT_OVERLAY_VISIBILITY, ...parsed };
  } catch {
    return DEFAULT_OVERLAY_VISIBILITY;
  }
};

/** Persists overlay visibility settings to localStorage. */
export const persistOverlayVisibility = (visibility: OverlayVisibility): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // ignore storage error
  }
};

/** Reads the persisted auto pro battle configuration from localStorage. */
export const getStoredAutoProBattleConfig = (): AutoProBattleConfig => {
  if (typeof window === 'undefined') return DEFAULT_AUTO_PRO_BATTLE_CONFIG;
  try {
    const raw = localStorage.getItem(AUTO_PRO_STORAGE_KEY);
    if (!raw) return DEFAULT_AUTO_PRO_BATTLE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AutoProBattleConfig>;
    return {
      ...DEFAULT_AUTO_PRO_BATTLE_CONFIG,
      ...parsed,
      enabled: parsed.enabled ?? DEFAULT_AUTO_PRO_BATTLE_CONFIG.enabled,
      onlyWhenIdle: parsed.onlyWhenIdle ?? DEFAULT_AUTO_PRO_BATTLE_CONFIG.onlyWhenIdle,
    };
  } catch {
    return DEFAULT_AUTO_PRO_BATTLE_CONFIG;
  }
};

/** Persists auto pro battle configuration to localStorage. */
export const persistAutoProBattleConfig = (config: AutoProBattleConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTO_PRO_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage error
  }
};

/** Reads the persisted auto summon configuration from localStorage. */
export const getStoredAutoSummonConfig = (): AutoSummonConfig => {
  if (typeof window === 'undefined') return DEFAULT_AUTO_SUMMON_CONFIG;
  try {
    const raw = localStorage.getItem(AUTO_SUMMON_STORAGE_KEY);
    if (!raw) return DEFAULT_AUTO_SUMMON_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AutoSummonConfig>;
    const team = parsed.team === TEAM_KEY.GENG ? TEAM_KEY.GENG : TEAM_KEY.BLG;
    return { ...DEFAULT_AUTO_SUMMON_CONFIG, ...parsed, team };
  } catch {
    return DEFAULT_AUTO_SUMMON_CONFIG;
  }
};

/** Persists auto summon configuration to localStorage. */
export const persistAutoSummonConfig = (config: AutoSummonConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTO_SUMMON_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage error
  }
};

/** Reads and sanitizes the persisted team & match queue configuration from localStorage. */
export const getStoredTeamConfig = (): TeamConfigState => {
  if (typeof window === 'undefined') return createDefaultTeamConfig();
  try {
    const raw = localStorage.getItem(TEAM_CONFIG_STORAGE_KEY);
    if (!raw) return createDefaultTeamConfig();
    return sanitizeTeamConfigState(JSON.parse(raw)) ?? createDefaultTeamConfig();
  } catch {
    return createDefaultTeamConfig();
  }
};

/** Persists team & match queue configuration to localStorage. */
export const persistTeamConfig = (config: TeamConfigState): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEAM_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
};
