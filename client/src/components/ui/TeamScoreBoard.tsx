import { useTranslation } from 'react-i18next';
import { Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BLGLogo, GenGLogo } from '../icons/TeamLogos';

export const TeamScoreBoard = () => {
  const { t } = useTranslation();
  const teamScoreBLG = useGameStore((state) => state.teamScoreBLG);
  const teamScoreGENG = useGameStore((state) => state.teamScoreGENG);

  const totalScore = teamScoreBLG + teamScoreGENG;
  let blgRatio = 50;
  let gengRatio = 50;
  if (totalScore > 0) {
    blgRatio = (teamScoreBLG / totalScore) * 100;
    gengRatio = (teamScoreGENG / totalScore) * 100;
  }

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-3 mt-1 pointer-events-auto select-none">
      {/* Team Headers: BLG (Left) vs GEN.G (Right) */}
      <div className="flex items-center justify-between mb-1">
        {/* BLG Team Block */}
        <div className="flex items-center space-x-2 text-cyan-400 min-w-0">
          <div className="relative shrink-0 p-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
            <BLGLogo className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.7)] truncate">
                {t('Game.teamBLG', 'BILIBILI GAMING')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-extrabold text-cyan-200 bg-cyan-950/80 px-1 rounded border border-cyan-500/40 shrink-0">
                {blgRatio.toFixed(0)}%
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono text-cyan-400 font-extrabold tracking-tight">
              {(teamScoreBLG ?? 0).toLocaleString()} DMG
            </div>
          </div>
        </div>

        {/* Center Worlds VS Crest */}
        <div className="flex flex-col items-center px-1.5 shrink-0">
          <div className="w-6 h-6 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.8)]">
            <Swords className="w-3 h-3 text-amber-400" />
          </div>
          <span className="text-[7px] font-black tracking-widest text-slate-400 uppercase mt-0.5">
            {t('Game.vs', 'VS')}
          </span>
        </div>

        {/* GEN.G Team Block */}
        <div className="flex items-center space-x-2 text-amber-400 text-right flex-row-reverse space-x-reverse min-w-0">
          <div className="relative shrink-0 p-0.5 rounded-md bg-amber-950/80 border border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.4)]">
            <GenGLogo className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 justify-end">
              <span className="text-[9px] sm:text-[10px] font-mono font-extrabold text-amber-200 bg-amber-950/80 px-1 rounded border border-amber-500/40 shrink-0">
                {gengRatio.toFixed(0)}%
              </span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)] truncate">
                {t('Game.teamGENG', 'GEN.G ESPORTS')}
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono text-amber-400 font-extrabold tracking-tight">
              {(teamScoreGENG ?? 0).toLocaleString()} DMG
            </div>
          </div>
        </div>
      </div>

      {/* Cyberpunk Battle Tug-of-War Bar */}
      <div className="relative w-full h-3.5 sm:h-4 bg-slate-950/95 rounded-lg border border-slate-700/90 p-0.5 shadow-[0_0_16px_rgba(0,0,0,0.9)] overflow-hidden flex">
        {/* BLG Territory Bar */}
        <div
          className="h-full bg-gradient-to-r from-blue-700 via-cyan-500 to-cyan-300 transition-all duration-300 shadow-[0_0_14px_#06b6d4] relative"
          style={{ width: `${blgRatio}%` }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#ffffff]" />
        </div>

        {/* GEN.G Territory Bar */}
        <div
          className="h-full bg-gradient-to-r from-amber-300 via-amber-500 to-yellow-600 transition-all duration-300 shadow-[0_0_14px_#f59e0b] relative"
          style={{ width: `${gengRatio}%` }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#ffffff]" />
        </div>

        {/* Center Tension Divider */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white shadow-[0_0_6px_#ffffff] z-10" />
      </div>
    </div>
  );
};
