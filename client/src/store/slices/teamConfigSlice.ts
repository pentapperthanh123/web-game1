import { StateCreator } from 'zustand';
import { GameState } from '../../types/game';
import { QueuedMatchup, TeamConfigState, TeamProfile } from '../../types/team';
import { BOSS_STATUS, TEAM_KEY, TeamType } from '../../constants/game';
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
  createInitialTeamCombos,
  createInitialTeamHeartMomentum,
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
  applyTeamConfigSnapshot: (config: TeamConfigState, resetMatch = false) => {
    const sanitized = sanitizeTeamConfigState(config);
    if (!sanitized) return;

    persistTeamConfig(sanitized);
    const state = get();
    const leftTag = sanitized.activeTeams[TEAM_KEY.BLG].shortTag;
    const rightTag = sanitized.activeTeams[TEAM_KEY.GENG].shortTag;

    if (resetMatch) {
      playSound(SFX_EVENT.ROUND_START);
      get().addLog('SYSTEM', `⚔️ Đổi cặp đấu mới: ${leftTag} vs ${rightTag} (Reset BO5)!`);
      set({
        activeTeams: sanitized.activeTeams,
        teamCatalog: sanitized.teamCatalog,
        matchQueue: sanitized.matchQueue,
        bossHp: state.bossMaxHp,
        bossStatus: BOSS_STATUS.IDLE,
        bo5Score: { [TEAM_KEY.BLG]: 0, [TEAM_KEY.GENG]: 0 },
        currentRound: 1,
        roundWinner: null,
        isRoundIntermission: false,
        isSeriesEnded: false,
        seriesWinner: null,
        teamScoreBLG: 0,
        teamScoreGENG: 0,
        totalLikesBLG: 0,
        totalLikesGENG: 0,
        minions: [],
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
        rosterAttackTimestamps: {},
        rosterPlayerFury: createInitialRosterFury(sanitized.activeTeams),
        lastFuryUltimatePlayerId: null,
      });
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
    const mountedLeft = mountTeamToSlot(leftTeam, TEAM_KEY.BLG);
    const mountedRight = mountTeamToSlot(rightTeam, TEAM_KEY.GENG);
    const catalogMap = new Map(state.teamCatalog.map((t) => [t.id, t]));
    catalogMap.set(mountedLeft.id, mountedLeft);
    catalogMap.set(mountedRight.id, mountedRight);

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_KEY.BLG]: mountedLeft,
          [TEAM_KEY.GENG]: mountedRight,
        },
        teamCatalog: Array.from(catalogMap.values()),
        matchQueue: state.matchQueue,
      },
      resetMatch
    );
  },

  saveTeamToCatalog: (team: TeamProfile, mountSlot?: TeamType) => {
    const state = get();
    const cleanTemplate = mountTeamToSlot(team, mountSlot ?? TEAM_KEY.BLG);
    const existsIndex = state.teamCatalog.findIndex((t) => t.id === cleanTemplate.id);
    const nextCatalog =
      existsIndex >= 0
        ? state.teamCatalog.map((item, idx) => (idx === existsIndex ? cleanTemplate : item))
        : [...state.teamCatalog, cleanTemplate];

    const currentLeft = state.activeTeams[TEAM_KEY.BLG];
    const currentRight = state.activeTeams[TEAM_KEY.GENG];

    const nextLeft =
      mountSlot === TEAM_KEY.BLG || currentLeft.id === cleanTemplate.id
        ? mountTeamToSlot(cleanTemplate, TEAM_KEY.BLG)
        : currentLeft;
    const nextRight =
      mountSlot === TEAM_KEY.GENG || currentRight.id === cleanTemplate.id
        ? mountTeamToSlot(cleanTemplate, TEAM_KEY.GENG)
        : currentRight;

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_KEY.BLG]: nextLeft,
          [TEAM_KEY.GENG]: nextRight,
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
      state.activeTeams[TEAM_KEY.BLG].id === teamId
        ? defaults.activeTeams[TEAM_KEY.BLG]
        : state.activeTeams[TEAM_KEY.BLG];
    const nextRight =
      state.activeTeams[TEAM_KEY.GENG].id === teamId
        ? defaults.activeTeams[TEAM_KEY.GENG]
        : state.activeTeams[TEAM_KEY.GENG];

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_KEY.BLG]: nextLeft,
          [TEAM_KEY.GENG]: nextRight,
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
      state.activeTeams[TEAM_KEY.BLG].id === template.id
        ? mountTeamToSlot(template, TEAM_KEY.BLG)
        : state.activeTeams[TEAM_KEY.BLG];
    const nextRight =
      state.activeTeams[TEAM_KEY.GENG].id === template.id
        ? mountTeamToSlot(template, TEAM_KEY.GENG)
        : state.activeTeams[TEAM_KEY.GENG];

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_KEY.BLG]: nextLeft,
          [TEAM_KEY.GENG]: nextRight,
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

  advanceNextMatchQueue: () => {
    const state = get();
    if (state.matchQueue.length === 0) return false;
    const [nextMatch, ...restQueue] = state.matchQueue;
    const leftTeam = state.teamCatalog.find((t) => t.id === nextMatch.leftTeamId);
    const rightTeam = state.teamCatalog.find((t) => t.id === nextMatch.rightTeamId);
    if (!leftTeam || !rightTeam) {
      get().applyTeamConfigSnapshot(
        {
          activeTeams: state.activeTeams,
          teamCatalog: state.teamCatalog,
          matchQueue: restQueue,
        },
        false
      );
      return false;
    }

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_KEY.BLG]: mountTeamToSlot(leftTeam, TEAM_KEY.BLG),
          [TEAM_KEY.GENG]: mountTeamToSlot(rightTeam, TEAM_KEY.GENG),
        },
        teamCatalog: state.teamCatalog,
        matchQueue: restQueue,
      },
      true
    );
    return true;
  },

  importTeamPack: (teams: TeamProfile[], importedQueue: QueuedMatchup[] = []) => {
    const state = get();
    const catalogMap = new Map(state.teamCatalog.map((t) => [t.id, t]));
    let importedCount = 0;
    for (const item of teams) {
      catalogMap.set(item.id, mountTeamToSlot(item, TEAM_KEY.BLG));
      importedCount += 1;
    }
    const nextCatalog = Array.from(catalogMap.values());
    const nextQueue = sanitizeMatchQueue([...state.matchQueue, ...importedQueue], nextCatalog);

    const mountedLeft = catalogMap.get(state.activeTeams[TEAM_KEY.BLG].id);
    const mountedRight = catalogMap.get(state.activeTeams[TEAM_KEY.GENG].id);
    const nextLeft = mountedLeft
      ? mountTeamToSlot(mountedLeft, TEAM_KEY.BLG)
      : state.activeTeams[TEAM_KEY.BLG];
    const nextRight = mountedRight
      ? mountTeamToSlot(mountedRight, TEAM_KEY.GENG)
      : state.activeTeams[TEAM_KEY.GENG];

    get().applyTeamConfigSnapshot(
      {
        activeTeams: {
          [TEAM_KEY.BLG]: nextLeft,
          [TEAM_KEY.GENG]: nextRight,
        },
        teamCatalog: nextCatalog,
        matchQueue: nextQueue,
      },
      false
    );
    return importedCount;
  },
});
