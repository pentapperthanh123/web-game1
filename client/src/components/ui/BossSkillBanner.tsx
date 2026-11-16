import React from 'react';
import { Flame, Zap, Droplets, Wind, Skull, Sparkles, Swords, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';

const renderSkillIcon = (iconName?: string, skillColor?: string) => {
  const iconClass = 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 drop-shadow';
  switch (iconName?.toLowerCase()) {
    case 'zap':
      return <Zap className={`${iconClass} text-yellow-300 animate-pulse`} />;
    case 'flame':
      return <Flame className={`${iconClass} text-amber-400 animate-pulse`} />;
    case 'wind':
      return <Wind className={`${iconClass} text-cyan-300`} />;
    case 'droplets':
      return <Droplets className={`${iconClass} text-emerald-300`} />;
    case 'sparkles':
      return <Sparkles className={`${iconClass} text-purple-300 animate-pulse`} />;
    case 'swords':
      return <Swords className={`${iconClass} text-rose-400`} />;
    case 'shield':
      return <Shield className={`${iconClass} text-blue-400`} />;
    case 'skull':
      return <Skull className={`${iconClass} text-rose-500 animate-pulse`} />;
    default:
      return <Zap className={iconClass} style={{ color: skillColor }} />;
  }
};

/**
 * Top-center skill announcement tag for the boss's first 3 skills (non-ultimate).
 * Placed in the Unified Non-Overlapping Center Toast Stack below the broadcast scoreboard
 * to avoid covering the boss name or boss sprite in the middle of the arena.
 */
export const BossSkillBanner = React.memo(() => {
  const { t, i18n } = useTranslation();
  const isBannerVisible = useGameStore((state) => state.overlayVisibility.bossSkillBanner ?? true);
  const activeBanner = useGameStore((state) => state.activeBossSkillBanner);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const livingMinionsCount = useGameStore((state) => state.minions.length);

  // Ultimates are already handled by BossSkillCastLayer full-screen cinematic
  if (!isBannerVisible || !activeBanner || activeBanner.isUltimate) return null;

  const isVi = i18n.language.startsWith('vi');
  const skillDisplayName = isVi ? activeBanner.vietnameseName : activeBanner.skillName;
  const bannerColor = activeBanner.color || '#f59e0b';
  const isCrowded = livingMinionsCount > 25;

  const targetTeamLabel =
    activeBanner.targetTeam === TEAM_KEY.BLG
      ? activeTeams[TEAM_KEY.BLG]?.shortTag ?? activeTeams[TEAM_KEY.BLG]?.name ?? t('Common.team1', 'ĐỘI 1')
      : activeBanner.targetTeam === TEAM_KEY.GENG
      ? activeTeams[TEAM_KEY.GENG]?.shortTag ?? activeTeams[TEAM_KEY.GENG]?.name ?? t('Common.team2', 'ĐỘI 2')
      : null;

  return (
    <div
      key={activeBanner.timestamp}
      style={{
        boxShadow: isCrowded
          ? `0 0 14px ${bannerColor}44, 0 4px 16px rgba(0,0,0,0.7)`
          : `0 0 24px ${bannerColor}66, 0 8px 30px rgba(0,0,0,0.85)`,
        borderColor: `${bannerColor}cc`,
      }}
      className={`pointer-events-none flex items-center gap-1.5 rounded-full border bg-slate-950/90 text-white backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 select-none shadow-2xl z-[46] max-w-[92vw] transition-all ${
        isCrowded
          ? 'px-2.5 py-0.5 scale-90 sm:scale-95'
          : 'px-3 py-1 sm:px-3.5 sm:py-1.5'
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-full border shadow-sm shrink-0 ${
          isCrowded ? 'p-0.5' : 'p-1'
        }`}
        style={{
          backgroundColor: `${bannerColor}25`,
          borderColor: bannerColor,
        }}
      >
        {renderSkillIcon(activeBanner.iconName, bannerColor)}
      </div>

      <div
        className={`flex items-center gap-1 whitespace-nowrap font-black tracking-wide ${
          isCrowded ? 'text-[9.5px] sm:text-[10px]' : 'text-[10.5px] sm:text-xs'
        }`}
      >
        <span
          className={`text-slate-300 uppercase tracking-wider opacity-85 truncate ${
            isCrowded ? 'text-[8.5px] max-w-[90px]' : 'text-[9.5px] sm:text-[10.5px]'
          }`}
        >
          [{activeBanner.bossName}]
        </span>
        <span style={{ color: bannerColor }} className="drop-shadow">
          {skillDisplayName}
        </span>
        <span className="px-1.5 py-0.2 rounded bg-red-950/90 text-rose-300 border border-rose-500/50 text-[8.5px] sm:text-[9.5px] font-mono font-bold tracking-tight shadow-inner">
          -{activeBanner.damage} HP
        </span>
        {targetTeamLabel && (
          <span className="px-1 py-0.2 rounded bg-slate-800/90 text-slate-200 border border-white/20 text-[8px] sm:text-[8.5px] uppercase tracking-wider font-extrabold">
            {targetTeamLabel}
          </span>
        )}
      </div>
    </div>
  );
});

BossSkillBanner.displayName = 'BossSkillBanner';
