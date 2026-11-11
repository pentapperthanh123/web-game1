import React from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY, TeamType } from '../../constants/game';

interface BossDefeatedCrest2DProps {
  isElderDragon: boolean;
}

interface TeamThemeConfig {
  primary: string;
  secondary: string;
  border: string;
  badgeBg: string;
  shadow: string;
  textColor: string;
  glowColor: string;
  teamLabel: string;
}

const COMPASS_CARDINAL_ANGLES = [0, 90, 180, 270] as const;

const TEAM_THEME_CONFIG: Record<TeamType, TeamThemeConfig> = {
  [TEAM_KEY.BLG]: {
    primary: '#00f2fe',
    secondary: '#38bdf8',
    border: 'border-cyan-400/90',
    badgeBg: 'from-cyan-950/95 via-slate-950/95 to-sky-950/95',
    shadow: 'shadow-[0_0_45px_rgba(6,182,212,0.85)]',
    textColor: 'text-cyan-200',
    glowColor: 'rgba(6, 182, 212, 0.5)',
    teamLabel: 'BLG',
  },
  [TEAM_KEY.GENG]: {
    primary: '#fbbf24',
    secondary: '#f59e0b',
    border: 'border-amber-400/90',
    badgeBg: 'from-amber-950/95 via-slate-950/95 to-yellow-950/95',
    shadow: 'shadow-[0_0_45px_rgba(245,158,11,0.85)]',
    textColor: 'text-amber-200',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    teamLabel: 'GEN.G',
  },
};

