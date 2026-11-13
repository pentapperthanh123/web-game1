import { BOSS_SHIELD_FIELD } from './bossShieldConstants';
import { clamp01, easeOutBack, easeOutCubic, fadeOut } from '../bossSkill/bossSkill3DShared';

const NO_RIPPLE_STARTED = Number.NEGATIVE_INFINITY;
const HALF = 0.5;

/** Shield HP ratio (0..1); an empty/invalid max counts as full so the field never vanishes by accident. */
export const computeShieldStrength = (hp: number, maxHp: number): number => {
  if (maxHp <= 0) return 1;
  return clamp01(hp / maxHp);
};

/** Overall field opacity: dimmer and more flickery as the shield loses HP. */
export const computeShieldOpacity = (strength: number, time: number): number => {
  const weakness = 1 - strength;
  const dipWave =
    Math.sin(time * BOSS_SHIELD_FIELD.FLICKER_DIP_FREQ_A) * Math.sin(time * BOSS_SHIELD_FIELD.FLICKER_DIP_FREQ_B);
  const isDipping = dipWave > BOSS_SHIELD_FIELD.FLICKER_DIP_THRESHOLD;
  const dip = isDipping ? weakness * BOSS_SHIELD_FIELD.FLICKER_DIP_DEPTH : 0;
  const jitter =
    weakness * BOSS_SHIELD_FIELD.FLICKER_JITTER_DEPTH * (HALF + HALF * Math.sin(time * BOSS_SHIELD_FIELD.FLICKER_JITTER_FREQ));
  const strengthOpacity =
    BOSS_SHIELD_FIELD.MIN_STRENGTH_OPACITY + (1 - BOSS_SHIELD_FIELD.MIN_STRENGTH_OPACITY) * strength;
  return Math.max(0, strengthOpacity * (1 - dip - jitter));
};

/** Grow-in scale right after the shield is raised. */
export const computeShieldIntroScale = (createdAt: number, now: number): number =>
  easeOutBack((now - createdAt) / BOSS_SHIELD_FIELD.INTRO_DURATION_MS);

export const computeShieldBreathScale = (time: number): number =>
  1 + Math.sin(time * BOSS_SHIELD_FIELD.BREATH_SPEED) * BOSS_SHIELD_FIELD.BREATH_AMPLITUDE;

export interface ShieldRippleTracker {
  lastHitTimestamp: number;
  rippleStartedAt: number;
}

export interface ShieldRippleState {
  progress: number;
  strength: number;
}

export const createRippleTracker = (): ShieldRippleTracker => ({
  lastHitTimestamp: 0,
  rippleStartedAt: NO_RIPPLE_STARTED,
});

const shouldStartRipple = (tracker: ShieldRippleTracker, hitTimestamp: number, now: number): boolean => {
  if (hitTimestamp === tracker.lastHitTimestamp) return false;
  if (now - hitTimestamp > BOSS_SHIELD_FIELD.RIPPLE_DURATION_MS) return false;
  return now - tracker.rippleStartedAt >= BOSS_SHIELD_FIELD.RIPPLE_MIN_INTERVAL_MS;
};

/**
 * Starts a ripple when the boss takes a new hit (throttled), then writes the ripple's travel/intensity
 * into `out`. Allocation-free so it can run every frame.
 */
export const updateShieldRipple = (
  tracker: ShieldRippleTracker,
  hitTimestamp: number,
  now: number,
  out: ShieldRippleState,
): void => {
  if (shouldStartRipple(tracker, hitTimestamp, now)) {
    tracker.lastHitTimestamp = hitTimestamp;
    tracker.rippleStartedAt = now;
  }
  const progress = (now - tracker.rippleStartedAt) / BOSS_SHIELD_FIELD.RIPPLE_DURATION_MS;
  if (progress >= 1) {
    out.progress = 0;
    out.strength = 0;
    return;
  }
  out.progress = easeOutCubic(progress);
  out.strength = fadeOut(progress);
};
