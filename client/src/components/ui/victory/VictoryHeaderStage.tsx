import { useTranslation } from 'react-i18next';
import { Crown, Star, Trophy } from 'lucide-react';
import { GAME_THEME, TeamType } from '../../../constants/game';
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
  gameTheme: string;
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
  const winnerName = winnerProfile?.name || winnerSlot;
  const isElderDragon = gameTheme === GAME_THEME.ELDER_DRAGON;

  const bossDefeatedSubtitle = isElderDragon
    ? t('Victory.bossDefeatedElder', 'RỒNG NGÀN TUỔI ĐÃ BỊ TIÊU DIỆT!')
    : t('Victory.bossDefeated', 'BARON NASHOR ĐÃ BỊ TIÊU DIỆT!');

  const headlineAction = isSeriesEnded
    ? t('Victory.seriesChampionAction', 'VÔ ĐỊCH CKTG {{format}}!', { format: seriesFormat })
    : t('Victory.roundWinAction', 'CHIẾN THẮNG VÁN {{round}}!', { round: currentRound });

  return (
    <div className="space-y-2.5">
      {/* World Championship Header Tag */}
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-amber-950/90 border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.35)] whitespace-nowrap">
        <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-200">
          {t('Victory.worldsBadge', 'CKTG 2026 WORLDS CHAMPIONSHIP')}
        </span>
        <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
      </div>

      {/* Grand Champion Trophy & Team Crest Pedestal */}
      <div className="relative flex justify-center items-center pt-2">
        <div
          className={`absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full blur-xl opacity-50 animate-pulse ${winnerTheme.glowOrbClass}`}
        />

        <div className="relative p-3 sm:p-3.5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-400/80 shadow-[0_0_32px_rgba(245,158,11,0.5)] flex flex-col items-center">
          <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center space-x-1 shadow-lg whitespace-nowrap">
            <Crown className="w-3 h-3 fill-current shrink-0" />
            <span>{t('Victory.championTag', 'CHAMPION')}</span>
          </div>

          <div className="w-18 h-18 sm:w-22 sm:h-22 flex items-center justify-center p-1 transition-transform duration-300 hover:scale-105">
            <TeamLogo
              teamProfile={winnerProfile}
              teamSlot={winnerSlot}
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            />
          </div>

          <div className="absolute -bottom-3 p-1.5 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 border-2 border-slate-900 shadow-xl">
            <Trophy className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>
      </div>

      {/* Non-Wrapping Victory Headline */}
      <div className="space-y-1 pt-2 px-1">
        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap truncate">
          {isSeriesEnded
            ? t('Victory.seriesScore', 'TỈ SỐ CHUNG CUỘC {{format}}: {{blg}} - {{geng}}', {
                format: seriesFormat,
                blg: leftScore,
                geng: rightScore,
              })
            : bossDefeatedSubtitle}
        </div>

        <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap max-w-full text-[clamp(0.84rem,3.6vw,1.25rem)] font-black uppercase tracking-wide drop-shadow-[0_2px_10px_rgba(245,158,11,0.7)]">
          <span className="truncate min-w-0 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
            {winnerName}
          </span>
          <span className="shrink-0 whitespace-nowrap bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
            {headlineAction}
          </span>
        </h1>
      </div>
    </div>
  );
};
