import { TeamProfile } from '../types/team';

/**
 * Series titles won by each team, grouped by matchup.
 * Keyed by team id (not left/right slot) so the record follows the teams even
 * when they swap sides or another matchup is played in between.
 *   { "geng__vs__t1": { "t1": 3, "geng": 1 } }
 */
export type ChampionshipTally = Record<string, Record<string, number>>;

export const CHAMPIONSHIP_TALLY_STORAGE_KEY = 'lol_championship_tally_v1';
const MATCHUP_KEY_SEPARATOR = '__vs__';

export interface MatchupTitleCount {
  leftTitles: number;
  rightTitles: number;
}

/** Order-independent key: T1 vs GEN and GEN vs T1 share one record. */
export const buildMatchupKey = (teamIdA: string, teamIdB: string): string =>
  [teamIdA, teamIdB].sort().join(MATCHUP_KEY_SEPARATOR);

export const getMatchupTitleCount = (
  tally: ChampionshipTally,
  leftTeam: TeamProfile,
  rightTeam: TeamProfile
): MatchupTitleCount => {
  const record = tally[buildMatchupKey(leftTeam.id, rightTeam.id)] ?? {};
  return {
    leftTitles: record[leftTeam.id] ?? 0,
    rightTitles: record[rightTeam.id] ?? 0,
  };
};

/** Returns a new tally with one more title for `winnerTeam` in this matchup. */
export const addChampionshipTitle = (
  tally: ChampionshipTally,
  winnerTeam: TeamProfile,
  loserTeam: TeamProfile
): ChampionshipTally => {
  const matchupKey = buildMatchupKey(winnerTeam.id, loserTeam.id);
  const record = tally[matchupKey] ?? {};
  return {
    ...tally,
    [matchupKey]: {
      ...record,
      [winnerTeam.id]: (record[winnerTeam.id] ?? 0) + 1,
      [loserTeam.id]: record[loserTeam.id] ?? 0,
    },
  };
};

/** Returns a new tally with this matchup's titles cleared (other matchups untouched). */
export const clearMatchupTitles = (
  tally: ChampionshipTally,
  leftTeam: TeamProfile,
  rightTeam: TeamProfile
): ChampionshipTally => {
  const nextTally = { ...tally };
  delete nextTally[buildMatchupKey(leftTeam.id, rightTeam.id)];
  return nextTally;
};

const isTitleRecord = (value: unknown): value is Record<string, number> => {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every((count) => typeof count === 'number' && Number.isFinite(count));
};

/** Reads the persisted tally, dropping any malformed matchup entries. */
export const getStoredChampionshipTally = (): ChampionshipTally => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CHAMPIONSHIP_TALLY_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, record]) => isTitleRecord(record)));
  } catch (error) {
    console.warn('[ChampionshipTally] cannot read stored tally:', error);
    return {};
  }
};

export const persistChampionshipTally = (tally: ChampionshipTally): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAMPIONSHIP_TALLY_STORAGE_KEY, JSON.stringify(tally));
  } catch (error) {
    console.warn('[ChampionshipTally] cannot persist tally:', error);
  }
};
