import { create } from 'zustand';
import {
  CHAT_PUSH_SHAKE,
  CHAT_PUSH_TIER,
  CHAT_RATE_LIMIT_PER_USER_MS,
  CLASH_CENTER_POSITION,
  CLASH_POSITION_LERP_FACTOR,
  CLASH_POSITION_SNAP_EPSILON,
  DEFAULT_PUSH_MULTIPLIERS,
  DEFAULT_ROUND_DURATION_SECONDS,
  ROUND_END_DISPLAY_SECONDS,
  STROBE_WARNING_THRESHOLDS,
} from '../../../shared/constants/clashConfig';
import { DEFAULT_PRESET_ID, TEAM_PRESETS } from '../../../shared/constants/presets';
import type {
  ClashMatchState,
  GiftAlertItem,
  PushMultipliers,
  PushResult,
  TeamId,
  TeamPresetConfig,
  ViewerSummary,
} from '../../../shared/types/clash';
import type { NormalizedViewer } from '../../../shared/types/events';
import { resolveGiftPushPercent, resolveGiftTier } from '../utils/giftCatalog';
import { audioService } from '../services/audioService';
import { useGiftTallyStore } from './giftTallyStore';

interface ClashStoreState extends ClashMatchState {
  pushMultipliers: PushMultipliers;
  userTeamMap: Map<string, TeamId>;
  userScoreMap: Map<string, ViewerSummary>;
  lastChatTimes: Map<string, number>;
  /** Push % each viewer's likes have added this round (capped by likePushMaxPerUserPerRound). */
  roundLikePush: Map<string, number>;
  screenShake: number; // 0 to 1 intensity
  /** Highest-scoring viewers of the current round, per team (fresh copies for React). */
  topLeftContributors: ViewerSummary[];
  topRightContributors: ViewerSummary[];
  // Actions
  getActivePreset: () => TeamPresetConfig;
  handleChat: (user: NormalizedViewer, text: string, explicitTeam?: TeamId) => PushResult | null;
  handleLike: (user: NormalizedViewer, count: number, explicitTeam?: TeamId) => PushResult | null;
  handleGift: (
    user: NormalizedViewer,
    giftName: string,
    coinValue: number,
    repeatCount: number,
    explicitTeam?: TeamId
  ) => PushResult | null;
  handleJoin: (user: NormalizedViewer) => void;
  tickGameLoop: (deltaSeconds: number) => void;
  startRound: () => void;
  pauseRound: () => void;
  resetRound: () => void;
  resetMatch: () => void;
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
  recentGiftAlerts: [],
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

const TEAM_TOP_LIMIT = 3;
const RECENT_CONTRIBUTOR_LIMIT = 3;

function getOrCreateSummary(
  scoreMap: Map<string, ViewerSummary>,
  user: NormalizedViewer,
  team: TeamId
): ViewerSummary {
  const existing = scoreMap.get(user.id);
  if (existing) {
    // Keep the freshest profile data (late avatar / renamed viewer).
    existing.nickname = user.nickname || existing.nickname;
    existing.avatarUrl = user.avatarUrl || existing.avatarUrl;
    existing.team = team;
    return existing;
  }

  const created: ViewerSummary = {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    avatarUrl: user.avatarUrl,
    team,
    totalPoints: 0,
  };
  scoreMap.set(user.id, created);
  return created;
}

/** Single pass top-N for one team; returns copies so list rows re-render when points change. */
function computeTeamTop(scoreMap: Map<string, ViewerSummary>, team: TeamId): ViewerSummary[] {
  const top: ViewerSummary[] = [];
  for (const summary of scoreMap.values()) {
    if (summary.team !== team) continue;
    let insertAt = top.length;
    while (insertAt > 0 && top[insertAt - 1].totalPoints < summary.totalPoints) {
      insertAt--;
    }
    if (insertAt >= TEAM_TOP_LIMIT) continue;
    top.splice(insertAt, 0, summary);
    if (top.length > TEAM_TOP_LIMIT) top.pop();
  }
  return top.map((summary) => ({ ...summary }));
}

function updateContributorList(
  currentList: ViewerSummary[],
  contributor: ViewerSummary
): ViewerSummary[] {
  const filtered = currentList.filter((item) => item.id !== contributor.id);
  return [{ ...contributor }, ...filtered].slice(0, RECENT_CONTRIBUTOR_LIMIT);
}

export const useClashStore = create<ClashStoreState>()((set, get) => ({
  ...DEFAULT_INITIAL_STATE,
  pushMultipliers: { ...DEFAULT_PUSH_MULTIPLIERS },
  userTeamMap: new Map<string, TeamId>(),
  userScoreMap: new Map<string, ViewerSummary>(),
  lastChatTimes: new Map<string, number>(),
  roundLikePush: new Map<string, number>(),
  screenShake: 0,
  topLeftContributors: [],
  topRightContributors: [],

  getActivePreset: () => {
    const { activePresetId, customPreset } = get();
    return getEffectivePreset(activePresetId, customPreset);
  },

  handleChat: (user: NormalizedViewer, text: string, explicitTeam?: TeamId) => {
    let { roundStatus } = get();
    // Auto-resume round if in WAITING state when interaction arrives
    if (roundStatus === 'WAITING') {
      get().startRound();
      roundStatus = 'PLAYING';
    } else if (roundStatus !== 'PLAYING') {
      return null;
    }

    const { userTeamMap, lastChatTimes, pushMultipliers } = get();

    const trimmed = text.trim().toLowerCase();
    const preset = get().getActivePreset();
    const now = Date.now();

    // Determine target team by explicitTeam, keyword, or existing user team
    let detectedTeam: TeamId | null = explicitTeam ?? null;
    if (!detectedTeam) {
      if (preset.leftTeam.keywords.includes(trimmed)) {
        detectedTeam = 'LEFT';
      } else if (preset.rightTeam.keywords.includes(trimmed)) {
        detectedTeam = 'RIGHT';
      } else {
        detectedTeam = userTeamMap.get(user.id) ?? null;
      }
    }

    if (!detectedTeam) {
      return null;
    }

    // Persist choice to userTeamMap
    userTeamMap.set(user.id, detectedTeam);

    // Anti-spam rate limit per user. Only accepted pushes start a new window, so comments
    // sent during the cooldown don't keep extending it.
    const lastChat = lastChatTimes.get(user.id) ?? 0;
    if (now - lastChat < CHAT_RATE_LIMIT_PER_USER_MS) {
      return null;
    }
    lastChatTimes.set(user.id, now);

    // Apply push force
    const deltaPush = pushMultipliers.chatPush;
    const pushAmount = detectedTeam === 'LEFT' ? deltaPush : -deltaPush;

    // Track contributor
    const scoreMap = get().userScoreMap;
    const currentSummary = getOrCreateSummary(scoreMap, user, detectedTeam);
    currentSummary.totalPoints += 1;
    const teamTop = computeTeamTop(scoreMap, detectedTeam);

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
        topLeftContributors: detectedTeam === 'LEFT' ? teamTop : state.topLeftContributors,
        topRightContributors: detectedTeam === 'RIGHT' ? teamTop : state.topRightContributors,
        screenShake: Math.max(state.screenShake, CHAT_PUSH_SHAKE),
      };
    });

    return {
      team: detectedTeam,
      amount: deltaPush,
      tier: CHAT_PUSH_TIER,
      source: 'CHAT',
      viewer: { ...currentSummary },
    };
  },

