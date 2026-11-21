export const REWARD_TIER = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 4,
  TIER_5: 5,
} as const;

export type RewardTier = (typeof REWARD_TIER)[keyof typeof REWARD_TIER];

export interface RewardItemConfig {
  id: string;
  emoji: string;
  tier: RewardTier;
  titleKey: string;
  titleFallback: string;
  effectKey: string;
  effectFallback: string;
}

export const REWARD_TIER_STYLE: Record<
  RewardTier,
  {
    containerClass: string;
    badgeClass: string;
  }
> = {
  [REWARD_TIER.TIER_1]: {
    containerClass:
      'border-slate-800/80 bg-slate-950/40 hover:bg-slate-900/60 hover:border-slate-700/60',
    badgeClass:
      'bg-slate-800/60 border border-slate-700/60 text-slate-300 font-medium tracking-tight',
  },
  [REWARD_TIER.TIER_2]: {
    containerClass:
      'border-cyan-500/25 bg-cyan-950/20 hover:bg-cyan-900/30 hover:border-cyan-400/50',
    badgeClass:
      'bg-cyan-950/80 border border-cyan-400/80 text-cyan-300 font-bold tracking-tight shadow-[0_0_8px_rgba(6,182,212,0.35)]',
  },
  [REWARD_TIER.TIER_3]: {
    containerClass:
      'border-blue-500/30 bg-blue-950/25 hover:bg-blue-900/35 hover:border-blue-400/60',
    badgeClass:
      'bg-blue-950/80 border border-blue-400 text-blue-300 font-extrabold tracking-tight shadow-[0_0_10px_rgba(59,130,246,0.45)]',
  },
  [REWARD_TIER.TIER_4]: {
    containerClass:
      'border-amber-400/40 bg-gradient-to-r from-amber-950/30 via-orange-950/20 to-amber-950/30 hover:border-amber-400/70 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    badgeClass:
      'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-black rounded-full border border-yellow-200 shadow-[0_0_12px_rgba(251,191,36,0.55)] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] tracking-tight',
  },
  [REWARD_TIER.TIER_5]: {
    containerClass:
      'border-rose-500/50 bg-gradient-to-r from-rose-950/40 via-red-950/30 to-amber-950/40 hover:border-rose-400/80 hover:shadow-[0_0_16px_rgba(244,63,94,0.4)]',
    badgeClass:
      'bg-gradient-to-r from-red-600 via-amber-500 to-rose-600 animate-gradient-x text-white font-black rounded-full border border-yellow-300 animate-pulse animate-god-glow shadow-[0_0_15px_rgba(239,68,68,0.7),0_0_25px_rgba(245,158,11,0.5)] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]',
  },
};

export const REWARD_ITEMS: readonly RewardItemConfig[] = [
  {
    id: 'rose',
    emoji: '🌹',
    tier: REWARD_TIER.TIER_1,
    titleKey: 'HUD.guideGiftRoseTitle',
    titleFallback: 'Hoa Hồng',
    effectKey: 'HUD.guideEffectRose',
    effectFallback: 'THIÊN THẠCH NHỎ',
  },
  {
    id: 'heart_tap',
    emoji: '💖',
    tier: REWARD_TIER.TIER_1,
    titleKey: 'HUD.guideGiftHeartTitle',
    titleFallback: 'Thả Tim',
    effectKey: 'HUD.guideEffectHeart',
    effectFallback: 'TĂNG TỐC ĐÁNH',
  },
  {
    id: 'cookie',
    emoji: '🍪',
    tier: REWARD_TIER.TIER_2,
    titleKey: 'HUD.guideGiftCookieTitle',
    titleFallback: 'Bánh Quy',
    effectKey: 'HUD.guideEffectCookie',
    effectFallback: '5 THIÊN THẠCH',
  },
  {
    id: 'sunglasses',
    emoji: '🕶️',
    tier: REWARD_TIER.TIER_2,
    titleKey: 'HUD.guideGiftSunglassesTitle',
    titleFallback: 'Kính Mát',
    effectKey: 'HUD.guideEffectSunglasses',
    effectFallback: 'MƯA THIÊN THẠCH',
  },
  {
    id: 'watergun',
    emoji: '🔫',
    tier: REWARD_TIER.TIER_3,
    titleKey: 'HUD.guideGiftWatergunTitle',
    titleFallback: 'Súng Nước',
    effectKey: 'HUD.guideEffectWatergun',
    effectFallback: 'SÁT THƯƠNG DIỆN RỘNG',
  },
];
