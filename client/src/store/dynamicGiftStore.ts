import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GIFT_TIER,
  GIFT_TIER_CONFIG,
  GiftTier,
  TeamType,
  calculateGiftBaseDamage,
} from '../constants/game';
import {
  GIFT_MEGA_GRADE,
  GIFT_MEGA_GRADE_CONFIG,
  GiftMegaGrade,
} from '../constants/giftPresentation';
import {
  resolveGiftTier,
  resolveMegaGrade,
} from './giftTier';

// ==========================================
// TYPES & ENUMS
// ==========================================

export const DYNAMIC_GIFT_CONSTANTS = {
  MIN_MULTIPLIER: 0.1,
  MAX_MULTIPLIER: 3.0,
  DEFAULT_MULTIPLIER: 1.0,
  STORAGE_KEY: 'lol_liveops_dynamic_gift_config_v1',
} as const;

export const GIFT_VFX_ASSET_TYPE = {
  DEFAULT_METEOR: 'DEFAULT_METEOR',
  LASER_BEAM: 'LASER_BEAM',
  WATER_BUBBLE: 'WATER_BUBBLE',
  GOLD_ORB: 'GOLD_ORB',
  SWORD_STRIKE: 'SWORD_STRIKE',
  LOVE_BURST: 'LOVE_BURST',
} as const;
export type GiftVfxAssetType = (typeof GIFT_VFX_ASSET_TYPE)[keyof typeof GIFT_VFX_ASSET_TYPE];

export const GIFT_SKILL_BINDING = {
  NONE: 'NONE',
  STUN_BOSS: 'STUN_BOSS',
  FULL_FURY: 'FULL_FURY',
  HEAL_TEAM: 'HEAL_TEAM',
  SUMMON_CHAMPION: 'SUMMON_CHAMPION',
} as const;
export type GiftSkillBinding = (typeof GIFT_SKILL_BINDING)[keyof typeof GIFT_SKILL_BINDING];

export const FORCED_GIFT_VFX_TIER = {
  AUTO: 'AUTO',
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  BIG: 'BIG',
  MEGA_ROYAL: 'MEGA_ROYAL',
  MEGA_MYTHIC: 'MEGA_MYTHIC',
  MEGA_LEGEND: 'MEGA_LEGEND',
} as const;
export type ForcedGiftVfxTier = (typeof FORCED_GIFT_VFX_TIER)[keyof typeof FORCED_GIFT_VFX_TIER];

export interface DynamicGiftRule {
  giftId: string;
  giftName: string;
  assetType: GiftVfxAssetType;
  flatDamageOverride?: number;
  skillBinding: GiftSkillBinding;
  forcedTier: ForcedGiftVfxTier;
  isEnabled: boolean;
  updatedAt?: number;
}

export interface DynamicGiftState {
  globalDamageMultiplier: number;
  rules: Record<string, DynamicGiftRule>;

  // Actions
  setGlobalDamageMultiplier: (multiplier: number) => void;
  upsertGiftRule: (rule: DynamicGiftRule) => void;
  removeGiftRule: (giftId: string) => void;
  toggleGiftRule: (giftId: string, isEnabled?: boolean) => void;
  resetAllRules: () => void;
}

// ==========================================
// DECLARATIVE ASSET AUTO-DETECTION RULES
// ==========================================

export interface GiftAssetKeywordRule {
  readonly keywords: readonly string[];
  readonly assetType: GiftVfxAssetType;
}

export interface GiftAssetCoinThresholdRule {
  readonly minCoins: number;
  readonly assetType: GiftVfxAssetType;
}

export const DEFAULT_GIFT_ASSET_KEYWORD_RULES: readonly GiftAssetKeywordRule[] = [
  {
    keywords: ['nước', 'súng nước', 'hoa', 'water', 'bubble', 'splash'],
    assetType: GIFT_VFX_ASSET_TYPE.WATER_BUBBLE,
  },
  {
    keywords: ['tim', 'corgi', 'yêu', 'heart', 'love'],
    assetType: GIFT_VFX_ASSET_TYPE.LOVE_BURST,
  },
  {
    keywords: ['vũ trụ', 'laser', 'galaxy', 'space', 'ufo', 'orbital'],
    assetType: GIFT_VFX_ASSET_TYPE.LASER_BEAM,
  },
];

export const DEFAULT_GIFT_ASSET_COIN_RULES: readonly GiftAssetCoinThresholdRule[] = [
  {
    minCoins: GIFT_MEGA_GRADE_CONFIG[GIFT_MEGA_GRADE.MYTHIC].minCoins,
    assetType: GIFT_VFX_ASSET_TYPE.LASER_BEAM,
  },
  {
    minCoins: GIFT_MEGA_GRADE_CONFIG[GIFT_MEGA_GRADE.ROYAL].minCoins,
    assetType: GIFT_VFX_ASSET_TYPE.SWORD_STRIKE,
  },
  {
    minCoins: GIFT_TIER_CONFIG[GIFT_TIER.BIG].minCoins,
    assetType: GIFT_VFX_ASSET_TYPE.GOLD_ORB,
  },
];

