import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Sparkles, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { DAMAGE_TYPE, DamageType, TEAM_KEY, TeamType } from '../../constants/game';
import { TeamComboState } from '../../types/game';

interface TeamComboStyleConfig {
  teamLabel: string;
  badgeClass: string;
}

const TEAM_COMBO_STYLE_MAP: Record<TeamType, TeamComboStyleConfig> = {
  [TEAM_KEY.BLG]: {
    teamLabel: 'BLG',
    badgeClass:
      'border-cyan-400/80 bg-cyan-950/85 text-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.55)]',
  },
  [TEAM_KEY.GENG]: {
    teamLabel: 'GEN',
    badgeClass:
      'border-amber-400/80 bg-amber-950/85 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.55)]',
  },
};

const MIN_COMBO_DISPLAY_COUNT = 2;

const TeamComboBadge = ({
  team,
  combo,
  comboLabel,
}: {
  team: TeamType;
  combo: TeamComboState;
  comboLabel: string;
}) => {
  if (combo.count < MIN_COMBO_DISPLAY_COUNT) {
    return null;
  }

  const style = TEAM_COMBO_STYLE_MAP[team];

  return (
    <div
      key={`${team}-${combo.count}`}
      className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border backdrop-blur-md animate-in zoom-in-75 duration-150 ${style.badgeClass}`}
    >
      <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase whitespace-nowrap">
        {style.teamLabel} {comboLabel} x{combo.count}
      </span>
      <span className="text-[10px] sm:text-xs font-mono font-black text-white whitespace-nowrap">
        -{combo.damage.toLocaleString()}
      </span>
    </div>
  );
};

const DAMAGE_TEXT_CLASS_MAP: Record<DamageType, string> = {
  [DAMAGE_TYPE.NORMAL]:
    'text-xs sm:text-sm font-extrabold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]',
  [DAMAGE_TYPE.CRIT]:
    'text-xs sm:text-sm font-black px-1.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-400/70 drop-shadow-[0_0_10px_rgba(244,63,94,0.85)]',
  [DAMAGE_TYPE.ULTIMATE]:
    'text-sm sm:text-base font-black px-2 py-0.5 rounded-full bg-amber-950/85 border border-amber-300/85 drop-shadow-[0_0_14px_rgba(245,158,11,0.9)]',
};

const DamageBadgeIcon = ({ damageType }: { damageType: DamageType }) => {
  if (damageType === DAMAGE_TYPE.ULTIMATE) {
    return (
      <span className="flex items-center gap-0.5 shrink-0">
        <Flame className="w-3.5 h-3.5 text-orange-400 fill-current animate-pulse" />
        <Sparkles className="w-3 h-3 text-yellow-300 animate-spin" />
      </span>
    );
  }
  if (damageType === DAMAGE_TYPE.CRIT) {
    return <Zap className="w-3 h-3 text-rose-400 fill-current animate-bounce shrink-0" />;
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
  const comboLabel = t('Combat.comboLabel', 'COMBO');

  return (
    <div
      aria-live="polite"
      className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-88 h-56 pointer-events-none z-30 flex items-center justify-center overflow-visible"
    >
      {/* Separate Per-Team Combo Counters (BLG Left Cyan / GEN.G Right Amber) */}
      <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 pointer-events-none">
        <TeamComboBadge team={TEAM_KEY.BLG} combo={blgCombo} comboLabel={comboLabel} />
        <TeamComboBadge team={TEAM_KEY.GENG} combo={gengCombo} comboLabel={comboLabel} />
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
                <span className="text-[9px] sm:text-[10px] font-black tracking-wide">
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
