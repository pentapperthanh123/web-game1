import { useState, useEffect } from 'react';
import { Crown, Trophy, Sparkles, RotateCcw } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, GAME_CONSTANTS } from '../../constants/game';
import { audioService } from '../../services/audioService';
import { BLGLogo, GenGLogo } from '../icons/TeamLogos';

export const VictoryOverlay = () => {
  const bossStatus = useGameStore((state) => state.bossStatus);
  const teamScoreBLG = useGameStore((state) => state.teamScoreBLG);
  const teamScoreGENG = useGameStore((state) => state.teamScoreGENG);
  const leaderboard = useGameStore((state) => state.leaderboard);
  const resetBoss = useGameStore((state) => state.resetBoss);

  const [countdown, setCountdown] = useState<number>(GAME_CONSTANTS.VICTORY.COUNTDOWN_SECONDS);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED;
  const isBLGWinner = teamScoreBLG >= teamScoreGENG;
  const mvpPlayer = leaderboard.length > 0 ? leaderboard[0] : null;

  useEffect(() => {
    if (!isDefeated) {
      setCountdown(GAME_CONSTANTS.VICTORY.COUNTDOWN_SECONDS);
      return;
    }

    audioService.playVictoryFanfare();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          resetBoss();
          return GAME_CONSTANTS.VICTORY.COUNTDOWN_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDefeated, resetBoss]);

  if (!isDefeated) return null;

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500 pointer-events-auto select-none">
      {/* Radiant Glow Orb */}
      <div
        className={`absolute w-80 h-80 rounded-full blur-3xl opacity-35 ${
          isBLGWinner ? 'bg-cyan-500' : 'bg-amber-500'
        }`}
      />

      {/* Main Victory Card */}
      <div className="relative z-10 max-w-sm w-full space-y-4">
        {/* Large Winning Team Logo */}
        <div className="flex justify-center items-center">
          <div className="relative p-2 rounded-3xl bg-slate-900/90 border-2 border-slate-700/80 shadow-2xl">
            {isBLGWinner ? (
              <BLGLogo className="w-20 h-20 animate-bounce" />
            ) : (
              <GenGLogo className="w-20 h-20 animate-bounce" />
            )}
            <div className="absolute -top-3 -right-3 p-1.5 rounded-full bg-amber-400 text-slate-950 shadow-lg">
              <Trophy className="w-5 h-5 fill-current" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">
            BARON NASHOR ĐÃ BỊ TIÊU DIỆT!
          </div>
          <h1
            className={`text-2xl font-black uppercase tracking-wider drop-shadow-lg ${
              isBLGWinner ? 'text-cyan-400' : 'text-amber-400'
            }`}
          >
            {isBLGWinner ? 'BILIBILI GAMING' : 'GEN.G ESPORTS'} CHIẾN THẮNG!
          </h1>
        </div>

        {/* MVP Player Showcase */}
        {mvpPlayer && (
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
            <div className="flex items-center justify-center space-x-1.5 text-xs font-black text-amber-400 uppercase">
              <Crown className="w-4 h-4 fill-current" />
              <span>MVP CỦA TRẬN ĐẤU</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            <div className="text-base font-extrabold text-white truncate">
              {mvpPlayer.userName}
            </div>

            <div className="flex justify-center items-center space-x-2 text-xs">
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded ${
                  mvpPlayer.team === 'BLG'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {mvpPlayer.team}
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {(mvpPlayer?.totalDamage ?? 0).toLocaleString()} SÁT THƯƠNG
              </span>
            </div>
          </div>
        )}

        {/* Total Score Tug-of-War */}
        <div className="flex justify-between text-xs font-mono px-3">
          <span className="text-cyan-400 font-bold">BLG: {(teamScoreBLG ?? 0).toLocaleString()} DMG</span>
          <span className="text-amber-400 font-bold">GEN: {(teamScoreGENG ?? 0).toLocaleString()} DMG</span>
        </div>

        {/* Auto Next Match Countdown */}
        <div className="pt-1">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow">
            <RotateCcw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Ván mới bắt đầu sau:</span>
            <span className="font-mono font-black text-cyan-400 text-sm">{countdown}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
