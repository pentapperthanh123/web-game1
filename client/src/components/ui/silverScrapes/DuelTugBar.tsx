import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { DUEL_PERCENT_CENTER, DUEL_PERCENT_MAX } from './silverScrapesShared';

const BEAM_HIGHLIGHT = '#ffffff';

interface DuelTugBarProps {
  leftPercent: number;
  leftTag: string;
  rightTag: string;
  leftColor: string;
  rightColor: string;
  isClashFlashing: boolean;
}

/**
 * The two beams pushing against each other. Fills and the clash point move with transform only:
 * each beam is a full-width layer scaled from its own edge, and the clash point rides a full-width
 * layer shifted by (percent - 50)% so it lands exactly where the beams meet.
 */
export const DuelTugBar = ({ leftPercent, leftTag, rightTag, leftColor, rightColor, isClashFlashing }: DuelTugBarProps) => {
  const { t } = useTranslation();
  const rightPercent = DUEL_PERCENT_MAX - leftPercent;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="relative w-full h-9">
        <div className="absolute inset-0 rounded-full bg-slate-950 border-2 border-slate-700/80 overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.95)]">
          <div
            style={{
              transform: `scaleX(${leftPercent / DUEL_PERCENT_MAX})`,
              background: `linear-gradient(to right, ${leftColor}, ${BEAM_HIGHLIGHT})`,
            }}
            className="absolute inset-0 origin-left transition-transform duration-300 ease-out"
          />
          <div
            style={{
              transform: `scaleX(${rightPercent / DUEL_PERCENT_MAX})`,
              background: `linear-gradient(to left, ${rightColor}, ${BEAM_HIGHLIGHT})`,
            }}
            className="absolute inset-0 origin-right transition-transform duration-300 ease-out"
          />
        </div>
        <div
          style={{ transform: `translateX(${leftPercent - DUEL_PERCENT_CENTER}%)` }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-300 ease-out"
        >
          <div
            className={clsx(
              'w-10 h-10 rounded-full bg-white flex items-center justify-center transition-transform duration-200',
              isClashFlashing ? 'scale-125 shadow-[0_0_35px_#ffffff,0_0_60px_#38bdf8]' : 'scale-100 shadow-[0_0_20px_#ffffff,0_0_35px_#f59e0b]'
            )}
          >
            <div className="w-3 h-3 rounded-full bg-amber-300 animate-ping" />
          </div>
        </div>
      </div>

      <div className="w-full flex items-end justify-between px-1">
        <div style={{ color: leftColor }} className="font-mono font-black leading-none">
          <span className="text-2xl tabular-nums">{leftPercent.toFixed(1)}%</span>
          <span className="ml-1 text-[11px]">{leftTag}</span>
        </div>
        <div className="pb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">
          {t('SilverScrapes.clashPrompt', 'Tap Tim & Donate Để Đẩy Chưởng')}
        </div>
        <div style={{ color: rightColor }} className="font-mono font-black leading-none text-right">
          <span className="mr-1 text-[11px]">{rightTag}</span>
          <span className="text-2xl tabular-nums">{rightPercent.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