const BaronCrestEmblem: React.FC<{ primary: string }> = ({ primary }) => (
  <svg viewBox="0 0 64 64" className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_12px_rgba(255,255,255,0.85)]">
    <polygon
      points="12,44 8,22 22,30 32,12 42,30 56,22 52,44"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <polygon
      points="16,42 13,26 23,33 32,17 41,33 51,26 48,42"
      fill={primary}
      fillOpacity="0.28"
    />
    <ellipse cx="32" cy="36" rx="10" ry="5.5" fill="#0f172a" stroke={primary} strokeWidth="2" />
    <circle cx="32" cy="36" r="3" fill="#ffffff" />
    <path d="M16,49 L48,49" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const ElderCrestEmblem: React.FC<{ primary: string }> = ({ primary }) => (
  <svg viewBox="0 0 64 64" className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_12px_rgba(255,255,255,0.85)]">
    <path
      d="M32,10 L42,26 L56,18 L48,40 L32,54 L16,40 L8,18 L22,26 Z"
      fill={primary}
      fillOpacity="0.25"
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <polygon
      points="32,18 39,34 32,46 25,34"
      fill="#ffffff"
      stroke={primary}
      strokeWidth="1.8"
    />
    <path d="M18,29 L26,34 M46,29 L38,34" stroke={primary} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const BossDefeatedCrest2D: React.FC<BossDefeatedCrest2DProps> = React.memo(
  ({ isElderDragon }) => {
    const { t } = useTranslation();
    const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
    const finisherTeam = useGameStore((state) => state.finisherTeam);
    const roundWinner = useGameStore((state) => state.roundWinner);
    const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);

    if (bossDefeatedTimestamp === 0) return null;

    const winnerTeam: TeamType = (finisherTeam || roundWinner || TEAM_KEY.BLG) as TeamType;
    const themeColors = TEAM_THEME_CONFIG[winnerTeam];

    const buffTitle = isElderDragon
      ? t('Victory.elderBuffClaimed', 'BÙA LỢI RỒNG NGÀN TUỔI THUỘC VỀ {{team}}', {
          team: themeColors.teamLabel,
        })
      : t('Victory.baronBuffClaimed', 'BÙA LỢI BARON THUỘC VỀ {{team}}', {
          team: themeColors.teamLabel,
        });

    return (
      <div
        key={bossDefeatedTimestamp}
        className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center select-none overflow-visible animate-in fade-in zoom-in-90 duration-700 delay-[850ms] fill-mode-both"
      >
        {/* 1. Celestial Ascension God Rays */}
        <div
          style={{
            background: `linear-gradient(to top, ${themeColors.glowColor}, rgba(255,255,255,0.18), transparent)`,
          }}
          className="absolute bottom-[18%] w-48 sm:w-64 h-80 rounded-t-full blur-2xl animate-buff-soul-beams"
        />

        {/* 2. Floating Relic Stack (Rings + Emblem + Plate) */}
        <div className="relative flex flex-col items-center animate-buff-crest-float">
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
            {/* Outer Hextech Beveled Runic Ring */}
            <svg
              viewBox="0 0 240 240"
              className="absolute inset-0 w-full h-full animate-buff-ring-rotate-slow"
            >
              <polygon
                points="120,8 199,41 232,120 199,199 120,232 41,199 8,120 41,41"
                fill="none"
                stroke={themeColors.primary}
                strokeWidth="2.4"
                strokeOpacity="0.85"
              />
              <circle
                cx="120"
                cy="120"
                r="98"
                fill="none"
                stroke={themeColors.secondary}
                strokeWidth="2"
                strokeDasharray="44 18 14 18"
                strokeLinecap="round"
              />
              {COMPASS_CARDINAL_ANGLES.map((angle) => (
                <polygon
                  key={angle}
                  points="120,2 126,14 120,22 114,14"
                  fill="#ffffff"
                  stroke={themeColors.primary}
                  strokeWidth="1.2"
                  transform={`rotate(${angle} 120 120)`}
                />
              ))}
            </svg>

            {/* Counter-Rotating Inner Geometric Sigil */}
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] animate-buff-ring-rotate-reverse"
            >
              <polygon
                points="100,10 178,55 178,145 100,190 22,145 22,55"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.6"
                strokeOpacity="0.65"
              />
              <polygon
                points="100,24 166,100 100,176 34,100"
                fill="none"
                stroke={themeColors.primary}
                strokeWidth="2"
                strokeOpacity="0.8"
              />
            </svg>

            {/* Core Crystal Relic Medallion */}
            <div
              style={{
                boxShadow: `0 0 32px ${themeColors.primary}, inset 0 0 24px ${themeColors.glowColor}`,
              }}
              className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 ${themeColors.border} bg-slate-950/95 flex items-center justify-center backdrop-blur-md`}
            >
              <div
                style={{
                  background: `radial-gradient(circle, #ffffff 10%, ${themeColors.primary} 55%, transparent 100%)`,
                }}
                className="absolute inset-1.5 rounded-full opacity-35 animate-pulse"
              />
              {isElderDragon ? (
                <ElderCrestEmblem primary={themeColors.primary} />
              ) : (
                <BaronCrestEmblem primary={themeColors.primary} />
              )}
            </div>
          </div>

          {/* Buff Claimed Announcement Plate */}
          <div
            className={`mt-2 flex flex-col items-center px-4 py-2 rounded-2xl border-2 bg-gradient-to-r backdrop-blur-md ${themeColors.border} ${themeColors.badgeBg} ${themeColors.shadow} max-w-[90vw]`}
          >
            <div className="flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-yellow-300 shrink-0" />
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-center">
                {buffTitle}
              </span>
            </div>

            {finisherPlayerName && (
              <div className="flex items-center space-x-1 mt-1 text-[9px] sm:text-[10px] font-bold text-slate-300">
                <Zap className="w-3 h-3 text-amber-300 shrink-0" />
                <span>{t('Victory.finisherLabel', 'Kết liễu bởi')}:</span>
                <span className={`font-black ${themeColors.textColor} truncate max-w-[150px]`}>
                  {finisherPlayerName}
                </span>
              </div>
            )}

            <div className="flex items-center space-x-1 mt-0.5 text-[8px] sm:text-[9px] font-semibold text-cyan-300/90 tracking-wide">
              <span>{t('Victory.buffPerks', 'Toàn bộ tướng được cường hóa sức mạnh vô song!')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

BossDefeatedCrest2D.displayName = 'BossDefeatedCrest2D';
