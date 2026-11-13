import { useTranslation } from 'react-i18next';
import { Swords } from 'lucide-react';
import { TeamType } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { TeamColorPalette, TeamProfile } from '../../../types/team';

interface VictoryDamageSummaryCardProps {
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  leftTheme: TeamColorPalette;
  rightTheme: TeamColorPalette;
  leftDamage: number;
  rightDamage: number;
  finisherPlayerName: string | null;
  finisherTeam: TeamType | null;
  activeTeams: Record<TeamType, TeamProfile>;
}

const DEFAULT_SPLIT_PERCENT = 50;

export const VictoryDamageSummaryCard = ({
  leftTeam,
  rightTeam,
  leftTheme,
  rightTheme,
  leftDamage,
  rightDamage,
  finisherPlayerName,
  finisherTeam,
  activeTeams,
}: VictoryDamageSummaryCardProps) => {
  const { t } = useTranslation();

  const totalDamage = leftDamage + rightDamage;
  const leftPercent =
    totalDamage > 0 ? Math.round((leftDamage / totalDamage) * 100) : DEFAULT_SPLIT_PERCENT;
  const rightPercent = 100 - leftPercent;

  const finisherTeamProfile = finisherTeam ? activeTeams[finisherTeam] : undefined;
  const finisherTheme = finisherTeamProfile ? getTeamTheme(finisherTeamProfile.colorTheme) : null;

  return (
    <div className="space-y-2">
      {finisherPlayerName && (
        <div className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/75 border border-rose-500/45 text-[11px] shadow-md whitespace-nowrap">
          <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="text-rose-200/90 font-semibold shrink-0">
            {t('Victory.finisherLabel', 'Kết liễu bởi')}:
          </span>
          <span className="font-black text-white truncate min-w-0">
            {finisherPlayerName}
          </span>
          {finisherTeam && finisherTheme && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${finisherTheme.badgePillClass}`}>
              {finisherTeamProfile?.shortTag || finisherTeam}
            </span>
          )}
        </div>
      )}

      <div className="p-2.5 rounded-xl bg-slate-900/75 border border-slate-800/90 shadow-lg space-y-1.5">
        <div className="flex items-center justify-between gap-1 text-[10px] font-mono whitespace-nowrap overflow-hidden">
          <span className={`font-black truncate ${leftTheme.textStrongClass}`}>
            {leftTeam.shortTag}: {leftPercent}% &bull; {leftDamage.toLocaleString()}
          </span>
          <span className={`font-black truncate text-right ${rightTheme.textStrongClass}`}>
            {rightDamage.toLocaleString()} &bull; {rightPercent}% {rightTeam.shortTag}
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
          <div
            style={{ width: `${leftPercent}%`, backgroundColor: leftTheme.primaryHex }}
            className="h-full transition-all duration-500"
          />
          <div
            style={{ width: `${rightPercent}%`, backgroundColor: rightTheme.primaryHex }}
            className="h-full transition-all duration-500"
          />
        </div>
      </div>
    </div>
  );
};
