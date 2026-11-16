import { useEffect } from 'react';
import i18n from '../i18n';
import { ROUND_CLOCK_CONSTANTS, ROUND_CLOCK_PHASE, RoundClockPhase } from '../constants/game';
import { SFX_EVENT } from '../constants/sfx';
import { playSound } from '../services/soundManager';
import { GameState } from '../types/game';
import { useGameStore } from './gameStore';
import {
  getPhaseRemainingMs,
  resetRoundClock,
  resolveRoundClockPhase,
  resolveRoundDurationMs,
  useRoundClockStore,
} from './roundClockStore';
import { isBattleHalted } from './storeHelpers';

const isRoundDecided = (state: GameState): boolean => state.roundWinner !== null || state.bossHp <= 0;

const toWholeSeconds = (ms: number): number => Math.ceil(ms / ROUND_CLOCK_CONSTANTS.MS_PER_SECOND);

const announceOvertime = (): void => {
  const game = useGameStore.getState();
  playSound(SFX_EVENT.BOSS_PHASE_SHIFT);
  game.triggerScreenFlash(ROUND_CLOCK_CONSTANTS.OVERTIME_FLASH_COLOR);
  game.triggerScreenShake(ROUND_CLOCK_CONSTANTS.OVERTIME_SHAKE);
  game.addLog(
    'SYSTEM',
    i18n.t('RoundClock.overtimeLog', {
      defaultValue: '⏰ HIỆP PHỤ {{seconds}}s! Boss suy yếu — sát thương tăng dần, ai sẽ kết liễu?',
      seconds: toWholeSeconds(ROUND_CLOCK_CONSTANTS.OVERTIME_DURATION_MS),
    })
  );
};

const finishRoundOnTime = (): void => {
  const game = useGameStore.getState();
  game.triggerScreenFlash(ROUND_CLOCK_CONSTANTS.TIME_UP_FLASH_COLOR);
  game.addLog('SYSTEM', i18n.t('RoundClock.timeUpLog', '⏱️ HẾT GIỜ! Đội gây nhiều sát thương hơn thắng ván.'));
  game.endRoundByTimeout();
};

const PHASE_ENTRY_EFFECTS: Partial<Record<RoundClockPhase, () => void>> = {
  [ROUND_CLOCK_PHASE.OVERTIME]: announceOvertime,
  [ROUND_CLOCK_PHASE.TIME_UP]: finishRoundOnTime,
};

/** One tick sound per second during the last seconds of regular time and of overtime. */
const playWarningTick = (prevRemainingMs: number, nextRemainingMs: number): void => {
  if (nextRemainingMs <= 0 || nextRemainingMs > ROUND_CLOCK_CONSTANTS.WARNING_TICK_REMAINING_MS) return;
  if (toWholeSeconds(prevRemainingMs) === toWholeSeconds(nextRemainingMs)) return;
  playSound(SFX_EVENT.CHAT_POP);
};

const advanceRoundClock = (deltaMs: number): void => {
  const game = useGameStore.getState();
  const clock = useRoundClockStore.getState();

  if (isRoundDecided(game)) {
    if (clock.elapsedMs > 0) resetRoundClock(game.currentRound);
    return;
  }
  if (clock.round !== game.currentRound) {
    resetRoundClock(game.currentRound);
    return;
  }
  if (isBattleHalted(game)) return;

  const durationMs = resolveRoundDurationMs(game.participationRuleConfig);
  if (durationMs === ROUND_CLOCK_CONSTANTS.NO_LIMIT_MS) {
    if (clock.durationMs !== durationMs) useRoundClockStore.setState({ durationMs, phase: ROUND_CLOCK_PHASE.REGULAR });
    return;
  }

  const elapsedMs = clock.elapsedMs + deltaMs;
  const phase = resolveRoundClockPhase(elapsedMs, durationMs);
  const prevRemainingMs = getPhaseRemainingMs(clock);
  useRoundClockStore.setState({ elapsedMs, durationMs, phase });

  if (phase !== clock.phase) {
    PHASE_ENTRY_EFFECTS[phase]?.();
    return;
  }
  playWarningTick(prevRemainingMs, getPhaseRemainingMs({ elapsedMs, durationMs, phase }));
};

/** Mount once at the app root: runs the round clock while the fight is live. */
export const useRoundClockTicker = (): void => {
  useEffect(() => {
    let lastTickAt = Date.now();
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const deltaMs = Math.min(ROUND_CLOCK_CONSTANTS.MAX_TICK_DELTA_MS, Math.max(0, now - lastTickAt));
      lastTickAt = now;
      advanceRoundClock(deltaMs);
    }, ROUND_CLOCK_CONSTANTS.TICK_MS);
    return () => window.clearInterval(intervalId);
  }, []);
};
