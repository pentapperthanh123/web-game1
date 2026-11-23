import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Sparkles, Upload, User, X } from 'lucide-react';
import { findChampion } from '../../../constants/champions';
import {
  DDRAGON_CHAMPION_CDN,
  TEAM_COLOR_THEME_OPTIONS,
  createChampionPortraitUrl,
} from '../../../constants/teams';
import { TeamColorThemeId, TeamPlayerProfile, TeamProfile } from '../../../types/team';
import { compressTeamImageFile } from '../../../utils/teamMediaIO';
import { TeamLogo } from '../../icons/TeamLogos';
import { TeamPlayerEditorRow } from './TeamPlayerEditorRow';

const MAX_TEAM_NAME_LENGTH = 36;
const MAX_SHORT_TAG_LENGTH = 8;
const FALLBACK_SHORT_TAG = 'TEAM';

interface TeamProfileEditorProps {
  initialTeam: TeamProfile;
  targetSlotLabel: string;
  onSave: (updatedTeam: TeamProfile) => void;
  onCancel: () => void;
}

const isAutoChampionAvatar = (avatarUrl: string): boolean =>
  !avatarUrl || avatarUrl.startsWith(DDRAGON_CHAMPION_CDN);

const parseAliasesInput = (text: string, mandatoryTag?: string): string[] => {
  const tokens = text
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set((mandatoryTag ? [mandatoryTag, ...tokens] : tokens).filter(Boolean)));
};

