import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Flame, Droplets, Skull, Swords } from 'lucide-react';
import { ActiveBossSkillBanner } from '../../types/bossSkill';
import { BOSS_HEALTH_BAR_LAYOUT, BossThemeConfig } from '../../constants/game';

interface BossAlertBannerProps {
  isRoarActive: boolean;
  themeConfig: BossThemeConfig;
  activeBossSkillBanner: ActiveBossSkillBanner | null;
  gameTheme: string;
  defaultRoarTextVi: string;
  /** The boss HP bar is shown right above the boss: sit above it. */
  isAboveHealthBar: boolean;
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
  ({ isRoarActive, themeConfig, activeBossSkillBanner, gameTheme, defaultRoarTextVi, isAboveHealthBar }) => {
    const { t } = useTranslation();

    // Boss skill cast tags are presented cleanly at the top-center of the screen
    // via BossSkillBanner (for the first 3 skills) and BossSkillCastLayer (for ultimates)
    // to avoid covering the boss name or boss sprite in the arena.
    if (!isRoarActive || activeBossSkillBanner) return null;

    const bannerColor = themeConfig.colors.primaryHex;
    const bannerText = t(`Game.bossRoar.${gameTheme}`, defaultRoarTextVi);

    return (
      <div
        style={{
          boxShadow: `0 0 24px ${bannerColor}aa`,
          borderColor: bannerColor,
        }}
        className={`absolute left-1/2 -translate-x-1/2 ${isAboveHealthBar ? BOSS_HEALTH_BAR_LAYOUT.ALERT_BANNER_TOP_CLASS : BOSS_HEALTH_BAR_LAYOUT.ALERT_BANNER_DEFAULT_TOP_CLASS} px-3.5 py-1 rounded-full border-2 text-[10px] sm:text-xs font-black tracking-wide flex items-center space-x-1.5 z-[46] max-w-[90vw] whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 bg-slate-950/95 text-white backdrop-blur-md`}
      >
        {renderSkillIcon(themeConfig, activeBossSkillBanner)}
        <span className="truncate">{bannerText}</span>
      </div>
    );
  }
);

BossAlertBanner.displayName = 'BossAlertBanner';
