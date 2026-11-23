import React, { useMemo, useRef, useState } from 'react';
import { Copy, Download, Edit3, RotateCcw, Search, Trash2, Upload, Users } from 'lucide-react';
import { TeamProfile, getTeamTheme } from '../constants/teams';
import { readFileAsText } from '../utils/teamMediaIO';
import { TeamLogo } from './TeamLogos';

interface AdminTeamCatalogSectionProps {
  catalog: TeamProfile[];
  onEditTeam: (team: TeamProfile) => void;
  onDuplicateTeam: (team: TeamProfile) => void;
  onRestorePreset: (team: TeamProfile) => void;
  onDeleteTeam: (team: TeamProfile) => void;
  onExportPack: () => void;
  onImportPackText: (jsonText: string) => void;
}

export const AdminTeamCatalogSection: React.FC<AdminTeamCatalogSectionProps> = ({
  catalog,
  onEditTeam,
  onDuplicateTeam,
  onRestorePreset,
  onDeleteTeam,
  onExportPack,
  onImportPackText,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((team) => {
      const hasTeam = team.name.toLowerCase().includes(q) || team.shortTag.toLowerCase().includes(q);
      const hasPlayer = team.roster.some((p) => p.name.toLowerCase().includes(q));
      return hasTeam || hasPlayer;
    });
  }, [catalog, searchQuery]);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const jsonText = await readFileAsText(file);
      onImportPackText(jsonText);
    } catch {
      onImportPackText('');
    }
  };

  return (
    <div className="p-3 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-xs font-black text-slate-200">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Kho Đội Tuyển ({catalog.length} đội):</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm đội / game thủ..."
              className="pl-8 pr-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <input ref={importInputRef} type="file" accept=".json,application/json" onChange={handleImportFile} className="hidden" />
          <button
            type="button"
            onClick={onExportPack}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất JSON</span>
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold flex items-center space-x-1"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập JSON</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
        {filtered.map((item) => {
          const theme = getTeamTheme(item.colorTheme);
          return (
            <div key={item.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <TeamLogo teamProfile={item} className="w-6 h-6 shrink-0" />
                <div className="min-w-0 leading-tight">
                  <div className={`text-xs font-black truncate ${theme.textClass}`}>{item.shortTag}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.name}</div>
                </div>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button type="button" onClick={() => onEditTeam(item)} className="p-1 rounded bg-slate-950 text-slate-400 hover:text-amber-300" title="Sửa">
                  <Edit3 className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => onDuplicateTeam(item)} className="p-1 rounded bg-slate-950 text-slate-400 hover:text-cyan-300" title="Nhân bản">
                  <Copy className="w-3 h-3" />
                </button>
                {item.isPreset ? (
                  <button type="button" onClick={() => onRestorePreset(item)} className="p-1 rounded bg-slate-950 text-slate-400 hover:text-emerald-300" title="Khôi phục Preset gốc">
                    <RotateCcw className="w-3 h-3" />
                  </button>
                ) : (
                  <button type="button" onClick={() => onDeleteTeam(item)} className="p-1 rounded bg-slate-950 text-slate-400 hover:text-rose-400" title="Xóa đội tùy chỉnh">
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
