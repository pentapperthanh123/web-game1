import React from 'react';
import { useTranslation } from 'react-i18next';
import { Timer } from 'lucide-react';
import { ROUND_CLOCK_CONSTANTS, ROUND_CLOCK_PHASE } from '../../constants/game';
import { getOvertimeDamageMultiplier, getPhaseRemainingMs, useRoundClockStore } from '../../store/roundClockStore';

const HIDDEN_SECONDS = -1;
const MULTIPLIER_FRACTION_DIGITS = 1;
const SECONDS_PAD_LENGTH = 2;

/** Compact pill: it shares the centre column (between the roster wings) with the toast stack. */
const BADGE_BASE_CLASS =
  'flex items-center gap-1 px-2 py-0.5 rounded-full border font-black text-[10px] sm:text-[11px] leading-none shadow-md whitespace-nowrap';
const REGULAR_CLASS = 'bg-slate-950/85 border-amber-400/60 text-amber-200';
const REGULAR_URGENT_CLASS = 'bg-rose-950/90 border-rose-400/80 text-rose-100 animate-pulse';
const OVERTIME_CLASS = 'bg-rose-700/90 border-amber-300/80 text-white shadow-[0_0_10px_rgba(244,63,94,0.55)]';
const MULTIPLIER_CHIP_CLASS = 'ml-0.5 px-1 py-px rounded-full bg-amber-300 text-slate-950 text-[9px] sm:text-[10px]';

const formatClock = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / ROUND_CLOCK_CONSTANTS.SECONDS_PER_MINUTE);
  const seconds = totalSeconds % ROUND_CLOCK_CONSTANTS.SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(SECONDS_PAD_LENGTH, '0')}`;
};

/** Whole seconds shown on the badge, or HIDDEN_SECONDS while the clock should stay off screen. */
const selectDisplaySeconds = (clock: ReturnType<typeof useRoundClockStore.getState>): number => {
  if (clock.durationMs <= ROUND_CLOCK_CONSTANTS.NO_LIMIT_MS || clock.elapsedMs <= 0) return HIDDEN_SECONDS;
  if (clock.phase === ROUND_CLOCK_PHASE.TIME_UP) return HIDDEN_SECONDS;
  const remainingMs = getPhaseRemainingMs(clock);
  const isRegular = clock.phase === ROUND_CLOCK_PHASE.REGULAR;
  if (isRegular && remainingMs > ROUND_CLOCK_CONSTANTS.VISIBLE_REMAINING_MS) return HIDDEN_SECONDS;
  return Math.ceil(remainingMs / ROUND_CLOCK_CONSTANTS.MS_PER_SECOND);
};

const resolveBadgeClass = (isOvertime: boolean, displaySeconds: number): string => {
  if (isOvertime) return OVERTIME_CLASS;
  const isUrgent =
    displaySeconds * ROUND_CLOCK_CONSTANTS.MS_PER_SECOND <= ROUND_CLOCK_CONSTANTS.WARNING_TICK_REMAINING_MS;
  return isUrgent ? REGULAR_URGENT_CLASS : REGULAR_CLASS;
};

/** Round clock: shown for the last minute of regular time and during overtime (with the boss damage bonus). */
export const RoundClockBadge = React.memo(() => {
  const { t } = useTranslation();
  const displaySeconds = useRoundClockStore(selectDisplaySeconds);
  const isOvertime = useRoundClockStore((clock) => clock.phase === ROUND_CLOCK_PHASE.OVERTIME);

  if (displaySeconds === HIDDEN_SECONDS) return null;

  const clockText = formatClock(displaySeconds);
  // Re-read on each displayed second: the multiplier only changes on whole overtime steps
  const multiplierText = getOvertimeDamageMultiplier().toFixed(MULTIPLIER_FRACTION_DIGITS);

  return (
    <div className={`${BADGE_BASE_CLASS} ${resolveBadgeClass(isOvertime, displaySeconds)}`}>
      <Timer className="h-3 w-3 shrink-0" />
      {isOvertime && <span>{t('RoundClock.overtimeLabel', 'Hiệp phụ')}</span>}
      <span className="font-mono tabular-nums">{clockText}</span>
      {isOvertime && (
        <span className={MULTIPLIER_CHIP_CLASS}>
          {t('RoundClock.overtimeMultiplier', { defaultValue: 'x{{multiplier}} ST', multiplier: multiplierText })}
        </span>
      )}
    </div>
  );
});

RoundClockBadge.displayName = 'RoundClockBadge';
