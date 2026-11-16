import { TEAM_KEY, TeamType } from '../../../constants/game';

export interface CelebrationStarConfig {
  id: number;
  top: string;
  left?: string;
  right?: string;
  size: string;
  delay: string;
  opacity: string;
}

export const VICTORY_CELEBRATION_STARS: readonly CelebrationStarConfig[] = [
  { id: 1, top: '7%', left: '8%', size: 'w-4 h-4', delay: '0s', opacity: 'opacity-70' },
  { id: 2, top: '12%', right: '10%', size: 'w-5 h-5', delay: '0.4s', opacity: 'opacity-85' },
  { id: 3, top: '24%', left: '6%', size: 'w-3 h-3', delay: '0.8s', opacity: 'opacity-60' },
  { id: 4, top: '27%', right: '7%', size: 'w-4 h-4', delay: '1.2s', opacity: 'opacity-75' },
];

export const resolveEffectiveWinner = (
  isSeriesEnded: boolean,
  seriesWinner: TeamType | null,
  roundWinner: TeamType | null,
  bo5Score: Record<TeamType, number> | { BLG: number; GENG: number },
  leftScore: number,
  rightScore: number
): TeamType => {
  if (isSeriesEnded) {
    if (seriesWinner) return seriesWinner;
    const scoreLeft = bo5Score[TEAM_KEY.BLG] ?? 0;
    const scoreRight = bo5Score[TEAM_KEY.GENG] ?? 0;
    return scoreLeft >= scoreRight ? TEAM_KEY.BLG : TEAM_KEY.GENG;
  }
  if (roundWinner) return roundWinner;
  return leftScore >= rightScore ? TEAM_KEY.BLG : TEAM_KEY.GENG;
};
