import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Flame, Sparkles } from 'lucide-react';
import { useCombatDeployBannerStore, hideCombatDeployBanner } from '../../../store/combatDeployBannerStore';
import { useGameStore } from '../../../store/gameStore';
import { TEAM_KEY } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';

const BANNER_DURATION_MS = 1400;

/**
 * Esports Worlds Broadcast 3D slam banner shown immediately when:
 * 1. Operator or user clicks "Xung trận ngay" / Space.
 * 2. Pre-round countdown timer naturally reaches 0s.
 */
export const CombatDeployBanner = () => {
  const { t } = useTranslation();
  const isActive = useCombatDeployBannerStore((state) => state.isActive);
  const round = useCombatDeployBannerStore((state) => state.round);
  const startedAt = useCombatDeployBannerStore((state) => state.startedAt);

  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);
  const leftTheme = getTeamTheme(leftTeam?.colorTheme);
  const rightTheme = getTeamTheme(rightTeam?.colorTheme);

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isActive || startedAt <= 0) {
      setIsVisible(false);
      return undefined;
    }

    setIsVisible(true);
    const timer = window.setTimeout(() => {
      setIsVisible(false);
      hideCombatDeployBanner();
    }, BANNER_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [isActive, startedAt]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none select-none flex flex-col items-center justify-center overflow-hidden">
      {/* 1. Dramatic Expanding Radial Shockwave Ring */}
      <div className="absolute w-[800px] h-[800px] rounded-full border-4 border-amber-400/80 animate-ping opacity-60 mix-blend-screen pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-rose-600/40 via-amber-500/30 to-yellow-400/20 blur-3xl animate-pulse pointer-events-none" />

      {/* 2. Top-level Screen Flash Line */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent blur-sm -translate-y-1/2" />

      {/* 3. Central 3D Slam Card */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 py-5 rounded-3xl bg-slate-950/95 border-2 border-amber-400/90 shadow-[0_0_80px_rgba(245,158,11,0.9),inset_0_2px_8px_rgba(255,255,255,0.4)] animate-in zoom-in-50 fade-in duration-200 transform-gpu max-w-sm sm:max-w-md w-[92%]">
        {/* Subtle Top Gold Highlight */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-yellow-200 to-transparent rounded-full shadow-[0_0_12px_#fde047]" />

        {/* Badge: Ván đấu */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/60 shadow-md">
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
          <span className="text-[11px] sm:text-xs font-black tracking-widest text-amber-200 uppercase font-mono">
            {t('CombatDeploy.roundBadge', 'VÁN {{round}} CHÍNH THỨC BẮT ĐẦU', { round })}
          </span>
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
        </div>

        {/* Epic Main Headline: XUNG TRẬN! */}
        <div className="my-2 flex items-center justify-center gap-3">
          <Swords className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 drop-shadow-[0_0_16px_rgba(245,158,11,1)] animate-pulse" />
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-600 drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] [text-shadow:0_0_30px_rgba(245,158,11,1),0_2px_4px_rgba(0,0,0,0.9)]">
            {t('CombatDeploy.title', 'XUNG TRẬN!')}
          </h1>
          <Swords className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 drop-shadow-[0_0_16px_rgba(245,158,11,1)] animate-pulse" />
        </div>

        {/* Dual Team Clash Subtitle */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-black tracking-wide mt-1">
          <span className={`px-2.5 py-0.5 rounded-lg border ${leftTheme.borderClass} ${leftTheme.textClass} bg-slate-900/90 shadow-sm`}>
            {leftTeam?.shortTag || 'BLG'}
          </span>
          <span className="text-amber-400 italic text-[11px] font-black uppercase">VS</span>
          <span className={`px-2.5 py-0.5 rounded-lg border ${rightTheme.borderClass} ${rightTheme.textClass} bg-slate-900/90 shadow-sm`}>
            {rightTeam?.shortTag || 'GEN'}
          </span>
        </div>

        {/* Live CTA Hint */}
        <div className="mt-3 flex items-center gap-1.5 text-[10.5px] font-bold text-amber-200/90">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span>{t('CombatDeploy.hint', 'Chat triệu hồi & Thả tim nạp Nộ ngay bây giờ!')}</span>
        </div>
      </div>
    </div>
  );
};
