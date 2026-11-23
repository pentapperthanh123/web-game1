import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { ALL_CHAMPIONS } from '../../../constants/champions';
import { createChampionPortraitUrl } from '../../../constants/teams';
import { TeamPlayerProfile } from '../../../types/team';
import { compressTeamImageFile } from '../../../utils/teamMediaIO';

const MAX_PLAYER_NAME_LENGTH = 24;

interface TeamPlayerEditorRowProps {
  player: TeamPlayerProfile;
  index: number;
  onNameChange: (index: number, name: string) => void;
  onChampionChange: (index: number, championName: string) => void;
  onAvatarChange: (index: number, avatarUrl: string) => void;
  onUploadError?: (message: string) => void;
}

export const TeamPlayerEditorRow: React.FC<TeamPlayerEditorRowProps> = ({
  player,
  index,
  onNameChange,
  onChampionChange,
  onAvatarChange,
  onUploadError,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasAvatarError, setHasAvatarError] = useState(false);

  const resolvedAvatarSrc = player.avatarUrl || createChampionPortraitUrl(player.championKey);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const compressedDataUrl = await compressTeamImageFile(file);
      setHasAvatarError(false);
      onAvatarChange(index, compressedDataUrl);
    } catch {
      onUploadError?.(
        t('AdminTeams.imageUploadError', 'Không thể đọc ảnh (chọn PNG/JPG/WebP dưới 8MB)')
      );
    }
  };

  return (
    <div className="p-2 rounded-lg bg-slate-950/85 border border-slate-800 space-y-1.5">
      <div className="flex items-center gap-1.5">
        {hasAvatarError ? (
          <div className="w-7 h-7 rounded-full border border-rose-500/60 bg-slate-900 flex items-center justify-center text-[9px] font-black text-rose-300 shrink-0">
            {player.role}
          </div>
        ) : (
          <img
            src={resolvedAvatarSrc}
            alt={player.name}
            onError={() => setHasAvatarError(true)}
            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0 bg-slate-900"
          />
        )}
        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 shrink-0">
          {player.role}
        </span>
        <input
          type="text"
          maxLength={MAX_PLAYER_NAME_LENGTH}
          value={player.name}
          onChange={(e) => onNameChange(index, e.target.value)}
          placeholder={t('AdminTeams.playerNamePlaceholder', 'Tên game thủ')}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white text-[11px] font-bold focus:outline-none focus:border-cyan-400"
        />
        <select
          value={player.signatureChampion}
          onChange={(e) => {
            setHasAvatarError(false);
            onChampionChange(index, e.target.value);
          }}
          className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-200 text-[11px] font-bold max-w-[125px] focus:outline-none focus:border-cyan-400"
        >
          {ALL_CHAMPIONS.map((champ) => (
            <option key={champ.id} value={champ.name}>
              {champ.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={player.avatarUrl}
          onChange={(e) => {
            setHasAvatarError(false);
            onAvatarChange(index, e.target.value);
          }}
          placeholder={t(
            'AdminTeams.avatarPlaceholder',
            'Link ảnh tuyển thủ (trống = tự dùng ảnh tướng)'
          )}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-900/70 border border-slate-800/80 text-slate-300 text-[10px] focus:outline-none focus:border-cyan-400"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-[10px] font-bold flex items-center space-x-1 shrink-0 transition"
          title={t('AdminTeams.uploadImageTitle', 'Tải ảnh từ máy (tự nén Base64)')}
        >
          <Upload className="w-3 h-3" />
          <span>{t('AdminTeams.uploadBtn', 'Tải ảnh')}</span>
        </button>
      </div>
    </div>
  );
};
