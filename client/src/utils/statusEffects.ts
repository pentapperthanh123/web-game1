import { ActiveStatusEffect, MinionEntity } from '../types/game';
import { BOSS_STATUS_EFFECT, BossStatusEffectType } from '../types/bossSkill';
import { STATUS_EFFECT_CONSTANTS } from '../constants/bossStatusEffects';

export const getActiveStatusEffects = (minion: MinionEntity, now: number): ActiveStatusEffect[] =>
  (minion.statusEffects ?? []).filter((effect) => effect.expiresAt > now);

export const hasStatusEffect = (
  minion: MinionEntity,
  type: BossStatusEffectType,
  now: number
): boolean => getActiveStatusEffects(minion, now).some((effect) => effect.type === type);

export const isMinionStunned = (minion: MinionEntity, now: number): boolean =>
  hasStatusEffect(minion, BOSS_STATUS_EFFECT.STUN, now);

/** Outgoing damage multiplier from the champion's current debuffs. */
export const getMinionDamageMultiplier = (minion: MinionEntity, now: number): number =>
  hasStatusEffect(minion, BOSS_STATUS_EFFECT.WEAKEN, now)
    ? STATUS_EFFECT_CONSTANTS.WEAKEN_DAMAGE_MULTIPLIER
    : 1;

/** Replaces an effect of the same type (refresh) and caps the list length. */
export const upsertStatusEffect = (
  current: ActiveStatusEffect[] | undefined,
  next: ActiveStatusEffect
): ActiveStatusEffect[] => {
  const others = (current ?? []).filter((effect) => effect.type !== next.type);
  return [...others, next].slice(-STATUS_EFFECT_CONSTANTS.MAX_EFFECTS_PER_CHAMPION);
};
