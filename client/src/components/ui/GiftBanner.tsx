import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';
import { BLGLogo, GenGLogo } from '../icons/TeamLogos';

export const GiftBanner = () => {
  const { t } = useTranslation();
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
  const giftDamage = (activeGiftBanner.coins ?? 0) * 120;

  return (
    <div className="w-full pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
      <div
        className={`relative overflow-hidden rounded-2xl px-3 py-2 shadow-2xl border backdrop-blur-xl ${
          isBLG
            ? 'bg-gradient-to-r from-slate-950/95 via-cyan-950/90 to-slate-950/95 border-cyan-400/90 shadow-[0_0_28px_rgba(6,182,212,0.55)]'
            : 'bg-gradient-to-r from-slate-950/95 via-amber-950/90 to-slate-950/95 border-amber-400/90 shadow-[0_0_28px_rgba(245,158,11,0.55)]'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] animate-[shimmer_1.8s_infinite]" />

        <div className="relative flex items-center space-x-2.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 p-1 shadow-lg border ${
              isBLG
                ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_14px_#06b6d4]'
                : 'bg-slate-900/90 border-amber-400 shadow-[0_0_14px_#f59e0b]'
            }`}
          >
            {isBLG ? (
              <BLGLogo className="w-7 h-7 object-contain" />
            ) : (
              <GenGLogo className="w-7 h-7 object-contain" />
            )}
          </div>

          <div className="flex-1 min-w-0 leading-tight">
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                  isBLG ? 'bg-cyan-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                }`}
              >
                {t('Gift.patronTag', 'ĐẠI GIA {{team}}', { team: activeGiftBanner.team })}
              </span>
              <span className="text-xs font-black text-white truncate">
                {activeGiftBanner.donorName}
              </span>
            </div>

            <div className="flex items-center space-x-1 mt-0.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-300 shrink-0">
                {t('Gift.sentLabel', 'ĐÃ TẶNG')}:
              </span>
              <span
                className={`text-xs font-black truncate ${
                  isBLG ? 'text-cyan-300' : 'text-amber-300'
                }`}
              >
                {activeGiftBanner.giftName}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin shrink-0" />
            </div>

            <div className="flex items-center space-x-1 mt-0.5 text-[10px] font-mono font-black text-emerald-400 truncate">
              <Flame className="w-3 h-3 fill-current text-rose-500 animate-pulse shrink-0" />
              <span className="truncate">
                +{giftDamage.toLocaleString()} {t('Gift.ultimateBonus', 'ST TUYỆT KỸ & MƯA THIÊN THẠCH!')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
