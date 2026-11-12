import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Download, Edit3, Plus, RotateCcw, Search, Trash2, Upload, Users } from 'lucide-react';
import { getTeamTheme } from '../../../constants/teams';
import { TeamProfile } from '../../../types/team';
import { readFileAsText } from '../../../utils/teamMediaIO';
import { TeamLogo } from '../../icons/TeamLogos';

interface TeamCatalogGridProps {
  catalog: TeamProfile[];
  onCreateTeam: () => void;
  onEditTeam: (team: TeamProfile) => void;
  onDuplicateTeam: (team: TeamProfile) => void;
  onRestorePreset: (team: TeamProfile) => void;
  onDeleteTeam: (team: TeamProfile) => void;
  onExportPack: () => void;
  onImportPackText: (jsonText: string) => void;
}

export const TeamCatalogGrid: React.FC<TeamCatalogGridProps> = ({
  catalog,
  onCreateTeam,
  onEditTeam,
  onDuplicateTeam,
  onRestorePreset,
  onDeleteTeam,
  onExportPack,
  onImportPackText,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((team) => {
      const hasTeamMatch =
        team.name.toLowerCase().includes(q) || team.shortTag.toLowerCase().includes(q);
      const hasRosterMatch = team.roster.some((p) => p.name.toLowerCase().includes(q));
      return hasTeamMatch || hasRosterMatch;
    });
  }, [catalog, searchQuery]);

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const content = await readFileAsText(file);
      onImportPackText(content);
    } catch {
      onImportPackText('');
    }
  };

  return (
    <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-[11px] font-bold text-slate-200 flex items-center space-x-1.5">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {t('AdminTeams.catalogTitle', 'Kho Đội Tuyển ({{count}} đội):', {
              count: catalog.length,
            })}
          </span>
        </span>
        <div className="flex items-center space-x-1">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={onExportPack}
            className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:text-cyan-300 font-bold text-[10px] flex items-center space-x-1 transition"
            title={t('AdminTeams.exportPackTitle', 'Xuất file JSON gói đội')}
          >
            <Download className="w-3 h-3" />
            <span>{t('AdminTeams.exportBtn', 'Xuất')}</span>
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:text-amber-300 font-bold text-[10px] flex items-center space-x-1 transition"
            title={t('AdminTeams.importPackTitle', 'Nhập file JSON gói đội')}
          >
            <Upload className="w-3 h-3" />
            <span>{t('AdminTeams.importBtn', 'Nhập')}</span>
          </button>
          <button
            type="button"
            onClick={onCreateTeam}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-[10px] flex items-center space-x-1 active:scale-95 transition"
          >
            <Plus className="w-3 h-3" />
            <span>{t('AdminTeams.createTeamBtn', 'Tạo Đội Mới')}</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('AdminTeams.catalogSearchPlaceholder', 'Tìm đội hoặc tên tuyển thủ...')}
          className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-white focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
        {filteredCatalog.map((item) => {
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
              <div className="flex items-center space-x-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditTeam(item)}
                  className="p-1 rounded bg-slate-900 text-slate-400 hover:text-amber-300"
                  title={t('AdminTeams.editTeamBtn', 'Sửa')}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateTeam(item)}
                  className="p-1 rounded bg-slate-900 text-slate-400 hover:text-cyan-300"
                  title={t('AdminTeams.duplicateTeamBtn', 'Nhân bản đội')}
                >
                  <Copy className="w-3 h-3" />
                </button>
                {item.isPreset && (
                  <button
                    type="button"
                    onClick={() => onRestorePreset(item)}
                    className="p-1 rounded bg-slate-900 text-slate-400 hover:text-emerald-300"
                    title={t('AdminTeams.restorePresetBtn', 'Khôi phục Preset gốc')}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
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
