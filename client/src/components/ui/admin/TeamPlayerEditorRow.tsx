import React from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_CHAMPIONS } from '../../../constants/champions';
import { createChampionPortraitUrl } from '../../../constants/teams';
import { TeamPlayerProfile } from '../../../types/team';

interface TeamPlayerEditorRowProps {
  player: TeamPlayerProfile;
  index: number;
  onNameChange: (index: number, name: string) => void;
  onChampionChange: (index: number, championName: string) => void;
  onAvatarChange: (index: number, avatarUrl: string) => void;
}

export const TeamPlayerEditorRow: React.FC<TeamPlayerEditorRowProps> = ({
  player,
  index,
  onNameChange,
  onChampionChange,
  onAvatarChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-2 rounded-lg bg-slate-950/85 border border-slate-800 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <img
          src={player.avatarUrl || createChampionPortraitUrl(player.championKey)}
          alt={player.name}
          className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0 bg-slate-900"
        />
        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 shrink-0">
          {player.role}
        </span>
        <input
          type="text"
          maxLength={24}
          value={player.name}
          onChange={(e) => onNameChange(index, e.target.value)}
          placeholder={t('AdminTeams.playerNamePlaceholder', 'Tên game thủ')}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white text-[11px] font-bold focus:outline-none focus:border-cyan-400"
        />
        <select
          value={player.signatureChampion}
          onChange={(e) => onChampionChange(index, e.target.value)}
          className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-200 text-[11px] font-bold max-w-[125px] focus:outline-none focus:border-cyan-400"
        >
          {ALL_CHAMPIONS.map((champ) => (
            <option key={champ.id} value={champ.name}>
              {champ.name}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        value={player.avatarUrl}
        onChange={(e) => onAvatarChange(index, e.target.value)}
        placeholder={t(
          'AdminTeams.avatarPlaceholder',
          'Link ảnh tuyển thủ (trống = tự dùng ảnh tướng)'
        )}
        className="w-full px-2 py-1 rounded bg-slate-900/70 border border-slate-800/80 text-slate-300 text-[10px] focus:outline-none focus:border-cyan-400"
      />
    </div>
  );
};
