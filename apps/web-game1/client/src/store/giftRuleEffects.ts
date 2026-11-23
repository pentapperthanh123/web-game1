import { GIFT_EFFECT, GIFT_EFFECT_TUNING, GiftEffect, GiftRulePayload } from '../constants/giftConfig';
import { TeamType } from '../constants/game';
import { GameState } from '../types/game';

interface GiftEffectContext {
  get: () => GameState;
  team: TeamType;
  donorName: string;
  donorAvatarUrl?: string;
  rule: GiftRulePayload;
}

export interface GiftRuleEffectResult {
  bossStunUntil: number;
  frenzyDurationMs: number;
}

/** Each special gift effect; returns the boss stun deadline and frenzy duration it sets. */
const EFFECT_HANDLERS: Readonly<Record<GiftEffect, (context: GiftEffectContext, now: number) => GiftRuleEffectResult>> = {
  [GIFT_EFFECT.NONE]: () => ({ bossStunUntil: 0, frenzyDurationMs: 0 }),
  // Not a gift bypass: the one-champion-per-viewer rule applies, so a long combo cannot flood the field
  [GIFT_EFFECT.SUMMON_CHAMPION]: ({ get, team, donorName, donorAvatarUrl, rule }) => {
    if (rule.effectChampion) get().summonMinion(donorName, rule.effectChampion, team, false, donorAvatarUrl, true);
    return { bossStunUntil: 0, frenzyDurationMs: 0 };
  },
  [GIFT_EFFECT.HEAL_TEAM]: ({ get, team }) => {
    get().healTeamChampions(team, GIFT_EFFECT_TUNING.HEAL_AMOUNT);
    return { bossStunUntil: 0, frenzyDurationMs: 0 };
  },
  [GIFT_EFFECT.STUN_BOSS]: (_context, now) => ({
    bossStunUntil: now + GIFT_EFFECT_TUNING.STUN_DURATION_MS,
    frenzyDurationMs: 0,
  }),
  [GIFT_EFFECT.FULL_FURY]: ({ get, team }) => {
    const roster = get().activeTeams[team]?.roster ?? [];
    roster.forEach((pro) => get().addPlayerFury(pro.id, GIFT_EFFECT_TUNING.FURY_AMOUNT));
    return { bossStunUntil: 0, frenzyDurationMs: 0 };
  },
  [GIFT_EFFECT.BATTLE_FRENZY]: ({ get, team }) => {
    const roster = get().activeTeams[team]?.roster ?? [];
    roster.forEach((pro) => get().addPlayerFury(pro.id, GIFT_EFFECT_TUNING.FRENZY_FURY_AMOUNT));
    get().healTeamChampions(team, GIFT_EFFECT_TUNING.FRENZY_HEAL_AMOUNT);
    return { bossStunUntil: 0, frenzyDurationMs: GIFT_EFFECT_TUNING.FRENZY_DURATION_MS };
  },
  [GIFT_EFFECT.AEGIS_BARRIER]: ({ get, team }, now) => {
    get().healTeamChampions(team, GIFT_EFFECT_TUNING.AEGIS_HEAL_AMOUNT);
    return {
      bossStunUntil: now + GIFT_EFFECT_TUNING.AEGIS_STUN_DURATION_MS,
      frenzyDurationMs: 0,
    };
  },
};

/** Runs the admin-configured effect of a gift; returns the boss stun deadline and frenzy duration. */
export const applyGiftRuleEffect = (context: GiftEffectContext, now: number): GiftRuleEffectResult =>
  EFFECT_HANDLERS[context.rule.effect](context, now);

export const resolveGiftDamageMultiplier = (rule: GiftRulePayload | undefined): number =>
  rule?.damageMultiplier ?? GIFT_EFFECT_TUNING.DEFAULT_DAMAGE_MULTIPLIER;