export const TeamProfileEditor: React.FC<TeamProfileEditorProps> = ({
  initialTeam,
  targetSlotLabel,
  onSave,
  onCancel,
}) => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
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
    initialTeam.roster.map((p) => ({ ...p }))
  );

  const previewProfile: TeamProfile = {
    ...initialTeam,
    name: name.trim() || initialTeam.name,
    shortTag: shortTag.trim().toUpperCase() || initialTeam.shortTag,
    aliases: parseAliasesInput(aliasesText),
    autoSyncRosterAliases,
    colorTheme,
    logoUrl: logoUrl.trim(),
    roster,
  };

  const patchPlayer = (index: number, patch: Partial<TeamPlayerProfile>) => {
    setRoster((prev) => prev.map((p, idx) => (idx === index ? { ...p, ...patch } : p)));
  };

  const handleChampionChange = (index: number, champName: string) => {
    const matched = findChampion(champName);
    setRoster((prev) =>
      prev.map((player, idx) => {
        if (idx !== index) return player;
        const nextChamp = matched ? matched.name : champName;
        const nextKey = matched ? matched.key : player.championKey;
        const nextAvatar = isAutoChampionAvatar(player.avatarUrl)
          ? createChampionPortraitUrl(nextKey)
          : player.avatarUrl;
        return { ...player, signatureChampion: nextChamp, championKey: nextKey, avatarUrl: nextAvatar };
      })
    );
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressTeamImageFile(file);
      setUploadError(null);
      setLogoUrl(compressed);
    } catch {
      setUploadError(
        t('AdminTeams.imageUploadError', 'Không thể đọc ảnh (chọn PNG/JPG/WebP dưới 8MB)')
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = shortTag.trim().toUpperCase().slice(0, MAX_SHORT_TAG_LENGTH) || FALLBACK_SHORT_TAG;
    onSave({
      ...initialTeam,
      name: name.trim() || cleanTag,
      shortTag: cleanTag,
      aliases: parseAliasesInput(aliasesText, cleanTag),
      autoSyncRosterAliases,
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
      className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-2.5 text-xs animate-fadeIn"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2 min-w-0">
          <TeamLogo teamProfile={previewProfile} className="w-7 h-7 shrink-0" />
          <div className="min-w-0">
            <div className="font-black text-amber-300 truncate">
              {t('AdminTeams.editorTitle', 'Chỉnh Sửa Đội ({{slot}})', { slot: targetSlotLabel })}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {t('AdminTeams.editorSubtitle', 'Cấu hình tên, từ khóa chat & 5 tuyển thủ')}
            </div>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {uploadError && (
        <div className="p-2 rounded-lg bg-rose-950/75 border border-rose-500/50 text-rose-200 text-[10px] flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">{t('AdminTeams.teamNameLabel', 'Tên đội tuyển:')}</span>
          <input
            type="text"
            maxLength={MAX_TEAM_NAME_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] focus:outline-none focus:border-amber-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">{t('AdminTeams.shortTagLabel', 'Tag hiển thị (tối đa 8 ký tự):')}</span>
          <input
            type="text"
            maxLength={MAX_SHORT_TAG_LENGTH}
            value={shortTag}
            onChange={(e) => setShortTag(e.target.value.toUpperCase())}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-black uppercase text-[11px] focus:outline-none focus:border-amber-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">{t('AdminTeams.aliasesLabel', 'Từ khóa Chat TikTok (cách bằng dấu phẩy):')}</span>
          <input
            type="text"
            value={aliasesText}
            onChange={(e) => setAliasesText(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-200 text-[11px] focus:outline-none focus:border-cyan-400"
          />
        </label>
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400">{t('AdminTeams.logoUrlLabel', 'Link Logo (trống = huy hiệu tự động):')}</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder={t('AdminTeams.logoPlaceholder', 'URL hoặc /images/teams/t1.svg')}
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-[11px] focus:outline-none focus:border-cyan-400"
            />
            <input ref={logoFileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button
              type="button"
              onClick={() => logoFileRef.current?.click()}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-[10px] font-bold flex items-center space-x-1 shrink-0"
            >
              <Upload className="w-3 h-3" />
              <span>{t('AdminTeams.uploadBtn', 'Tải ảnh')}</span>
            </button>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/75 border border-slate-800 cursor-pointer">
        <span className="text-[10px] text-slate-300">
          {t('AdminTeams.autoSyncRosterAliasesLabel', 'Tự nhận tên 5 tuyển thủ làm từ khóa chat ({{names}})', {
            names: roster.map((p) => p.name).filter(Boolean).join(', '),
          })}
        </span>
        <input
          type="checkbox"
          checked={autoSyncRosterAliases}
          onChange={(e) => setAutoSyncRosterAliases(e.target.checked)}
          className="accent-emerald-500 ml-2 shrink-0"
        />
      </label>

      <div className="flex flex-wrap gap-1.5">
        {TEAM_COLOR_THEME_OPTIONS.map((palette) => (
          <button
            key={palette.id}
            type="button"
            onClick={() => setColorTheme(palette.id)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition ${
              colorTheme === palette.id ? `${palette.pillButtonClass} ring-1 ring-white/40` : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${palette.swatchClass}`} />
            <span>{isVi ? palette.labelVi : palette.labelEn}</span>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-amber-300 flex items-center space-x-1">
          <User className="w-3 h-3" />
          <span>{t('AdminTeams.rosterTitle', 'Đội hình 5 Tuyển Thủ (TOP / JUG / MID / ADC / SUP):')}</span>
        </span>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {roster.map((player, index) => (
            <TeamPlayerEditorRow
              key={`${player.role}-${index}`}
              player={player}
              index={index}
              onNameChange={(idx, val) => patchPlayer(idx, { name: val })}
              onChampionChange={handleChampionChange}
              onAvatarChange={(idx, val) => patchPlayer(idx, { avatarUrl: val })}
              onUploadError={setUploadError}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-800">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700">
          {t('AdminTeams.cancelBtn', 'Hủy')}
        </button>
        <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black flex items-center space-x-1">
          <Check className="w-3.5 h-3.5" />
          <Sparkles className="w-3 h-3" />
          <span>{t('AdminTeams.saveApplyBtn', 'Lưu & Áp Dụng')}</span>
        </button>
      </div>
    </form>
  );
};
