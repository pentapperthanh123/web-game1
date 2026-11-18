import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, RotateCcw, Timer } from 'lucide-react';
import { VICTORY_CELEBRATION_CONSTANTS } from '../../../constants/game';
import { casterQueue } from '../../../services/caster/presentationQueue';
import { useCasterStore } from '../../../store/casterStore';

interface VictoryActionControlsProps {
  isSeriesEnded: boolean;
  seriesFormat: string;
  isAdvancing: boolean;
  nextQueuedMatchLabel: string | null;
  remainingQueueCount: number;
  onStartNextRound: () => void;
  onResetSeriesMatch: () => void;
  onAdvanceQueuedMatch: () => void;
  teamColor?: string;
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
  teamColor,
}) => {
  const { t } = useTranslation();
  /** One advance per victory screen, whatever triggers it (countdown, Space/Enter or button). */
  const hasAdvancedRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(VICTORY_CELEBRATION_CONSTANTS.AUTO_ADVANCE_SECONDS);
  const [isWaitingForCaster, setIsWaitingForCaster] = useState<boolean>(false);

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
    if (secondsLeft > 0 || isAdvancing) return undefined;

    const checkCasterBusy = (): boolean => {
      const isTtsEnabled = useCasterStore.getState().isTtsEnabled;
      if (!isTtsEnabled) return false;
      return casterQueue.isBusy() || Boolean(useCasterStore.getState().subtitle);
    };

    if (!checkCasterBusy()) {
      executeAdvance();
      return undefined;
    }

    setIsWaitingForCaster(true);
    const safetyDeadline = Date.now() + 15000;
    const interval = setInterval(() => {
      if (!checkCasterBusy() || Date.now() >= safetyDeadline) {
        clearInterval(interval);
        setIsWaitingForCaster(false);
        setTimeout(() => {
          executeAdvance();
        }, 800);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [secondsLeft, isAdvancing, executeAdvance]);

  const autoAdvanceCaption = resolveAutoAdvanceCaption(isSeriesEnded, Boolean(nextQueuedMatchLabel));
  const captionText = isWaitingForCaster
    ? t('Victory.autoAdvanceWaitingCaster', 'Đang hoàn tất bình luận...')
    : t(autoAdvanceCaption.key, { defaultValue: autoAdvanceCaption.fallback, seconds: secondsLeft });

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
    <div className="pt-2 border-t border-white/10 flex flex-col items-center space-y-2 w-full">
      {/* Primary Action Buttons inside the Unified Bottom Card */}
      {isSeriesEnded ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
          {nextQueuedMatchLabel && (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={onAdvanceQueuedMatch}
              style={{
                borderColor: teamColor ? `${teamColor}80` : undefined,
                boxShadow: teamColor ? `0 0 18px ${teamColor}40` : '0 0 18px rgba(16,185,129,0.35)',
              }}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800/95 to-slate-900 border border-white/20 text-white font-black text-xs uppercase tracking-wide transition hover:brightness-110 flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap pointer-events-auto"
            >
              <span>
                {t('Victory.nextQueuedMatch', 'TRẬN TIẾP THEO: {{label}} ({{remaining}})', {
                  label: nextQueuedMatchLabel,
                  remaining: remainingQueueCount,
                })}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0 text-emerald-400" />
            </button>
          )}
          <button
            type="button"
            disabled={isAdvancing}
            onClick={onResetSeriesMatch}
            style={{
              borderColor: teamColor ? `${teamColor}80` : undefined,
              boxShadow: teamColor ? `0 0 18px ${teamColor}40` : '0 0 18px rgba(245,158,11,0.35)',
            }}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800/95 to-slate-900 border border-white/20 text-white font-black text-xs uppercase tracking-wide transition hover:brightness-110 flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap pointer-events-auto"
          >
            <RotateCcw className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{t('Victory.newSeries', 'BẮT ĐẦU TRẬN ĐẤU MỚI')}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isAdvancing}
          onClick={onStartNextRound}
          style={{
            borderColor: teamColor ? `${teamColor}80` : undefined,
            boxShadow: teamColor ? `0 0 20px ${teamColor}45` : '0 0 20px rgba(6,182,212,0.4)',
          }}
          className="w-full py-2.5 px-6 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800/95 to-slate-900 border border-white/20 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition hover:brightness-110 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap pointer-events-auto"
        >
          <span>{t('Victory.nextRoundNow', 'VÀO VÁN TIẾP THEO')}</span>
          <ArrowRight className="w-4 h-4 shrink-0 text-amber-400" />
        </button>
      )}

      {/* Integrated Countdown & Shortcut Footer Row (No separate floating box) */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5">
        {!isAdvancing && (
          <div className="flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-black text-amber-300 tracking-wide">
            <Timer className="w-3 h-3 shrink-0 text-amber-400" />
            <span>{captionText}</span>
          </div>
        )}

        <div className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-semibold tracking-wide">
          {t('Victory.pressKeyHint', 'Nhấn Phím Cách (Space) hoặc bấm nút để vào ván')}
        </div>
      </div>
    </div>
  );
};
