import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Trophy, Sparkles, RotateCcw, ArrowRight, Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_DEFEAT_CONSTANTS,
  BOSS_STATUS,
  TEAM_KEY,
  TeamType,
} from '../../constants/game';
import { audioService } from '../../services/audioService';
import { getTeamTheme } from '../../constants/teams';
import { TeamLogo } from '../icons/TeamLogos';
import { ProDamageRecord } from '../../types/game';

export const VictoryOverlay = () => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
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
  const activeTeams = useGameStore((state) => state.activeTeams);

  const [isVictoryVisible, setIsVictoryVisible] = useState<boolean>(false);
  const [proAvatarFailed, setProAvatarFailed] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED || isRoundIntermission;

  useEffect(() => {
    if (!isDefeated) {
      setIsVictoryVisible(false);
      setProAvatarFailed(false);
      setIsAdvancing(false);
      return;
    }

    const revealTimer = setTimeout(() => {
      setIsVictoryVisible(true);
      audioService.playVictoryFanfare();
    }, BOSS_DEFEAT_CONSTANTS.VICTORY_DELAY_MS);

    return () => clearTimeout(revealTimer);
  }, [isDefeated]);

  // Determine active winner
  const effectiveWinner: TeamType = isSeriesEnded
    ? seriesWinner || (bo5Score.BLG >= bo5Score.GENG ? TEAM_KEY.BLG : TEAM_KEY.GENG)
    : roundWinner || (teamScoreBLG >= teamScoreGENG ? TEAM_KEY.BLG : TEAM_KEY.GENG);

  const leftTeam = activeTeams[TEAM_KEY.BLG];
  const rightTeam = activeTeams[TEAM_KEY.GENG];
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);
  const winnerProfile = activeTeams[effectiveWinner];
  const winnerTheme = getTeamTheme(winnerProfile?.colorTheme);
  const winnerName = winnerProfile?.name || effectiveWinner;

  const viewerMvp = leaderboard.length > 0 ? leaderboard[0] : null;
  const proMvp: ProDamageRecord | null = proLeaderboard.length > 0 ? proLeaderboard[0] : null;

  const handleStartNextRound = () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    startNextRound();
  };

  const handleResetBO5Match = () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    resetBO5Match();
  };

  if (!isDefeated || !isVictoryVisible) return null;

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in zoom-in-95 duration-500 pointer-events-auto select-none">
      {/* Radiant Glow Orb */}
      <div className={`absolute w-80 h-80 rounded-full blur-3xl opacity-35 ${winnerTheme.glowOrbClass}`} />

      {/* Main Victory Card */}
      <div className="relative z-10 max-w-sm w-full space-y-3 sm:space-y-4">
        {/* Large Winning Team Logo */}
        <div className="flex justify-center items-center">
          <div className="relative p-2 rounded-3xl bg-slate-900/90 border-2 border-slate-700/80 shadow-2xl">
            <TeamLogo
              teamProfile={winnerProfile}
              teamSlot={effectiveWinner}
              className="w-16 h-16 sm:w-20 sm:h-20 animate-bounce"
            />
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
            className={`text-xl sm:text-2xl font-black uppercase tracking-wider drop-shadow-lg ${winnerTheme.textStrongClass}`}
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
            {/* Left Team Block */}
            <div className="flex items-center space-x-1.5">
              <span className={`text-xs font-black ${leftTheme.textStrongClass}`}>{leftTeam.shortTag}</span>
              <div className="flex space-x-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={`win-left-${i}`}
                    className={`w-2.5 h-2.5 rotate-45 border transition-all ${
                      i < bo5Score.BLG
                        ? leftTheme.winPipActiveClass
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

            {/* Right Team Block */}
            <div className="flex items-center space-x-1.5">
              <div className="flex space-x-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={`win-right-${i}`}
                    className={`w-2.5 h-2.5 rotate-45 border transition-all ${
                      i < bo5Score.GENG
                        ? rightTheme.winPipActiveClass
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs font-black ${rightTheme.textStrongClass}`}>{rightTeam.shortTag}</span>
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
              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${getTeamTheme(activeTeams[viewerMvp.team]?.colorTheme).badgePillClass}`}>
                {activeTeams[viewerMvp.team]?.shortTag || viewerMvp.team}
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
              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${getTeamTheme(activeTeams[proMvp.team]?.colorTheme).badgePillClass}`}>
                {activeTeams[proMvp.team]?.shortTag || proMvp.team}
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
                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${getTeamTheme(activeTeams[finisherTeam]?.colorTheme).badgePillClass}`}
              >
                {activeTeams[finisherTeam]?.shortTag || finisherTeam}
              </span>
            )}
          </div>
        )}

        {/* Total Score Tug-of-War of this game */}
        <div className="flex justify-between text-xs font-mono px-3">
          <span className={`${leftTheme.textStrongClass} font-bold`}>
            {leftTeam.shortTag}: {(teamScoreBLG ?? 0).toLocaleString()} DMG
          </span>
          <span className={`${rightTheme.textStrongClass} font-bold`}>
            {rightTeam.shortTag}: {(teamScoreGENG ?? 0).toLocaleString()} DMG
          </span>
        </div>

        {/* Manual Advance / Match Control */}
        <div className="pt-2 flex flex-col items-center space-y-2.5">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isSeriesEnded
                ? t('Victory.seriesEndedNotice', 'Loạt trận BO5 đã kết thúc!')
                : t('Victory.roundIntermissionPrompt', 'Nghỉ giữa hiệp - Sẵn sàng cho ván tiếp theo')}
            </span>
          </div>

          {isSeriesEnded ? (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={handleResetBO5Match}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('Victory.newSeries', 'BẮT ĐẦU TRẬN ĐẤU MỚI')}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={handleStartNextRound}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse hover:animate-none"
            >
              <span>{t('Victory.nextRoundNow', 'VÀO VÁN TIẾP THEO')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
