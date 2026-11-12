import { useTranslation } from 'react-i18next';
import { Skull, Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { GAME_THEME, TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamLogo } from '../icons/TeamLogos';

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
      {/* Grand LoL Esports Broadcast Slain Banner (Visual explosion handled via BossDeathVFX3D) */}
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
