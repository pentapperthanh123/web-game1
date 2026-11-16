import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, RotateCcw, Pause, Play } from 'lucide-react';
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
  const [timeLeft, setTimeLeft] = useState<number>(
    VICTORY_CELEBRATION_CONSTANTS.AUTO_ADVANCE_SECONDS
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);
  /** One advance per victory screen, whatever triggers it (countdown, Space/Enter, button). */
  const hasAdvancedRef = useRef(false);

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

  // Auto-advance countdown: the updater only counts down. Advancing inside it ran twice under
  // React StrictMode (updaters are double-invoked in dev), which skipped a round: 1 -> 3.
  useEffect(() => {
    if (isPaused || isAdvancing) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isAdvancing]);

  useEffect(() => {
    if (timeLeft === 0) executeAdvance();
  }, [timeLeft, executeAdvance]);

  // Keyboard shortcut listener (Space or Enter to advance)
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

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const resolveCountdownText = (): string => {
    if (isPaused) {
      return t('Victory.autoAdvancePause', 'Tạm dừng đếm ngược');
    }
    if (isSeriesEnded) {
      if (nextQueuedMatchLabel) {
        return t('Victory.autoAdvanceQueuedMatch', {
          defaultValue: 'Tự động chuyển sang trận tiếp theo sau: {{seconds}}s',
          seconds: timeLeft,
        });
      }
      return t('Victory.autoAdvanceNewSeries', {
        defaultValue: 'Tự động bắt đầu trận mới sau: {{seconds}}s',
        seconds: timeLeft,
      });
    }
    return t('Victory.autoAdvanceRound', {
      defaultValue: 'Tự động vào ván tiếp theo sau: {{seconds}}s',
      seconds: timeLeft,
    });
  };

  const progressPercent = Math.max(
    0,
    Math.min(
      100,
      (timeLeft / VICTORY_CELEBRATION_CONSTANTS.AUTO_ADVANCE_SECONDS) * 100
    )
  );

  return (
    <div className="pt-0.5 flex flex-col items-center space-y-1 w-full">
      {/* Auto-Advance Countdown Bar & Pause Toggle */}
      <div className="w-full flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[9px] sm:text-[9.5px] text-slate-300 shadow-inner">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="truncate font-semibold text-cyan-300">
              {resolveCountdownText()}
            </span>
            <span className="font-mono font-bold text-slate-400 text-[9px]">
              {timeLeft}s
            </span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-1000 ease-linear"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={togglePause}
          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-90 shrink-0 cursor-pointer"
          title={isPaused ? t('Victory.autoAdvanceResume', 'Tiếp tục') : t('Victory.autoAdvancePause', 'Tạm dừng')}
        >
          {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
        </button>
      </div>

      {/* Action Buttons */}
      {isSeriesEnded ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 w-full">
          {nextQueuedMatchLabel && (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={onAdvanceQueuedMatch}
              className="w-full sm:w-auto py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wide transition shadow-lg flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <span>
                {t('Victory.nextQueuedMatch', 'TRẬN TIẾP THEO: {{label}} ({{remaining}})', {
                  label: nextQueuedMatchLabel,
                  remaining: remainingQueueCount,
                })}
              </span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
          <button
            type="button"
            disabled={isAdvancing}
            onClick={onResetSeriesMatch}
            className="w-full sm:w-auto py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wide transition shadow-md flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>{t('Victory.newSeries', 'BẮT ĐẦU TRẬN ĐẤU MỚI')}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isAdvancing}
          onClick={onStartNextRound}
          className="w-full py-2 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap animate-pulse hover:animate-none"
        >
          <span>
            {t('Victory.nextRoundNow', 'VÀO VÁN TIẾP THEO')}
            {!isPaused && timeLeft > 0 && ` (${timeLeft}s)`}
          </span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      )}

      {/* Spacebar Shortcut Hint */}
      <div className="text-[8px] sm:text-[8.5px] text-slate-500 font-semibold tracking-wide">
        {t('Victory.pressKeyHint', 'Nhấn Phím Cách (Space) để vào ngay')}
      </div>
    </div>
  );
};
