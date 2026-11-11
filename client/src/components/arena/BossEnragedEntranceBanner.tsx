import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, ShieldAlert, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_ENRAGED_CONSTANTS } from '../../constants/game';

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

    if (bossEnragedEntranceTimestamp === 0 || bossStatus !== 'ENRAGED') {
      return null;
    }

    const elapsed = Date.now() - bossEnragedEntranceTimestamp;
    if (elapsed > BOSS_ENRAGED_CONSTANTS.ENTRANCE_BANNER_DURATION_MS) {
      return null;
    }

    const titleText = isElderDragon
      ? t('Game.rageWarningDragonTitle', 'CẢNH BÁO: RỒNG NGÀN TUỔI CUỒNG NỘ!')
      : t('Game.rageWarningTitle', 'CẢNH BÁO: BARON CUỒNG NỘ!');

    const subtitleText = t(
      'Game.rageWarningSubtitle',
      'MÁU DƯỚI 35% — SÁT THƯƠNG & TỐC ĐÁNH TĂNG VỌT!'
    );

    const themeColors = isElderDragon
      ? {
          border: 'border-amber-500',
          bg: 'from-amber-950/95 via-stone-950/95 to-orange-950/95',
          shadow: 'shadow-[0_0_35px_rgba(245,158,11,0.9)]',
          badgeText: 'text-amber-300',
          badgeBg: 'bg-amber-900/80 border-amber-500/60',
        }
      : {
          border: 'border-rose-500',
          bg: 'from-rose-950/95 via-stone-950/95 to-red-950/95',
          shadow: 'shadow-[0_0_35px_rgba(244,63,94,0.95)]',
          badgeText: 'text-rose-300',
          badgeBg: 'bg-rose-900/80 border-rose-500/60',
        };

    return (
      <div
        key={bossEnragedEntranceTimestamp}
        className="absolute left-1/2 -top-16 sm:-top-20 -translate-x-1/2 z-30 pointer-events-none select-none w-max max-w-[94vw] animate-rage-entrance-banner"
      >
        <div
          className={`flex flex-col items-center px-4 py-2 rounded-2xl border-2 bg-gradient-to-r backdrop-blur-md ${themeColors.border} ${themeColors.bg} ${themeColors.shadow}`}
        >
          {/* Main Title Row */}
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
              {titleText}
            </span>
            <Flame className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
          </div>

          {/* Subtitle Explainer */}
          <span className="text-[9px] sm:text-[10px] font-bold text-amber-200/90 tracking-wide mt-0.5 text-center">
            {subtitleText}
          </span>

          {/* Buff Indicators */}
          <div className="flex items-center space-x-2 mt-1">
            <span
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[8px] sm:text-[9px] font-black uppercase ${themeColors.badgeBg} ${themeColors.badgeText}`}
            >
              <Zap className="w-2.5 h-2.5 text-yellow-300 animate-spin shrink-0" />
              <span>+50% SÁT THƯƠNG</span>
            </span>
            <span
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[8px] sm:text-[9px] font-black uppercase ${themeColors.badgeBg} ${themeColors.badgeText}`}
            >
              <Flame className="w-2.5 h-2.5 text-orange-400 animate-pulse shrink-0" />
              <span>+50% TỐC ĐÁNH</span>
            </span>
          </div>
        </div>
      </div>
    );
  }
);

BossEnragedEntranceBanner.displayName = 'BossEnragedEntranceBanner';
