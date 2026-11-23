import { create } from 'zustand';
import { SFX_EVENT } from '../constants/sfx';
import { playSound } from '../services/soundManager';

/**
 * Short-lived "big moment" signals that several layers react to (2D stamp, 3D slow motion, audio).
 * Kept outside the main game store so a wipe does not re-render the whole HUD.
 */
export const COMBAT_MOMENT_CONSTANTS = {
  /** Champions killed by one boss action that count as a wipe. */
  WIPE_MIN_KILLS: 5,
  /** 2 deaths or fewer use the single death sound; more use the layered multi-kill sound. */
  MULTI_KILL_MIN: 3,
  WIPE_STAMP_MS: 2200,
  WIPE_COOLDOWN_MS: 3000,
  SLOW_MOTION_MS: 300,
  SLOW_MOTION_SCALE: 0.3,
} as const;

interface CombatMomentState {
  wipeAt: number;
  wipeKillCount: number;
}

export const useCombatMomentStore = create<CombatMomentState>(() => ({ wipeAt: 0, wipeKillCount: 0 }));

/** Triggered when the arena runs out of champions or an instant 5+ kill wipe happens. */
export const triggerFieldWipe = (killCount = 0, now = Date.now()): void => {
  const currentWipeAt = useCombatMomentStore.getState().wipeAt;
  if (now - currentWipeAt < COMBAT_MOMENT_CONSTANTS.WIPE_COOLDOWN_MS) return;
  useCombatMomentStore.setState({ wipeAt: now, wipeKillCount: killCount });
  playSound(SFX_EVENT.WIPE);
};

/**
 * One sound per boss action instead of one per death, tiered by how many fell.
 * "QUÉT SẠCH / ACE" (Wipe) ONLY triggers when ALL champions on the field are defeated (remainingMinionsCount === 0).
 */
export const announceChampionDeaths = (
  killCount: number,
  now: number,
  remainingMinionsCount?: number
): void => {
  if (killCount <= 0) return;

  // "QUÉT SẠCH" (ACE): CHỈ xuất hiện khi toàn bộ tướng trên sàn đã bị tiêu diệt sạch (sàn đấu trống)
  if (remainingMinionsCount !== undefined && remainingMinionsCount === 0) {
    triggerFieldWipe(killCount, now);
    return;
  }

  if (killCount >= COMBAT_MOMENT_CONSTANTS.MULTI_KILL_MIN) {
    playSound(SFX_EVENT.CHAMPION_DEATH_MULTI);
    return;
  }
  playSound(SFX_EVENT.CHAMPION_DEATH);
};

/** 3D time scale: a brief slow motion right after a wipe, 1 otherwise. */
export const getCombatTimeScale = (now: number): number => {
  const sinceWipe = now - useCombatMomentStore.getState().wipeAt;
  if (sinceWipe < 0 || sinceWipe > COMBAT_MOMENT_CONSTANTS.SLOW_MOTION_MS) return 1;
  return COMBAT_MOMENT_CONSTANTS.SLOW_MOTION_SCALE;
};
