import { BOSS_STATUS_EFFECT, BossStatusEffectType } from '../types/bossSkill';

export const STATUS_EFFECT_CONSTANTS = {
  /** How often `tickStatusEffects` runs (App interval). */
  LOOP_INTERVAL_MS: 250,
  /** Damage-over-time cadence. */
  DOT_TICK_INTERVAL_MS: 1000,
  WEAKEN_DAMAGE_MULTIPLIER: 0.5,
  /** Only the newest effects are kept per champion to bound render cost. */
  MAX_EFFECTS_PER_CHAMPION: 3,
  FLOATING_TEXT_SCALE: 0.75,
} as const;

export interface StatusEffectPresentation {
  color: string;
  icon: string;
  labelVi: string;
  labelEn: string;
}

export const STATUS_EFFECT_PRESENTATION: Readonly<Record<BossStatusEffectType, StatusEffectPresentation>> = {
  [BOSS_STATUS_EFFECT.BURN]: { color: '#f97316', icon: '🔥', labelVi: 'Thiêu đốt', labelEn: 'Burning' },
  [BOSS_STATUS_EFFECT.POISON]: { color: '#22c55e', icon: '☠️', labelVi: 'Trúng độc', labelEn: 'Poisoned' },
  [BOSS_STATUS_EFFECT.STUN]: { color: '#facc15', icon: '💫', labelVi: 'Choáng', labelEn: 'Stunned' },
  [BOSS_STATUS_EFFECT.WEAKEN]: { color: '#a78bfa', icon: '🌀', labelVi: 'Suy yếu', labelEn: 'Weakened' },
  [BOSS_STATUS_EFFECT.LIFESTEAL]: { color: '#e11d48', icon: '🩸', labelVi: 'Hút máu', labelEn: 'Lifesteal' },
};

/** Effects that live on the champion (LIFESTEAL resolves instantly on the boss instead). */
export const CHAMPION_BOUND_STATUS_EFFECTS: readonly BossStatusEffectType[] = [
  BOSS_STATUS_EFFECT.BURN,
  BOSS_STATUS_EFFECT.POISON,
  BOSS_STATUS_EFFECT.STUN,
  BOSS_STATUS_EFFECT.WEAKEN,
];

export const DAMAGE_OVER_TIME_EFFECTS: readonly BossStatusEffectType[] = [
  BOSS_STATUS_EFFECT.BURN,
  BOSS_STATUS_EFFECT.POISON,
];
