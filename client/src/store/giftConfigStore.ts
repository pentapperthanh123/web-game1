import { create } from 'zustand';
import { GIFT_EFFECT, GiftEffect, GiftRule } from '../constants/giftConfig';
import { TEAM_KEY, TeamType } from '../constants/game';

/**
 * Gift rules pushed by the server (admin portal). Kept outside the main game store:
 * a config change only re-renders the gift boards, not the whole HUD.
 */
interface GiftConfigState {
  rules: GiftRule[];
}

export const useGiftConfigStore = create<GiftConfigState>(() => ({ rules: [] }));

const TEAMS: ReadonlySet<string> = new Set<TeamType>([TEAM_KEY.BLG, TEAM_KEY.GENG]);
const EFFECTS: ReadonlySet<string> = new Set(Object.values(GIFT_EFFECT));

const toRule = (raw: unknown): GiftRule | null => {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.name !== 'string' || !source.name) return null;
  return {
    giftId: typeof source.giftId === 'string' ? source.giftId : '',
    name: source.name,
    coins: typeof source.coins === 'number' ? source.coins : 0,
    imageUrl: typeof source.imageUrl === 'string' ? source.imageUrl : '',
    team: typeof source.team === 'string' && TEAMS.has(source.team) ? (source.team as TeamType) : null,
    showOnOverlay: source.showOnOverlay === true,
    damageMultiplier: typeof source.damageMultiplier === 'number' ? source.damageMultiplier : 1,
    effect: typeof source.effect === 'string' && EFFECTS.has(source.effect) ? (source.effect as GiftEffect) : GIFT_EFFECT.NONE,
    effectChampion: typeof source.effectChampion === 'string' ? source.effectChampion : '',
  };
};

export const applyGiftConfigPayload = (payload: unknown): void => {
  const rawRules = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).rules : undefined;
  const rules = Array.isArray(rawRules) ? rawRules.map(toRule).filter((rule): rule is GiftRule => rule !== null) : [];
  useGiftConfigStore.setState({ rules });
};

/**
 * Gifts the admin chose to show on the overlay, cheapest first.
 * Returns a new array: call it inside useMemo, never as a zustand selector.
 */
export const pickOverlayGiftRules = (rules: readonly GiftRule[]): GiftRule[] =>
  rules.filter((rule) => rule.showOnOverlay).sort((left, right) => left.coins - right.coins);
