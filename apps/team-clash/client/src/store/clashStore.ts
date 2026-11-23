import { create } from 'zustand';
import {
  CHAT_RATE_LIMIT_PER_USER_MS,
  DEFAULT_PUSH_MULTIPLIERS,
  DEFAULT_ROUND_DURATION_SECONDS,
  ROUND_END_DISPLAY_SECONDS,
  STROBE_WARNING_THRESHOLDS,
} from '../../../shared/constants/clashConfig';
import { DEFAULT_PRESET_ID, TEAM_PRESETS } from '../../../shared/constants/presets';
import type {
  ClashMatchState,
  PushMultipliers,
  TeamId,
  TeamPresetConfig,
  ViewerSummary,
} from '../../../shared/types/clash';
import type { NormalizedViewer } from '../../../shared/types/events';

interface ClashStoreState extends ClashMatchState {
  pushMultipliers: PushMultipliers;
  userTeamMap: Map<string, TeamId>;
  userScoreMap: Map<string, ViewerSummary>;
  lastChatTimes: Map<string, number>;
  screenShake: number; // 0 to 1 intensity
  // Actions
  getActivePreset: () => TeamPresetConfig;
  handleChat: (user: NormalizedViewer, text: string) => void;
  handleLike: (user: NormalizedViewer, count: number) => void;
  handleGift: (
    user: NormalizedViewer,
    giftName: string,
    coinValue: number,
    repeatCount: number
  ) => void;
  handleJoin: (user: NormalizedViewer) => void;
  tickGameLoop: (deltaSeconds: number) => void;
  resetRound: () => void;
  rebalance5050: () => void;
  dramaBoost: () => void;
  setPreset: (presetId: string) => void;
  setCustomPreset: (preset: TeamPresetConfig) => void;
  setLanguage: (lang: 'EN' | 'VI') => void;
  setRoundDuration: (seconds: number) => void;
  setPushMultipliers: (multipliers: Partial<PushMultipliers>) => void;
  triggerScreenShake: (intensity: number) => void;
}

const DEFAULT_INITIAL_STATE: ClashMatchState = {
  roundNumber: 1,
  seriesScore: { left: 0, right: 0 },
  roundStatus: 'PLAYING',
  roundTimeRemaining: DEFAULT_ROUND_DURATION_SECONDS,
  roundDurationSeconds: DEFAULT_ROUND_DURATION_SECONDS,
  clashPosition: 50.0,
  targetPosition: 50.0,
  leftScore: 0,
  rightScore: 0,
  activePresetId: DEFAULT_PRESET_ID,
  language: 'EN',
  recentLeftContributors: [],
  recentRightContributors: [],
  topRoundContributors: [],
  lastRoundWinner: null,
  roundEndCountdown: ROUND_END_DISPLAY_SECONDS,
  neutralEnergySurge: 0,
  isStrobeWarning: false,
};

export function getEffectivePreset(
  activePresetId: string,
  customPreset?: TeamPresetConfig
): TeamPresetConfig {
  if (customPreset && activePresetId === 'custom') {
    return customPreset;
  }
  return TEAM_PRESETS[activePresetId] ?? TEAM_PRESETS[DEFAULT_PRESET_ID];
}

function updateContributorList(
  currentList: ViewerSummary[],
  contributor: ViewerSummary
): ViewerSummary[] {
  const filtered = currentList.filter((item) => item.id !== contributor.id);
  return [contributor, ...filtered].slice(0, 3);
}

