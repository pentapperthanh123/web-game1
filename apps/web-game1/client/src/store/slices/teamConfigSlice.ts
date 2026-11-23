import { StateCreator } from 'zustand';
import { GameState } from '../../types/game';
import { QueuedMatchup, TeamConfigState, TeamProfile } from '../../types/team';
import {
  BOSS_DIFFICULTY_SCALE,
  BOSS_STATUS,
  GAME_CONSTANTS,
  GAME_THEME,
  getBossThemeForRound,
  TEAM_SLOT_LEFT,
  TEAM_SLOT_RIGHT,
  TeamType,
} from '../../constants/game';
import { clearMatchSnapshot } from '../matchSnapshot';
import {
  ROUND_HOLD_REASON,
  RoundHoldReason,
  resolveRoundIntroDurationMs,
  showRoundIntro,
} from '../roundIntroStore';
import {
  MATCH_ROTATION_MODE,
  createRotatedMatchup,
  pickNextMatchup,
} from '../matchRotation';
import { BOSS_PHASE } from '../../constants/bossPhases';
import { SFX_EVENT } from '../../constants/sfx';
import { playSound } from '../../services/soundManager';
import {
  createDefaultTeamConfig,
  createDuplicateTeamTemplate,
  getPresetTeamTemplate,
  mountTeamToSlot,
  sanitizeMatchQueue,
  sanitizeTeamConfigState,
} from '../../constants/teams';
import {
  createInitialRosterFury,
  createInitialSummonQueue,
  createInitialTeamCombos,
  createInitialTeamHeartMomentum,
  createInitialTeamScores,
} from '../storeHelpers';
import { persistTeamConfig } from '../storeStorage';

export type TeamConfigSlice = Pick<
  GameState,
  | 'applyTeamConfigSnapshot'
  | 'setActiveTeams'
  | 'saveTeamToCatalog'
  | 'deleteCustomTeam'
  | 'duplicateTeamInCatalog'
  | 'restorePresetTeam'
  | 'setMatchQueue'
  | 'enqueueMatchup'
  | 'removeQueuedMatchup'
  | 'advanceNextMatchQueue'
  | 'importTeamPack'
>;

