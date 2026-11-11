import { useEffect } from 'react';
import { Sparkles, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';
import { BLGLogo, GenGLogo } from '../icons/TeamLogos';

export const GiftBanner = () => {
  const activeGiftBanner = useGameStore((state) => state.activeGiftBanner);
  const dismissGiftBanner = useGameStore((state) => state.dismissGiftBanner);

  useEffect(() => {
    if (!activeGiftBanner) return;
    const timer = setTimeout(() => {
      dismissGiftBanner();
    }, 4500);
    return () => clearTimeout(timer);
  }, [activeGiftBanner, dismissGiftBanner]);

  if (!activeGiftBanner) return null;

  const isBLG = activeGiftBanner.team === TEAM_KEY.BLG;

  return (
    <div className="absolute top-[28%] left-0 right-0 flex justify-center items-center z-40 pointer-events-none px-3 animate-in fade-in zoom-in-90 duration-300">
      <div
        className={`relative overflow-hidden rounded-3xl p-3.5 shadow-2xl border-2 backdrop-blur-2xl max-w-md w-full ${
          isBLG
            ? 'bg-gradient-to-r from-slate-950/95 via-cyan-950/90 to-slate-950/95 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.7)]'
            : 'bg-gradient-to-r from-slate-950/95 via-amber-950/90 to-slate-950/95 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.7)]'
        }`}
      >
        {/* Animated Light Sweep Bar */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_1.8s_infinite]" />

        <div className="relative flex items-center space-x-3">
          {/* Team Official Logo Badge */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 p-1.5 shadow-2xl border ${
              isBLG
                ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_25px_#06b6d4]'
                : 'bg-slate-900/90 border-amber-400 shadow-[0_0_25px_#f59e0b]'
            }`}
          >
            {isBLG ? (
              <BLGLogo className="w-10 h-10 object-contain drop-shadow-[0_0_12px_#00f2fe]" />
            ) : (
              <GenGLogo className="w-10 h-10 object-contain drop-shadow-[0_0_12px_#ffa751]" />
            )}
          </div>

          {/* Right Text Block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span
                className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                  isBLG
                    ? 'bg-cyan-400 text-slate-950 font-black'
                    : 'bg-amber-400 text-slate-950 font-black'
                }`}
              >
                ĐẠI GIA {activeGiftBanner.team}
              </span>
              <span className="text-sm font-black text-white truncate drop-shadow">
                {activeGiftBanner.donorName}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-xs font-bold text-slate-300">ĐÃ TẶNG:</span>
              <span
                className={`text-base font-black tracking-wide ${
                  isBLG ? 'text-cyan-300' : 'text-amber-300'
                }`}
              >
                {activeGiftBanner.giftName}
              </span>
              <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
            </div>

            <div className="flex items-center space-x-1 mt-1 text-[11px] font-mono font-black text-emerald-400">
              <Flame className="w-3.5 h-3.5 fill-current text-rose-500 animate-pulse" />
              <span>+{((activeGiftBanner.coins ?? 0) * 120).toLocaleString()} ST TUYỆT KỸ & MƯA THIÊN THẠCH!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
