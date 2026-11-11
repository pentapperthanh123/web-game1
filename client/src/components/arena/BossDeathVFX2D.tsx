import { useTranslation } from 'react-i18next';
import { Skull, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_DEFEAT_CONSTANTS, GAME_THEME, TEAM_KEY } from '../../constants/game';

export const BossDeathVFX2D = () => {
  const { t } = useTranslation();
  const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);
  const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const gameTheme = useGameStore((state) => state.gameTheme);

  if (bossDefeatedTimestamp === 0) return null;

  const isElder = gameTheme === GAME_THEME.ELDER_DRAGON;
  const primaryColor = isElder
    ? BOSS_DEFEAT_CONSTANTS.ELDER_DRAGON_DEFEAT_COLOR
    : BOSS_DEFEAT_CONSTANTS.BARON_DEFEAT_COLOR;
  const isBLGFinisher = finisherTeam === TEAM_KEY.BLG;
  const finisherBadgeClass = isBLGFinisher
    ? 'border-cyan-400 bg-cyan-950/95 text-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.85)]'
    : 'border-amber-400 bg-amber-950/95 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.85)]';

  return (
    <div
      key={bossDefeatedTimestamp}
      className="absolute inset-0 pointer-events-none z-20 overflow-visible"
    >
      {/* 1. Radiating Supernova Explosion Core */}
      <div
        style={{
          left: '50%',
          top: '48%',
          background: `radial-gradient(circle, #ffffff 10%, ${primaryColor} 48%, transparent 74%)`,
          boxShadow: `0 0 70px ${primaryColor}`,
        }}
        className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full animate-defeat-core-flash"
      />

      {/* 2. Dual Cross-Shatter Execution Light Beams */}
      <div
        style={{
          left: '50%',
          top: '48%',
          background: `linear-gradient(90deg, transparent, #ffffff, ${primaryColor}, #ffffff, transparent)`,
        }}
        className="absolute w-72 sm:w-96 h-3 rounded-full rotate-45 animate-defeat-cross-beam"
      />
      <div
        style={{
          left: '50%',
          top: '48%',
          background: `linear-gradient(90deg, transparent, #ffffff, ${primaryColor}, #ffffff, transparent)`,
        }}
        className="absolute w-72 sm:w-96 h-3 rounded-full -rotate-45 animate-defeat-cross-beam"
      />

      {/* 3. Execution Finisher Callout Banner */}
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
