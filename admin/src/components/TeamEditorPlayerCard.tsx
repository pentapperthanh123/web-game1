import React from 'react';
import { ALL_CHAMPIONS } from '../constants/champions';
import {
  TeamPlayerProfile,
  createChampionPortraitUrl,
} from '../constants/teams';

const MAX_PLAYER_NAME_LENGTH = 24;

interface TeamEditorPlayerCardProps {
  player: TeamPlayerProfile;
  index: number;
  onPatch: (index: number, patch: Partial<TeamPlayerProfile>) => void;
  onChampionChange: (index: number, championName: string) => void;
}

export const TeamEditorPlayerCard: React.FC<TeamEditorPlayerCardProps> = ({
  player,
  index,
  onPatch,
  onChampionChange,
}) => {
  const portraitSrc = player.avatarUrl || createChampionPortraitUrl(player.championKey);

  return (
    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
      <div className="flex items-center space-x-1.5">
        <img
          src={portraitSrc}
          alt={player.name}
          className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
        />
        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
          {player.role}
        </span>
      </div>

      <input
        type="text"
        maxLength={MAX_PLAYER_NAME_LENGTH}
        value={player.name}
        onChange={(e) => onPatch(index, { name: e.target.value })}
        placeholder="Tên game thủ"
        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white text-[11px] font-bold"
      />

      <select
        value={player.signatureChampion}
        onChange={(e) => onChampionChange(index, e.target.value)}
        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-200 text-[11px] font-bold"
      >
        {ALL_CHAMPIONS.map((champ) => (
          <option key={champ.id} value={champ.name}>
            {champ.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={player.avatarUrl}
        onChange={(e) => onPatch(index, { avatarUrl: e.target.value })}
        placeholder="Link ảnh (trống = ảnh tướng)"
        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[10px]"
      />
    </div>
  );
};
