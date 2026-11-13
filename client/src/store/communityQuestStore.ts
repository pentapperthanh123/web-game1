import { create } from 'zustand';
import {
  COMMUNITY_QUEST_CONSTANTS,
  QUEST_KIND,
  QuestKind,
  TEAM_KEY,
  TeamType,
} from '../constants/game';

/**
 * Per-round community quests (likes / summons / gift coins) for each team.
 * Kept in its own small store so the HUD bars re-render without touching the main game store.
 */
export interface QuestProgress {
  value: number;
  /** Number of tiers already rewarded. */
  claimedTiers: number;
}

type TeamQuestProgress = Record<QuestKind, QuestProgress>;

interface CommunityQuestState {
  progress: Record<TeamType, TeamQuestProgress>;
  /** Team damage buff (from the SUMMONS quest) is active until this time. */
  damageBuffUntil: Record<TeamType, number>;
}

const createTeamProgress = (): TeamQuestProgress => ({
  [QUEST_KIND.LIKES]: { value: 0, claimedTiers: 0 },
  [QUEST_KIND.SUMMONS]: { value: 0, claimedTiers: 0 },
  [QUEST_KIND.COINS]: { value: 0, claimedTiers: 0 },
});

const createInitialState = (): CommunityQuestState => ({
  progress: {
    [TEAM_KEY.BLG]: createTeamProgress(),
    [TEAM_KEY.GENG]: createTeamProgress(),
  },
  damageBuffUntil: {
    [TEAM_KEY.BLG]: 0,
    [TEAM_KEY.GENG]: 0,
  },
});

export const useCommunityQuestStore = create<CommunityQuestState>(() => createInitialState());

export const getQuestTiers = (kind: QuestKind): readonly number[] => COMMUNITY_QUEST_CONSTANTS.TIERS[kind];

/** Next tier target, or the last tier once everything is claimed (bar then shows full). */
export const getNextQuestTarget = (kind: QuestKind, claimedTiers: number): number => {
  const tiers = getQuestTiers(kind);
  return tiers[Math.min(claimedTiers, tiers.length - 1)];
};

/**
 * Adds progress and returns the tier numbers (1-based) newly reached by this increment,
 * so the caller can apply each reward exactly once.
 */
export const recordQuestProgress = (team: TeamType, kind: QuestKind, amount: number): number[] => {
  if (!Number.isFinite(amount) || amount <= 0) return [];
  const tiers = getQuestTiers(kind);
  const current = useCommunityQuestStore.getState().progress[team][kind];
  const nextValue = current.value + amount;
  const reachedTiers: number[] = [];
  let claimedTiers = current.claimedTiers;
  while (claimedTiers < tiers.length && nextValue >= tiers[claimedTiers]) {
    claimedTiers += 1;
    reachedTiers.push(claimedTiers);
  }

  useCommunityQuestStore.setState((state) => ({
    progress: {
      ...state.progress,
      [team]: { ...state.progress[team], [kind]: { value: nextValue, claimedTiers } },
    },
  }));
  return reachedTiers;
};

export const activateTeamDamageBuff = (team: TeamType, now: number): void => {
  useCommunityQuestStore.setState((state) => ({
    damageBuffUntil: {
      ...state.damageBuffUntil,
      [team]: now + COMMUNITY_QUEST_CONSTANTS.DAMAGE_BUFF_DURATION_MS,
    },
  }));
};

export const getQuestDamageMultiplier = (team: TeamType, now: number): number => {
  const isBuffActive = now < useCommunityQuestStore.getState().damageBuffUntil[team];
  return isBuffActive ? COMMUNITY_QUEST_CONSTANTS.DAMAGE_BUFF_MULTIPLIER : 1;
};

export const resetCommunityQuests = (): void => {
  useCommunityQuestStore.setState(createInitialState());
};
