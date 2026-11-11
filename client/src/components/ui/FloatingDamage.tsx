import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Sparkles, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { DAMAGE_TYPE, DamageType, TEAM_KEY } from '../../constants/game';
import { DefeatedChampionEntity } from '../../types/game';

const DAMAGE_TEXT_CLASS_MAP: Record<DamageType, string> = {
  [DAMAGE_TYPE.NORMAL]: 'text-sm sm:text-base font-extrabold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]',
  [DAMAGE_TYPE.CRIT]:
    'text-xl sm:text-2xl font-black px-2 py-0.5 rounded-full bg-rose-950/75 border border-rose-400/70 drop-shadow-[0_0_16px_rgba(244,63,94,0.95)]',
  [DAMAGE_TYPE.ULTIMATE]:
    'text-2xl sm:text-3xl font-black px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-300/85 drop-shadow-[0_0_24px_rgba(245,158,11,0.98)]',
};

const DamageBadgeIcon = ({ damageType }: { damageType: DamageType }) => {
  if (damageType === DAMAGE_TYPE.ULTIMATE) {
    return (
      <span className="flex items-center space-x-0.5 shrink-0">
        <Flame className="w-5 h-5 text-orange-400 fill-current animate-pulse" />
        <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
      </span>
    );
  }
  if (damageType === DAMAGE_TYPE.CRIT) {
    return <Zap className="w-4 h-4 text-rose-400 fill-current animate-bounce shrink-0" />;
  }
  return null;
};

const DAMAGE_TAG_CONFIG_MAP: Partial<
  Record<DamageType, { i18nKey: string; fallback: string }>
> = {
  [DAMAGE_TYPE.CRIT]: { i18nKey: 'Combat.critTag', fallback: 'BẠO KÍCH!' },
  [DAMAGE_TYPE.ULTIMATE]: { i18nKey: 'Combat.ultimateTag', fallback: 'TUYỆT KỸ!' },
};

interface DefeatedChampionBadgeProps {
  entity: DefeatedChampionEntity;
}

const DefeatedChampionBadge = ({ entity }: DefeatedChampionBadgeProps) => {
  const { t } = useTranslation();
  const age = Date.now() - entity.createdAt;
  const progress = Math.min(1.0, Math.max(0.0, age / entity.durationMs));
  const floatUp = progress * 48;
  const fadeOut = Math.max(0, 1.0 - Math.pow(progress, 1.2));

  return (
    <div
      style={{
        left: `${entity.screenX}px`,
        top: `${entity.screenY - floatUp}px`,
        opacity: fadeOut,
      }}
      className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40 flex flex-col items-center select-none"
    >
      <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-950/95 border-2 border-red-500/90 shadow-[0_0_20px_rgba(239,68,68,0.9)] backdrop-blur-md animate-bounce">
        <span className="text-xs sm:text-sm">💀</span>
        <span className="text-xs sm:text-sm font-black text-white tracking-wider uppercase">
          {entity.championName} {t('Combat.defeated', 'TỬ TRẬN!')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs font-bold text-red-300 drop-shadow-[0_2px_4px_#000000] mt-0.5">
        {entity.summonerName}
      </span>
    </div>
  );
};

export const FloatingDamage = React.memo(() => {
  const { t } = useTranslation();
  const floatingDamages = useGameStore((state) => state.floatingDamages);
  const activeDefeatedChampions = useGameStore((state) => state.activeDefeatedChampions);
  const comboCount = useGameStore((state) => state.comboCount);
  const comboDamage = useGameStore((state) => state.comboDamage);
  const comboTeam = useGameStore((state) => state.comboTeam);

  const isBLGCombo = comboTeam === TEAM_KEY.BLG;
  const comboBadgeStyle = isBLGCombo
    ? 'border-cyan-400/80 bg-cyan-950/85 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.55)]'
    : 'border-amber-400/80 bg-amber-950/85 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.55)]';

  return (
    <>
      <div
        aria-live="polite"
        className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 pointer-events-none z-30 flex items-center justify-center overflow-visible"
      >
        {/* Active Combo Counter Banner */}
        {comboCount >= 2 && (
          <div
            key={comboCount}
            className={`absolute -top-6 sm:-top-8 flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border backdrop-blur-md animate-in zoom-in-75 duration-150 ${comboBadgeStyle}`}
          >
            <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase">
              {t('Combat.comboLabel', 'COMBO')} x{comboCount}
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-black text-white">
              -{comboDamage.toLocaleString()}
            </span>
          </div>
        )}

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
              className={`absolute flex items-center space-x-1 tracking-tight animate-float-damage select-none whitespace-nowrap ${typeClass}`}
            >
              <DamageBadgeIcon damageType={item.damageType} />
              {tagLabel && <span className="text-[10px] sm:text-xs font-black tracking-wider">{tagLabel}</span>}
              <span className="font-mono font-black drop-shadow-[0_2px_4px_#000000]">
                {item.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* 2. Floating Defeated Champion Badges */}
      {activeDefeatedChampions.map((item) => (
        <DefeatedChampionBadge key={item.id} entity={item} />
      ))}
    </>
  );
});
