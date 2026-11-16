import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Flame, Shield, Sparkles, Timer } from 'lucide-react';
import { DUEL_URGENT_SECONDS, formatDuelTime } from './silverScrapesShared';

interface DuelHeaderProps {
  timeRemaining: number;
  totalDuration: number;
  isLastStandActive: boolean;
}

/** Title pill, countdown with a draining time bar, and the last-stand shield badge. */
export const DuelHeader = ({ timeRemaining, totalDuration, isLastStandActive }: DuelHeaderProps) => {
  const { t } = useTranslation();
  const timeRatio = totalDuration > 0 ? Math.max(0, Math.min(1, timeRemaining / totalDuration)) : 0;
  const isUrgent = timeRemaining <= DUEL_URGENT_SECONDS;

  return (
    <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-2.5 pt-1">
      <div className="inline-flex max-w-full items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-amber-950/90 border border-cyan-400/50 shadow-[0_0_22px_rgba(6,182,212,0.4)]">
        <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
        <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-amber-200 truncate">
          {t('SilverScrapes.title', '⚡ SILVER SCRAPES: ĐẠI CHIẾN ĐỘC TÔN 1V1 ⚡')}
        </h2>
        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      </div>

      <div className="w-full max-w-[240px] flex flex-col items-center gap-1.5">
        <div
          className={clsx(
            'flex items-center gap-2 font-mono text-3xl font-black tracking-widest tabular-nums',
            isUrgent ? 'text-rose-300 drop-shadow-[0_0_14px_rgba(244,63,94,0.8)] animate-pulse' : 'text-white'
          )}
        >
          <Timer className={clsx('w-5 h-5', isUrgent ? 'text-rose-400' : 'text-cyan-400')} />
          <span>{formatDuelTime(timeRemaining)}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-800/90 overflow-hidden">
          <div
            style={{ transform: `scaleX(${timeRatio})` }}
            className={clsx(
              'h-full w-full origin-left transition-transform duration-1000 ease-linear',
              isUrgent ? 'bg-rose-400' : 'bg-gradient-to-r from-cyan-400 to-amber-400'
            )}
          />
        </div>
      </div>

      {isLastStandActive && (
        <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/80 shadow-[0_0_14px_rgba(245,158,11,0.5)] animate-pulse">
          <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{t('SilverScrapes.lastStand', 'LÁ CHẮN TỬ THỦ (GIỚI HẠN 95%)')}</span>
        </div>
      )}
    </div>
  );
};
