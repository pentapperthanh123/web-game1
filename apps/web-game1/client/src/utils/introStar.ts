import { PlayerRole, TeamProfile } from '../types/team';

const STAR_ROLE: PlayerRole = 'MID';

/** Champion shown when a team has no roster at all. */
export const INTRO_STAR_FALLBACK_CHAMPION = { LEFT: 'Ahri', RIGHT: 'Yone' } as const;

export interface IntroStar {
  name: string;
  signatureChampion: string;
  avatarUrl?: string;
}

/**
 * Player featured on the round intro matchup card (mid laner, else the first player).
 * Shared by the card and the AI caster so the voice names exactly who is on screen.
 */
export const pickIntroStar = (team: TeamProfile, fallbackChampion: string): IntroStar => {
  const star = team.roster.find((player) => player.role === STAR_ROLE) ?? team.roster[0];
  if (star) return { name: star.name, signatureChampion: star.signatureChampion, avatarUrl: star.avatarUrl };
  return { name: team.shortTag, signatureChampion: fallbackChampion };
};
