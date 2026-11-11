import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Trophy, Sparkles, RotateCcw, ArrowRight, Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_DEFEAT_CONSTANTS,
  BOSS_STATUS,
  GAME_CONSTANTS,
  TEAM_KEY,
  TeamType,
} from '../../constants/game';
import { audioService } from '../../services/audioService';
import { BLGLogo, GenGLogo } from '../icons/TeamLogos';
import { ProDamageRecord } from '../../types/game';

const getTeamBadgeClass = (team: TeamType): string => {
  if (team === TEAM_KEY.BLG) {
    return 'bg-cyan-950 text-cyan-300 border border-cyan-800';
  }
  return 'bg-amber-950 text-amber-300 border border-amber-800';
};

export const VictoryOverlay = () => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const teamScoreBLG = useGameStore((state) => state.teamScoreBLG);
  const teamScoreGENG = useGameStore((state) => state.teamScoreGENG);
  const leaderboard = useGameStore((state) => state.leaderboard);
  const proLeaderboard = useGameStore((state) => state.proLeaderboard);
  const bo5Score = useGameStore((state) => state.bo5Score);
  const currentRound = useGameStore((state) => state.currentRound);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const isSeriesEnded = useGameStore((state) => state.isSeriesEnded);
  const seriesWinner = useGameStore((state) => state.seriesWinner);
  const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const startNextRound = useGameStore((state) => state.startNextRound);
  const resetBO5Match = useGameStore((state) => state.resetBO5Match);

  const [countdown, setCountdown] = useState<number>(GAME_CONSTANTS.BO5.ROUND_TRANSITION_SECONDS);
  const [isVictoryVisible, setIsVictoryVisible] = useState<boolean>(false);
  const [proAvatarFailed, setProAvatarFailed] = useState<boolean>(false);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED;

  useEffect(() => {
    if (!isDefeated) {
      setIsVictoryVisible(false);
      setProAvatarFailed(false);
      return;
    }

    const revealTimer = setTimeout(() => {
      setIsVictoryVisible(true);
    }, BOSS_DEFEAT_CONSTANTS.VICTORY_DELAY_MS);

    return () => clearTimeout(revealTimer);
  }, [isDefeated]);

  // Determine active winner
  const effectiveWinner: TeamType = isSeriesEnded
    ? seriesWinner || (bo5Score.BLG >= bo5Score.GENG ? TEAM_KEY.BLG : TEAM_KEY.GENG)
    : roundWinner || (teamScoreBLG >= teamScoreGENG ? TEAM_KEY.BLG : TEAM_KEY.GENG);

  const isBLGWinner = effectiveWinner === TEAM_KEY.BLG;
  const winnerName = isBLGWinner
    ? t('Game.teamBLG', 'BILIBILI GAMING')
    : t('Game.teamGENG', 'GEN.G ESPORTS');

  const viewerMvp = leaderboard.length > 0 ? leaderboard[0] : null;
  const proMvp: ProDamageRecord | null = proLeaderboard.length > 0 ? proLeaderboard[0] : null;

  useEffect(() => {
    if (!isDefeated || !isVictoryVisible) {
      setCountdown(GAME_CONSTANTS.BO5.ROUND_TRANSITION_SECONDS);
      return;
    }

    audioService.playVictoryFanfare();

    const transitionSec = isSeriesEnded ? 15 : GAME_CONSTANTS.BO5.ROUND_TRANSITION_SECONDS;
    setCountdown(transitionSec);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (isSeriesEnded) {
            resetBO5Match();
          } else {
            startNextRound();
          }
          return GAME_CONSTANTS.BO5.ROUND_TRANSITION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDefeated, isVictoryVisible, isSeriesEnded, startNextRound, resetBO5Match]);

  if (!isDefeated || !isVictoryVisible) return null;

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in zoom-in-95 duration-500 pointer-events-auto select-none">
      {/* Radiant Glow Orb */}
      <div
        className={`absolute w-80 h-80 rounded-full blur-3xl opacity-35 ${
          isBLGWinner ? 'bg-cyan-500' : 'bg-amber-500'
        }`}
      />

      {/* Main Victory Card */}
      <div className="relative z-10 max-w-sm w-full space-y-3 sm:space-y-4">
        {/* Large Winning Team Logo */}
        <div className="flex justify-center items-center">
          <div className="relative p-2 rounded-3xl bg-slate-900/90 border-2 border-slate-700/80 shadow-2xl">
            {isBLGWinner ? (
              <BLGLogo className="w-16 h-16 sm:w-20 sm:h-20 animate-bounce" />
            ) : (
              <GenGLogo className="w-16 h-16 sm:w-20 sm:h-20 animate-bounce" />
            )}
            <div className="absolute -top-3 -right-3 p-1.5 rounded-full bg-amber-400 text-slate-950 shadow-lg">
              <Trophy className="w-5 h-5 fill-current" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
            {isSeriesEnded
              ? t('Victory.seriesScore', 'TỈ SỐ CHUNG CUỘC BO5: {{blg}} - {{geng}}', {
                  blg: bo5Score.BLG,
                  geng: bo5Score.GENG,
                })
              : t('Victory.bossDefeated', 'BARON NASHOR ĐÃ BỊ TIÊU DIỆT!')}
          </div>
          <h1
            className={`text-xl sm:text-2xl font-black uppercase tracking-wider drop-shadow-lg ${
              isBLGWinner ? 'text-cyan-400' : 'text-amber-400'
            }`}
          >
            {isSeriesEnded
              ? t('Victory.seriesChampion', '🏆 {{team}} VÔ ĐỊCH CKTG 2026 BO5!', { team: winnerName })
              : t('Victory.roundWin', '{{team}} CHIẾN THẮNG VÁN {{round}}!', {
                  team: winnerName,
                  round: currentRound,
                })}
          </h1>
        </div>

        {/* BO5 Scoreboard Card */}
        <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1.5">
          <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
            {t('Victory.bo5Score', 'TỈ SỐ BO5 HIỆN TẠI')}
          </div>

          <div className="flex items-center justify-center space-x-3">
            {/* BLG Block */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-black text-cyan-400">BLG</span>
              <div className="flex space-x-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={`win-blg-${i}`}
                    className={`w-2.5 h-2.5 rotate-45 border transition-all ${
                      i < bo5Score.BLG
                        ? 'bg-cyan-400 border-cyan-200 shadow-[0_0_8px_#06b6d4]'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Score Numbers */}
            <div className="font-mono text-base font-black text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
              {bo5Score.BLG} - {bo5Score.GENG}
            </div>

            {/* GEN.G Block */}
            <div className="flex items-center space-x-1.5">
              <div className="flex space-x-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={`win-gen-${i}`}
                    className={`w-2.5 h-2.5 rotate-45 border transition-all ${
                      i < bo5Score.GENG
                        ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_#f59e0b]'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-black text-amber-400">GEN</span>
            </div>
          </div>
        </div>

        {/* MVP Showcase (Viewer MVP first, Pro-Player MVP fallback when solo) */}
        {viewerMvp && (
          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
            <div className="flex items-center justify-center space-x-1.5 text-[11px] font-black text-amber-400 uppercase">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>{t('Victory.mvpTitle', 'MVP CỦA TRẬN ĐẤU')}</span>
              <Sparkles className="w-3 h-3" />
            </div>

            <div className="text-sm sm:text-base font-extrabold text-white truncate">
              {viewerMvp.userName}
            </div>

            <div className="flex justify-center items-center space-x-2 text-xs">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${getTeamBadgeClass(viewerMvp.team)}`}>
                {viewerMvp.team}
              </span>
              <span className="font-mono text-emerald-400 font-bold text-[11px]">
                {(viewerMvp.totalDamage ?? 0).toLocaleString()} {t('Victory.damage', 'SÁT THƯƠNG')}
              </span>
            </div>
          </div>
        )}

        {!viewerMvp && proMvp && (
          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1.5">
            <div className="flex items-center justify-center space-x-1.5 text-[11px] font-black text-amber-400 uppercase">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>{t('Victory.proMvpTitle', 'MVP TUYỂN THỦ')}</span>
              <Sparkles className="w-3 h-3" />
            </div>

            <div className="flex items-center justify-center space-x-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-amber-400/80 bg-slate-800 shrink-0 flex items-center justify-center">
                {!proAvatarFailed ? (
                  <img
                    src={proMvp.avatarUrl}
                    alt={proMvp.playerName}
                    className="w-full h-full object-cover object-top"
                    onError={() => setProAvatarFailed(true)}
                  />
                ) : (
                  <span className="text-xs font-black text-amber-300">
                    {proMvp.playerName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="text-left min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-white truncate flex items-center space-x-1.5">
                  <span>{proMvp.playerName}</span>
                  <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {proMvp.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold truncate">
                  {proMvp.championName}
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center space-x-2 text-xs">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${getTeamBadgeClass(proMvp.team)}`}>
                {proMvp.team}
              </span>
              <span className="font-mono text-emerald-400 font-bold text-[11px]">
                {(proMvp.totalDamage ?? 0).toLocaleString()} {t('Victory.damage', 'SÁT THƯƠNG')}
              </span>
            </div>
          </div>
        )}

        {/* Last-Hit Finisher Callout */}
        {finisherPlayerName && (
          <div className="inline-flex items-center justify-center space-x-1.5 px-3 py-1 rounded-full bg-rose-950/75 border border-rose-500/40 text-[11px]">
            <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-rose-200/90 font-semibold">
              {t('Victory.finisherLabel', 'Kết liễu bởi')}:
            </span>
            <span className="font-black text-white truncate max-w-[140px]">
              {finisherPlayerName}
            </span>
            {finisherTeam && (
              <span
                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                  finisherTeam === TEAM_KEY.BLG
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                    : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                }`}
              >
                {finisherTeam}
              </span>
            )}
          </div>
        )}

        {/* Total Score Tug-of-War of this game */}
        <div className="flex justify-between text-xs font-mono px-3">
          <span className="text-cyan-400 font-bold">BLG: {(teamScoreBLG ?? 0).toLocaleString()} DMG</span>
          <span className="text-amber-400 font-bold">GEN: {(teamScoreGENG ?? 0).toLocaleString()} DMG</span>
        </div>

        {/* Auto Next Match Countdown & Manual Advance Button */}
        <div className="pt-1 flex flex-col items-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 shadow">
            <RotateCcw className="w-3 h-3 animate-spin text-cyan-400" />
            <span>{t('Victory.nextRoundIn', 'Ván mới bắt đầu sau:')}</span>
            <span className="font-mono font-black text-cyan-400 text-xs sm:text-sm">{countdown}s</span>
          </div>

          {isSeriesEnded ? (
            <button
              type="button"
              onClick={() => resetBO5Match()}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center space-x-1.5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('Victory.newSeries', 'BẮT ĐẦU TRẬN ĐẤU MỚI')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startNextRound()}
              className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_12px_rgba(6,182,212,0.4)] flex items-center space-x-1.5 active:scale-95"
            >
              <span>{t('Victory.nextRoundNow', 'VÀO VÁN TIẾP THEO')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
