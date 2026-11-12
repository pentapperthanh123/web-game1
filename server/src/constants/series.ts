export type SeriesFormat = 'BO1' | 'BO3' | 'BO5';

export interface SeriesFormatConfig {
  format: SeriesFormat;
  targetWins: number;
  maxRounds: number;
  blgScore: number;
  gengScore: number;
  currentRound: number;
}

export const SERIES_SPECS: Record<SeriesFormat, { targetWins: number; maxRounds: number }> = {
  BO1: { targetWins: 1, maxRounds: 1 },
  BO3: { targetWins: 2, maxRounds: 3 },
  BO5: { targetWins: 3, maxRounds: 5 },
};

export const DEFAULT_SERIES_CONFIG: SeriesFormatConfig = {
  format: 'BO5',
  targetWins: 3,
  maxRounds: 5,
  blgScore: 0,
  gengScore: 0,
  currentRound: 1,
};

export function getSeriesFormatSpecs(format: SeriesFormat): { targetWins: number; maxRounds: number } {
  return SERIES_SPECS[format] ?? SERIES_SPECS.BO5;
}

export function isDeciderRound(blgScore: number, gengScore: number, targetWins: number): boolean {
  if (targetWins <= 1) return false;
  return blgScore === gengScore && blgScore === targetWins - 1;
}

export type DuelLaneKey = 'MID' | 'TOP' | 'JUG' | 'ADC' | 'SUP';

export interface DuelFighter {
  id: string;
  name: string;
  champion: string;
  avatarUrl: string;
  team: 'BLG' | 'GENG';
}

export interface SilverScrapesDuelEvent {
  type: 'TAP' | 'SKILL' | 'ULTIMATE' | 'MYTHIC';
  donorName: string;
  team: 'BLG' | 'GENG';
  deltaPercent: number;
  description: string;
}

export interface SilverScrapesDuelState {
  isActive: boolean;
  timeRemaining: number;
  totalDuration: number;
  tugOfWarPercent: number;
  selectedLane: DuelLaneKey;
  leftFighter: DuelFighter;
  rightFighter: DuelFighter;
  winner: 'BLG' | 'GENG' | 'DRAW' | null;
  isLastStandActive: boolean;
  lastEvent?: SilverScrapesDuelEvent;
  buffActiveUntil?: number;
  winningTeamBuff?: 'BLG' | 'GENG' | null;
}

export const DEFAULT_DUEL_STATE: SilverScrapesDuelState = {
  isActive: false,
  timeRemaining: 60,
  totalDuration: 60,
  tugOfWarPercent: 50,
  selectedLane: 'MID',
  leftFighter: {
    id: 'left_mid',
    name: 'Fighter A',
    champion: 'Ahri',
    avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ahri.png',
    team: 'BLG',
  },
  rightFighter: {
    id: 'right_mid',
    name: 'Fighter B',
    champion: 'Yone',
    avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Yone.png',
    team: 'GENG',
  },
  winner: null,
  isLastStandActive: false,
  winningTeamBuff: null,
};
