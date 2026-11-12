import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Flame, Crown } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  DAMAGE_TYPE,
  DamageType,
  TEAM_KEY,
  TeamType,
  COMBO_TIER_CONFIG,
} from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamComboState } from '../../types/game';

const MIN_COMBO_DISPLAY_COUNT = 2;

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

const TeamComboBadge = ({
  team,
  combo,
}: {
  team: TeamType;
  combo: TeamComboState;
}) => {
  const { t } = useTranslation();
  const teamProfile = useGameStore((state) => state.activeTeams[team]);
  if (combo.count < MIN_COMBO_DISPLAY_COUNT) {
    return null;
  }

  const theme = getTeamTheme(teamProfile?.colorTheme);
  const tier = getComboTierPresentation(combo.count, t);
  const teamTag = teamProfile?.shortTag || team;

  return (
    <div
      key={`${team}-${combo.count}`}
      style={{ boxShadow: tier.isHighTier ? undefined : theme.glowStyle }}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-md animate-combo-punch select-none ${tier.badgeContainerClass}`}
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
};

const DAMAGE_TEXT_CLASS_MAP: Record<DamageType, string> = {
  [DAMAGE_TYPE.NORMAL]:
    'text-[10px] sm:text-xs font-extrabold drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]',
  [DAMAGE_TYPE.CRIT]:
    'text-[10px] sm:text-xs font-black px-1.5 py-0.2 rounded-full bg-rose-950/85 border border-rose-400/60 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]',
  [DAMAGE_TYPE.ULTIMATE]:
    'text-[11px] sm:text-xs font-black px-1.5 py-0.2 rounded-full bg-amber-950/90 border border-amber-300/75 drop-shadow-[0_0_10px_rgba(245,158,11,0.75)]',
};

const DamageBadgeIcon = ({ damageType }: { damageType: DamageType }) => {
  if (damageType === DAMAGE_TYPE.ULTIMATE) {
    return (
      <span className="flex items-center gap-0.5 shrink-0">
        <Flame className="w-2.5 h-2.5 text-orange-400 fill-current animate-pulse" />
      </span>
    );
  }
  if (damageType === DAMAGE_TYPE.CRIT) {
    return <Zap className="w-2.5 h-2.5 text-rose-400 fill-current shrink-0" />;
  }
  return null;
};

const DAMAGE_TAG_CONFIG_MAP: Partial<
  Record<DamageType, { i18nKey: string; fallback: string }>
> = {
  [DAMAGE_TYPE.CRIT]: { i18nKey: 'Combat.critTag', fallback: 'BẠO KÍCH!' },
  [DAMAGE_TYPE.ULTIMATE]: { i18nKey: 'Combat.ultimateTag', fallback: 'TUYỆT KỸ!' },
};

export const FloatingDamage = React.memo(() => {
  const { t } = useTranslation();
  const floatingDamages = useGameStore((state) => state.floatingDamages);
  const teamCombos = useGameStore((state) => state.teamCombos);

  const blgCombo = teamCombos[TEAM_KEY.BLG];
  const gengCombo = teamCombos[TEAM_KEY.GENG];

  return (
    <div
      aria-live="polite"
      className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-88 h-56 pointer-events-none z-30 flex items-center justify-center overflow-visible"
    >
      {/* Separate Per-Team High-Impact Combo Counters */}
      <div className="absolute -top-6 sm:-top-7 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2.5 pointer-events-none z-30">
        <TeamComboBadge team={TEAM_KEY.BLG} combo={blgCombo} />
        <TeamComboBadge team={TEAM_KEY.GENG} combo={gengCombo} />
      </div>

      {floatingDamages.map((item) => {
        const typeClass = DAMAGE_TEXT_CLASS_MAP[item.damageType];
        const tagConfig = DAMAGE_TAG_CONFIG_MAP[item.damageType];
        const tagLabel = tagConfig ? t(tagConfig.i18nKey, tagConfig.fallback) : '';

        return (
          <div
            key={item.id}
            style={{
              transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale})`,
              color: item.color,
            }}
            className="absolute pointer-events-none"
          >
            <div
              className={`flex items-center gap-1 tracking-tight animate-float-damage select-none whitespace-nowrap ${typeClass}`}
            >
              <DamageBadgeIcon damageType={item.damageType} />
              {tagLabel && (
                <span className="text-[7.5px] sm:text-[8px] font-black tracking-wider uppercase opacity-90">
                  {tagLabel}
                </span>
              )}
              <span className="font-mono font-black drop-shadow-[0_2px_4px_#000000]">
                {item.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

FloatingDamage.displayName = 'FloatingDamage';
