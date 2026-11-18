import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Trophy } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useGiftVfxStore } from '../../store/giftVfxStore';
import {
  FINISHER_BANNER_CONSTANTS,
  getThemeConfig,
  isDonorFinisherCheck,
  TEAM_KEY,
} from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamLogo } from '../icons/TeamLogos';

export const BossDeathVFX2D = () => {
  const { t } = useTranslation();
  const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);
  const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
  const finisherGiftName = useGameStore((state) => state.finisherGiftName);
  const finisherCoins = useGameStore((state) => state.finisherCoins);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const isPodiumOrbitActive = useGiftVfxStore((state) => state.isPodiumOrbitActive);

  const isDonorFinisher = isDonorFinisherCheck(finisherGiftName, finisherCoins);

  const [hasImpacted, setHasImpacted] = useState<boolean>(() => {
    if (!isDonorFinisher) return true;
    return Date.now() - bossDefeatedTimestamp >= FINISHER_BANNER_CONSTANTS.AVATAR_STRIKE_DURATION_MS;
  });

  useEffect(() => {
    if (!isDonorFinisher || bossDefeatedTimestamp <= 0) {
      setHasImpacted(true);
      return;
    }
    const elapsed = Date.now() - bossDefeatedTimestamp;
    const remaining = FINISHER_BANNER_CONSTANTS.AVATAR_STRIKE_DURATION_MS - elapsed;
    if (remaining <= 0) {
      setHasImpacted(true);
      return;
    }
    setHasImpacted(false);
    const timer = setTimeout(() => {
      setHasImpacted(true);
    }, remaining);
    return () => clearTimeout(timer);
  }, [isDonorFinisher, bossDefeatedTimestamp]);

  // Immediately unmount/hide when Victory Overlay and Podium Orbit become active
  if (bossDefeatedTimestamp === 0 || !hasImpacted || isPodiumOrbitActive) return null;

  const effectiveTeam = finisherTeam || roundWinner || TEAM_KEY.BLG;
  const winningTeamProfile = activeTeams[effectiveTeam];
  const finisherTheme = getTeamTheme(winningTeamProfile?.colorTheme);
  const teamAccentColor = finisherTheme.primaryHex;
  const teamTag = winningTeamProfile?.shortTag || effectiveTeam;

  const bossThemeConfig = getThemeConfig(gameTheme);
  const bossName = bossThemeConfig.bossName;

  return (
    <div
      key={bossDefeatedTimestamp}
      className="absolute inset-0 pointer-events-none z-[45] overflow-visible"
    >
      {/* Grand LoL Esports Broadcast Slain Banner */}
      <div className="absolute left-1/2 top-[18%] sm:top-[20%] animate-execution-banner w-max max-w-[94vw] z-[46] pointer-events-none flex flex-col items-center select-none">
        {/* Symmetrical Winged Hextech Golden Container */}
        <div className="relative flex items-center justify-center">
          {/* Deep dark backdrop plate to block background 3D light pillars, beams, and particles */}
          <div className="absolute -inset-4 bg-slate-950/95 rounded-3xl blur-md -z-10 pointer-events-none shadow-[0_0_40px_rgba(0,0,0,1)]" />

          {/* Left Wing Ornament */}
          <div className="hidden sm:flex -mr-2 items-center pointer-events-none z-10 opacity-90">
            <div className="w-8 h-12 bg-gradient-to-l from-amber-400/80 via-amber-500/40 to-transparent skew-x-[25deg] rounded-l-lg border-l-2 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
            <div className="w-3 h-8 bg-amber-400/60 skew-x-[25deg] border-l border-amber-200" />
          </div>

          {/* Core Slain Card */}
          <div
            style={{
              borderColor: `${teamAccentColor}`,
              boxShadow: `0 0 35px ${teamAccentColor}80, 0 10px 40px rgba(0,0,0,0.98), inset 0 0 16px ${teamAccentColor}30`,
              background: 'linear-gradient(135deg, #020617 0%, #0b1120 50%, #020617 100%)',
            }}
            className="relative flex items-center gap-3 sm:gap-4 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-2xl overflow-hidden shadow-2xl"
          >
            {/* Shimmer light beam sweeping across */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-20deg] animate-gold-shimmer" />
            </div>

            {/* Top Ornamental Golden Border Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_8px_#fbbf24]" />

            {/* Team Logo in 3D Embossed Shield */}
            <div
              className="relative w-10 h-10 sm:w-13 sm:h-13 flex items-center justify-center shrink-0 rounded-2xl bg-slate-950 border-2 shadow-xl"
              style={{
                borderColor: teamAccentColor,
                boxShadow: `0 0 16px ${teamAccentColor}80`,
              }}
            >
              <TeamLogo
                teamSlot={effectiveTeam}
                teamProfile={winningTeamProfile}
                className="w-7 h-7 sm:w-9 sm:h-9 object-contain drop-shadow"
              />
            </div>

            {/* Banner Text Details */}
            <div className="flex flex-col items-start leading-tight min-w-0">
              {/* Eyebrow Label */}
              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-300 mb-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                <Trophy className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
                <span>{t('Victory.objectiveSecured', 'TIÊU DIỆT MỤC TIÊU LỚN')}</span>
              </div>

              {/* Main Headline */}
              <h2
                style={{
                  textShadow:
                    '0 2px 4px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.95), 0 0 24px rgba(245,158,11,0.5)',
                }}
                className="text-xs sm:text-base md:text-lg font-black uppercase tracking-wider text-amber-200 truncate max-w-[260px] sm:max-w-md"
              >
                {teamTag} {t('Victory.slainBadge', 'ĐÃ HẠ GỤC')} {bossName.toUpperCase()}!
              </h2>

              {/* Finisher Credit Badge */}
              {finisherPlayerName && (
                <div className="flex items-center gap-1.5 mt-1 text-[9.5px] sm:text-[11px] font-bold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                  <Swords className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-slate-200 font-semibold">{t('Victory.finisherBlow', 'Đòn Kết Liễu')}:</span>
                  <span
                    className="text-amber-100 font-black px-2 py-0.5 rounded-md border truncate max-w-[160px] sm:max-w-[220px] shadow-sm bg-slate-900/90"
                    style={{
                      borderColor: `${teamAccentColor}80`,
                    }}
                  >
                    {finisherPlayerName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Wing Ornament */}
          <div className="hidden sm:flex -ml-2 items-center pointer-events-none z-10 opacity-90">
            <div className="w-3 h-8 bg-amber-400/60 skew-x-[-25deg] border-r border-amber-200" />
            <div className="w-8 h-12 bg-gradient-to-r from-amber-400/80 via-amber-500/40 to-transparent skew-x-[-25deg] rounded-r-lg border-r-2 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
