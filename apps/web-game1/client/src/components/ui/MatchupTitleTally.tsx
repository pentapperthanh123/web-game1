import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { getMatchupTitleCount } from '../../store/championshipTally';

/**
 * Head-to-head series titles of the two teams on stage. Hidden until the matchup
 * has finished at least one series, so a fresh pairing shows no "0 - 0" clutter.
 */
export const MatchupTitleTally = () => {
  const { t } = useTranslation();
  const championshipTally = useGameStore((state) => state.championshipTally);
  const seriesFormat = useGameStore((state) => state.seriesFormat);
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);
  const { leftTitles, rightTitles } = getMatchupTitleCount(championshipTally, leftTeam, rightTeam);
  const hasAnyTitle = leftTitles + rightTitles > 0;
  if (!hasAnyTitle) return null;

  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  return (
    <div
      title={t('Game.titleTallyTooltip', {
        defaultValue: '{{left}} {{leftTitles}} - {{rightTitles}} {{right}} (số lần vô địch {{format}} khi đối đầu)',
        left: leftTeam.shortTag,
        right: rightTeam.shortTag,
        leftTitles,
        rightTitles,
        format: seriesFormat,
      })}
      className="mt-0.5 flex items-center space-x-1 px-1.5 py-px rounded-full bg-slate-950/85 border border-amber-500/40 text-[8px] sm:text-[9px] font-mono font-black leading-none"
    >
      <span className={leftTheme.textClass}>{leftTitles}</span>
      <Trophy className="w-2.5 h-2.5 text-amber-400" aria-label={t('Game.titleTallyLabel', 'Số lần vô địch')} />
      <span className={rightTheme.textClass}>{rightTitles}</span>
    </div>
  );
};
