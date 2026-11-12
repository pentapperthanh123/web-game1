import React, { useRef, useState } from 'react';
import { AlertTriangle, Check, Sparkles, Upload, User, X } from 'lucide-react';
import { findChampion } from '../constants/champions';
import {
  DDRAGON_CHAMPION_CDN,
  TEAM_COLOR_THEME_OPTIONS,
  TeamColorThemeId,
  TeamPlayerProfile,
  TeamProfile,
  createChampionPortraitUrl,
} from '../constants/teams';
import { compressTeamImageFile } from '../utils/teamMediaIO';
import { TeamEditorPlayerCard } from './TeamEditorPlayerCard';
import { TeamLogo } from './TeamLogos';

const MAX_TEAM_NAME_LENGTH = 36;
const MAX_SHORT_TAG_LENGTH = 8;
const FALLBACK_SHORT_TAG = 'TEAM';

interface TeamEditorCardProps {
  initialTeam: TeamProfile;
  slotLabel: string;
  onSave: (updated: TeamProfile) => void;
  onCancel: () => void;
}

const isAutoAvatar = (url: string): boolean => !url || url.startsWith(DDRAGON_CHAMPION_CDN);

const parseAliases = (aliasesText: string, mandatoryTag?: string): string[] => {
  const parsed = aliasesText
    .split(',')
    .map((alias) => alias.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set((mandatoryTag ? [mandatoryTag, ...parsed] : parsed).filter(Boolean)));
};

export const TeamEditorCard: React.FC<TeamEditorCardProps> = ({
  initialTeam,
  slotLabel,
  onSave,
  onCancel,
}) => {
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialTeam.name);
  const [shortTag, setShortTag] = useState(initialTeam.shortTag);
  const [aliasesText, setAliasesText] = useState(initialTeam.aliases.join(', '));
  const [autoSyncRosterAliases, setAutoSyncRosterAliases] = useState(
    initialTeam.autoSyncRosterAliases ?? true
  );
  const [colorTheme, setColorTheme] = useState<TeamColorThemeId>(initialTeam.colorTheme);
  const [logoUrl, setLogoUrl] = useState(initialTeam.logoUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [roster, setRoster] = useState<TeamPlayerProfile[]>(() =>
    initialTeam.roster.map((player) => ({ ...player }))
  );

  const previewProfile: TeamProfile = {
    ...initialTeam,
    name: name.trim() || initialTeam.name,
    shortTag: shortTag.trim().toUpperCase() || initialTeam.shortTag,
    aliases: parseAliases(aliasesText),
    autoSyncRosterAliases,
    colorTheme,
    logoUrl: logoUrl.trim(),
    roster,
  };

  const handlePlayerPatch = (index: number, patch: Partial<TeamPlayerProfile>) => {
    setRoster((prev) => prev.map((player, idx) => (idx === index ? { ...player, ...patch } : player)));
  };

  const handleChampionChange = (index: number, champName: string) => {
    const matched = findChampion(champName);
    setRoster((prev) =>
      prev.map((player, idx) => {
        if (idx !== index) return player;
        const nextChamp = matched ? matched.name : champName;
        const nextKey = matched ? matched.key : player.championKey;
        const nextAvatar = isAutoAvatar(player.avatarUrl) ? createChampionPortraitUrl(nextKey) : player.avatarUrl;
        return { ...player, signatureChampion: nextChamp, championKey: nextKey, avatarUrl: nextAvatar };
      })
    );
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressTeamImageFile(file);
      setUploadError(null);
      setLogoUrl(dataUrl);
    } catch {
      setUploadError('Không đọc được ảnh logo (chọn PNG/JPG/WebP/SVG dưới 8MB)');
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTag = shortTag.trim().toUpperCase().slice(0, MAX_SHORT_TAG_LENGTH) || FALLBACK_SHORT_TAG;
    onSave({
      ...initialTeam,
      name: name.trim() || cleanTag,
      shortTag: cleanTag,
      aliases: parseAliases(aliasesText, cleanTag),
      autoSyncRosterAliases,
      colorTheme,
      logoUrl: logoUrl.trim(),
      roster: roster.map((player) => ({
        ...player,
        name: player.name.trim() || player.role,
        avatarUrl: player.avatarUrl.trim() || createChampionPortraitUrl(player.championKey),
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/50 space-y-3 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <TeamLogo teamProfile={previewProfile} className="w-8 h-8" />
          <div>
            <div className="font-black text-amber-300">Chỉnh Sửa Đội ({slotLabel})</div>
            <div className="text-[10px] text-slate-400">Tên, từ khóa Chat TikTok, logo &amp; 5 Game thủ (Tướng Tủ +25% DMG)</div>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {uploadError && (
        <div className="p-2 rounded-lg bg-rose-950/75 border border-rose-500/50 text-rose-200 text-[11px] flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">Tên đội tuyển:</span>
          <input type="text" maxLength={MAX_TEAM_NAME_LENGTH} value={name} onChange={(e) => setName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs" />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">Tag ngắn (tối đa {MAX_SHORT_TAG_LENGTH} ký tự):</span>
          <input type="text" maxLength={MAX_SHORT_TAG_LENGTH} value={shortTag} onChange={(e) => setShortTag(e.target.value.toUpperCase())} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-black uppercase text-xs" />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">Từ khóa Chat TikTok:</span>
          <input type="text" value={aliasesText} onChange={(e) => setAliasesText(e.target.value)} placeholder="T1, SKT, FAKER" className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-200 text-xs" />
        </label>
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">Link Logo (hoặc tải ảnh từ máy):</span>
          <div className="flex items-center gap-1.5">
            <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="/images/teams/t1.svg" className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs" />
            <input ref={logoFileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button type="button" onClick={() => logoFileRef.current?.click()} className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold flex items-center space-x-1 shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>Tải ảnh</span>
            </button>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-[11px] text-slate-300">
        <span>Tự nhận tên 5 tuyển thủ vào từ khóa Chat TikTok ({roster.map((p) => p.name).filter(Boolean).join(', ')})</span>
        <input type="checkbox" checked={autoSyncRosterAliases} onChange={(e) => setAutoSyncRosterAliases(e.target.checked)} className="accent-emerald-500 ml-2 shrink-0" />
      </label>

      <div className="flex flex-wrap gap-1.5">
        {TEAM_COLOR_THEME_OPTIONS.map((palette) => (
          <button key={palette.id} type="button" onClick={() => setColorTheme(palette.id)} className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${colorTheme === palette.id ? `${palette.pillButtonClass} ring-1 ring-white/40` : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${palette.swatchClass}`} />
            <span>{palette.labelVi}</span>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
          <User className="w-3.5 h-3.5" />
          <span>5 Tuyển Thủ / Game Thủ Ra Trận:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          {roster.map((player, index) => (
            <TeamEditorPlayerCard key={`${player.role}-${index}`} player={player} index={index} onPatch={handlePlayerPatch} onChampionChange={handleChampionChange} onUploadError={setUploadError} />
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700">Hủy</button>
        <button type="submit" className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black flex items-center space-x-1 hover:brightness-110">
          <Check className="w-3.5 h-3.5" />
          <Sparkles className="w-3 h-3" />
          <span>Lưu &amp; Đồng Bộ Live</span>
        </button>
      </div>
    </form>
  );
};
