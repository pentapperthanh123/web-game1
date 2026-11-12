import React, { useState } from 'react';
import { Check, Sparkles, User, X } from 'lucide-react';
import { ALL_CHAMPIONS, findChampion } from '../constants/champions';
import {
  DDRAGON_CHAMPION_CDN,
  TEAM_COLOR_THEME_OPTIONS,
  TeamColorThemeId,
  TeamPlayerProfile,
  TeamProfile,
  createChampionPortraitUrl,
} from '../constants/teams';
import { TeamLogo } from './TeamLogos';

interface TeamEditorCardProps {
  initialTeam: TeamProfile;
  slotLabel: string;
  onSave: (updated: TeamProfile) => void;
  onCancel: () => void;
}

const isAutoAvatar = (url: string): boolean => !url || url.startsWith(DDRAGON_CHAMPION_CDN);

export const TeamEditorCard: React.FC<TeamEditorCardProps> = ({
  initialTeam,
  slotLabel,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialTeam.name);
  const [shortTag, setShortTag] = useState(initialTeam.shortTag);
  const [aliasesText, setAliasesText] = useState(initialTeam.aliases.join(', '));
  const [colorTheme, setColorTheme] = useState<TeamColorThemeId>(initialTeam.colorTheme);
  const [logoUrl, setLogoUrl] = useState(initialTeam.logoUrl);
  const [roster, setRoster] = useState<TeamPlayerProfile[]>(() =>
    initialTeam.roster.map((p) => ({ ...p }))
  );

  const previewProfile: TeamProfile = {
    ...initialTeam,
    name: name.trim() || initialTeam.name,
    shortTag: shortTag.trim().toUpperCase() || initialTeam.shortTag,
    aliases: aliasesText
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
    colorTheme,
    logoUrl: logoUrl.trim(),
    roster,
  };

  const handlePlayerPatch = (index: number, patch: Partial<TeamPlayerProfile>) => {
    setRoster((prev) => prev.map((p, idx) => (idx === index ? { ...p, ...patch } : p)));
  };

  const handleChampionChange = (index: number, champName: string) => {
    const matched = findChampion(champName);
    setRoster((prev) =>
      prev.map((player, idx) => {
        if (idx !== index) return player;
        const nextChamp = matched ? matched.name : champName;
        const nextKey = matched ? matched.key : player.championKey;
        const nextAvatar = isAutoAvatar(player.avatarUrl)
          ? createChampionPortraitUrl(nextKey)
          : player.avatarUrl;
        return {
          ...player,
          signatureChampion: nextChamp,
          championKey: nextKey,
          avatarUrl: nextAvatar,
        };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = shortTag.trim().toUpperCase().slice(0, 8) || 'TEAM';
    const aliases = Array.from(
      new Set(
        [
          cleanTag,
          ...aliasesText
            .split(',')
            .map((a) => a.trim().toUpperCase())
            .filter(Boolean),
        ].filter(Boolean)
      )
    );
    onSave({
      ...initialTeam,
      name: name.trim() || cleanTag,
      shortTag: cleanTag,
      aliases,
      colorTheme,
      logoUrl: logoUrl.trim(),
      roster: roster.map((p) => ({
        ...p,
        name: p.name.trim() || p.role,
        avatarUrl: p.avatarUrl.trim() || createChampionPortraitUrl(p.championKey),
      })),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/50 space-y-3 text-xs"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <TeamLogo teamProfile={previewProfile} className="w-8 h-8" />
          <div>
            <div className="font-black text-amber-300">Chỉnh Sửa Đội ({slotLabel})</div>
            <div className="text-[10px] text-slate-400">
              Cấu hình tên, từ khóa Chat TikTok, màu sắc &amp; 5 Game thủ
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">Tên đội tuyển:</span>
          <input
            type="text"
            maxLength={36}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">Tag ngắn (tối đa 8 ký tự):</span>
          <input
            type="text"
            maxLength={8}
            value={shortTag}
            onChange={(e) => setShortTag(e.target.value.toUpperCase())}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-black uppercase text-xs focus:outline-none focus:border-amber-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">Từ khóa Chat TikTok:</span>
          <input
            type="text"
            value={aliasesText}
            onChange={(e) => setAliasesText(e.target.value)}
            placeholder="T1, SKT, FAKER"
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-200 text-xs focus:outline-none focus:border-cyan-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">Link Logo (trống = tự tạo):</span>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="/images/teams/t1.svg hoặc https://..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
          />
        </label>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-400 block">Màu sắc &amp; Hiệu ứng 3D:</span>
        <div className="flex flex-wrap gap-1.5">
          {TEAM_COLOR_THEME_OPTIONS.map((palette) => (
            <button
              key={palette.id}
              type="button"
              onClick={() => setColorTheme(palette.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                colorTheme === palette.id
                  ? `${palette.pillButtonClass} ring-1 ring-white/40`
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${palette.swatchClass}`} />
              <span>{palette.labelVi}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
          <User className="w-3.5 h-3.5" />
          <span>5 Tuyển Thủ / Game Thủ Ra Trận:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          {roster.map((player, index) => (
            <div
              key={`${player.role}-${index}`}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5"
            >
              <div className="flex items-center space-x-1.5">
                <img
                  src={player.avatarUrl || createChampionPortraitUrl(player.championKey)}
                  alt={player.name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                />
                <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                  {player.role}
                </span>
              </div>
              <input
                type="text"
                maxLength={24}
                value={player.name}
                onChange={(e) => handlePlayerPatch(index, { name: e.target.value })}
                placeholder="Tên game thủ"
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white text-[11px] font-bold"
              />
              <select
                value={player.signatureChampion}
                onChange={(e) => handleChampionChange(index, e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-200 text-[11px] font-bold"
              >
                {ALL_CHAMPIONS.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={player.avatarUrl}
                onChange={(e) => handlePlayerPatch(index, { avatarUrl: e.target.value })}
                placeholder="Link ảnh (trống = ảnh tướng)"
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[10px]"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black flex items-center space-x-1 hover:brightness-110"
        >
          <Check className="w-3.5 h-3.5" />
          <Sparkles className="w-3 h-3" />
          <span>Lưu &amp; Đồng Bộ Live</span>
        </button>
      </div>
    </form>
  );
};
