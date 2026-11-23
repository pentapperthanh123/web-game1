import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_ENRAGED_CONSTANTS, BOSS_STATUS, BossThemeConfig } from '../../constants/game';

interface BossEnragedEntranceBannerProps {
  themeConfig: BossThemeConfig;
}

export const BossEnragedEntranceBanner: React.FC<BossEnragedEntranceBannerProps> = React.memo(
  ({ themeConfig }) => {
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

    const titleText = t(
      'Game.rageWarningDynamicTitle',
      `CẢNH BÁO: ${themeConfig.bossName.toUpperCase()} CUỒNG NỘ!`
    );

    const enragedColor = themeConfig.colors.enragedHex;

    return (
      <div
        key={bossEnragedEntranceTimestamp}
        className="w-full max-w-sm pointer-events-none select-none animate-in fade-in slide-in-from-top-2 duration-200 px-2 mx-auto flex justify-center"
      >
        {/* Slim Esports Ribbon Ticker: Only 28px height, never blocks the 3D Boss or Minions */}
        <div
          style={{
            borderColor: enragedColor,
            boxShadow: `0 0 16px ${enragedColor}88`,
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border bg-slate-950/95 backdrop-blur-md shadow-lg"
        >
          <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/80 text-rose-300 tracking-wider shrink-0 flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5 text-amber-400 animate-bounce" />
            <span>{t('Game.enragedBadge', 'CUỒNG NỘ')}</span>
          </span>

          <span className="text-[10.5px] sm:text-[11px] font-black text-white uppercase tracking-wider drop-shadow truncate flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
            <span>{titleText}</span>
          </span>

          <span className="text-[8.5px] sm:text-[9px] font-bold text-amber-300 tracking-tight shrink-0 hidden xs:inline">
            • {t('Game.enragedStatsShort', 'MÁU < 35% (+50% ST & TỐC ĐÁNH)')}
          </span>
        </div>
      </div>
    );
  }
);

BossEnragedEntranceBanner.displayName = 'BossEnragedEntranceBanner';
