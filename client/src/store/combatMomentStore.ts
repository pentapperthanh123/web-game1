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
  WIPE_STAMP_MS: 1600,
  SLOW_MOTION_MS: 250,
  SLOW_MOTION_SCALE: 0.3,
} as const;

interface CombatMomentState {
  wipeAt: number;
  wipeKillCount: number;
}

export const useCombatMomentStore = create<CombatMomentState>(() => ({ wipeAt: 0, wipeKillCount: 0 }));

/** One sound per boss action instead of one per death, tiered by how many fell. */
export const announceChampionDeaths = (killCount: number, now: number): void => {
  if (killCount <= 0) return;
  if (killCount >= COMBAT_MOMENT_CONSTANTS.WIPE_MIN_KILLS) {
    useCombatMomentStore.setState({ wipeAt: now, wipeKillCount: killCount });
    playSound(SFX_EVENT.WIPE);
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