/**
 * Resolves default 3D weapon/VFX asset type via declarative keyword rules and coin thresholds.
 * Zero hardcode, flat guard-clause matching.
 */
export const resolveDefaultVfxAssetType = (giftName: string, coins: number): GiftVfxAssetType => {
  const normalizedName = giftName.trim().toLowerCase();

  // 1. Keyword-based matching
  const matchedKeywordRule = DEFAULT_GIFT_ASSET_KEYWORD_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedName.includes(keyword))
  );
  if (matchedKeywordRule) {
    return matchedKeywordRule.assetType;
  }

  // 2. Coin threshold-based matching (descending order)
  const matchedCoinRule = DEFAULT_GIFT_ASSET_COIN_RULES.find((rule) => coins >= rule.minCoins);
  if (matchedCoinRule) {
    return matchedCoinRule.assetType;
  }

  return GIFT_VFX_ASSET_TYPE.DEFAULT_METEOR;
};

// ==========================================
// FORCED TIER LOOKUP MAP
// ==========================================

interface ForcedTierMapping {
  readonly tier: GiftTier;
  readonly megaGrade?: GiftMegaGrade;
}

export const FORCED_TIER_LOOKUP_MAP: Readonly<
  Record<Exclude<ForcedGiftVfxTier, typeof FORCED_GIFT_VFX_TIER.AUTO>, ForcedTierMapping>
> = {
  [FORCED_GIFT_VFX_TIER.SMALL]: { tier: GIFT_TIER.SMALL },
  [FORCED_GIFT_VFX_TIER.MEDIUM]: { tier: GIFT_TIER.MEDIUM },
  [FORCED_GIFT_VFX_TIER.BIG]: { tier: GIFT_TIER.BIG },
  [FORCED_GIFT_VFX_TIER.MEGA_ROYAL]: { tier: GIFT_TIER.MEGA, megaGrade: GIFT_MEGA_GRADE.ROYAL },
  [FORCED_GIFT_VFX_TIER.MEGA_MYTHIC]: { tier: GIFT_TIER.MEGA, megaGrade: GIFT_MEGA_GRADE.MYTHIC },
  [FORCED_GIFT_VFX_TIER.MEGA_LEGEND]: { tier: GIFT_TIER.MEGA, megaGrade: GIFT_MEGA_GRADE.LEGEND },
};

// ==========================================
// ZUSTAND STORE WITH LOCALSTORAGE PERSISTENCE
// ==========================================

