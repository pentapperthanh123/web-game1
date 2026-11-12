import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Flame, Droplets, Skull, Swords } from 'lucide-react';
import { ActiveBossSkillBanner } from '../../types/bossSkill';
import { BossThemeConfig } from '../../constants/game';

interface BossAlertBannerProps {
  isRoarActive: boolean;
  themeConfig: BossThemeConfig;
  activeBossSkillBanner: ActiveBossSkillBanner | null;
  gameTheme: string;
  defaultRoarTextVi: string;
}

const renderSkillIcon = (themeConfig: BossThemeConfig, activeBanner: ActiveBossSkillBanner | null) => {
  if (activeBanner?.isUltimate) {
    return <Skull className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />;
  }
  if (activeBanner?.skillId === 'baron_acid_spit') {
    return <Droplets className="w-3.5 h-3.5 text-emerald-300 animate-pulse shrink-0" />;
  }
  if (themeConfig.archetype === 'HERALD') {
    return <Swords className="w-3.5 h-3.5 text-emerald-300 animate-bounce shrink-0" />;
  }
  if (themeConfig.archetype === 'DRAGON') {
    return <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />;
  }
  return <Zap className="w-3.5 h-3.5 text-purple-300 animate-spin shrink-0" />;
};

export const BossAlertBanner: React.FC<BossAlertBannerProps> = React.memo(
  ({ isRoarActive, themeConfig, activeBossSkillBanner, gameTheme, defaultRoarTextVi }) => {
    const { t } = useTranslation();

    if (!isRoarActive) return null;

    const isUltimate = activeBossSkillBanner?.isUltimate ?? false;
    const bannerColor = activeBossSkillBanner?.color || themeConfig.colors.primaryHex;
    const shadowHex = isUltimate ? '#ef4444' : bannerColor;

    const bannerText = activeBossSkillBanner
      ? `${activeBossSkillBanner.vietnameseName} (-${activeBossSkillBanner.damage} HP)`
      : t(`Game.bossRoar.${gameTheme}`, defaultRoarTextVi);

    return (
      <div
        style={{
          boxShadow: `0 0 24px ${shadowHex}aa`,
          borderColor: bannerColor,
        }}
        className="absolute -top-10 sm:-top-12 px-3.5 py-1 rounded-full border-2 text-[10px] sm:text-xs font-black tracking-wide flex items-center space-x-1.5 z-[46] max-w-[90vw] whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 bg-slate-950/95 text-white backdrop-blur-md"
      >
        {renderSkillIcon(themeConfig, activeBossSkillBanner)}
        {isUltimate && (
          <span className="px-1.5 py-0.5 rounded bg-rose-600 text-[8px] font-black tracking-wider text-white uppercase shrink-0">
            {t('Combat.ultimateSkill', 'CHIÊU CUỐI!')}
          </span>
        )}
        <span className="truncate">{bannerText}</span>
      </div>
    );
  }
);

BossAlertBanner.displayName = 'BossAlertBanner';
