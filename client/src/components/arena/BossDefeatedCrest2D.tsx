import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY, TeamType, BossThemeConfig } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamLogo } from '../icons/TeamLogos';
import { BossMythicCrest } from '../icons/BossMythicCrest';

interface BossDefeatedCrest2DProps {
  themeConfig: BossThemeConfig;
}

const COMPASS_CARDINAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export const BossDefeatedCrest2D: React.FC<BossDefeatedCrest2DProps> = React.memo(
  ({ themeConfig }) => {
    const { t } = useTranslation();
    const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
    const finisherTeam = useGameStore((state) => state.finisherTeam);
    const roundWinner = useGameStore((state) => state.roundWinner);
    const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);
    const activeTeams = useGameStore((state) => state.activeTeams);

    if (bossDefeatedTimestamp === 0) return null;

    const winnerTeam: TeamType = (finisherTeam || roundWinner || TEAM_KEY.BLG) as TeamType;
    const winnerProfile = activeTeams[winnerTeam];
    const teamTheme = getTeamTheme(winnerProfile?.colorTheme);
    const teamLabel = winnerProfile?.shortTag || winnerTeam;
    const glowHex = `${teamTheme.primaryHex}80`;

    const buffTitle = themeConfig.defeatBuffTitle
      ? themeConfig.defeatBuffTitle.replace('{{team}}', teamLabel)
      : t('Victory.genericBuffClaimed', 'BÙA LỢI {{boss}} THUỘC VỀ {{team}}', {
          boss: themeConfig.bossName,
          team: teamLabel,
        });

    return (
      <div
        key={bossDefeatedTimestamp}
        className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center select-none overflow-visible animate-in fade-in zoom-in-90 duration-700 delay-[850ms] fill-mode-both"
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

          {/* Broadcast Victory Buff Banner */}
          <div
            style={{
              borderColor: teamTheme.primaryHex,
              boxShadow: `0 0 35px ${teamTheme.primaryHex}45, inset 0 0 16px ${teamTheme.primaryHex}20`,
            }}
            className="mt-3 flex flex-col items-center px-4 sm:px-6 py-2.5 rounded-2xl border-2 bg-slate-950/95 backdrop-blur-xl max-w-[92vw] sm:max-w-md shadow-2xl space-y-1.5"
          >
            {/* Team Logo, Tag & Buff Title */}
            <div className="flex items-center space-x-2">
              <TeamLogo
                teamProfile={winnerProfile}
                className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 object-contain drop-shadow"
              />
              <span
                className={`text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${teamTheme.badgePillClass}`}
              >
                {teamLabel}
              </span>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-center">
                {buffTitle}
              </span>
            </div>

            {/* Finisher Viewer Shoutout */}
            {finisherPlayerName && (
              <div className="flex items-center space-x-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
                <span className="text-slate-400">{t('Victory.finisherLabel', 'Kết liễu bởi')}:</span>
                <span className={`font-black ${teamTheme.textStrongClass} truncate max-w-[200px]`}>
                  {finisherPlayerName}
                </span>
              </div>
            )}

            {/* Buff Perks Description */}
            <div className="flex items-center space-x-1 text-[8.5px] sm:text-[9.5px] font-semibold text-cyan-300/90 tracking-wide text-center pt-1 border-t border-slate-800/80 w-full justify-center">
              <span>{t('Victory.buffPerks', 'Toàn bộ tướng được cường hóa sức mạnh vô song!')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

BossDefeatedCrest2D.displayName = 'BossDefeatedCrest2D';