  handleLike: (user: NormalizedViewer, count: number, explicitTeam?: TeamId) => {
    let { roundStatus } = get();
    if (roundStatus === 'WAITING') {
      get().startRound();
      roundStatus = 'PLAYING';
    } else if (roundStatus !== 'PLAYING') {
      return null;
    }

    const { userTeamMap, pushMultipliers } = get();

    let assignedTeam = explicitTeam || userTeamMap.get(user.id);
    if (explicitTeam && !userTeamMap.has(user.id)) {
      userTeamMap.set(user.id, explicitTeam);
    }
    const likeBatchCount = Math.max(1, count);

    if (!assignedTeam) {
      set((state) => ({
        neutralEnergySurge: Math.min(100, state.neutralEnergySurge + likeBatchCount * 0.5),
      }));
      return null;
    }

    // Likes are free: cap how much one viewer's likes can push per round.
    const roundLikePush = get().roundLikePush;
    const usedLikePush = roundLikePush.get(user.id) ?? 0;
    const likeDelta = Math.min(
      likeBatchCount * pushMultipliers.likePush,
      Math.max(0, pushMultipliers.likePushMaxPerUserPerRound - usedLikePush)
    );
    if (likeDelta <= 0) {
      return null;
    }
    roundLikePush.set(user.id, usedLikePush + likeDelta);

    const likeSummary = get().userScoreMap.get(user.id);

    const pushAmount = assignedTeam === 'LEFT' ? likeDelta : -likeDelta;
    set((state) => {
      const nextTarget = Math.max(0, Math.min(100, state.targetPosition + pushAmount));
      return {
        targetPosition: nextTarget,
        leftScore: assignedTeam === 'LEFT' ? state.leftScore + likeBatchCount : state.leftScore,
        rightScore: assignedTeam === 'RIGHT' ? state.rightScore + likeBatchCount : state.rightScore,
      };
    });

    return {
      team: assignedTeam,
      amount: likeDelta,
      tier: 'SMALL',
      source: 'LIKE',
      viewer: {
        id: user.id,
        username: user.username,
        nickname: user.nickname || likeSummary?.nickname || user.username,
        avatarUrl: user.avatarUrl || likeSummary?.avatarUrl,
        team: assignedTeam,
        totalPoints: likeSummary?.totalPoints ?? 0,
      },
    };
  },

