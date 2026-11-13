import { useEffect } from 'react';
import { GAME_THEME, GameThemeType, MATCH_SNAPSHOT_CONSTANTS, TEAM_KEY } from '../constants/game';
import { DPSPlayer, GameState } from '../types/game';
import { useGameStore } from './gameStore';
import { isBattleHalted } from './storeHelpers';

/**
 * Mid-round state of the fight, saved to localStorage so an OBS / browser reload
 * resumes the same boss HP, round and damage race instead of starting over.
 * The BO score is also restored, but the server's series snapshot (sent on connect) stays authoritative.
 */
interface MatchSnapshot {
  version: number;
  savedAt: number;
  teamIds: [string, string];
  gameTheme: GameThemeType;
  bossHp: number;
  bossMaxHp: number;
  bo5Score: GameState['bo5Score'];
  currentRound: number;
  teamScoreBLG: number;
  teamScoreGENG: number;
  leaderboard: DPSPlayer[];
}

const LOG_PREFIX = '[MatchSnapshot]';

const getTeamIds = (state: GameState): [string, string] => [
  state.activeTeams[TEAM_KEY.BLG].id,
  state.activeTeams[TEAM_KEY.GENG].id,
];

const buildSnapshot = (state: GameState): MatchSnapshot => ({
  version: MATCH_SNAPSHOT_CONSTANTS.VERSION,
  savedAt: Date.now(),
  teamIds: getTeamIds(state),
  gameTheme: state.gameTheme,
  bossHp: state.bossHp,
  bossMaxHp: state.bossMaxHp,
  bo5Score: state.bo5Score,
  currentRound: state.currentRound,
  teamScoreBLG: state.teamScoreBLG,
  teamScoreGENG: state.teamScoreGENG,
  leaderboard: state.leaderboard,
});

/** Saves only while a round is being fought; between rounds there is nothing to resume. */
export const saveMatchSnapshot = (): void => {
  const state = useGameStore.getState();
  if (isBattleHalted(state)) return;
  try {
    localStorage.setItem(MATCH_SNAPSHOT_CONSTANTS.STORAGE_KEY, JSON.stringify(buildSnapshot(state)));
  } catch (error) {
    console.warn(`${LOG_PREFIX} cannot save snapshot:`, error);
  }
};

const readSnapshot = (): MatchSnapshot | null => {
  try {
    const raw = localStorage.getItem(MATCH_SNAPSHOT_CONSTANTS.STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const snapshot = parsed as MatchSnapshot;
    if (snapshot.version !== MATCH_SNAPSHOT_CONSTANTS.VERSION) return null;
    return snapshot;
  } catch (error) {
    console.warn(`${LOG_PREFIX} cannot read snapshot:`, error);
    return null;
  }
};

const isSnapshotUsable = (snapshot: MatchSnapshot, state: GameState): boolean => {
  const isFresh = Date.now() - snapshot.savedAt < MATCH_SNAPSHOT_CONSTANTS.MAX_AGE_MS;
  const [leftId, rightId] = getTeamIds(state);
  const isSameMatchup = snapshot.teamIds[0] === leftId && snapshot.teamIds[1] === rightId;
  const isBossAlive = Number.isFinite(snapshot.bossHp) && snapshot.bossHp > 0;
  const isKnownTheme = Object.values(GAME_THEME).includes(snapshot.gameTheme);
  return isFresh && isSameMatchup && isBossAlive && isKnownTheme;
};

/** Restores the saved round if it is recent and the same two teams are on stage. */
export const restoreMatchSnapshot = (): boolean => {
  const snapshot = readSnapshot();
  const state = useGameStore.getState();
  if (!snapshot || !isSnapshotUsable(snapshot, state)) return false;

  state.setGameTheme(snapshot.gameTheme);
  useGameStore.setState({
    bossHp: Math.min(snapshot.bossHp, snapshot.bossMaxHp),
    bossMaxHp: snapshot.bossMaxHp,
    bo5Score: snapshot.bo5Score,
    currentRound: snapshot.currentRound,
    teamScoreBLG: snapshot.teamScoreBLG,
    teamScoreGENG: snapshot.teamScoreGENG,
    leaderboard: snapshot.leaderboard,
  });
  state.addLog('SYSTEM', `♻️ Khôi phục trận đấu đang diễn ra (Ván ${snapshot.currentRound}, Boss ${snapshot.bossHp.toLocaleString()} HP)`);
  return true;
};

/** Mount once at the app root: restore on start, then save periodically and right before unload. */
export const useMatchSnapshotPersistence = (): void => {
  useEffect(() => {
    restoreMatchSnapshot();
    const intervalId = window.setInterval(saveMatchSnapshot, MATCH_SNAPSHOT_CONSTANTS.SAVE_INTERVAL_MS);
    window.addEventListener('beforeunload', saveMatchSnapshot);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', saveMatchSnapshot);
    };
  }, []);
};
