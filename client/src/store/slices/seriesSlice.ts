import { StateCreator } from 'zustand';
import { GameState, SeriesFormat } from '../../types/game';
import {
  BOSS_DIFFICULTY_SCALE,
  BOSS_STATUS,
  GAME_CONSTANTS,
  GAME_THEME,
  getBossThemeForRound,
  getThemeConfig,
  TEAM_KEY,
  TeamType,
} from '../../constants/game';
import { BOSS_PHASE } from '../../constants/bossPhases';
import { SFX_EVENT } from '../../constants/sfx';
import { audioService } from '../../services/audioService';
import { playSound } from '../../services/soundManager';
import {
  createInitialRosterFury,
  createInitialTeamCombos,
  createInitialTeamHeartMomentum,
} from '../storeHelpers';
import { persistGameTheme } from '../storeStorage';

export type SeriesSlice = Pick<
  GameState,
  | 'startNextRound'
  | 'resetBO5Match'
  | 'setSeriesFormat'
  | 'applySeriesFormatSnapshot'
  | 'setSilverScrapesState'
  | 'isSilverScrapesBuffActive'
  | 'setBO5Score'
>;

const resolveSeriesWinner = (
  isEnded: boolean,
  blgScore: number,
  targetWins: number
): TeamType | null => {
  if (!isEnded) return null;
  return blgScore >= targetWins ? TEAM_KEY.BLG : TEAM_KEY.GENG;
};

/** Creates the BO1/BO3/BO5 series progression and Silver Scrapes duel slice. */
export const createSeriesSlice: StateCreator<GameState, [], [], SeriesSlice> = (set, get) => ({
  startNextRound: () => {
    const state = get();
    if (state.isSeriesEnded) return;
    const nextRound = Math.min(GAME_CONSTANTS.BO5.MAX_ROUNDS, state.currentRound + 1);
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
      teamScoreBLG: 0,
      teamScoreGENG: 0,
      minions: [],
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
      leaderboard: [],
      proLeaderboard: [],
      rosterAttackTimestamps: {},
      rosterPlayerFury: createInitialRosterFury(state.activeTeams),
      lastFuryUltimatePlayerId: null,
    });
  },

  resetBO5Match: () => {
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
      bo5Score: { [TEAM_KEY.BLG]: 0, [TEAM_KEY.GENG]: 0 },
      currentRound: 1,
      roundWinner: null,
      isRoundIntermission: false,
      isSeriesEnded: false,
      seriesWinner: null,
      teamScoreBLG: 0,
      teamScoreGENG: 0,
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
      rosterPlayerFury: createInitialRosterFury(get().activeTeams),
      lastFuryUltimatePlayerId: null,
    });
  },

  setSeriesFormat: (format: SeriesFormat, resetScore = false) => {
    const specs = GAME_CONSTANTS.SERIES_FORMATS[format] ?? GAME_CONSTANTS.SERIES_FORMATS.BO5;
    set((state) => {
      const nextBlg = resetScore ? 0 : Math.min(specs.TARGET_WINS, state.bo5Score.BLG);
      const nextGeng = resetScore ? 0 : Math.min(specs.TARGET_WINS, state.bo5Score.GENG);
      const isEnded = nextBlg >= specs.TARGET_WINS || nextGeng >= specs.TARGET_WINS;
      const round1Theme = getBossThemeForRound(1, format);
      const difficulty = BOSS_DIFFICULTY_SCALE[round1Theme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
      const round1MaxHp = Math.ceil(GAME_CONSTANTS.BOSS.MAX_HP * difficulty.hpMultiplier);

      if (resetScore) {
        persistGameTheme(round1Theme);
      }

      return {
        gameTheme: resetScore ? round1Theme : state.gameTheme,
        bossMaxHp: resetScore ? round1MaxHp : state.bossMaxHp,
        bossHp: resetScore ? round1MaxHp : state.bossHp,
        seriesFormat: format,
        bo5TargetWins: specs.TARGET_WINS,
        seriesMaxRounds: specs.MAX_ROUNDS,
        bo5Score: {
          [TEAM_KEY.BLG]: nextBlg,
          [TEAM_KEY.GENG]: nextGeng,
        },
        currentRound: resetScore ? 1 : Math.min(specs.MAX_ROUNDS, state.currentRound),
        isSeriesEnded: isEnded,
        seriesWinner: resolveSeriesWinner(isEnded, nextBlg, specs.TARGET_WINS),
      };
    });
    get().addLog('SYSTEM', `⚙️ Thể thức thi đấu chuyển sang ${format} (Chạm ${specs.TARGET_WINS} thắng)`);
  },

  applySeriesFormatSnapshot: (config) => {
    const isEnded = config.blgScore >= config.targetWins || config.gengScore >= config.targetWins;
    set({
      seriesFormat: config.format,
      bo5TargetWins: config.targetWins,
      seriesMaxRounds: config.maxRounds,
      bo5Score: {
        [TEAM_KEY.BLG]: config.blgScore,
        [TEAM_KEY.GENG]: config.gengScore,
      },
      currentRound: config.currentRound,
      isSeriesEnded: isEnded,
      seriesWinner: resolveSeriesWinner(isEnded, config.blgScore, config.targetWins),
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

  setBO5Score: (blg: number, geng: number, currentRound?: number) => {
    const state = get();
    const targetWins = state.bo5TargetWins;
    const clampedBlg = Math.max(0, Math.min(targetWins, blg));
    const clampedGeng = Math.max(0, Math.min(targetWins, geng));
    const isEnded = clampedBlg >= targetWins || clampedGeng >= targetWins;
    const seriesWinner = resolveSeriesWinner(isEnded, clampedBlg, targetWins);
    const nextRound = currentRound ?? Math.min(state.seriesMaxRounds, clampedBlg + clampedGeng + 1);
    const leftTag = state.activeTeams[TEAM_KEY.BLG].shortTag;
    const rightTag = state.activeTeams[TEAM_KEY.GENG].shortTag;

    get().addLog(
      'SYSTEM',
      `⚙️ Cập nhật điểm ${state.seriesFormat}: ${leftTag} ${clampedBlg} - ${clampedGeng} ${rightTag} (Ván ${nextRound})`
    );
    set({
      bo5Score: {
        [TEAM_KEY.BLG]: clampedBlg,
        [TEAM_KEY.GENG]: clampedGeng,
      },
      currentRound: nextRound,
      isSeriesEnded: isEnded,
      seriesWinner,
    });
  },
});
