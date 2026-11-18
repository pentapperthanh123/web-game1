import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGiftVfxStore } from '../../store/giftVfxStore';
import {
  DEFEAT_SHOWCASE_TIMELINE,
  FINISHER_BANNER_CONSTANTS,
  isDonorFinisherCheck,
  TEAM_KEY,
  TeamType,
  BossThemeConfig,
} from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { BossMythicCrest } from '../icons/BossMythicCrest';

interface BossDefeatedCrest2DProps {
  themeConfig: BossThemeConfig;
}

const COMPASS_CARDINAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export const BossDefeatedCrest2D: React.FC<BossDefeatedCrest2DProps> = React.memo(
  ({ themeConfig }) => {
    const finisherTeam = useGameStore((state) => state.finisherTeam);
    const finisherGiftName = useGameStore((state) => state.finisherGiftName);
    const finisherCoins = useGameStore((state) => state.finisherCoins);
    const roundWinner = useGameStore((state) => state.roundWinner);
    const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);
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

    if (bossDefeatedTimestamp === 0 || !hasImpacted || isPodiumOrbitActive) return null;

    const winnerTeam: TeamType = (finisherTeam || roundWinner || TEAM_KEY.BLG) as TeamType;
    const winnerProfile = activeTeams[winnerTeam];
    const teamTheme = getTeamTheme(winnerProfile?.colorTheme);
    const glowHex = `${teamTheme.primaryHex}80`;

    return (
      <div
        key={bossDefeatedTimestamp}
        style={{ animationDelay: `${DEFEAT_SHOWCASE_TIMELINE.CREST_REVEAL_DELAY_MS}ms` }}
        className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center select-none overflow-visible animate-in fade-in zoom-in-90 duration-700 fill-mode-both"
      >
        {/* Background Divine Light Pillars */}
        <div
          style={{
            background: `linear-gradient(to top, ${glowHex}, rgba(255,255,255,0.22), transparent)`,
          }}
          className="absolute bottom-[16%] w-64 sm:w-80 h-96 rounded-t-full blur-2xl animate-buff-soul-beams"
        />

        <div className="relative flex flex-col items-center animate-buff-crest-float">
          {/* Hextech Runic Astrolabe Rings & Core Pedestal */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
            {/* Outer Rotating Runic Astrolabe */}
            <svg
              viewBox="0 0 240 240"
              className="absolute inset-0 w-full h-full animate-buff-ring-rotate-slow"
            >
              <polygon
                points="120,6 199,39 234,120 199,201 120,234 41,201 6,120 41,39"
                fill="none"
                stroke={teamTheme.primaryHex}
                strokeWidth="2.6"
                strokeOpacity="0.9"
              />
              <circle
                cx="120"
                cy="120"
                r="104"
                fill="none"
                stroke={teamTheme.secondaryHex}
                strokeWidth="2"
                strokeDasharray="48 16 12 16"
                strokeLinecap="round"
              />
              {COMPASS_CARDINAL_ANGLES.map((angle) => (
                <polygon
                  key={angle}
                  points="120,2 126,14 120,22 114,14"
                  fill="#ffffff"
                  stroke={teamTheme.primaryHex}
                  strokeWidth="1.2"
                  transform={`rotate(${angle} 120 120)`}
                />
              ))}
            </svg>

            {/* Middle Reverse Rotating Hextech Gear Ring */}
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] animate-buff-ring-rotate-reverse"
            >
              <polygon
                points="100,10 178,55 178,145 100,190 22,145 22,55"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.8"
                strokeOpacity="0.75"
              />
              <polygon
                points="100,22 168,100 100,178 32,100"
                fill="none"
                stroke={teamTheme.primaryHex}
                strokeWidth="2.2"
                strokeOpacity="0.85"
              />
              <circle
                cx="100"
                cy="100"
                r="82"
                fill="none"
                stroke={teamTheme.secondaryHex}
                strokeWidth="1.4"
                strokeDasharray="16 12"
              />
            </svg>

            {/* Core Metallic Relic Bevel with Radiant Glow */}
            <div
              style={{
                boxShadow: `0 0 42px ${teamTheme.primaryHex}, inset 0 0 26px ${glowHex}`,
                borderColor: teamTheme.primaryHex,
              }}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 bg-slate-950/95 flex items-center justify-center backdrop-blur-xl z-10"
            >
              <div
                style={{
                  background: `radial-gradient(circle, #ffffff 15%, ${teamTheme.primaryHex} 60%, transparent 100%)`,
                }}
                className="absolute inset-1.5 rounded-full opacity-40 animate-pulse pointer-events-none"
              />
              <BossMythicCrest themeConfig={themeConfig} teamTheme={teamTheme} size="lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

BossDefeatedCrest2D.displayName = 'BossDefeatedCrest2D';