export const useClashStore = create<ClashStoreState>()((set, get) => ({
  ...DEFAULT_INITIAL_STATE,
  pushMultipliers: { ...DEFAULT_PUSH_MULTIPLIERS },
  userTeamMap: new Map<string, TeamId>(),
  userScoreMap: new Map<string, ViewerSummary>(),
  lastChatTimes: new Map<string, number>(),
  screenShake: 0,

  getActivePreset: () => {
    const { activePresetId, customPreset } = get();
    return getEffectivePreset(activePresetId, customPreset);
  },

  handleChat: (user: NormalizedViewer, text: string) => {
    const { roundStatus, userTeamMap, lastChatTimes, pushMultipliers } = get();
    if (roundStatus !== 'PLAYING') {
      return;
    }

    const trimmed = text.trim().toLowerCase();
    const preset = get().getActivePreset();
    const now = Date.now();

    // Determine target team by keyword or existing user team
    let detectedTeam: TeamId | null = null;
    if (preset.leftTeam.keywords.includes(trimmed)) {
      detectedTeam = 'LEFT';
    } else if (preset.rightTeam.keywords.includes(trimmed)) {
      detectedTeam = 'RIGHT';
    } else {
      detectedTeam = userTeamMap.get(user.id) ?? null;
    }

    if (!detectedTeam) {
      return;
    }

    // Persist choice to userTeamMap
    userTeamMap.set(user.id, detectedTeam);

    // Anti-spam rate limit per user
    const lastChat = lastChatTimes.get(user.id) ?? 0;
    const isRateLimited = now - lastChat < CHAT_RATE_LIMIT_PER_USER_MS;
    lastChatTimes.set(user.id, now);

    if (isRateLimited) {
      return;
    }

    // Apply push force
    const deltaPush = pushMultipliers.chatPush;
    const pushAmount = detectedTeam === 'LEFT' ? deltaPush : -deltaPush;

    // Track contributor
    const currentSummary: ViewerSummary = get().userScoreMap.get(user.id) ?? {
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      avatarUrl: user.avatarUrl,
      team: detectedTeam,
      totalPoints: 0,
    };
    currentSummary.totalPoints += 1;
    currentSummary.team = detectedTeam;
    get().userScoreMap.set(user.id, currentSummary);

    set((state) => {
      const nextTarget = Math.max(0, Math.min(100, state.targetPosition + pushAmount));
      const nextRecent =
        detectedTeam === 'LEFT'
          ? updateContributorList(state.recentLeftContributors, currentSummary)
          : updateContributorList(state.recentRightContributors, currentSummary);

      return {
        targetPosition: nextTarget,
        leftScore: detectedTeam === 'LEFT' ? state.leftScore + 1 : state.leftScore,
        rightScore: detectedTeam === 'RIGHT' ? state.rightScore + 1 : state.rightScore,
        recentLeftContributors:
          detectedTeam === 'LEFT' ? nextRecent : state.recentLeftContributors,
        recentRightContributors:
          detectedTeam === 'RIGHT' ? nextRecent : state.recentRightContributors,
      };
    });
  },

  handleLike: (user: NormalizedViewer, count: number) => {
    const { roundStatus, userTeamMap, pushMultipliers } = get();
    if (roundStatus !== 'PLAYING') {
      return;
    }

    const assignedTeam = userTeamMap.get(user.id);
    const likeBatchCount = Math.max(1, count);
    const likeDelta = likeBatchCount * pushMultipliers.likePush;

    if (!assignedTeam) {
      set((state) => ({
        neutralEnergySurge: Math.min(100, state.neutralEnergySurge + likeBatchCount * 0.5),
      }));
      return;
    }

    const pushAmount = assignedTeam === 'LEFT' ? likeDelta : -likeDelta;
    set((state) => {
      const nextTarget = Math.max(0, Math.min(100, state.targetPosition + pushAmount));
      return {
        targetPosition: nextTarget,
        leftScore: assignedTeam === 'LEFT' ? state.leftScore + likeBatchCount : state.leftScore,
        rightScore: assignedTeam === 'RIGHT' ? state.rightScore + likeBatchCount : state.rightScore,
      };
    });
  },

  handleGift: (
    user: NormalizedViewer,
    _giftName: string,
    coinValue: number,
    repeatCount: number
  ) => {
    const { roundStatus, userTeamMap, pushMultipliers } = get();
    if (roundStatus !== 'PLAYING') {
      return;
    }

    let assignedTeam = userTeamMap.get(user.id);
    if (!assignedTeam) {
      // Default to team based on coin parity or left if unassigned
      assignedTeam = 'LEFT';
      userTeamMap.set(user.id, assignedTeam);
    }

    const totalCoins = Math.max(1, coinValue) * Math.max(1, repeatCount);
    let pushBonus = pushMultipliers.smallGiftPush;
    let shakeIntensity = 0;

    if (totalCoins >= 30) {
      pushBonus = pushMultipliers.largeGiftPush;
      shakeIntensity = 1.0;
    } else if (totalCoins >= 5) {
      pushBonus = pushMultipliers.mediumGiftPush;
      shakeIntensity = 0.5;
    }

    const pushAmount = assignedTeam === 'LEFT' ? pushBonus : -pushBonus;

    // Track points
    const currentSummary: ViewerSummary = get().userScoreMap.get(user.id) ?? {
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      avatarUrl: user.avatarUrl,
      team: assignedTeam,
      totalPoints: 0,
    };
    currentSummary.totalPoints += totalCoins * 10;
    get().userScoreMap.set(user.id, currentSummary);

    set((state) => {
      const nextTarget = Math.max(0, Math.min(100, state.targetPosition + pushAmount));
      const nextRecent =
        assignedTeam === 'LEFT'
          ? updateContributorList(state.recentLeftContributors, currentSummary)
          : updateContributorList(state.recentRightContributors, currentSummary);

      return {
        targetPosition: nextTarget,
        leftScore:
          assignedTeam === 'LEFT' ? state.leftScore + totalCoins * 5 : state.leftScore,
        rightScore:
          assignedTeam === 'RIGHT' ? state.rightScore + totalCoins * 5 : state.rightScore,
        recentLeftContributors:
          assignedTeam === 'LEFT' ? nextRecent : state.recentLeftContributors,
        recentRightContributors:
          assignedTeam === 'RIGHT' ? nextRecent : state.recentRightContributors,
        screenShake: Math.max(state.screenShake, shakeIntensity),
      };
    });
  },

  handleJoin: (_user: NormalizedViewer) => {
    // Lightweight join handling: increase neutral atmosphere without clutter
    set((state) => ({
      neutralEnergySurge: Math.min(100, state.neutralEnergySurge + 0.1),
    }));
  },

  tickGameLoop: (deltaSeconds: number) => {
    const { roundStatus, clashPosition, targetPosition, roundTimeRemaining, roundEndCountdown } =
      get();

    // 1. Lerp clashPosition towards targetPosition
    const LERP_FACTOR = 0.12;
    const nextClashPos = clashPosition + (targetPosition - clashPosition) * LERP_FACTOR;

    // 2. Strobe Warning check
    const isWarning =
      nextClashPos >= STROBE_WARNING_THRESHOLDS.RIGHT_CRITICAL ||
      nextClashPos <= STROBE_WARNING_THRESHOLDS.LEFT_CRITICAL;

    // 3. Screen shake decay
    const currentShake = get().screenShake;
    const nextShake = currentShake > 0 ? Math.max(0, currentShake - deltaSeconds * 2.5) : 0;

    // Check round over condition during PLAYING
    if (roundStatus === 'PLAYING') {
      const isKnockout = nextClashPos >= 100 || nextClashPos <= 0;
      const isTimeOut = roundTimeRemaining <= 0;

      if (isKnockout || isTimeOut) {
        // Calculate winner
        const winner: TeamId = nextClashPos >= 50 ? 'LEFT' : 'RIGHT';
        const sortedMVPs = Array.from(get().userScoreMap.values())
          .sort((a: ViewerSummary, b: ViewerSummary) => b.totalPoints - a.totalPoints)
          .slice(0, 3);

        set((state) => ({
          clashPosition: nextClashPos,
          isStrobeWarning: isWarning,
          screenShake: nextShake,
          roundStatus: 'ROUND_END',
          lastRoundWinner: winner,
          roundEndCountdown: ROUND_END_DISPLAY_SECONDS,
          topRoundContributors: sortedMVPs,
          seriesScore: {
            left: winner === 'LEFT' ? state.seriesScore.left + 1 : state.seriesScore.left,
            right: winner === 'RIGHT' ? state.seriesScore.right + 1 : state.seriesScore.right,
          },
        }));
        return;
      }

      // Decrement match timer
      const nextTime = Math.max(0, roundTimeRemaining - deltaSeconds);
      set({
        clashPosition: nextClashPos,
        roundTimeRemaining: nextTime,
        isStrobeWarning: isWarning,
        screenShake: nextShake,
      });
      return;
    }

    // If ROUND_END: count down 5 seconds to next round
    if (roundStatus === 'ROUND_END') {
      const nextCountdown = roundEndCountdown - deltaSeconds;
      if (nextCountdown <= 0) {
        // Start next round automatically
        get().resetRound();
        return;
      }

      set({
        clashPosition: nextClashPos,
        roundEndCountdown: nextCountdown,
        screenShake: nextShake,
      });
    }
  },

  resetRound: () => {
    set((state) => ({
      roundNumber: state.roundNumber + 1,
      roundStatus: 'PLAYING',
      roundTimeRemaining: state.roundDurationSeconds,
      clashPosition: 50.0,
      targetPosition: 50.0,
      leftScore: 0,
      rightScore: 0,
      recentLeftContributors: [],
      recentRightContributors: [],
      topRoundContributors: [],
      lastRoundWinner: null,
      roundEndCountdown: ROUND_END_DISPLAY_SECONDS,
      isStrobeWarning: false,
      screenShake: 0,
    }));
  },

  rebalance5050: () => {
    set({
      targetPosition: 50.0,
      clashPosition: 50.0,
    });
  },

  dramaBoost: () => {
    // Invert position to give trailing team instant advantage
    set((state) => {
      const invertedTarget = 100 - state.targetPosition;
      return {
        targetPosition: invertedTarget,
        screenShake: 0.8,
      };
    });
  },

  setPreset: (presetId: string) => {
    set({ activePresetId: presetId });
  },

  setCustomPreset: (preset: TeamPresetConfig) => {
    set({
      activePresetId: 'custom',
      customPreset: preset,
    });
  },

  setLanguage: (lang: 'EN' | 'VI') => {
    set({ language: lang });
  },

  setRoundDuration: (seconds: number) => {
    set({
      roundDurationSeconds: seconds,
      roundTimeRemaining: seconds,
    });
  },

  setPushMultipliers: (multipliers: Partial<PushMultipliers>) => {
    set((state) => ({
      pushMultipliers: { ...state.pushMultipliers, ...multipliers },
    }));
  },

  triggerScreenShake: (intensity: number) => {
    set({ screenShake: Math.min(1.0, intensity) });
  },
}));