  handleGift: (
    user: NormalizedViewer,
    giftName: string,
    coinValue: number,
    repeatCount: number,
    explicitTeam?: TeamId
  ) => {
    let { roundStatus } = get();
    if (roundStatus === 'WAITING') {
      get().startRound();
      roundStatus = 'PLAYING';
    } else if (roundStatus !== 'PLAYING') {
      return null;
    }

    const { userTeamMap, pushMultipliers } = get();

    let assignedTeam = explicitTeam || userTeamMap.get(user.id);
    if (!assignedTeam) {
      // Default to team based on explicitTeam or left if unassigned
      assignedTeam = 'LEFT';
      userTeamMap.set(user.id, assignedTeam);
    } else if (explicitTeam && explicitTeam !== userTeamMap.get(user.id)) {
      assignedTeam = explicitTeam;
      userTeamMap.set(user.id, explicitTeam);
    }

    const safeRepeatCount = Math.max(1, repeatCount);
    const totalCoins = Math.max(1, coinValue) * safeRepeatCount;
    // Push scales with coins; tier only drives the visuals (shake, SFX, colors).
    const tier = resolveGiftTier(totalCoins);
    const pushBonus = resolveGiftPushPercent(totalCoins, pushMultipliers);
    const shakeIntensity = tier === 'LARGE' ? 1.0 : tier === 'MEDIUM' ? 0.5 : 0;

    const pushAmount = assignedTeam === 'LEFT' ? pushBonus : -pushBonus;

    // Track points
    const scoreMap = get().userScoreMap;
    const currentSummary = getOrCreateSummary(scoreMap, user, assignedTeam);
    currentSummary.totalPoints += totalCoins * 10;
    const teamTop = computeTeamTop(scoreMap, assignedTeam);

    const preset = get().getActivePreset();
    const teamObj = assignedTeam === 'LEFT' ? preset.leftTeam : preset.rightTeam;
    const alertItem: GiftAlertItem = {
      id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      username: user.username,
      nickname: user.nickname || currentSummary.nickname || user.username,
      avatarUrl: user.avatarUrl || currentSummary.avatarUrl,
      team: assignedTeam,
      teamName: teamObj.name,
      teamColor: teamObj.primaryColor,
      giftName,
      coinValue: Math.max(1, coinValue),
      repeatCount: safeRepeatCount,
      tier,
      pushPercent: pushBonus,
      timestamp: Date.now(),
    };

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
        topLeftContributors: assignedTeam === 'LEFT' ? teamTop : state.topLeftContributors,
        topRightContributors: assignedTeam === 'RIGHT' ? teamTop : state.topRightContributors,
        recentGiftAlerts: [alertItem, ...state.recentGiftAlerts].slice(0, 3),
        screenShake: Math.max(state.screenShake, shakeIntensity),
      };
    });

    return {
      team: assignedTeam,
      amount: pushBonus,
      tier,
      source: 'GIFT',
      viewer: { ...currentSummary },
      giftName,
      giftCount: safeRepeatCount,
    };
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

    // 1. Lerp clashPosition towards targetPosition (snap at the end so a 0/100 knockout lands on time)
    const lerpedPos = clashPosition + (targetPosition - clashPosition) * CLASH_POSITION_LERP_FACTOR;
    const nextClashPos =
      Math.abs(targetPosition - lerpedPos) < CLASH_POSITION_SNAP_EPSILON ? targetPosition : lerpedPos;

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
        // Winner by the real (target) position, not the lerped orb, so last-second pushes count.
        // Dead center: tie-break on round activity score; still equal = draw, nobody scores.
        const { leftScore, rightScore } = get();
        const finalPos = isKnockout ? nextClashPos : targetPosition;
        let winner: TeamId | null = null;
        if (finalPos > CLASH_CENTER_POSITION) winner = 'LEFT';
        else if (finalPos < CLASH_CENTER_POSITION) winner = 'RIGHT';
        else if (leftScore !== rightScore) winner = leftScore > rightScore ? 'LEFT' : 'RIGHT';
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
      const nowAlerts = get().recentGiftAlerts;
      const validAlerts =
        nowAlerts.length > 0
          ? nowAlerts.filter((a) => Date.now() - a.timestamp < 3800)
          : nowAlerts;

      set({
        clashPosition: nextClashPos,
        roundTimeRemaining: nextTime,
        isStrobeWarning: isWarning,
        screenShake: nextShake,
        recentGiftAlerts: validAlerts,
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
    // Points are per round: MVPs and TOP lists must not carry over.
    get().userScoreMap.clear();
    get().roundLikePush.clear();
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
      topLeftContributors: [],
      topRightContributors: [],
      topRoundContributors: [],
      lastRoundWinner: null,
      roundEndCountdown: ROUND_END_DISPLAY_SECONDS,
      isStrobeWarning: false,
      screenShake: 0,
    }));
  },

  resetMatch: () => {
    get().userScoreMap.clear();
    get().userTeamMap.clear();
    get().lastChatTimes.clear();
    get().roundLikePush.clear();
    useGiftTallyStore.getState().reset();
    audioService.stopBattleGroove();
    set((state) => ({
      roundNumber: 1,
      seriesScore: { left: 0, right: 0 },
      roundStatus: 'PLAYING',
      roundTimeRemaining: state.roundDurationSeconds,
      clashPosition: 50.0,
      targetPosition: 50.0,
      leftScore: 0,
      rightScore: 0,
      recentLeftContributors: [],
      recentRightContributors: [],
      topLeftContributors: [],
      topRightContributors: [],
      topRoundContributors: [],
      lastRoundWinner: null,
      roundEndCountdown: 0,
      isStrobeWarning: false,
      neutralEnergySurge: 0,
      screenShake: 0,
      recentGiftAlerts: [],
    }));
  },

  startRound: () => {
    set({ roundStatus: 'PLAYING' });
    audioService.onRoundStart();
  },

  pauseRound: () => {
    set({ roundStatus: 'WAITING' });
    audioService.stopBattleGroove();
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
