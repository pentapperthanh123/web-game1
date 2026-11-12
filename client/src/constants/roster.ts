import { TEAM_KEY, TeamType } from './game';
import { findChampion } from './champions';
import { TeamPlayerProfile } from '../types/team';
import {
  DDRAGON_CHAMPION_CDN,
  PRESET_TEAMS,
  findRosterPlayerInRoster,
} from './teams';

export type RosterPlayer = TeamPlayerProfile;
export { DDRAGON_CHAMPION_CDN };

export const OFFICIAL_TEAM_LOGOS: Record<TeamType, string> = {
  [TEAM_KEY.BLG]: PRESET_TEAMS[0].logoUrl,
  [TEAM_KEY.GENG]: PRESET_TEAMS[1].logoUrl,
};

export const BARON_AVATAR_URL = '/images/boss_baron_2d.png';

const TEAM_FALLBACK_CHAMPION_KEY: Record<TeamType, string> = {
  [TEAM_KEY.BLG]: 'Ahri',
  [TEAM_KEY.GENG]: 'Yone',
};

export const getChampionAvatarUrl = (championName: string, team: TeamType): string => {
  const champ = findChampion(championName);
  if (champ) {
    return champ.avatarUrl;
  }

  const fallbackKey = TEAM_FALLBACK_CHAMPION_KEY[team];
  return `${DDRAGON_CHAMPION_CDN}/${fallbackKey}.png`;
};

export const TEAM_ROSTERS: Record<TeamType, RosterPlayer[]> = {
  [TEAM_KEY.BLG]: PRESET_TEAMS[0].roster,
  [TEAM_KEY.GENG]: PRESET_TEAMS[1].roster,
};

export const findRosterPlayer = (
  championName: string,
  team: TeamType,
  dynamicRoster?: RosterPlayer[]
): RosterPlayer => {
  const list = dynamicRoster && dynamicRoster.length > 0 ? dynamicRoster : TEAM_ROSTERS[team];
  return findRosterPlayerInRoster(championName, list) || list[0];
};
