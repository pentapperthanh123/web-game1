import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Skull, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_DEFEAT_CONSTANTS, GAME_THEME, TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';

const RADIAL_SHARD_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const;

const FRACTURE_PATHS = [
  'M120,120 L78,72 L45,58 M78,72 L64,102',
  'M120,120 L166,76 L198,48 M166,76 L184,104',
  'M120,120 L82,164 L48,192 M82,164 L106,188',
  'M120,120 L162,162 L196,190 M162,162 L138,194',
  'M120,120 L122,52 L110,20 M120,120 L124,186 L134,218',
  'M120,120 L48,122 L18,132 M120,120 L192,118 L222,108',
] as const;

interface ShardStyle extends CSSProperties {
  '--shard-angle': string;
}

export const BossDeathVFX2D = () => {
  const { t } = useTranslation();
  const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);
  const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const activeTeams = useGameStore((state) => state.activeTeams);

  if (bossDefeatedTimestamp === 0) return null;

  const isElder = gameTheme === GAME_THEME.ELDER_DRAGON;
  const primaryColor = isElder
    ? BOSS_DEFEAT_CONSTANTS.ELDER_DRAGON_DEFEAT_COLOR
    : BOSS_DEFEAT_CONSTANTS.BARON_DEFEAT_COLOR;
  const secondaryColor = isElder
    ? BOSS_DEFEAT_CONSTANTS.ELDER_SECONDARY_COLOR
    : BOSS_DEFEAT_CONSTANTS.BARON_SECONDARY_COLOR;

  const effectiveTeam = finisherTeam || roundWinner || TEAM_KEY.BLG;
  const finisherTheme = getTeamTheme(activeTeams[effectiveTeam]?.colorTheme);
  const finisherBadgeClass = `${finisherTheme.giftBannerGradientClass} ${finisherTheme.textMutedClass}`;
  const teamAccentColor = finisherTheme.primaryHex;

  return (
    <div
      key={bossDefeatedTimestamp}
      className="absolute inset-0 pointer-events-none z-20 overflow-visible"
    >
      {/* 1. Hit-Stop Crisp Impact Snap Ring (Beat 1: 0 - 420ms) */}
      <div
        style={{
          left: '50%',
          top: '48%',
          transform: 'translate(-50%, -50%)',
        }}
        className="absolute w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center"
      >
        <div
          style={{
            borderColor: '#ffffff',
            boxShadow: `0 0 40px #ffffff, inset 0 0 36px ${teamAccentColor}`,
          }}
          className="w-full h-full rounded-full border-4 animate-defeat-impact-snap"
        />
      </div>

      {/* 2. Glowing Fracture Fissure Web Over Boss Silhouette (Beat 1 -> 2) */}
      <div
        style={{ left: '50%', top: '48%' }}
        className="absolute w-64 h-64 sm:w-80 sm:h-80 animate-defeat-fracture"
      >
        <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
          {FRACTURE_PATHS.map((path, index) => (
            <path
              key={index}
              d={path}
              fill="none"
              stroke={index % 2 === 0 ? '#ffffff' : secondaryColor}
              strokeWidth={index % 2 === 0 ? '3' : '2.2'}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: `drop-shadow(0 0 8px ${primaryColor}) drop-shadow(0 0 14px #ffffff)`,
              }}
            />
          ))}
        </svg>
      </div>

      {/* 3. Radiating Supernova Explosion Core */}
      <div
        style={{
          left: '50%',
          top: '48%',
          background: `radial-gradient(circle, #ffffff 14%, ${teamAccentColor} 40%, ${primaryColor} 64%, transparent 78%)`,
          boxShadow: `0 0 80px ${primaryColor}`,
        }}
        className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full animate-defeat-core-flash"
      />

      {/* 4. Dual Cross-Shatter Execution Slashes */}
      <div
        style={{
          left: '50%',
          top: '48%',
          background: `linear-gradient(90deg, transparent, #ffffff, ${teamAccentColor}, #ffffff, transparent)`,
        }}
        className="absolute w-80 sm:w-[26rem] h-3.5 rounded-full rotate-45 animate-defeat-cross-beam"
      />
      <div
        style={{
          left: '50%',
          top: '48%',
          background: `linear-gradient(90deg, transparent, #ffffff, ${primaryColor}, #ffffff, transparent)`,
        }}
        className="absolute w-80 sm:w-[26rem] h-3.5 rounded-full -rotate-45 animate-defeat-cross-beam"
      />

      {/* 5. Outward Flying Energy Shard Streaks */}
      <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {RADIAL_SHARD_ANGLES.map((angle, index) => {
          const shardStyle: ShardStyle = {
            '--shard-angle': `${angle}deg`,
            background: `linear-gradient(to top, ${index % 2 === 0 ? teamAccentColor : primaryColor}, #ffffff)`,
            boxShadow: `0 0 14px ${primaryColor}, 0 0 24px #ffffff`,
          };
          return (
            <div
              key={angle}
              style={shardStyle}
              className="absolute -left-1 -top-4 w-2 h-8 rounded-full animate-defeat-shard"
            />
          );
        })}
      </div>

      {/* 6. Execution Finisher Callout Banner */}
      <div className="absolute left-1/2 top-[12%] animate-execution-banner w-max max-w-[90vw]">
        <div
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border-2 backdrop-blur-md ${finisherBadgeClass}`}
        >
          <Skull className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
            {t('Victory.slainBadge', 'ĐÃ BỊ HẠ GỤC!')}
          </span>
          {finisherPlayerName && (
            <span className="text-[10px] sm:text-xs font-bold flex items-center space-x-1 opacity-95 truncate max-w-[140px]">
              <Sparkles className="w-3 h-3 text-yellow-300 shrink-0" />
              <span className="truncate">{finisherPlayerName}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
