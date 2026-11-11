import React from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Sparkles, Award, Zap, Shield } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY, TeamType } from '../../constants/game';

interface BossDefeatedCrest2DProps {
  isElderDragon: boolean;
}

export const BossDefeatedCrest2D: React.FC<BossDefeatedCrest2DProps> = React.memo(
  ({ isElderDragon }) => {
    const { t } = useTranslation();
    const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
    const finisherTeam = useGameStore((state) => state.finisherTeam);
    const roundWinner = useGameStore((state) => state.roundWinner);
    const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);

    if (bossDefeatedTimestamp === 0) return null;

    const winnerTeam: TeamType = (finisherTeam || roundWinner || TEAM_KEY.BLG) as TeamType;
    const isBLG = winnerTeam === TEAM_KEY.BLG;

    const themeColors = isBLG
      ? {
          primary: '#00f2fe',
          secondary: '#38bdf8',
          accent: '#0284c7',
          border: 'border-cyan-400',
          badgeBg: 'from-cyan-950/95 via-slate-950/95 to-sky-950/95',
          shadow: 'shadow-[0_0_40px_rgba(6,182,212,0.85)]',
          textColor: 'text-cyan-200',
          glowColor: 'rgba(6, 182, 212, 0.45)',
          teamLabel: 'BLG',
        }
      : {
          primary: '#fbbf24',
          secondary: '#f59e0b',
          accent: '#d97706',
          border: 'border-amber-400',
          badgeBg: 'from-amber-950/95 via-slate-950/95 to-yellow-950/95',
          shadow: 'shadow-[0_0_40px_rgba(245,158,11,0.85)]',
          textColor: 'text-amber-200',
          glowColor: 'rgba(245, 158, 11, 0.45)',
          teamLabel: 'GEN.G',
        };

    const buffTitle = isElderDragon
      ? t('Victory.elderBuffClaimed', 'BÙA LỢI RỒNG NGÀN TUỔI THUỘC VỀ {{team}}', {
          team: themeColors.teamLabel,
        })
      : t('Victory.baronBuffClaimed', 'BÙA LỢI BARON THUỘC VỀ {{team}}', {
          team: themeColors.teamLabel,
        });

    return (
      <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center select-none overflow-visible animate-in fade-in zoom-in-95 duration-1000 delay-500">
        {/* 1. Celestial Ascension God Rays Shining to the Sky */}
        <div
          style={{
            background: `linear-gradient(to top, ${themeColors.glowColor}, rgba(255,255,255,0.15), transparent)`,
          }}
          className="absolute bottom-[20%] w-48 sm:w-64 h-80 rounded-t-full blur-xl animate-buff-soul-beams"
        />

        {/* 2. Rotating Ancient Celestial Runic Glyphs Ring */}
        <div className="absolute w-64 h-64 sm:w-80 sm:h-80 animate-buff-ring-rotate-slow opacity-80 pointer-events-none">
          <svg viewBox="0 0 240 240" className="w-full h-full">
            <circle
              cx="120"
              cy="120"
              r="108"
              fill="none"
              stroke={themeColors.primary}
              strokeWidth="2"
              strokeDasharray="18 10 32 14 8 16"
              className="drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]"
            />
            <circle
              cx="120"
              cy="120"
              r="94"
              fill="none"
              stroke={themeColors.secondary}
              strokeWidth="1.2"
              strokeDasharray="6 8 20 12"
              className="opacity-70"
            />
          </svg>
        </div>

        {/* 3. Counter-Rotating Inner Glyphs Ring */}
        <div className="absolute w-48 h-48 sm:w-60 sm:h-60 animate-buff-ring-rotate-reverse opacity-75 pointer-events-none">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <polygon
              points="100,15 180,155 20,155"
              fill="none"
              stroke={themeColors.secondary}
              strokeWidth="1.5"
              strokeDasharray="12 8"
              className="opacity-50"
            />
            <polygon
              points="100,185 20,45 180,45"
              fill="none"
              stroke={themeColors.primary}
              strokeWidth="1.5"
              strokeDasharray="12 8"
              className="opacity-50"
            />
          </svg>
        </div>

        {/* 4. Core Floating Buff Relic Vessel */}
        <div className="relative flex flex-col items-center animate-buff-crest-float">
          {/* Central Glowing Relic Orb */}
          <div
            style={{
              boxShadow: `0 0 35px ${themeColors.primary}, 0 0 70px ${themeColors.secondary}`,
            }}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 ${themeColors.border} bg-slate-950/90 flex items-center justify-center backdrop-blur-md relative`}
          >
            {/* Pulsing Core Emblem */}
            <div
              style={{
                background: `radial-gradient(circle, #ffffff 15%, ${themeColors.primary} 60%, transparent 100%)`,
              }}
              className="absolute inset-2 rounded-full opacity-35 animate-pulse"
            />

            {/* Emblem Icon */}
            {isElderDragon ? (
              <Shield
                style={{ color: themeColors.primary }}
                className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse"
              />
            ) : (
              <Crown
                style={{ color: themeColors.primary }}
                className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse"
              />
            )}

            {/* Orbiting Sparkle Star */}
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-spin-slow" />
            </div>
          </div>

          {/* Buff Claimed Announcement Plate */}
          <div
            className={`mt-3 flex flex-col items-center px-4 py-2 rounded-2xl border-2 bg-gradient-to-r backdrop-blur-md ${themeColors.border} ${themeColors.badgeBg} ${themeColors.shadow} max-w-[90vw]`}
          >
            {/* Header Badge */}
            <div className="flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-yellow-300 shrink-0" />
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-center">
                {buffTitle}
              </span>
            </div>

            {/* Finisher Attribution */}
            {finisherPlayerName && (
              <div className="flex items-center space-x-1 mt-1 text-[9px] sm:text-[10px] font-bold text-slate-300">
                <Zap className="w-3 h-3 text-amber-300 shrink-0" />
                <span>{t('Victory.finisherLabel', 'Kết liễu bởi')}:</span>
                <span className={`font-black ${themeColors.textColor} truncate max-w-[150px]`}>
                  {finisherPlayerName}
                </span>
              </div>
            )}

            {/* Buff Effect Notice */}
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
