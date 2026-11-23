import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { ALL_CHAMPIONS } from '../constants/champions';
import { TeamPlayerProfile, createChampionPortraitUrl } from '../constants/teams';
import { compressTeamImageFile } from '../utils/teamMediaIO';

const MAX_PLAYER_NAME_LENGTH = 24;

interface TeamEditorPlayerCardProps {
  player: TeamPlayerProfile;
  index: number;
  onPatch: (index: number, patch: Partial<TeamPlayerProfile>) => void;
  onChampionChange: (index: number, championName: string) => void;
  onUploadError?: (msg: string) => void;
}

export const TeamEditorPlayerCard: React.FC<TeamEditorPlayerCardProps> = ({
  player,
  index,
  onPatch,
  onChampionChange,
  onUploadError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasError, setHasError] = useState(false);
  const portraitSrc = player.avatarUrl || createChampionPortraitUrl(player.championKey);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressTeamImageFile(file);
      setHasError(false);
      onPatch(index, { avatarUrl: dataUrl });
    } catch {
      onUploadError?.('Không đọc được ảnh (chỉ hỗ trợ PNG/JPG/WebP/SVG dưới 8MB)');
    }
  };

  return (
    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
      <div className="flex items-center space-x-1.5">
        {hasError ? (
          <div className="w-7 h-7 rounded-full border border-rose-500/60 bg-slate-950 flex items-center justify-center text-[9px] font-black text-rose-300 shrink-0">
            {player.role}
          </div>
        ) : (
          <img
            src={portraitSrc}
            alt={player.name}
            onError={() => setHasError(true)}
            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
          />
        )}
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
        onChange={(e) => {
          setHasError(false);
          onChampionChange(index, e.target.value);
        }}
        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-200 text-[11px] font-bold"
      >
        {ALL_CHAMPIONS.map((champ) => (
          <option key={champ.id} value={champ.name}>
            {champ.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <input
          type="text"
          value={player.avatarUrl}
          onChange={(e) => {
            setHasError(false);
            onPatch(index, { avatarUrl: e.target.value });
          }}
          placeholder="Link ảnh (trống = ảnh tướng)"
          className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[10px]"
        />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 shrink-0"
          title="Tải ảnh tuyển thủ (tự nén Base64)"
        >
          <Upload className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
