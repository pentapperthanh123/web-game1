import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, ShieldAlert, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_ENRAGED_CONSTANTS, BOSS_STATUS } from '../../constants/game';

interface BossEnragedEntranceBannerProps {
  isElderDragon: boolean;
}

export const BossEnragedEntranceBanner: React.FC<BossEnragedEntranceBannerProps> = React.memo(
  ({ isElderDragon }) => {
    const { t } = useTranslation();
    const bossEnragedEntranceTimestamp = useGameStore(
      (state) => state.bossEnragedEntranceTimestamp
    );
    const bossStatus = useGameStore((state) => state.bossStatus);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      if (bossEnragedEntranceTimestamp === 0 || bossStatus !== BOSS_STATUS.ENRAGED) {
        setIsVisible(false);
        return;
      }

      const elapsed = Date.now() - bossEnragedEntranceTimestamp;
      const remainingMs = BOSS_ENRAGED_CONSTANTS.ENTRANCE_BANNER_DURATION_MS - elapsed;
      if (remainingMs <= 0) {
        setIsVisible(false);
        return;
      }

      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, remainingMs);

      return () => clearTimeout(timer);
    }, [bossEnragedEntranceTimestamp, bossStatus]);

    if (!isVisible) return null;

    const titleText = isElderDragon
      ? t('Game.rageWarningDragonTitle', 'CẢNH BÁO: RỒNG NGÀN TUỔI CUỒNG NỘ!')
      : t('Game.rageWarningTitle', 'CẢNH BÁO: BARON CUỒNG NỘ!');

    const subtitleText = t(
      'Game.rageWarningSubtitle',
      'MÁU DƯỚI 35% — SÁT THƯƠNG & TỐC ĐÁNH TĂNG VỌT!'
    );

    const themeColors = isElderDragon
      ? {
          border: 'border-amber-400',
          bg: 'from-slate-950/95 via-amber-950/90 to-slate-950/95',
          shadow: 'shadow-[0_0_35px_rgba(245,158,11,0.85)]',
          badgeText: 'text-amber-300',
          badgeBg: 'bg-amber-950/90 border-amber-500/70',
        }
      : {
          border: 'border-rose-500',
          bg: 'from-slate-950/95 via-rose-950/90 to-slate-950/95',
          shadow: 'shadow-[0_0_35px_rgba(244,63,94,0.9)]',
          badgeText: 'text-rose-300',
          badgeBg: 'bg-rose-950/90 border-rose-500/70',
        };

    return (
      <div
        key={bossEnragedEntranceTimestamp}
        className="w-full pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300 select-none"
      >
        <div
          className={`relative overflow-hidden rounded-2xl px-3.5 py-2.5 shadow-2xl border-2 backdrop-blur-xl bg-gradient-to-r flex flex-col items-center text-center ${themeColors.border} ${themeColors.bg} ${themeColors.shadow}`}
        >
          {/* Shimmer laser highlight */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_1.8s_infinite] pointer-events-none" />

          {/* Main Title Row */}
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
              {titleText}
            </span>
            <Flame className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
          </div>

          {/* Subtitle Explainer */}
          <span className="text-[10px] sm:text-[11px] font-bold text-amber-200/90 tracking-wide mt-0.5">
            {subtitleText}
          </span>

          {/* Buff Indicators */}
          <div className="flex items-center space-x-2 mt-1.5">
            <span
              className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-black uppercase shadow-sm ${themeColors.badgeBg} ${themeColors.badgeText}`}
            >
              <Zap className="w-3 h-3 text-yellow-300 animate-spin shrink-0" />
              <span>+50% SÁT THƯƠNG</span>
            </span>
            <span
              className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-black uppercase shadow-sm ${themeColors.badgeBg} ${themeColors.badgeText}`}
            >
              <Flame className="w-3 h-3 text-orange-400 animate-pulse shrink-0" />
              <span>+50% TỐC ĐÁNH</span>
            </span>
          </div>
        </div>
      </div>
    );
  }
);

BossEnragedEntranceBanner.displayName = 'BossEnragedEntranceBanner';
