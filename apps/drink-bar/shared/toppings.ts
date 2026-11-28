import { GIFT_TIER_THRESHOLDS } from './config';
import type { GiftTier, Language, RecipeId, ToppingId } from './types';

export interface ToppingSpec {
  id: ToppingId;
  nameEn: string;
  nameVi: string;
  badgeColor: string;
}

export const TOPPING_LIST: readonly ToppingSpec[] = [
  {
    id: 'boba_pearls',
    nameEn: 'Boba Pearls',
    nameVi: 'Trân Châu Đen',
    badgeColor: '#EBD6C0',
  },
  {
    id: 'fruit_slice',
    nameEn: 'Fresh Fruit',
    nameVi: 'Lát Trái Cây',
    badgeColor: '#FFE1C6',
  },
  {
    id: 'cream_swirl',
    nameEn: 'Cream Swirl',
    nameVi: 'Kem Xoáy Mịn',
    badgeColor: '#FFF4D6',
  },
  {
    id: 'sparkle_aura',
    nameEn: 'Sparkle Aura',
    nameVi: 'Ánh Lấp Lánh',
    badgeColor: '#FFE8A3',
  },
] as const;

export const TOPPING_MAP: Record<ToppingId, ToppingSpec> = {
  boba_pearls: TOPPING_LIST[0],
  fruit_slice: TOPPING_LIST[1],
  cream_swirl: TOPPING_LIST[2],
  sparkle_aura: TOPPING_LIST[3],
};

export const BASIC_TOPPING_ROTATION: readonly ToppingId[] = [
  'boba_pearls',
  'fruit_slice',
  'cream_swirl',
];

export const MATCHA_TOPPING_ROTATION: readonly ToppingId[] = [
  'cream_swirl',
  'fruit_slice',
  'sparkle_aura',
];

export const GLOW_LAYER_TOPPINGS: readonly ToppingId[] = [
  'cream_swirl',
  'fruit_slice',
  'sparkle_aura',
];

export const SIGNATURE_TOPPINGS: readonly ToppingId[] = [
  'boba_pearls',
  'fruit_slice',
  'cream_swirl',
  'sparkle_aura',
];

export const MATCHA_SIGNATURE_TOPPINGS: readonly ToppingId[] = [
  'cream_swirl',
  'fruit_slice',
  'sparkle_aura',
];

export const CITRUS_TOPPING_ROTATION: readonly ToppingId[] = [
  'fruit_slice',
  'cream_swirl',
  'sparkle_aura',
];

export const CITRUS_SIGNATURE_TOPPINGS: readonly ToppingId[] = [
  'fruit_slice',
  'cream_swirl',
  'sparkle_aura',
];

export function resolveGiftTier(coins: number): GiftTier {
  if (coins >= GIFT_TIER_THRESHOLDS.LARGE_MIN) {
    return 'LARGE';
  }
  if (coins >= GIFT_TIER_THRESHOLDS.MEDIUM_MIN) {
    return 'MEDIUM';
  }
  return 'SMALL';
}

export function getToppingLabel(toppingId: ToppingId, language: Language): string {
  const spec = TOPPING_MAP[toppingId];
  return language === 'EN' ? spec.nameEn : spec.nameVi;
}

export function mergeUniqueToppings(
  current: readonly ToppingId[],
  additions: readonly ToppingId[]
): ToppingId[] {
  const seen = new Set<ToppingId>(current);
  for (const item of additions) {
    seen.add(item);
  }
  return Array.from(seen);
}

const RECIPE_TOPPING_POOL_MAP: Partial<Record<RecipeId, readonly ToppingId[]>> = {
  matcha: MATCHA_TOPPING_ROTATION,
  thai_tea: BASIC_TOPPING_ROTATION,
  peach_tea: CITRUS_TOPPING_ROTATION,
  lime_tea: CITRUS_TOPPING_ROTATION,
  coffee_milk: MATCHA_TOPPING_ROTATION,
  cacao: MATCHA_TOPPING_ROTATION,
  berry_soda: CITRUS_TOPPING_ROTATION,
  blue_citrus: CITRUS_TOPPING_ROTATION,
};

export function pickNextMissingTopping(
  current: readonly ToppingId[],
  pool: readonly ToppingId[] = BASIC_TOPPING_ROTATION,
  recipeId?: RecipeId
): ToppingId {
  const activePool = (recipeId && RECIPE_TOPPING_POOL_MAP[recipeId]) || pool;
  for (const candidate of activePool) {
    if (!current.includes(candidate)) {
      return candidate;
    }
  }
  if (!current.includes('sparkle_aura')) {
    return 'sparkle_aura';
  }
  return activePool[current.length % activePool.length];
}
