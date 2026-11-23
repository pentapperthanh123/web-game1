import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import {
  TeamProfile,
  TeamSlotKey,
  getTeamTheme,
} from '../constants/teams';
import { TeamLogo } from './TeamLogos';

interface AdminTeamSlotCardProps {
  slot: TeamSlotKey;
  title: string;
  team: TeamProfile;
  catalog: TeamProfile[];
  onAssignSlot: (slot: TeamSlotKey, teamId: string) => void;
  onEditSlot: (slot: TeamSlotKey, team: TeamProfile) => void;
  onDeleteCustom: (team: TeamProfile) => void;
}

export const AdminTeamSlotCard: React.FC<AdminTeamSlotCardProps> = ({
  slot,
  title,
  team,
  catalog,
  onAssignSlot,
  onEditSlot,
  onDeleteCustom,
}) => {
  const theme = getTeamTheme(team.colorTheme);

  return (
    <div className={`p-3 rounded-xl bg-slate-950/85 border space-y-2.5 ${theme.borderSoftClass}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <TeamLogo teamProfile={team} className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">{title}</div>
            <div className={`text-sm font-black truncate ${theme.textClass}`}>
              {team.name} ({team.shortTag})
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEditSlot(slot, team)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold flex items-center space-x-1 shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Sửa Đội &amp; Game Thủ</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={team.id}
          onChange={(e) => onAssignSlot(slot, e.target.value)}
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-white"
        >
          {catalog.map((catalogTeam) => (
            <option key={catalogTeam.id} value={catalogTeam.id}>
              {catalogTeam.shortTag} — {catalogTeam.name} {!catalogTeam.isPreset ? '★ Custom' : ''}
            </option>
          ))}
        </select>
        {!team.isPreset && (
          <button
            type="button"
            onClick={() => onDeleteCustom(team)}
            className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900"
            title="Xóa đội tùy chỉnh"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="text-[10px] text-slate-400">
        Từ khóa TikTok Chat:{' '}
        <span className="text-cyan-300 font-mono font-bold">
          {team.aliases.join(', ')}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {team.roster.map((player) => (
          <div
            key={player.id}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center space-y-0.5"
          >
            <img
              src={player.avatarUrl}
              alt={player.name}
              className="w-6 h-6 rounded-full mx-auto object-cover border border-slate-700"
            />
            <div className="text-[9px] font-black text-white truncate">{player.name}</div>
            <div className="text-[8px] text-cyan-300 truncate">{player.signatureChampion}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
