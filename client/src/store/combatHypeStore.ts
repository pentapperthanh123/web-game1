import { create } from 'zustand';
import { TeamType } from '../constants/game';
import { VoiceManager } from '../services/caster/VoiceManager';

export const COMBAT_HYPE_CONSTANTS = {
  STREAK_WINDOW_MS: 3500,
  MIN_STREAK_COUNT: 5,
  FIRST_BLOOD_DURATION_MS: 2500,
  STREAK_DURATION_MS: 2000,
  OVERTIME_BANNER_DURATION_MS: 3000,
  OVERTIME_ALERT_SECONDS: 15,
} as const;

export interface FirstBloodInfo {
  summonerName: string;
  championName: string;
  team: TeamType;
  round: number;
  timestamp: number;
}

export interface SummonStreakInfo {
  team: TeamType;
  count: number;
  timestamp: number;
}

interface RollingSummonRecord {
  team: TeamType;
  timestamp: number;
}

interface CombatHypeState {
  firstBlood: FirstBloodInfo | null;
  streak: SummonStreakInfo | null;
  isOvertimeAlertActive: boolean;
  overtimeAlertStartedAt: number;
}

const rollingSummons: RollingSummonRecord[] = [];
let currentTrackingRound = -1;
let lastOvertimeSoundRound = -1;

export const useCombatHypeStore = create<CombatHypeState>(() => ({
  firstBlood: null,
  streak: null,
  isOvertimeAlertActive: false,
  overtimeAlertStartedAt: 0,
}));

export const resetHypeForRound = (round: number): void => {
  currentTrackingRound = round;
  rollingSummons.length = 0;
  useCombatHypeStore.setState({
    firstBlood: null,
    streak: null,
    isOvertimeAlertActive: false,
    overtimeAlertStartedAt: 0,
  });
};

/**
 * Called on every viewer summon:
 * 1. Checks and claims First Blood for the current round if unclaimed.
 * 2. Checks rolling summon frequency to trigger or increment Summon Streak.
 */
export const recordHypeSummon = (
  summonerName: string,
  championName: string,
  team: TeamType,
  round: number,
  now = Date.now()
): void => {
  if (round !== currentTrackingRound) {
    resetHypeForRound(round);
  }

  const state = useCombatHypeStore.getState();

  // 1. First Blood Check
  if (!state.firstBlood) {
    useCombatHypeStore.setState({
      firstBlood: {
        summonerName,
        championName,
        team,
        round,
        timestamp: now,
      },
    });
  }

  // 2. Rolling Summon Streak Check
  rollingSummons.push({ team, timestamp: now });
  const cutoff = now - COMBAT_HYPE_CONSTANTS.STREAK_WINDOW_MS;

  // Prune old summons
  while (rollingSummons.length > 0 && rollingSummons[0].timestamp < cutoff) {
    rollingSummons.shift();
  }

  // Count recent summons for this team
  let teamCount = 0;
  for (let i = rollingSummons.length - 1; i >= 0; i--) {
    if (rollingSummons[i].team === team) {
      teamCount++;
    }
  }

  if (teamCount >= COMBAT_HYPE_CONSTANTS.MIN_STREAK_COUNT) {
    useCombatHypeStore.setState({
      streak: {
        team,
        count: teamCount,
        timestamp: now,
      },
    });
  }
};

export const dismissFirstBlood = (): void => {
  useCombatHypeStore.setState({ firstBlood: null });
};

export const dismissStreak = (): void => {
  useCombatHypeStore.setState({ streak: null });
};

export const triggerOvertimeSurgeAlert = (round: number, now = Date.now()): void => {
  const state = useCombatHypeStore.getState();
  if (state.isOvertimeAlertActive && now - state.overtimeAlertStartedAt < COMBAT_HYPE_CONSTANTS.OVERTIME_BANNER_DURATION_MS) {
    return;
  }

  useCombatHypeStore.setState({
    isOvertimeAlertActive: true,
    overtimeAlertStartedAt: now,
  });

  if (lastOvertimeSoundRound !== round) {
    lastOvertimeSoundRound = round;
    try {
      VoiceManager.playCaster('clutch_final_10s');
    } catch {}
  }
};

export const dismissOvertimeAlert = (): void => {
  useCombatHypeStore.setState({ isOvertimeAlertActive: false, overtimeAlertStartedAt: 0 });
};
