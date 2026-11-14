import React, { useState, useEffect, useCallback } from 'react';
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
  seriesFormat,
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

  const executeAdvance = useCallback(() => {
    if (isAdvancing) return;

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

  // Auto-advance countdown timer
  useEffect(() => {
    if (isPaused || isAdvancing) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeAdvance();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isAdvancing, executeAdvance]);

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
    <div className="pt-0.5 flex flex-col items-center space-y-2 w-full">
      {/* Series Notice or Intermission Badge */}
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] sm:text-[11px] text-slate-300 shadow whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span>
          {isSeriesEnded
            ? t('Victory.seriesEndedNotice', 'Loạt trận {{format}} đã kết thúc!', {
                format: seriesFormat,
              })
            : t('Victory.roundIntermissionPrompt', 'Nghỉ giữa hiệp - Sẵn sàng cho ván tiếp theo')}
        </span>
      </div>

      {/* Auto-Advance Countdown Bar & Pause Toggle */}
      <div className="w-full flex items-center justify-between gap-2 px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[9.5px] sm:text-[10px] text-slate-300 shadow-inner">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
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
          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-90 shrink-0"
          title={isPaused ? t('Victory.autoAdvanceResume', 'Tiếp tục') : t('Victory.autoAdvancePause', 'Tạm dừng')}
        >
          {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
        </button>
      </div>

      {/* Action Buttons */}
      {isSeriesEnded ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
          {nextQueuedMatchLabel && (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={onAdvanceQueuedMatch}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_20px_rgba(16,185,129,0.55)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_18px_rgba(245,158,11,0.5)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-[0_0_18px_rgba(6,182,212,0.55)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap animate-pulse hover:animate-none"
        >
          <span>
            {t('Victory.nextRoundNow', 'VÀO VÁN TIẾP THEO')}
            {!isPaused && timeLeft > 0 && ` (${timeLeft}s)`}
          </span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>
      )}

      {/* Spacebar Shortcut Hint */}
      <div className="text-[8.5px] sm:text-[9px] text-slate-500 font-semibold tracking-wide">
        {t('Victory.pressKeyHint', 'Nhấn Phím Cách (Space) để vào ngay')}
      </div>
    </div>
  );
};
