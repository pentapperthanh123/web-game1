import { useTranslation } from 'react-i18next';
import { Crown, Star, Trophy } from 'lucide-react';
import { GameThemeType, getThemeConfig, TEAM_KEY, TeamType } from '../../../constants/game';
import { useGameStore } from '../../../store/gameStore';
import { TeamColorPalette, TeamProfile } from '../../../types/team';
import { TeamLogo } from '../../icons/TeamLogos';

interface VictoryHeaderStageProps {
  winnerProfile: TeamProfile;
  winnerSlot: TeamType;
  winnerTheme: TeamColorPalette;
  isSeriesEnded: boolean;
  seriesFormat: string;
  leftScore: number;
  rightScore: number;
  currentRound: number;
  gameTheme: GameThemeType;
}

export const VictoryHeaderStage = ({
  winnerProfile,
  winnerSlot,
  winnerTheme,
  isSeriesEnded,
  seriesFormat,
  leftScore,
  rightScore,
  currentRound,
  gameTheme,
}: VictoryHeaderStageProps) => {
  const { t } = useTranslation();
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);
  const winnerName = winnerProfile?.name || winnerSlot;
  const themeConfig = getThemeConfig(gameTheme);

  const bossDefeatedSubtitle = t(
    'Victory.bossDefeatedDynamic',
    `${themeConfig.bossName.toUpperCase()} ĐÃ BỊ TIÊU DIỆT!`,
    { bossName: themeConfig.bossName.toUpperCase() }
  );

  const headlineAction = isSeriesEnded
    ? t('Victory.seriesChampionAction', 'VÔ ĐỊCH CKTG {{format}}!', { format: seriesFormat })
    : t('Victory.roundWinAction', 'CHIẾN THẮNG VÁN {{round}}!', { round: currentRound });

  return (
    <div className="space-y-1.5">
      {/* World Championship Header Tag */}
      <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-amber-950/90 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.35)] whitespace-nowrap">
        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-200">
          {t('Victory.worldsBadge', 'CKTG 2026 WORLDS CHAMPIONSHIP')}
        </span>
        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
      </div>

      {/* Grand Champion Trophy & Team Crest Pedestal */}
      <div className="relative flex justify-center items-center pt-1">
        <div
          className={`absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full blur-xl opacity-45 animate-pulse ${winnerTheme.glowOrbClass}`}
        />

        <div className="relative p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.45)] flex flex-col items-center">
          <div className="absolute -top-3 px-2.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center space-x-1 shadow-md whitespace-nowrap">
            <Crown className="w-2.5 h-2.5 fill-current shrink-0" />
            <span>{t('Victory.championTag', 'CHAMPION')}</span>
          </div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-1 transition-transform duration-300 hover:scale-105">
            <TeamLogo
              teamProfile={winnerProfile}
              teamSlot={winnerSlot}
              className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]"
            />
          </div>

          <div className="absolute -bottom-2.5 p-1 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 border-2 border-slate-900 shadow-lg">
            <Trophy className="w-3 h-3 fill-current" />
          </div>
        </div>
      </div>

      {/* Responsive Victory Headline without Truncation */}
      <div className="space-y-0.5 pt-1 px-1 text-center">
        <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {isSeriesEnded
            ? t('Victory.seriesScore', 'TỈ SỐ CHUNG CUỘC {{format}}: {{team1}} {{score1}} - {{score2}} {{team2}}', {
                format: seriesFormat,
                team1: leftTeam.shortTag,
                team2: rightTeam.shortTag,
                score1: leftScore,
                score2: rightScore,
                blg: `${leftTeam.shortTag} ${leftScore}`,
                geng: `${rightScore} ${rightTeam.shortTag}`,
              })
            : bossDefeatedSubtitle}
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-100 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]">
            {winnerName}
          </span>
          <h1 className="text-sm sm:text-base font-black uppercase tracking-wide bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.8)]">
            {headlineAction}
          </h1>
        </div>
      </div>
    </div>
  );
};