/** Creates the team catalog, active matchup, and match queue slice. */
export const createTeamConfigSlice: StateCreator<GameState, [], [], TeamConfigSlice> = (
  set,
  get
) => ({
  applyTeamConfigSnapshot: (
    config: TeamConfigState,
    resetMatch = false,
    holdReason: RoundHoldReason = ROUND_HOLD_REASON.ADMIN_RESET
  ) => {
    const sanitized = sanitizeTeamConfigState(config);
    if (!sanitized) return;

    persistTeamConfig(sanitized);
    const state = get();
    const leftTag = sanitized.activeTeams[TEAM_SLOT_LEFT]?.shortTag ?? TEAM_SLOT_LEFT;
    const rightTag = sanitized.activeTeams[TEAM_SLOT_RIGHT]?.shortTag ?? TEAM_SLOT_RIGHT;

    if (resetMatch) {
      clearMatchSnapshot();
      const round1Theme = getBossThemeForRound(1, state.seriesFormat);
      const difficulty = BOSS_DIFFICULTY_SCALE[round1Theme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
      const round1MaxHp = Math.ceil(GAME_CONSTANTS.BOSS.MAX_HP * difficulty.hpMultiplier);

      playSound(SFX_EVENT.ROUND_START);
      get().addLog('SYSTEM', `⚔️ Đổi cặp đấu mới: ${leftTag} vs ${rightTag} (Reset ${state.seriesFormat})!`);
      set({
        activeTeams: sanitized.activeTeams,
        teamCatalog: sanitized.teamCatalog,
        matchQueue: sanitized.matchQueue,
        gameTheme: round1Theme,
        bossMaxHp: round1MaxHp,
        bossHp: round1MaxHp,
        bossStatus: BOSS_STATUS.IDLE,
        bo5Score: createInitialTeamScores(),
        currentRound: 1,
        roundWinner: null,
        isRoundIntermission: false,
        isSeriesEnded: false,
        seriesWinner: null,
        teamScores: createInitialTeamScores(),
        teamLikes: createInitialTeamScores(),
        teamScoreBLG: 0,
        teamScoreGENG: 0,
        totalLikesBLG: 0,
        totalLikesGENG: 0,
        minions: [],
        summonQueue: createInitialSummonQueue(),
        activeBursts: [],
        activeHearts: [],
        activeProjectiles: [],
        activeFlyingArrows: [],
        activeShockwaves: [],
        activeMeteors: [],
        activeSlashes: [],
        activeSummonPortals: [],
        activeHitImpacts: [],
        activeGiftBanner: null,
        floatingDamages: [],
        activeDefeatedChampions: [],
        teamCombos: createInitialTeamCombos(),
        teamHeartMomentum: createInitialTeamHeartMomentum(),
        leaderboard: [],
        proLeaderboard: [],
        lastHitTeam: null,
        lastHitDamageType: null,
        bossAttackTargetTeam: null,
        bossDefeatedTimestamp: 0,
        bossEnragedEntranceTimestamp: 0,
        bossShield: null,
        triggeredShieldThresholds: [],
        bossShieldBrokenTimestamp: 0,
        bossPhase: BOSS_PHASE.ONE,
        bossPhaseChangedAt: 0,
        bossWeakPoint: null,
        lastWeakPointSpawnTimestamp: 0,
        finisherPlayerName: null,
        finisherTeam: null,
        finisherAvatarUrl: null,
        finisherGiftName: null,
        finisherCoins: null,
        rosterAttackTimestamps: {},
        rosterPlayerFury: createInitialRosterFury(sanitized.activeTeams),
        lastFuryUltimatePlayerId: null,
      });
      // After the store update: the intro and the caster read the round from currentRound
      const autoStartDelayMs =
        holdReason === ROUND_HOLD_REASON.NEW_SERIES
          ? (state.participationRuleConfig.seriesAutoStartMs ?? 15_000)
          : 0;
      showRoundIntro(Date.now(), true, resolveRoundIntroDurationMs(1), holdReason, autoStartDelayMs);
      return;
    }

    get().addLog('SYSTEM', `🛡️ Cập nhật đội hình: ${leftTag} vs ${rightTag}`);
    set({
      activeTeams: sanitized.activeTeams,
      teamCatalog: sanitized.teamCatalog,
      matchQueue: sanitized.matchQueue,
      rosterPlayerFury: createInitialRosterFury(sanitized.activeTeams, state.rosterPlayerFury),
    });
  },

  setActiveTeams: (leftTeam: TeamProfile, rightTeam: TeamProfile, resetMatch = false) => {
    const state = get();
    const mountedLeft = mountTeamToSlot(leftTeam, TEAM_SLOT_LEFT);
    const mountedRight = mountTeamToSlot(rightTeam, TEAM_SLOT_RIGHT);
    const catalogMap = new Map(state.teamCatalog.map((t) => [t.id, t]));
    catalogMap.set(mountedLeft.id, mountedLeft);
    catalogMap.set(mountedRight.id, mountedRight);

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_SLOT_LEFT]: mountedLeft,
          [TEAM_SLOT_RIGHT]: mountedRight,
        },
        teamCatalog: Array.from(catalogMap.values()),
        matchQueue: state.matchQueue,
      },
      resetMatch
    );
  },

  saveTeamToCatalog: (team: TeamProfile, mountSlot?: TeamType) => {
    const state = get();
    const cleanTemplate = mountTeamToSlot(team, mountSlot ?? TEAM_SLOT_LEFT);
    const existsIndex = state.teamCatalog.findIndex((t) => t.id === cleanTemplate.id);
    const nextCatalog =
      existsIndex >= 0
        ? state.teamCatalog.map((item, idx) => (idx === existsIndex ? cleanTemplate : item))
        : [...state.teamCatalog, cleanTemplate];

    const currentLeft = state.activeTeams[TEAM_SLOT_LEFT];
    const currentRight = state.activeTeams[TEAM_SLOT_RIGHT];

    const nextLeft =
      mountSlot === TEAM_SLOT_LEFT || currentLeft.id === cleanTemplate.id
        ? mountTeamToSlot(cleanTemplate, TEAM_SLOT_LEFT)
        : currentLeft;
    const nextRight =
      mountSlot === TEAM_SLOT_RIGHT || currentRight.id === cleanTemplate.id
        ? mountTeamToSlot(cleanTemplate, TEAM_SLOT_RIGHT)
        : currentRight;

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_SLOT_LEFT]: nextLeft,
          [TEAM_SLOT_RIGHT]: nextRight,
        },
        teamCatalog: nextCatalog,
        matchQueue: state.matchQueue,
      },
      false
    );
  },

  deleteCustomTeam: (teamId: string) => {
    const state = get();
    const target = state.teamCatalog.find((t) => t.id === teamId);
    if (!target || target.isPreset) return;

    const nextCatalog = state.teamCatalog.filter((t) => t.id !== teamId);
    const defaults = createDefaultTeamConfig();
    const nextLeft =
      state.activeTeams[TEAM_SLOT_LEFT].id === teamId
        ? defaults.activeTeams[TEAM_SLOT_LEFT]
        : state.activeTeams[TEAM_SLOT_LEFT];
    const nextRight =
      state.activeTeams[TEAM_SLOT_RIGHT].id === teamId
        ? defaults.activeTeams[TEAM_SLOT_RIGHT]
        : state.activeTeams[TEAM_SLOT_RIGHT];

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_SLOT_LEFT]: nextLeft,
          [TEAM_SLOT_RIGHT]: nextRight,
        },
        teamCatalog: nextCatalog,
        matchQueue: sanitizeMatchQueue(state.matchQueue, nextCatalog),
      },
      false
    );
  },

  duplicateTeamInCatalog: (teamId: string, copySuffix = 'Copy') => {
    const state = get();
    const source = state.teamCatalog.find((t) => t.id === teamId);
    if (!source) return null;
    const duplicated = createDuplicateTeamTemplate(source, copySuffix);
    const nextCatalog = [...state.teamCatalog, duplicated];
    get().applyTeamConfigSnapshot(
      {
        activeTeams: state.activeTeams,
        teamCatalog: nextCatalog,
        matchQueue: state.matchQueue,
      },
      false
    );
    return duplicated;
  },

  restorePresetTeam: (presetId: string) => {
    const template = getPresetTeamTemplate(presetId);
    if (!template) return false;
    const state = get();
    const exists = state.teamCatalog.some((t) => t.id === template.id);
    const nextCatalog = exists
      ? state.teamCatalog.map((item) => (item.id === template.id ? template : item))
      : [...state.teamCatalog, template];

    const nextLeft =
      state.activeTeams[TEAM_SLOT_LEFT].id === template.id
        ? mountTeamToSlot(template, TEAM_SLOT_LEFT)
        : state.activeTeams[TEAM_SLOT_LEFT];
    const nextRight =
      state.activeTeams[TEAM_SLOT_RIGHT].id === template.id
        ? mountTeamToSlot(template, TEAM_SLOT_RIGHT)
        : state.activeTeams[TEAM_SLOT_RIGHT];

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_SLOT_LEFT]: nextLeft,
          [TEAM_SLOT_RIGHT]: nextRight,
        },
        teamCatalog: nextCatalog,
        matchQueue: state.matchQueue,
      },
      false
    );
    return true;
  },

  setMatchQueue: (queue: QueuedMatchup[]) => {
    const state = get();
    get().applyTeamConfigSnapshot(
      {
        activeTeams: state.activeTeams,
        teamCatalog: state.teamCatalog,
        matchQueue: sanitizeMatchQueue(queue, state.teamCatalog),
      },
      false
    );
  },

  enqueueMatchup: (leftTeamId: string, rightTeamId: string, customLabel?: string) => {
    const state = get();
    const left = state.teamCatalog.find((t) => t.id === leftTeamId);
    const right = state.teamCatalog.find((t) => t.id === rightTeamId);
    if (!left || !right) return false;
    const entry: QueuedMatchup = {
      id: `match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      label: customLabel?.trim() || `${left.shortTag} vs ${right.shortTag}`,
      leftTeamId: left.id,
      rightTeamId: right.id,
    };
    get().applyTeamConfigSnapshot(
      {
        activeTeams: state.activeTeams,
        teamCatalog: state.teamCatalog,
        matchQueue: [...state.matchQueue, entry],
      },
      false
    );
    return true;
  },

  removeQueuedMatchup: (queueId: string) => {
    const state = get();
    get().applyTeamConfigSnapshot(
      {
        activeTeams: state.activeTeams,
        teamCatalog: state.teamCatalog,
        matchQueue: state.matchQueue.filter((item) => item.id !== queueId),
      },
      false
    );
  },

  advanceNextMatchQueue: (forcedNextMatch?: { leftTeamId: string; rightTeamId: string }) => {
    const state = get();
    const currentPair = {
      leftTeamId: state.activeTeams[TEAM_SLOT_LEFT].id,
      rightTeamId: state.activeTeams[TEAM_SLOT_RIGHT].id,
    };
    const mode = state.participationRuleConfig.matchRotationMode ?? MATCH_ROTATION_MODE.RANDOM;
    const { nextMatch, nextQueue } = forcedNextMatch
      ? {
          nextMatch: forcedNextMatch,
          nextQueue:
            state.matchQueue.length > 0
              ? [...state.matchQueue.slice(1), createRotatedMatchup(currentPair, state.teamCatalog)]
              : [],
        }
      : pickNextMatchup(state.matchQueue, state.teamCatalog, currentPair, mode);

    const leftTeam = state.teamCatalog.find((t) => t.id === nextMatch.leftTeamId);
    const rightTeam = state.teamCatalog.find((t) => t.id === nextMatch.rightTeamId);
    if (!leftTeam || !rightTeam) {
      return false;
    }

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_SLOT_LEFT]: mountTeamToSlot(leftTeam, TEAM_SLOT_LEFT),
          [TEAM_SLOT_RIGHT]: mountTeamToSlot(rightTeam, TEAM_SLOT_RIGHT),
        },
        teamCatalog: state.teamCatalog,
        matchQueue: nextQueue,
      },
      true,
      ROUND_HOLD_REASON.NEW_SERIES
    );
    return true;
  },

  importTeamPack: (teams: TeamProfile[], importedQueue: QueuedMatchup[] = []) => {
    const state = get();
    const catalogMap = new Map(state.teamCatalog.map((t) => [t.id, t]));
    let importedCount = 0;
    for (const item of teams) {
      catalogMap.set(item.id, mountTeamToSlot(item, TEAM_SLOT_LEFT));
      importedCount += 1;
    }
    const nextCatalog = Array.from(catalogMap.values());
    const nextQueue = sanitizeMatchQueue([...state.matchQueue, ...importedQueue], nextCatalog);

    const mountedLeft = catalogMap.get(state.activeTeams[TEAM_SLOT_LEFT].id);
    const mountedRight = catalogMap.get(state.activeTeams[TEAM_SLOT_RIGHT].id);
    const nextLeft = mountedLeft
      ? mountTeamToSlot(mountedLeft, TEAM_SLOT_LEFT)
      : state.activeTeams[TEAM_SLOT_LEFT];
    const nextRight = mountedRight
      ? mountTeamToSlot(mountedRight, TEAM_SLOT_RIGHT)
      : state.activeTeams[TEAM_SLOT_RIGHT];

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_SLOT_LEFT]: nextLeft,
          [TEAM_SLOT_RIGHT]: nextRight,
        },
        teamCatalog: nextCatalog,
        matchQueue: nextQueue,
      },
      false
    );
    return importedCount;
  },
});
