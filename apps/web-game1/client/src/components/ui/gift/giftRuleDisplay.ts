import { calculateGiftBaseDamage } from '../../../constants/game';
import { GIFT_EFFECT, GiftEffect, GiftRule } from '../../../constants/giftConfig';

/** Damage one gift of this rule deals (for the boards; the live value is computed in giftExplosion). */
export const resolveRuleGiftDamage = (rule: GiftRule): number =>
  Math.round(calculateGiftBaseDamage(rule.coins) * rule.damageMultiplier);

interface EffectLabel {
  key: string;
  fallback: string;
}

export const GIFT_EFFECT_LABEL: Readonly<Record<Exclude<GiftEffect, typeof GIFT_EFFECT.NONE>, EffectLabel>> = {
  [GIFT_EFFECT.SUMMON_CHAMPION]: { key: 'GiftConfig.effect.SUMMON_CHAMPION', fallback: 'Gọi {{champion}}' },
  [GIFT_EFFECT.HEAL_TEAM]: { key: 'GiftConfig.effect.HEAL_TEAM', fallback: 'Hồi máu cả đội' },
  [GIFT_EFFECT.STUN_BOSS]: { key: 'GiftConfig.effect.STUN_BOSS', fallback: 'Làm choáng boss' },
  [GIFT_EFFECT.FULL_FURY]: { key: 'GiftConfig.effect.FULL_FURY', fallback: 'Đầy Nộ tuyển thủ' },
  [GIFT_EFFECT.BATTLE_FRENZY]: { key: 'GiftConfig.effect.BATTLE_FRENZY', fallback: 'Cuồng nộ chiến trường' },
  [GIFT_EFFECT.AEGIS_BARRIER]: { key: 'GiftConfig.effect.AEGIS_BARRIER', fallback: 'Lá chắn Aegis' },
};

export const getGiftEffectLabel = (effect: GiftEffect): EffectLabel | null =>
  effect === GIFT_EFFECT.NONE ? null : GIFT_EFFECT_LABEL[effect];

/** TikTok's CDN may refuse hotlinked images that send a referrer. */
export const GIFT_IMAGE_REFERRER_POLICY = 'no-referrer';
export const GIFT_IMAGE_FALLBACK_EMOJI = '🎁';
