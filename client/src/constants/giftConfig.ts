import { TeamType } from './game';

/** Per-gift rules from the admin portal; mirrors server/src/constants/giftConfig.ts. */
export const GIFT_EFFECT = {
  NONE: 'NONE',
  SUMMON_CHAMPION: 'SUMMON_CHAMPION',
  HEAL_TEAM: 'HEAL_TEAM',
  STUN_BOSS: 'STUN_BOSS',
  FULL_FURY: 'FULL_FURY',
} as const;
export type GiftEffect = (typeof GIFT_EFFECT)[keyof typeof GIFT_EFFECT];

export interface GiftRule {
  giftId: string;
  name: string;
  coins: number;
  imageUrl: string;
  team: TeamType | null;
  showOnOverlay: boolean;
  damageMultiplier: number;
  effect: GiftEffect;
  effectChampion: string;
}

/** What a gift event carries when an admin rule matched it. */
export interface GiftRulePayload {
  damageMultiplier: number;
  effect: GiftEffect;
  effectChampion: string;
}

export const GIFT_CONFIG_SOCKET_EVENT = {
  CONFIG: 'game:gift-config',
} as const;

export const GIFT_EFFECT_TUNING = {
  /** Boss cannot cast skills for this long after a STUN_BOSS gift. */
  STUN_DURATION_MS: 6000,
  /** HEAL_TEAM restores this much HP to every champion (champions have 100 max HP). */
  HEAL_AMOUNT: 100,
  /** FULL_FURY fills the pros' bar completely. */
  FURY_AMOUNT: 100,
  MIN_DAMAGE_MULTIPLIER: 0,
  MAX_DAMAGE_MULTIPLIER: 5,
  DEFAULT_DAMAGE_MULTIPLIER: 1,
} as const;

const EFFECTS: ReadonlySet<string> = new Set(Object.values(GIFT_EFFECT));

/** Gift events come from the network: keep only a well-formed rule. */
export const parseGiftRulePayload = (raw: unknown): GiftRulePayload | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const multiplier = Number(source.damageMultiplier);
  const effect = typeof source.effect === 'string' && EFFECTS.has(source.effect) ? (source.effect as GiftEffect) : GIFT_EFFECT.NONE;
  return {
    damageMultiplier: Number.isFinite(multiplier)
      ? Math.min(GIFT_EFFECT_TUNING.MAX_DAMAGE_MULTIPLIER, Math.max(GIFT_EFFECT_TUNING.MIN_DAMAGE_MULTIPLIER, multiplier))
      : GIFT_EFFECT_TUNING.DEFAULT_DAMAGE_MULTIPLIER,
    effect,
    effectChampion: typeof source.effectChampion === 'string' ? source.effectChampion : '',
  };
};
