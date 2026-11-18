import { StateCreator } from 'zustand';
import { resetRoundDamage } from '../roundDamageTracker';
import { resetComebackState } from '../comebackRules';
import {
  ROUND_HOLD_REASON,
  RoundHoldReason,
  playRoundIntroCinematic,
  resolveRoundIntroDurationMs,
  showRoundIntro,
} from '../roundIntroStore';
import { resetCommunityQuests } from '../communityQuestStore';
import { clearMatchSnapshot } from '../matchSnapshot';
import { clearMatchupTitles, persistChampionshipTally } from '../championshipTally';
import { GameState, SeriesFormat } from '../../types/game';
import {
  BOSS_DIFFICULTY_SCALE,
  BOSS_STATUS,
  GAME_CONSTANTS,
  GAME_THEME,
  getBossThemeForRound,
  getThemeConfig,
  TEAM_SLOTS,
  TEAM_SLOT_LEFT,
  TEAM_SLOT_RIGHT,
  TeamType,
} from '../../constants/game';
import { BOSS_PHASE } from '../../constants/bossPhases';
import { SFX_EVENT } from '../../constants/sfx';
import { audioService } from '../../services/audioService';
import { playSound } from '../../services/soundManager';
import {
  createInitialRosterFury,
  createInitialSummonQueue,
  createInitialTeamCombos,
  createInitialTeamHeartMomentum,
  createInitialTeamScores,
} from '../storeHelpers';
import { persistGameTheme } from '../storeStorage';

export type SeriesSlice = Pick<
  GameState,
  | 'startNextRound'
  | 'resetBO5Match'
  | 'resetMatchupChampionships'
  | 'setSeriesFormat'
  | 'applySeriesFormatSnapshot'
  | 'setSilverScrapesState'
  | 'isSilverScrapesBuffActive'
  | 'setBO5Score'
>;

const resolveSeriesWinner = (
  isEnded: boolean,
  scores: Record<TeamType, number>,
  targetWins: number
): TeamType | null => {
  if (!isEnded) return null;
  for (const slot of TEAM_SLOTS) {
    if ((scores[slot] ?? 0) >= targetWins) return slot;
  }
  return null;
};