export const useDynamicGiftStore = create<DynamicGiftState>()(
  persist(
    (set) => ({
      globalDamageMultiplier: DYNAMIC_GIFT_CONSTANTS.DEFAULT_MULTIPLIER,
      rules: {},

      setGlobalDamageMultiplier: (multiplier: number) => {
        const clamped = Math.min(
          DYNAMIC_GIFT_CONSTANTS.MAX_MULTIPLIER,
          Math.max(DYNAMIC_GIFT_CONSTANTS.MIN_MULTIPLIER, Number(multiplier.toFixed(2)))
        );
        set({ globalDamageMultiplier: clamped });
      },

      upsertGiftRule: (rule: DynamicGiftRule) => {
        set((state) => {
          const key = rule.giftId.trim().toLowerCase();
          return {
            rules: {
              ...state.rules,
              [key]: {
                ...rule,
                giftId: key,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      removeGiftRule: (giftId: string) => {
        set((state) => {
          const key = giftId.trim().toLowerCase();
          const nextRules = { ...state.rules };
          delete nextRules[key];
          return { rules: nextRules };
        });
      },

      toggleGiftRule: (giftId: string, isEnabled?: boolean) => {
        set((state) => {
          const key = giftId.trim().toLowerCase();
          const existing = state.rules[key];
          if (!existing) return state;

          return {
            rules: {
              ...state.rules,
              [key]: {
                ...existing,
                isEnabled: isEnabled !== undefined ? isEnabled : !existing.isEnabled,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      resetAllRules: () => {
        set({
          globalDamageMultiplier: DYNAMIC_GIFT_CONSTANTS.DEFAULT_MULTIPLIER,
          rules: {},
        });
      },
    }),
    {
      name: DYNAMIC_GIFT_CONSTANTS.STORAGE_KEY,
    }
  )
);

// ==========================================
// LOGIC INTERCEPTOR & RULE ENGINE
// ==========================================

export interface RawGiftInput {
  giftId?: string;
  giftName: string;
  team: TeamType;
  donorName: string;
  coins: number;
  streakCount?: number;
  totalCoins?: number;
  isComboFinal?: boolean;
  donorAvatarUrl?: string;
}

export interface ProcessedGiftOutput {
  giftId: string;
  giftName: string;
  team: TeamType;
  donorName: string;
  coins: number;
  totalCoins: number;
  streakCount: number;
  isComboFinal: boolean;
  donorAvatarUrl?: string;

  // Interceptor resolved values
  calculatedDamage: number;
  effectiveTier: GiftTier;
  effectiveMegaGrade?: GiftMegaGrade;
  vfxAssetType: GiftVfxAssetType;
  boundSkill: GiftSkillBinding;
  isRuleApplied: boolean;
  appliedRuleId?: string;
  globalMultiplierUsed: number;
}

/**
 * Checks useDynamicGiftStore first. If a rule exists for the giftId or giftName,
 * apply it; otherwise, fall back to default GIFT_COIN_DAMAGE_TABLE and default Tier logic.
 */
export const applyDynamicGiftRules = (
  rawGift: RawGiftInput,
  currentRules?: Pick<DynamicGiftState, 'globalDamageMultiplier' | 'rules'>
): ProcessedGiftOutput => {
  const storeState = currentRules || useDynamicGiftStore.getState();
  const globalMultiplier = storeState.globalDamageMultiplier || DYNAMIC_GIFT_CONSTANTS.DEFAULT_MULTIPLIER;
  const totalCoins = rawGift.totalCoins ?? rawGift.coins;
  const streakCount = Math.max(1, rawGift.streakCount || 1);
  const isComboFinal = Boolean(rawGift.isComboFinal);

  // Normalize key lookup (try giftId first, then normalized giftName)
  const candidateKey1 = (rawGift.giftId || '').trim().toLowerCase();
  const candidateKey2 = rawGift.giftName.trim().toLowerCase();
  const matchedRule =
    (candidateKey1 && storeState.rules[candidateKey1]) ||
    storeState.rules[candidateKey2] ||
    Object.values(storeState.rules).find(
      (r) => r.isEnabled && (r.giftName.toLowerCase() === candidateKey2 || candidateKey2.includes(r.giftId))
    );

  const isRuleActive = Boolean(matchedRule && matchedRule.isEnabled);

  // 1. Resolve Damage
  let baseDamage = 0;
  if (isRuleActive && matchedRule?.flatDamageOverride !== undefined && matchedRule.flatDamageOverride > 0) {
    baseDamage = matchedRule.flatDamageOverride;
  } else {
    baseDamage = calculateGiftBaseDamage(rawGift.coins);
  }
  const calculatedDamage = Math.round(baseDamage * globalMultiplier);

  // 2. Resolve Visual Tier & Mega Grade (Flat Object Map Lookup)
  let effectiveTier: GiftTier = GIFT_TIER.SMALL;
  let effectiveMegaGrade: GiftMegaGrade | undefined;

  const forcedTierKey =
    isRuleActive && matchedRule && matchedRule.forcedTier !== FORCED_GIFT_VFX_TIER.AUTO
      ? matchedRule.forcedTier
      : null;

  const forcedMapping = forcedTierKey ? FORCED_TIER_LOOKUP_MAP[forcedTierKey] : null;

  if (forcedMapping) {
    effectiveTier = forcedMapping.tier;
    effectiveMegaGrade = forcedMapping.megaGrade;
  } else {
    effectiveTier = resolveGiftTier(rawGift.coins, totalCoins);
    effectiveMegaGrade = effectiveTier === GIFT_TIER.MEGA ? resolveMegaGrade(rawGift.coins) : undefined;
  }

  // 3. Resolve VFX Asset / Weapon Mapping (Declarative Matcher)
  const vfxAssetType: GiftVfxAssetType =
    isRuleActive && matchedRule
      ? matchedRule.assetType
      : resolveDefaultVfxAssetType(rawGift.giftName, rawGift.coins);

  // 4. Resolve Skill Binding
  const boundSkill: GiftSkillBinding =
    isRuleActive && matchedRule ? matchedRule.skillBinding : GIFT_SKILL_BINDING.NONE;

  return {
    giftId: rawGift.giftId || rawGift.giftName,
    giftName: rawGift.giftName,
    team: rawGift.team,
    donorName: rawGift.donorName,
    coins: rawGift.coins,
    totalCoins,
    streakCount,
    isComboFinal,
    donorAvatarUrl: rawGift.donorAvatarUrl,
    calculatedDamage,
    effectiveTier,
    effectiveMegaGrade,
    vfxAssetType,
    boundSkill,
    isRuleApplied: isRuleActive,
    appliedRuleId: isRuleActive ? matchedRule?.giftId : undefined,
    globalMultiplierUsed: globalMultiplier,
  };
};
