import { findChampion, getRandomChampion } from '../constants/champions';
import { ActiveTeamsMap, createDefaultTeamConfig, matchCommentTeam } from '../constants/teams';

export interface SummonCommandResult {
  championName: string;
  team: 'BLG' | 'GENG';
}

/**
 * Parses a viewer chat comment to detect a champion summon command (including random keywords) and target team.
 */
export const detectSummonCommand = (
  text: string,
  defaultTeam: 'BLG' | 'GENG' = 'BLG',
  activeTeams?: ActiveTeamsMap
): SummonCommandResult | null => {
  if (!text || !text.trim()) return null;

  const upper = text.toUpperCase().trim();

  const team: 'BLG' | 'GENG' | undefined = matchCommentTeam(
    text,
    activeTeams || createDefaultTeamConfig().activeTeams
  );

  // 1. Check random summon commands
  if (
    upper.includes('RANDOM') ||
    upper.includes('NGAU NHIEN') ||
    upper.includes('NGAUNHIEN')
  ) {
    const randomChamp = getRandomChampion();
    return {
      championName: randomChamp.name,
      team: team || (Math.random() < 0.5 ? 'BLG' : 'GENG'),
    };
  }

  // 2. Intelligent resolution against all 169 official champions
  const matched = findChampion(text);
  if (!matched) return null;

  return {
    championName: matched.name,
    team: team || defaultTeam,
  };
};
