import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Skull, Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_DEFEAT_CONSTANTS, GAME_THEME, TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamLogo } from '../icons/TeamLogos';

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
  const winningTeamProfile = activeTeams[effectiveTeam];
  const finisherTheme = getTeamTheme(winningTeamProfile?.colorTheme);
  const teamAccentColor = finisherTheme.primaryHex;
  const teamTag = winningTeamProfile?.shortTag || effectiveTeam;
  const bossNameShort = isElder
    ? t('Victory.elderShort', 'RỒNG NGÀN TUỔI')
    : t('Victory.baronShort', 'BARON NASHOR');

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

      {/* 6. Grand LoL Esports Broadcast Slain Banner */}
      <div className="absolute left-1/2 top-[18%] sm:top-[22%] -translate-x-1/2 animate-execution-banner w-max max-w-[94vw] z-30 pointer-events-none flex flex-col items-center select-none">
        <div
          style={{
            boxShadow: `0 0 35px ${teamAccentColor}, 0 0 70px rgba(0,0,0,0.95)`,
            borderColor: teamAccentColor,
          }}
          className="relative flex items-center gap-2.5 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-2xl border-2 backdrop-blur-xl bg-slate-950/92 overflow-hidden"
        >
          {/* Subtle animated slash light beam across the banner */}
          <div
            style={{
              background: `linear-gradient(90deg, transparent, ${teamAccentColor}60, transparent)`,
            }}
            className="absolute inset-0 animate-defeat-slash-sweep pointer-events-none"
          />

          {/* Team Logo Badge */}
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 rounded-xl bg-slate-900/90 border border-white/30 shadow-md">
            <TeamLogo teamSlot={effectiveTeam} className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
          </div>

          <div className="flex flex-col items-start leading-tight min-w-0">
            <div className="flex items-center gap-1.5">
              <Skull className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
              <h2
                style={{ textShadow: `0 0 14px ${teamAccentColor}` }}
                className="text-xs sm:text-base font-black uppercase tracking-wider text-white truncate"
              >
                {teamTag} {t('Victory.slainBadge', 'ĐÃ HẠ GỤC')} {bossNameShort}!
              </h2>
            </div>

            {finisherPlayerName && (
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-xs font-bold text-amber-300">
                <Swords className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-slate-300 font-semibold">{t('Victory.finisherBlow', 'Đòn Kết Liễu')}:</span>
                <span className="text-amber-200 font-black px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/40 truncate max-w-[150px] sm:max-w-[200px]">
                  {finisherPlayerName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
