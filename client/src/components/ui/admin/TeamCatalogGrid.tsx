import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit3, Plus, Trash2, Users } from 'lucide-react';
import { getTeamTheme } from '../../../constants/teams';
import { TeamProfile } from '../../../types/team';
import { TeamLogo } from '../../icons/TeamLogos';

interface TeamCatalogGridProps {
  catalog: TeamProfile[];
  onCreateTeam: () => void;
  onEditTeam: (team: TeamProfile) => void;
  onDeleteTeam: (team: TeamProfile) => void;
}

export const TeamCatalogGrid: React.FC<TeamCatalogGridProps> = ({
  catalog,
  onCreateTeam,
  onEditTeam,
  onDeleteTeam,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-200 flex items-center space-x-1.5">
          <Users className="w-3.5 h-3.5 text-violet-400" />
          <span>
            {t('AdminTeams.catalogTitle', 'Kho Đội Tuyển ({{count}} đội):', {
              count: catalog.length,
            })}
          </span>
        </span>
        <button
          type="button"
          onClick={onCreateTeam}
          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-black text-[10px] flex items-center space-x-1 active:scale-95 transition"
        >
          <Plus className="w-3 h-3" />
          <span>{t('AdminTeams.createTeamBtn', 'Tạo Đội Mới')}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
        {catalog.map((item) => {
          const theme = getTeamTheme(item.colorTheme);
          return (
            <div
              key={item.id}
              className="p-1.5 rounded-lg bg-slate-950/85 border border-slate-800 flex items-center justify-between gap-1.5"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <TeamLogo teamProfile={item} className="w-5 h-5 shrink-0" />
                <div className="min-w-0 leading-tight">
                  <div className={`text-[10px] font-black truncate ${theme.textClass}`}>
                    {item.shortTag}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">{item.name}</div>
                </div>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditTeam(item)}
                  className="p-1 rounded bg-slate-900 text-slate-400 hover:text-amber-300"
                  title={t('AdminTeams.editTeamBtn', 'Sửa')}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                {!item.isPreset && (
                  <button
                    type="button"
                    onClick={() => onDeleteTeam(item)}
                    className="p-1 rounded bg-slate-900 text-slate-400 hover:text-rose-400"
                    title={t('AdminTeams.deleteTeamBtn', 'Xóa đội tùy chỉnh')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
