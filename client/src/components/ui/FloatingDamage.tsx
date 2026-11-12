import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  DAMAGE_TYPE,
  DamageType,
} from '../../constants/game';

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

const MAX_RENDERED_FLOATING_DAMAGES = 8;

export const FloatingDamage = React.memo(() => {
  const { t } = useTranslation();
  const floatingDamages = useGameStore((state) => state.floatingDamages);
  const visibleDamages =
    floatingDamages.length > MAX_RENDERED_FLOATING_DAMAGES
      ? floatingDamages.slice(-MAX_RENDERED_FLOATING_DAMAGES)
      : floatingDamages;

  return (
    <div
      aria-live="polite"
      className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-88 h-56 pointer-events-none z-30 flex items-center justify-center overflow-visible"
    >
      {visibleDamages.map((item) => {
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
              <span>{item.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

FloatingDamage.displayName = 'FloatingDamage';
