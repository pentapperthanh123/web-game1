/**
 * Champion Level & Evolution System
 *
 * Tiers:
 * - Recruit (Lv 1 - 5): Standard scale (1.0x), base DPS
 * - Warrior (Lv 6 - 15): Scale 1.15x, +8% DPS, Sky Blue aura, Level badge
 * - Warlord (Lv 16 - 29): Scale 1.28x, +14% DPS, Amber/Gold aura, Crown badge
 * - Legend (Lv 30+): Scale 1.40x, +20% DPS, Divine Rose aura, Crown + Wings
 */

export const CHAMPION_LEVEL_TIER = {
  RECRUIT: 'RECRUIT',
  WARRIOR: 'WARRIOR',
  WARLORD: 'WARLORD',
  LEGEND: 'LEGEND',
} as const;

export type ChampionLevelTier = (typeof CHAMPION_LEVEL_TIER)[keyof typeof CHAMPION_LEVEL_TIER];

export const CHAMPION_LEVEL_THRESHOLDS = {
  RECRUIT_MIN: 1,
  RECRUIT_MAX: 5,
  WARRIOR_MIN: 6,
  WARRIOR_MAX: 15,
  WARLORD_MIN: 16,
  WARLORD_MAX: 29,
  LEGEND_MIN: 30,
} as const;

export interface ChampionLevelConfig {
  tier: ChampionLevelTier;
  tierNameVi: string;
  tierNameEn: string;
  minLevel: number;
  maxLevel: number;
  scaleMultiplier: number;
  dpsBonusPercent: number;
  auraColor: string;
  badgeBgColor: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  hasCrown: boolean;
  hasWings: boolean;
}

export const CHAMPION_LEVEL_TIER_CONFIGS: Readonly<Record<ChampionLevelTier, ChampionLevelConfig>> = {
  [CHAMPION_LEVEL_TIER.RECRUIT]: {
    tier: CHAMPION_LEVEL_TIER.RECRUIT,
    tierNameVi: 'Tân Binh',
    tierNameEn: 'Recruit',
    minLevel: CHAMPION_LEVEL_THRESHOLDS.RECRUIT_MIN,
    maxLevel: CHAMPION_LEVEL_THRESHOLDS.RECRUIT_MAX,
    scaleMultiplier: 1.0,
    dpsBonusPercent: 0,
    auraColor: '#94a3b8',
    badgeBgColor: '#1e293b',
    badgeTextColor: '#cbd5e1',
    badgeBorderColor: '#475569',
    hasCrown: false,
    hasWings: false,
  },
  [CHAMPION_LEVEL_TIER.WARRIOR]: {
    tier: CHAMPION_LEVEL_TIER.WARRIOR,
    tierNameVi: 'Chiến Binh',
    tierNameEn: 'Warrior',
    minLevel: CHAMPION_LEVEL_THRESHOLDS.WARRIOR_MIN,
    maxLevel: CHAMPION_LEVEL_THRESHOLDS.WARRIOR_MAX,
    scaleMultiplier: 1.15,
    dpsBonusPercent: 0.08,
    auraColor: '#38bdf8',
    badgeBgColor: '#0369a1',
    badgeTextColor: '#ffffff',
    badgeBorderColor: '#38bdf8',
    hasCrown: false,
    hasWings: false,
  },
  [CHAMPION_LEVEL_TIER.WARLORD]: {
    tier: CHAMPION_LEVEL_TIER.WARLORD,
    tierNameVi: 'Chiến Thần',
    tierNameEn: 'Warlord',
    minLevel: CHAMPION_LEVEL_THRESHOLDS.WARLORD_MIN,
    maxLevel: CHAMPION_LEVEL_THRESHOLDS.WARLORD_MAX,
    scaleMultiplier: 1.28,
    dpsBonusPercent: 0.14,
    auraColor: '#f59e0b',
    badgeBgColor: '#78350f',
    badgeTextColor: '#fef08a',
    badgeBorderColor: '#fbbf24',
    hasCrown: true,
    hasWings: false,
  },
  [CHAMPION_LEVEL_TIER.LEGEND]: {
    tier: CHAMPION_LEVEL_TIER.LEGEND,
    tierNameVi: 'Huyền Thoại',
    tierNameEn: 'Legend',
    minLevel: CHAMPION_LEVEL_THRESHOLDS.LEGEND_MIN,
    maxLevel: 999,
    scaleMultiplier: 1.4,
    dpsBonusPercent: 0.2,
    auraColor: '#ec4899',
    badgeBgColor: '#831843',
    badgeTextColor: '#ffffff',
    badgeBorderColor: '#f43f5e',
    hasCrown: true,
    hasWings: true,
  },
};

export const resolveChampionLevelTier = (level: number): ChampionLevelTier => {
  if (level >= CHAMPION_LEVEL_THRESHOLDS.LEGEND_MIN) return CHAMPION_LEVEL_TIER.LEGEND;
  if (level >= CHAMPION_LEVEL_THRESHOLDS.WARLORD_MIN) return CHAMPION_LEVEL_TIER.WARLORD;
  if (level >= CHAMPION_LEVEL_THRESHOLDS.WARRIOR_MIN) return CHAMPION_LEVEL_TIER.WARRIOR;
  return CHAMPION_LEVEL_TIER.RECRUIT;
};

export const getChampionLevelConfig = (level: number): ChampionLevelConfig => {
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const tier = resolveChampionLevelTier(safeLevel);
  return CHAMPION_LEVEL_TIER_CONFIGS[tier];
};

/**
 * Calculates progressive session level (1 -> 50) based on total damage dealt during the stream.
 */
export const calculateSessionDerivedLevel = (totalDamage: number): number => {
  if (!totalDamage || totalDamage <= 0) return 1;
  if (totalDamage >= 50_000) {
    return Math.min(50, 30 + Math.floor((totalDamage - 50_000) / 5_000));
  }
  if (totalDamage >= 15_000) {
    return 16 + Math.floor(((totalDamage - 15_000) / 35_000) * 13);
  }
  if (totalDamage >= 2_500) {
    return 6 + Math.floor(((totalDamage - 2_500) / 12_500) * 9);
  }
  return 1 + Math.floor((totalDamage / 2_500) * 4);
};

/**
 * Hybrid Level Resolver:
 * Prioritizes TikTok Live fan club badge level, but elevates it if session contribution is higher.
 */
export const resolveEffectiveChampionLevel = (
  tikTokFansLevel?: number,
  sessionDamage?: number
): number => {
  const rawTikTok = Math.max(0, Math.floor(tikTokFansLevel ?? 0));
  const sessionLvl = calculateSessionDerivedLevel(sessionDamage ?? 0);
  return Math.max(1, Math.max(rawTikTok, sessionLvl));
};
