import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Flame, Shield, Sparkles, Timer } from 'lucide-react';
import { DUEL_URGENT_SECONDS, formatDuelTime } from './silverScrapesShared';
import { SilverScrapesEqualizerBars } from './SilverScrapesVisualizer';

interface DuelHeaderProps {
  timeRemaining: number;
  totalDuration: number;
  isLastStandActive: boolean;
}

/** Championship title pill, stadium countdown with a draining time bar, and the last-stand shield badge. */
export const DuelHeader: React.FC<DuelHeaderProps> = React.memo(
  ({ timeRemaining, totalDuration, isLastStandActive }) => {
    const { t } = useTranslation();
    const timeRatio = totalDuration > 0 ? Math.max(0, Math.min(1, timeRemaining / totalDuration)) : 0;
    const isUrgent = timeRemaining <= DUEL_URGENT_SECONDS;

    return (
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-2 pt-1">
        {/* Main Tournament Championship Title */}
        <div className="inline-flex max-w-full items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-amber-950/90 border border-cyan-400/60 shadow-[0_0_24px_rgba(6,182,212,0.4)]">
          <SilverScrapesEqualizerBars colorClass="bg-cyan-400" size="sm" />
          <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0 animate-pulse" />
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-amber-200 truncate">
            {t('SilverScrapes.title', '⚡ SILVER SCRAPES: ĐẠI CHIẾN ĐỘC TÔN 1V1 ⚡')}
          </h2>
          <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <SilverScrapesEqualizerBars colorClass="bg-amber-400" size="sm" />
        </div>

        {/* Stadium Digital Clock & Progress Bar */}
        <div className="w-full max-w-[260px] flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-lg">
          <div
            className={clsx(
              'flex items-center gap-2 font-mono text-3xl sm:text-4xl font-black tracking-widest tabular-nums',
              isUrgent ? 'text-rose-400 drop-shadow-[0_0_16px_rgba(244,63,94,0.9)] animate-pulse' : 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'
            )}
          >
            <Timer className={clsx('w-5 h-5 sm:w-6 sm:h-6', isUrgent ? 'text-rose-400 animate-bounce' : 'text-cyan-400')} />
            <span>{formatDuelTime(timeRemaining)}</span>
          </div>

          <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
            <div
              style={{ transform: `scaleX(${timeRatio})` }}
              className={clsx(
                'h-full w-full origin-left transition-transform duration-1000 ease-linear rounded-full',
                isUrgent ? 'bg-gradient-to-r from-rose-500 to-amber-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
              )}
            />
          </div>
        </div>

        {/* Last Stand Protective Shield Badge */}
        {isLastStandActive && (
          <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/80 shadow-[0_0_16px_rgba(245,158,11,0.6)] animate-pulse">
            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t('SilverScrapes.lastStand', 'LÁ CHẮN TỬ THỦ (GIỚI HẠN 95%)')}</span>
          </div>
        )}
      </div>
    );
  }
);

DuelHeader.displayName = 'DuelHeader';

