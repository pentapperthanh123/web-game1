import { TeamType } from '../constants/game';

export type TeamSlotKey = TeamType;

export type TeamColorThemeId =
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'orange'
  | 'violet'
  | 'emerald'
  | 'blue'
  | 'red';

export type PlayerRole = 'TOP' | 'JUG' | 'MID' | 'ADC' | 'SUP';

export interface TeamPlayerProfile {
  id: string;
  name: string;
  role: PlayerRole;
  roleName: string;
  signatureChampion: string;
  championKey: string;
  team: TeamSlotKey;
  color: string;
  avatarUrl: string;
}

export interface QueuedMatchup {
  id: string;
  label: string;
  leftTeamId: string;
  rightTeamId: string;
}

export interface TeamPackExport {
  version: number;
  exportedAt: string;
  teams: TeamProfile[];
  matchQueue: QueuedMatchup[];
}

export interface TeamProfile {
  id: string;
  name: string;
  shortTag: string;
  aliases: string[];
  autoSyncRosterAliases?: boolean;
  colorTheme: TeamColorThemeId;
  logoUrl: string;
  isPreset?: boolean;
  roster: TeamPlayerProfile[];
}

export type ActiveTeamsMap = Record<TeamSlotKey, TeamProfile>;

export interface TeamConfigState {
  activeTeams: ActiveTeamsMap;
  teamCatalog: TeamProfile[];
  matchQueue: QueuedMatchup[];
}

export interface TeamConfigUpdatePayload extends TeamConfigState {
  resetMatch?: boolean;
  senderId?: string;
}

export interface TeamColorPalette {
  id: TeamColorThemeId;
  labelVi: string;
  labelEn: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  critHex: string;
  swatchClass: string;
  textClass: string;
  textStrongClass: string;
  textMutedClass: string;
  borderClass: string;
  borderSoftClass: string;
  borderSubtleClass: string;
  bgSoftClass: string;
  bgBadgeClass: string;
  badgePillClass: string;
  pillButtonClass: string;
  adminActiveBtnClass: string;
  tugBarLeftClass: string;
  tugBarRightClass: string;
  winPipActiveClass: string;
  glowOrbClass: string;
  glowStyle: string;
  giftBannerGradientClass: string;
  rosterCardActiveClass: string;
  summonPortalBorderClass: string;
  avatarInitialsBgClass: string;
  avatarFallbackIconClass: string;
  likeBadgeBorderClass: string;
  chatAvatarClass: string;
}

export interface HotMatchupPreset {
  id: string;
  label: string;
  leftTeamId: string;
  rightTeamId: string;
}
