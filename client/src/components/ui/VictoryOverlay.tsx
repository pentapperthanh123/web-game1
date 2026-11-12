import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Crown,
  Trophy,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Swords,
  Star,
  Flame,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_DEFEAT_CONSTANTS,
  BOSS_STATUS,
  TEAM_KEY,
  TeamType,
} from '../../constants/game';
import { audioService } from '../../services/audioService';
import { gameSocket } from '../../services/socket';
import { getTeamTheme } from '../../constants/teams';
import { TeamLogo } from '../icons/TeamLogos';
import { ProDamageRecord } from '../../types/game';

const CELEBRATION_STARS = [
  { id: 1, top: '8%', left: '12%', size: 'w-4 h-4', delay: '0s', opacity: 'opacity-70' },
  { id: 2, top: '15%', right: '14%', size: 'w-5 h-5', delay: '0.4s', opacity: 'opacity-90' },
  { id: 3, top: '28%', left: '8%', size: 'w-3 h-3', delay: '0.8s', opacity: 'opacity-60' },
  { id: 4, top: '35%', right: '10%', size: 'w-4 h-4', delay: '1.2s', opacity: 'opacity-80' },
  { id: 5, top: '70%', left: '15%', size: 'w-3.5 h-3.5', delay: '0.6s', opacity: 'opacity-75' },
  { id: 6, top: '75%', right: '18%', size: 'w-4 h-4', delay: '1s', opacity: 'opacity-85' },
];

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
  const seriesFormat = useGameStore((state) => state.seriesFormat);
  const bo5TargetWins = useGameStore((state) => state.bo5TargetWins);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const isSeriesEnded = useGameStore((state) => state.isSeriesEnded);
  const seriesWinner = useGameStore((state) => state.seriesWinner);
  const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const startNextRound = useGameStore((state) => state.startNextRound);
  const resetBO5Match = useGameStore((state) => state.resetBO5Match);
  const advanceNextMatchQueue = useGameStore((state) => state.advanceNextMatchQueue);
  const matchQueue = useGameStore((state) => state.matchQueue);
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

  const nextQueuedMatch = matchQueue.length > 0 ? matchQueue[0] : null;

  const handleResetBO5Match = () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    resetBO5Match();
  };

  const handleAdvanceQueuedMatch = () => {
    if (isAdvancing || !nextQueuedMatch) return;
    setIsAdvancing(true);
    const didAdvance = advanceNextMatchQueue();
    if (didAdvance) {
      const latest = useGameStore.getState();
      gameSocket.sendTeamConfig(
        {
          activeTeams: latest.activeTeams,
          teamCatalog: latest.teamCatalog,
          matchQueue: latest.matchQueue,
        },
        true
      );
    }
  };

  if (!isDefeated || !isVictoryVisible) return null;

  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-3 sm:p-6 text-center animate-in fade-in zoom-in-95 duration-700 pointer-events-auto select-none overflow-y-auto">
      {/* Background Celebration Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/30 via-slate-950/80 to-slate-950 pointer-events-none" />
      <div
        className={`absolute w-96 h-96 rounded-full blur-[100px] opacity-40 pointer-events-none ${winnerTheme.glowOrbClass}`}
      />

      {/* Floating Golden Celebration Sparkles */}
      {CELEBRATION_STARS.map((star) => (
        <div
          key={`star-${star.id}`}
          style={{ top: star.top, left: star.left, right: star.right, animationDelay: star.delay }}
          className={`absolute pointer-events-none text-amber-300 animate-pulse ${star.size} ${star.opacity}`}
        >
          <Sparkles className="w-full h-full drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        </div>
      ))}

      {/* Main Victory Stage / Podium */}
      <div className="relative z-10 max-w-sm sm:max-w-md w-full space-y-3.5 my-auto py-2">
        {/* World Championship Header Tag */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-amber-950/90 border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-200">
            CKTG 2026 WORLDS CHAMPIONSHIP
          </span>
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
        </div>

        {/* Grand Champion Trophy & Team Crest Pedestal */}
        <div className="relative flex justify-center items-center pt-2">
          {/* Radiant Halo behind Logo */}
          <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-amber-500/40 via-yellow-300/30 to-amber-600/40 blur-xl animate-pulse" />

          {/* Golden Shield Base */}
          <div className="relative p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.55)] flex flex-col items-center">
            {/* Crown Crest on top */}
            <div className="absolute -top-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center space-x-1 shadow-lg">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>CHAMPION</span>
            </div>

            {/* Official Team Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center p-1.5 transition-transform duration-300 hover:scale-105">
              <TeamLogo
                teamProfile={winnerProfile}
                teamSlot={effectiveWinner}
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              />
            </div>

            {/* Trophy Icon Badge */}
            <div className="absolute -bottom-3 p-1.5 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 border-2 border-slate-900 shadow-xl">
              <Trophy className="w-4 h-4 fill-current" />
            </div>
          </div>
        </div>

        {/* Victory Title & Subtitle */}
        <div className="space-y-0.5 pt-1">
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">
            {isSeriesEnded
              ? t('Victory.seriesScore', 'TỈ SỐ CHUNG CUỘC {{format}}: {{blg}} - {{geng}}', {
                  format: seriesFormat,
                  blg: bo5Score.BLG,
                  geng: bo5Score.GENG,
                })
              : t('Victory.bossDefeated', 'BARON NASHOR ĐÃ BỊ TIÊU DIỆT!')}
          </div>

          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.7)]">
            {isSeriesEnded
              ? t('Victory.seriesChampion', '🏆 {{team}} VÔ ĐỊCH CKTG 2026 {{format}}!', {
                  team: winnerName,
                  format: seriesFormat,
                })
              : t('Victory.roundWin', '{{team}} CHIẾN THẮNG VÁN {{round}}!', {
                  team: winnerName,
                  round: currentRound,
                })}
          </h1>
        </div>

        {/* Match Series Scoreboard Card */}
        <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800 shadow-2xl space-y-2">
          <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase flex items-center justify-center space-x-1">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>{t('Victory.bo5Score', 'TỈ SỐ {{format}} HIỆN TẠI', { format: seriesFormat })}</span>
          </div>

          <div className="flex items-center justify-between px-2 sm:px-4">
            {/* Left Team Block */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1">
                <TeamLogo teamProfile={leftTeam} teamSlot={TEAM_KEY.BLG} className="w-6 h-6 object-contain" />
              </div>
              <div className="text-left">
                <div className={`text-xs font-black leading-tight ${leftTheme.textStrongClass}`}>
                  {leftTeam.shortTag}
                </div>
                <div className="flex space-x-1 mt-0.5">
                  {Array.from({ length: bo5TargetWins }).map((_, i) => (
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
            </div>

            {/* Score Display */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
              <span className={`font-mono text-base sm:text-lg font-black ${leftTheme.textStrongClass}`}>
                {bo5Score.BLG}
              </span>
              <span className="text-slate-500 font-black">-</span>
              <span className={`font-mono text-base sm:text-lg font-black ${rightTheme.textStrongClass}`}>
                {bo5Score.GENG}
              </span>
            </div>

            {/* Right Team Block */}
            <div className="flex items-center space-x-2 flex-row-reverse space-x-reverse">
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1">
                <TeamLogo teamProfile={rightTeam} teamSlot={TEAM_KEY.GENG} className="w-6 h-6 object-contain" />
              </div>
              <div className="text-right">
                <div className={`text-xs font-black leading-tight ${rightTheme.textStrongClass}`}>
                  {rightTeam.shortTag}
                </div>
                <div className="flex space-x-1 justify-end mt-0.5">
                  {Array.from({ length: bo5TargetWins }).map((_, i) => (
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
              </div>
            </div>
          </div>
        </div>

        {/* MVP Award Showcase */}
        {viewerMvp && (
          <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-amber-500/40 shadow-xl space-y-1.5">
            <div className="flex items-center justify-center space-x-1.5 text-[10px] sm:text-[11px] font-black text-amber-300 uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>{t('Victory.mvpTitle', 'MVP CỦA TRẬN ĐẤU')}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>

            <div className="text-sm sm:text-base font-black text-white truncate px-2">
              {viewerMvp.userName}
            </div>

            <div className="flex justify-center items-center space-x-2 text-xs">
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded ${
                  getTeamTheme(activeTeams[viewerMvp.team]?.colorTheme).badgePillClass
                }`}
              >
                {activeTeams[viewerMvp.team]?.shortTag || viewerMvp.team}
              </span>
              <span className="font-mono text-emerald-400 font-black text-xs sm:text-sm">
                {(viewerMvp.totalDamage ?? 0).toLocaleString()} {t('Victory.damage', 'SÁT THƯƠNG')}
              </span>
            </div>
          </div>
        )}

        {!viewerMvp && proMvp && (
          <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-amber-500/40 shadow-xl space-y-1.5">
            <div className="flex items-center justify-center space-x-1.5 text-[10px] sm:text-[11px] font-black text-amber-300 uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>{t('Victory.proMvpTitle', 'MVP TUYỂN THỦ')}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>

            <div className="flex items-center justify-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400/80 bg-slate-800 shrink-0 flex items-center justify-center shadow-lg">
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
                <div className="text-sm sm:text-base font-black text-white truncate flex items-center space-x-1.5">
                  <span>{proMvp.playerName}</span>
                  <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {proMvp.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold truncate">
                  {proMvp.championName}
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center space-x-2 text-xs pt-0.5">
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded ${
                  getTeamTheme(activeTeams[proMvp.team]?.colorTheme).badgePillClass
                }`}
              >
                {activeTeams[proMvp.team]?.shortTag || proMvp.team}
              </span>
              <span className="font-mono text-emerald-400 font-black text-xs sm:text-sm">
                {(proMvp.totalDamage ?? 0).toLocaleString()} {t('Victory.damage', 'SÁT THƯƠNG')}
              </span>
            </div>
          </div>
        )}

        {/* Last-Hit Finisher Callout */}
        {finisherPlayerName && (
          <div className="inline-flex items-center justify-center space-x-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-[11px] shadow">
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
                  getTeamTheme(activeTeams[finisherTeam]?.colorTheme).badgePillClass
                }`}
              >
                {activeTeams[finisherTeam]?.shortTag || finisherTeam}
              </span>
            )}
          </div>
        )}

        {/* Total Damage Summary */}
        <div className="flex justify-between text-[11px] font-mono px-3 text-slate-400">
          <span className={`${leftTheme.textStrongClass} font-bold`}>
            {leftTeam.shortTag}: {(teamScoreBLG ?? 0).toLocaleString()} DMG
          </span>
          <span className={`${rightTheme.textStrongClass} font-bold`}>
            {rightTeam.shortTag}: {(teamScoreGENG ?? 0).toLocaleString()} DMG
          </span>
        </div>

        {/* Action Controls & Match Advancing */}
        <div className="pt-1 flex flex-col items-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] sm:text-[11px] text-slate-300 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isSeriesEnded
                ? t('Victory.seriesEndedNotice', 'Loạt trận {{format}} đã kết thúc!', {
                    format: seriesFormat,
                  })
                : t('Victory.roundIntermissionPrompt', 'Nghỉ giữa hiệp - Sẵn sàng cho ván tiếp theo')}
            </span>
          </div>

          {isSeriesEnded ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
              {nextQueuedMatch && (
                <button
                  type="button"
                  disabled={isAdvancing}
                  onClick={handleAdvanceQueuedMatch}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_20px_rgba(16,185,129,0.55)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <span>
                    {t('Victory.nextQueuedMatch', 'TRẬN TIẾP THEO: {{label}} ({{remaining}})', {
                      label: nextQueuedMatch.label,
                      remaining: matchQueue.length,
                    })}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                disabled={isAdvancing}
                onClick={handleResetBO5Match}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_18px_rgba(245,158,11,0.5)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('Victory.newSeries', 'BẮT ĐẦU TRẬN ĐẤU MỚI')}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={handleStartNextRound}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-[0_0_18px_rgba(6,182,212,0.55)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse hover:animate-none"
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
