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

  const titleText = t('CombatDeploy.title', 'XUNG TRẬN!');
  const roundBadgeText = t('CombatDeploy.roundBadge', 'VÁN {{round}} CHÍNH THỨC BẮT ĐẦU', { round })
    .replace(/\{\{\s*round\s*\}\}/gi, String(round));

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none select-none flex flex-col items-center justify-center overflow-hidden">
      {/* 1. Dramatic Expanding Radial Shockwave Ring */}
      <div className="absolute w-[800px] h-[800px] rounded-full border-4 border-amber-400/80 animate-ping opacity-60 mix-blend-screen pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-rose-600/40 via-amber-500/30 to-yellow-400/20 blur-3xl animate-pulse pointer-events-none" />

      {/* 2. Top-level Screen Flash Line */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent blur-sm -translate-y-1/2" />

      {/* 3. Central 3D Slam Card */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 sm:px-10 py-5 sm:py-6 rounded-3xl bg-slate-950/96 border-2 border-amber-400/90 shadow-[0_0_90px_rgba(245,158,11,0.85),inset_0_2px_12px_rgba(255,255,255,0.4)] animate-in zoom-in-75 fade-in duration-200 max-w-md sm:max-w-xl w-[94%] overflow-hidden">
        {/* Animated Top/Bottom Gold Highlight Lines */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_15px_#fde047]" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] animate-gold-shimmer" />
        </div>

        {/* Badge: Ván đấu */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/60 shadow-md">
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
          <span className="text-[11px] sm:text-xs font-black tracking-widest text-amber-200 uppercase font-mono">
            {roundBadgeText}
          </span>
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
        </div>

        {/* ── Epic Main Headline: XUNG TRẬN! (3D Radiant Typography) ── */}
        <div className="relative my-2 sm:my-3.5 flex items-center justify-center gap-2 sm:gap-4 w-full px-2">
          {/* Left Flaming Sword */}
          <div className="relative shrink-0 flex items-center justify-center animate-sword-clash-left">
            <Swords className="w-8 h-8 sm:w-11 sm:h-11 text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.9)]" />
            <Flame className="absolute -top-2 -right-1 w-4 h-4 text-orange-400 fill-orange-400 animate-bounce" />
          </div>

          {/* ── 3D Ultra-Sharp High-Contrast Headline Container ── */}
          <div className="relative flex items-center justify-center animate-combat-title-slam">
            {/* 1. Underlying Crisp Anamorphic Laser Flare (Clean, Thin, Zero Haze) */}
            <div className="absolute inset-x-[-20%] h-[2px] bg-gradient-to-r from-transparent via-amber-200 to-transparent opacity-80 pointer-events-none" />

            {/* 2. Deep 3D Shadow Base Layer (translateY 4px, dark chocolate depth) */}
            <span
              aria-hidden="true"
              className="absolute select-none font-black italic uppercase tracking-wider text-4xl sm:text-6xl md:text-7xl font-sans whitespace-nowrap"
              style={{
                color: '#1c0701',
                transform: 'translateY(4px)',
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.95))',
              }}
            >
              {titleText}
            </span>

            {/* 3. Mid 3D Gold Bevel Rim (translateY 2px, burnished bronze-gold) */}
            <span
              aria-hidden="true"
              className="absolute select-none font-black italic uppercase tracking-wider text-4xl sm:text-6xl md:text-7xl font-sans whitespace-nowrap"
              style={{
                color: '#78350f',
                transform: 'translateY(2px)',
              }}
            >
              {titleText}
            </span>

            {/* 4. Foreground Radiant Incandescent Face (100% Vector Crisp, Brilliant White-to-Gold) */}
            <h1
              className="relative z-10 font-black italic uppercase tracking-wider text-4xl sm:text-6xl md:text-7xl font-sans select-none whitespace-nowrap"
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #FEF9C3 20%, #FDE047 45%, #F59E0B 75%, #B45309 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {titleText}
            </h1>
          </div>

          {/* Right Flaming Sword */}
          <div className="relative shrink-0 flex items-center justify-center animate-sword-clash-right">
            <Swords className="w-8 h-8 sm:w-11 sm:h-11 text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.9)]" />
            <Flame className="absolute -top-2 -left-1 w-4 h-4 text-orange-400 fill-orange-400 animate-bounce" />
          </div>
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