/** Creates the BO1/BO3/BO5 series progression and Silver Scrapes duel slice. */
export const createSeriesSlice: StateCreator<GameState, [], [], SeriesSlice> = (set, get) => ({
  startNextRound: (targetRound?: number) => {
    const state = get();
    const isWon = TEAM_SLOTS.some((slot) => (state.bo5Score[slot] ?? 0) >= state.bo5TargetWins);
    if (state.isSeriesEnded || isWon) return;
    resetCommunityQuests();
    resetRoundDamage();
    resetComebackState();
    const maxRounds = state.seriesMaxRounds || GAME_CONSTANTS.BO5.MAX_ROUNDS;
    // A server-sent target wins: the series sync may already have moved currentRound (no double +1)
    const isValidTarget = typeof targetRound === 'number' && Number.isInteger(targetRound) && targetRound >= 1;
    const nextRound = Math.min(maxRounds, isValidTarget ? targetRound : state.currentRound + 1);
    const nextTheme = getBossThemeForRound(nextRound, state.seriesFormat);
    const difficulty = BOSS_DIFFICULTY_SCALE[nextTheme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
    const nextMaxHp = Math.ceil(GAME_CONSTANTS.BOSS.MAX_HP * difficulty.hpMultiplier);
    const themeConfig = getThemeConfig(nextTheme);

    persistGameTheme(nextTheme);
    audioService.setCombatMuted(false);
    playSound(SFX_EVENT.ROUND_START);
    get().addLog(
      'SYSTEM',
      `⚔️ Bắt đầu Ván ${nextRound} / ${state.seriesFormat} • Đối đầu ${themeConfig.bossName} (${nextMaxHp.toLocaleString()} HP)!`
    );
    set({
      gameTheme: nextTheme,
      bossMaxHp: nextMaxHp,
      bossHp: nextMaxHp,
      bossStatus: BOSS_STATUS.IDLE,
      currentRound: nextRound,
      roundWinner: null,
      isRoundIntermission: false,
      teamScores: createInitialTeamScores(),
      teamScoreBLG: 0,
      teamScoreGENG: 0,
      minions: [],
      summonQueue: createInitialSummonQueue(),
      teamCombos: createInitialTeamCombos(),
      teamHeartMomentum: createInitialTeamHeartMomentum(),
      floatingDamages: [],
      activeSlashes: [],
      activeHitImpacts: [],
      activeDefeatedChampions: [],
      activeBursts: [],
      activeFlyingArrows: [],
      activeProjectiles: [],
      activeShockwaves: [],
      activeMeteors: [],
      activeSummonPortals: [],
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
      leaderboard: [],
      proLeaderboard: [],
      rosterAttackTimestamps: {},
      rosterPlayerFury: createInitialRosterFury(state.activeTeams),
      lastFuryUltimatePlayerId: null,
    });
    // After the store update: the next round opens by itself (cinematic, then the narrated card), so a
    // live show never stalls when nobody can click the OBS overlay. A new series still waits for "Bắt đầu".
    playRoundIntroCinematic(Date.now(), resolveRoundIntroDurationMs(get().currentRound));
  },

  resetMatchupChampionships: () => {
    const state = get();
    const leftTeam = state.activeTeams[TEAM_SLOT_LEFT];
    const rightTeam = state.activeTeams[TEAM_SLOT_RIGHT];
    const nextTally = clearMatchupTitles(state.championshipTally, leftTeam, rightTeam);
    persistChampionshipTally(nextTally);
    set({ championshipTally: nextTally });
    get().addLog('SYSTEM', `🧹 Đã xoá số lần vô địch của cặp ${leftTeam.shortTag} vs ${rightTeam.shortTag}`);
  },

  resetBO5Match: (holdReason: RoundHoldReason = ROUND_HOLD_REASON.ADMIN_RESET) => {
    clearMatchSnapshot();
    resetCommunityQuests();
    resetRoundDamage();
    resetComebackState();
    const state = get();
    const round1Theme = getBossThemeForRound(1, state.seriesFormat);
    const difficulty = BOSS_DIFFICULTY_SCALE[round1Theme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
    const round1MaxHp = Math.ceil(GAME_CONSTANTS.BOSS.MAX_HP * difficulty.hpMultiplier);
    const themeConfig = getThemeConfig(round1Theme);

    persistGameTheme(round1Theme);
    audioService.setCombatMuted(false);
    playSound(SFX_EVENT.ROUND_START);
    get().addLog(
      'SYSTEM',
      `🔄 Bắt đầu Trận đấu ${state.seriesFormat} Mới (0 - 0) • Ván 1: ${themeConfig.bossName}!`
    );
    set({
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
      teamScoreBLG: 0,
      teamScoreGENG: 0,
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
      rosterPlayerFury: createInitialRosterFury(get().activeTeams),
      lastFuryUltimatePlayerId: null,
    });
    // After the store update: the intro and the caster read the round from currentRound
    const autoStartDelayMs =
      holdReason === ROUND_HOLD_REASON.NEW_SERIES
        ? (state.participationRuleConfig.seriesAutoStartMs ?? 15_000)
        : 0;
    showRoundIntro(Date.now(), true, resolveRoundIntroDurationMs(1), holdReason, autoStartDelayMs);
  },

  setSeriesFormat: (format: SeriesFormat, resetScore = false) => {
    const specs = GAME_CONSTANTS.SERIES_FORMATS[format] ?? GAME_CONSTANTS.SERIES_FORMATS.BO5;
    set((state) => {
      const nextScores = Object.fromEntries(
        TEAM_SLOTS.map((slot) => [
          slot,
          resetScore ? 0 : Math.min(specs.TARGET_WINS, state.bo5Score[slot] ?? 0),
        ])
      ) as Record<TeamType, number>;
      const isEnded = TEAM_SLOTS.some((slot) => (nextScores[slot] ?? 0) >= specs.TARGET_WINS);
      const targetRound = resetScore ? 1 : Math.min(specs.MAX_ROUNDS, state.currentRound);
      const targetTheme = getBossThemeForRound(targetRound, format);
      const difficulty = BOSS_DIFFICULTY_SCALE[targetTheme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
      const targetMaxHp = Math.ceil(GAME_CONSTANTS.BOSS.MAX_HP * difficulty.hpMultiplier);

      persistGameTheme(targetTheme);

      return {
        gameTheme: targetTheme,
        bossMaxHp: targetMaxHp,
        bossHp: targetMaxHp,
        seriesFormat: format,
        bo5TargetWins: specs.TARGET_WINS,
        seriesMaxRounds: specs.MAX_ROUNDS,
        bo5Score: nextScores,
        currentRound: targetRound,
        isSeriesEnded: isEnded,
        seriesWinner: resolveSeriesWinner(isEnded, nextScores, specs.TARGET_WINS),
      };
    });
    get().addLog('SYSTEM', `⚙️ Thể thức thi đấu chuyển sang ${format} (Chạm ${specs.TARGET_WINS} thắng)`);
  },

  applySeriesFormatSnapshot: (config) => {
    const nextScores: Record<TeamType, number> = {
      [TEAM_SLOT_LEFT]: config.blgScore,
      [TEAM_SLOT_RIGHT]: config.gengScore,
    };
    const isEnded = TEAM_SLOTS.some((slot) => (nextScores[slot] ?? 0) >= config.targetWins);
    // On the victory screen the round number stays the one just played: only an explicit nextRound
    // (startNextRound) moves it. Changing it here made this overlay's own countdown skip a round.
    const isBetweenRounds = get().roundWinner !== null;
    const targetRound = isBetweenRounds ? get().currentRound : config.currentRound;
    const targetTheme = getBossThemeForRound(targetRound, config.format);
    const difficulty = BOSS_DIFFICULTY_SCALE[targetTheme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
    const targetMaxHp = Math.ceil(GAME_CONSTANTS.BOSS.MAX_HP * difficulty.hpMultiplier);

    persistGameTheme(targetTheme);
    set({
      seriesFormat: config.format,
      bo5TargetWins: config.targetWins,
      seriesMaxRounds: config.maxRounds,
      bo5Score: nextScores,
      currentRound: targetRound,
      gameTheme: targetTheme,
      bossMaxHp: targetMaxHp,
      bossHp: get().bossHp >= get().bossMaxHp ? targetMaxHp : Math.min(get().bossHp, targetMaxHp),
      isSeriesEnded: isEnded,
      seriesWinner: resolveSeriesWinner(isEnded, nextScores, config.targetWins),
    });
  },

  setSilverScrapesState: (patch) => {
    set((state) => ({
      silverScrapesState: {
        ...state.silverScrapesState,
        ...patch,
      },
    }));
  },

  isSilverScrapesBuffActive: (team: TeamType) => {
    const duel = get().silverScrapesState;
    if (!duel.buffActiveUntil || !duel.winningTeamBuff) return false;
    return duel.winningTeamBuff === team && Date.now() <= duel.buffActiveUntil;
  },

  setBO5Score: (leftWins: number, rightWins: number, currentRound?: number) => {
    const state = get();
    const targetWins = state.bo5TargetWins;
    const clampedLeft = Math.max(0, Math.min(targetWins, leftWins));
    const clampedRight = Math.max(0, Math.min(targetWins, rightWins));
    const nextScores: Record<TeamType, number> = {
      [TEAM_SLOT_LEFT]: clampedLeft,
      [TEAM_SLOT_RIGHT]: clampedRight,
    };
    const isEnded = TEAM_SLOTS.some((slot) => (nextScores[slot] ?? 0) >= targetWins);
    const seriesWinner = resolveSeriesWinner(isEnded, nextScores, targetWins);
    const calculatedRound = isEnded
      ? Math.min(state.seriesMaxRounds, clampedLeft + clampedRight)
      : Math.min(state.seriesMaxRounds, clampedLeft + clampedRight + 1);
    const nextRound = currentRound ?? calculatedRound;
    const nextTheme = getBossThemeForRound(nextRound, state.seriesFormat);
    const difficulty = BOSS_DIFFICULTY_SCALE[nextTheme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
    const nextMaxHp = Math.ceil(GAME_CONSTANTS.BOSS.MAX_HP * difficulty.hpMultiplier);
    const leftTag = state.activeTeams[TEAM_SLOT_LEFT]?.shortTag ?? TEAM_SLOT_LEFT;
    const rightTag = state.activeTeams[TEAM_SLOT_RIGHT]?.shortTag ?? TEAM_SLOT_RIGHT;

    persistGameTheme(nextTheme);
    get().addLog(
      'SYSTEM',
      `⚙️ Cập nhật điểm ${state.seriesFormat}: ${leftTag} ${clampedLeft} - ${clampedRight} ${rightTag} (Ván ${nextRound})`
    );
    set({
      bo5Score: nextScores,
      currentRound: nextRound,
      gameTheme: nextTheme,
      bossMaxHp: nextMaxHp,
      bossHp: nextMaxHp,
      isSeriesEnded: isEnded,
      seriesWinner,
    });
  },
});
