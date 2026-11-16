import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, RotateCcw, Timer } from 'lucide-react';
import { VICTORY_CELEBRATION_CONSTANTS } from '../../../constants/game';

interface VictoryActionControlsProps {
  isSeriesEnded: boolean;
  seriesFormat: string;
  isAdvancing: boolean;
  nextQueuedMatchLabel: string | null;
  remainingQueueCount: number;
  onStartNextRound: () => void;
  onResetSeriesMatch: () => void;
  onAdvanceQueuedMatch: () => void;
}

/** Countdown caption per outcome: next round, next queued matchup or a fresh series. */
const AUTO_ADVANCE_CAPTION = {
  ROUND: { key: 'Victory.autoAdvanceRound', fallback: 'Tự động vào ván tiếp theo sau: {{seconds}}s' },
  QUEUED_MATCH: { key: 'Victory.autoAdvanceQueuedMatch', fallback: 'Tự động chuyển sang trận tiếp theo sau: {{seconds}}s' },
  NEW_SERIES: { key: 'Victory.autoAdvanceNewSeries', fallback: 'Tự động bắt đầu trận mới sau: {{seconds}}s' },
} as const;

const resolveAutoAdvanceCaption = (isSeriesEnded: boolean, hasQueuedMatch: boolean) => {
  if (!isSeriesEnded) return AUTO_ADVANCE_CAPTION.ROUND;
  if (hasQueuedMatch) return AUTO_ADVANCE_CAPTION.QUEUED_MATCH;
  return AUTO_ADVANCE_CAPTION.NEW_SERIES;
};

export const VictoryActionControls: React.FC<VictoryActionControlsProps> = ({
  isSeriesEnded,
  seriesFormat: _seriesFormat,
  isAdvancing,
  nextQueuedMatchLabel,
  remainingQueueCount,
  onStartNextRound,
  onResetSeriesMatch,
  onAdvanceQueuedMatch,
}) => {
  const { t } = useTranslation();
  /** One advance per victory screen, whatever triggers it (countdown, Space/Enter or button). */
  const hasAdvancedRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(VICTORY_CELEBRATION_CONSTANTS.AUTO_ADVANCE_SECONDS);

  const executeAdvance = useCallback(() => {
    if (isAdvancing || hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;

    if (isSeriesEnded) {
      if (nextQueuedMatchLabel) {
        onAdvanceQueuedMatch();
        return;
      }
      onResetSeriesMatch();
      return;
    }

    onStartNextRound();
  }, [
    isAdvancing,
    isSeriesEnded,
    nextQueuedMatchLabel,
    onAdvanceQueuedMatch,
    onResetSeriesMatch,
    onStartNextRound,
  ]);

  // The updater only counts down: React StrictMode runs updaters twice in dev, so no side effects here
  useEffect(() => {
    if (isAdvancing) return undefined;
    const timer = setInterval(
      () => setSecondsLeft((previous) => Math.max(0, previous - 1)),
      VICTORY_CELEBRATION_CONSTANTS.COUNTDOWN_TICK_MS
    );
    return () => clearInterval(timer);
  }, [isAdvancing]);

  useEffect(() => {
    if (secondsLeft === 0) executeAdvance();
  }, [secondsLeft, executeAdvance]);

  const autoAdvanceCaption = resolveAutoAdvanceCaption(isSeriesEnded, Boolean(nextQueuedMatchLabel));

  // Keyboard shortcut listener (Space or Enter to advance manually when ready)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        executeAdvance();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeAdvance]);

  return (
    <div className="pt-1 flex flex-col items-center space-y-1.5 w-full">
      {/* Action Buttons: advance now, or let the countdown below do it */}
      {isSeriesEnded ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 w-full">
          {nextQueuedMatchLabel && (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={onAdvanceQueuedMatch}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-lg flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <span>
                {t('Victory.nextQueuedMatch', 'TRẬN TIẾP THEO: {{label}} ({{remaining}})', {
                  label: nextQueuedMatchLabel,
                  remaining: remainingQueueCount,
                })}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}
          <button
            type="button"
            disabled={isAdvancing}
            onClick={onResetSeriesMatch}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-md flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>{t('Victory.newSeries', 'BẮT ĐẦU TRẬN ĐẤU MỚI')}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isAdvancing}
          onClick={onStartNextRound}
          className="w-full py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider transition shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap animate-pulse hover:animate-none"
        >
          <span>{t('Victory.nextRoundNow', 'VÀO VÁN TIẾP THEO')}</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>
      )}

      {!isAdvancing && (
        <div className="flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-black text-cyan-300 tracking-wide">
          <Timer className="w-3 h-3 shrink-0" />
          <span>{t(autoAdvanceCaption.key, { defaultValue: autoAdvanceCaption.fallback, seconds: secondsLeft })}</span>
        </div>
      )}

      {/* Spacebar Shortcut Hint */}
      <div className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-semibold tracking-wide">
        {t('Victory.pressKeyHint', 'Nhấn Phím Cách (Space) hoặc bấm nút để vào ván')}
      </div>
    </div>
  );
};
