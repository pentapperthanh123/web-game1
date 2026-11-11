import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Flame, Droplets, Skull } from 'lucide-react';
import { ActiveBossSkillBanner } from '../../types/bossSkill';

interface BossAlertBannerProps {
  isRoarActive: boolean;
  isElderDragon: boolean;
  activeBossSkillBanner: ActiveBossSkillBanner | null;
  gameTheme: string;
  defaultRoarTextVi: string;
}

const getBannerThemeClass = (
  isElderDragon: boolean,
  skillId?: string
): string => {
  if (isElderDragon) {
    return 'bg-amber-950/95 border-amber-400 text-amber-200 shadow-[0_0_20px_#f59e0b]';
  }
  if (skillId === 'baron_acid_spit') {
    return 'bg-emerald-950/95 border-emerald-400 text-emerald-200 shadow-[0_0_20px_#22c55e]';
  }
  if (skillId === 'baron_void_cataclysm') {
    return 'bg-rose-950/95 border-rose-400 text-rose-200 shadow-[0_0_25px_#ef4444]';
  }
  return 'bg-purple-950/95 border-purple-400 text-purple-200 shadow-[0_0_20px_#9333ea]';
};

const renderSkillIcon = (isElderDragon: boolean, skillId?: string) => {
  if (isElderDragon) {
    return <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />;
  }
  if (skillId === 'baron_acid_spit') {
    return <Droplets className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />;
  }
  if (skillId === 'baron_void_cataclysm') {
    return <Skull className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
  }
  return <Zap className="w-3.5 h-3.5 text-purple-300 animate-spin" />;
};

export const BossAlertBanner: React.FC<BossAlertBannerProps> = React.memo(
  ({ isRoarActive, isElderDragon, activeBossSkillBanner, gameTheme, defaultRoarTextVi }) => {
    const { t } = useTranslation();

    if (!isRoarActive) return null;

    const skillId = activeBossSkillBanner?.skillId;
    const bannerThemeClass = getBannerThemeClass(isElderDragon, skillId);

    const bannerText = activeBossSkillBanner
      ? `${activeBossSkillBanner.vietnameseName} (-${activeBossSkillBanner.damage} HP)`
      : t(`Game.bossRoar.${gameTheme}`, defaultRoarTextVi);

    return (
      <div
        className={`absolute -top-10 sm:-top-12 px-3.5 py-1 rounded-full border-2 text-[10px] sm:text-xs font-black tracking-widest flex items-center space-x-1.5 animate-bounce z-20 shadow-xl ${bannerThemeClass}`}
      >
        {renderSkillIcon(isElderDragon, skillId)}
        <span>{bannerText}</span>
      </div>
    );
  }
);

BossAlertBanner.displayName = 'BossAlertBanner';
