import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit3 } from 'lucide-react';
import { TeamType } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { TeamProfile } from '../../../types/team';
import { TeamLogo } from '../../icons/TeamLogos';

interface TeamSlotSelectorCardProps {
  slot: TeamType;
  label: string;
  team: TeamProfile;
  catalog: TeamProfile[];
  onAssignSlot: (slot: TeamType, teamId: string) => void;
  onEditTeam: (team: TeamProfile, slot: TeamType) => void;
}

export const TeamSlotSelectorCard: React.FC<TeamSlotSelectorCardProps> = ({
  slot,
  label,
  team,
  catalog,
  onAssignSlot,
  onEditTeam,
}) => {
  const { t } = useTranslation();
  const theme = getTeamTheme(team.colorTheme);

  return (
    <div className={`p-2.5 rounded-xl border bg-slate-950/85 space-y-2 ${theme.borderSoftClass}`}>
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center space-x-2 min-w-0">
          <TeamLogo teamProfile={team} className="w-7 h-7 shrink-0" />
          <div className="min-w-0">
            <div className="text-[9px] text-slate-400 uppercase font-bold">{label}</div>
            <div className={`text-xs font-black truncate ${theme.textClass}`}>
              {team.name} ({team.shortTag})
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEditTeam(team, slot)}
          className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 hover:bg-slate-700 text-[10px] font-bold flex items-center space-x-1 shrink-0 transition active:scale-95"
        >
          <Edit3 className="w-3 h-3" />
          <span>{t('AdminTeams.editTeamBtn', 'Sửa')}</span>
        </button>
      </div>

      <select
        value={team.id}
        onChange={(e) => onAssignSlot(slot, e.target.value)}
        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-cyan-400"
      >
        {catalog.map((item) => (
          <option key={item.id} value={item.id}>
            {item.shortTag} — {item.name} {!item.isPreset ? '★' : ''}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-1">
        {team.roster.map((p) => (
          <span
            key={p.id}
            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
            title={`${p.role}: ${p.name} (${p.signatureChampion})`}
          >
            <strong className={theme.textStrongClass}>{p.name}</strong> · {p.signatureChampion}
          </span>
        ))}
      </div>
    </div>
  );
};
