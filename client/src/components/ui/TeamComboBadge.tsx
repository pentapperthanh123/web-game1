import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Flame, Crown } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  TeamType,
  COMBO_TIER_CONFIG,
} from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamComboState } from '../../types/game';

export const MIN_COMBO_DISPLAY_COUNT = 2;

interface ComboTierPresentation {
  tagText: string;
  badgeContainerClass: string;
  isHighTier: boolean;
  tierLevel: 1 | 2 | 3 | 4;
}

const getComboTierPresentation = (
  count: number,
  t: (key: string, fallback: string) => string
): ComboTierPresentation => {
  if (count >= COMBO_TIER_CONFIG.HYPER.min) {
    return {
      tagText: t(COMBO_TIER_CONFIG.HYPER.tagKey, COMBO_TIER_CONFIG.HYPER.tagFallback),
      badgeContainerClass:
        'bg-gradient-to-r from-fuchsia-950/95 via-purple-950/95 to-amber-950/95 border-amber-300 text-yellow-200 shadow-[0_0_28px_rgba(234,179,8,0.85)] ring-2 ring-yellow-400/60 animate-combo-flame',
      isHighTier: true,
      tierLevel: 4,
    };
  }

  if (count >= COMBO_TIER_CONFIG.SUPER.min) {
    return {
      tagText: t(COMBO_TIER_CONFIG.SUPER.tagKey, COMBO_TIER_CONFIG.SUPER.tagFallback),
      badgeContainerClass:
        'bg-gradient-to-r from-rose-950/95 via-red-950/95 to-orange-950/95 border-rose-400 text-rose-200 shadow-[0_0_22px_rgba(244,63,94,0.75)] ring-1 ring-rose-400/50 animate-combo-flame',
      isHighTier: true,
      tierLevel: 3,
    };
  }

  if (count >= COMBO_TIER_CONFIG.GREAT.min) {
    return {
      tagText: t(COMBO_TIER_CONFIG.GREAT.tagKey, COMBO_TIER_CONFIG.GREAT.tagFallback),
      badgeContainerClass:
        'bg-gradient-to-r from-amber-950/90 to-orange-950/90 border-amber-400 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.65)] ring-1 ring-amber-400/40 animate-combo-flame',
      isHighTier: false,
      tierLevel: 2,
    };
  }

  return {
    tagText: t(COMBO_TIER_CONFIG.NORMAL.tagKey, COMBO_TIER_CONFIG.NORMAL.tagFallback),
    badgeContainerClass:
      'bg-slate-950/90 border-cyan-400/70 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.45)]',
    isHighTier: false,
    tierLevel: 1,
  };
};

const ComboTierIcons = ({ tierLevel }: { tierLevel: 1 | 2 | 3 | 4 }) => {
  if (tierLevel === 4) {
    return (
      <span className="flex items-center gap-0.5 shrink-0">
        <Crown className="w-3.5 h-3.5 text-yellow-300 fill-current animate-pulse" />
        <Flame className="w-3.5 h-3.5 text-fuchsia-400 fill-current animate-bounce" />
      </span>
    );
  }

  if (tierLevel === 3) {
    return (
      <span className="flex items-center gap-0.5 shrink-0">
        <Flame className="w-3.5 h-3.5 text-rose-400 fill-current animate-pulse" />
        <Zap className="w-3 h-3 text-amber-300 fill-current" />
      </span>
    );
  }

  if (tierLevel === 2) {
    return <Flame className="w-3.5 h-3.5 text-orange-400 fill-current animate-bounce shrink-0" />;
  }

  return <Zap className="w-3 h-3 text-cyan-300 fill-current shrink-0" />;
};

export const TeamComboBadge: React.FC<{
  team: TeamType;
  combo: TeamComboState;
}> = React.memo(({ team, combo }) => {
  const { t } = useTranslation();
  const teamProfile = useGameStore((state) => state.activeTeams[team]);
  if (!combo || combo.count < MIN_COMBO_DISPLAY_COUNT) {
    return null;
  }

  const theme = getTeamTheme(teamProfile?.colorTheme);
  const tier = getComboTierPresentation(combo.count, t);
  const teamTag = teamProfile?.shortTag || team;

  return (
    <div
      key={`${team}-${combo.count}`}
      style={{ boxShadow: tier.isHighTier ? undefined : theme.glowStyle }}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-md animate-combo-punch select-none transition-all duration-200 ${tier.badgeContainerClass}`}
    >
      <ComboTierIcons tierLevel={tier.tierLevel} />

      <div className="flex items-center gap-1">
        <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase whitespace-nowrap">
          {teamTag} {tier.tagText}
        </span>
        <span className="px-1.5 py-0.2 rounded-full bg-white/20 font-mono font-black text-[10px] sm:text-xs text-white shadow-inner">
          x{combo.count}
        </span>
      </div>

      <span className="text-[10px] sm:text-xs font-mono font-black text-amber-200 whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        -{combo.damage.toLocaleString()}
      </span>
    </div>
  );
});

TeamComboBadge.displayName = 'TeamComboBadge';
