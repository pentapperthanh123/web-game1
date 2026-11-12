import { TEAM_KEY, TeamType } from './game';
import {
  ActiveTeamsMap,
  HotMatchupPreset,
  PlayerRole,
  QueuedMatchup,
  TeamColorPalette,
  TeamColorThemeId,
  TeamConfigState,
  TeamPackExport,
  TeamPlayerProfile,
  TeamProfile,
} from '../types/team';

export const TEAM_DATA_LIMITS = {
  MAX_BASE64_MEDIA_LENGTH: 400_000,
  MAX_QUEUE_ITEMS: 24,
  MAX_CATALOG_ITEMS: 60,
  MAX_ALIASES: 16,
} as const;

const DATA_IMAGE_URI_PREFIX_REGEX = /^data:image\/(png|jpeg|jpg|webp|svg\+xml|gif);base64,/i;

export const TEAM_CONFIG_STORAGE_KEY = 'lol_team_config_v1';
export const DDRAGON_CHAMPION_CDN =
  'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion';

export const createChampionPortraitUrl = (championKey: string): string =>
  `${DDRAGON_CHAMPION_CDN}/${championKey}.png`;

export const PLAYER_ROLE_OPTIONS: readonly { role: PlayerRole; roleName: string }[] = [
  { role: 'TOP', roleName: 'Đường Trên' },
  { role: 'JUG', roleName: 'Đi Rừng' },
  { role: 'MID', roleName: 'Đường Giữa' },
  { role: 'ADC', roleName: 'Xạ Thủ' },
  { role: 'SUP', roleName: 'Hỗ Trợ' },
];

export const PLAYER_ROLE_LABEL_MAP: Record<PlayerRole, string> = {
  TOP: 'Đường Trên',
  JUG: 'Đi Rừng',
  MID: 'Đường Giữa',
  ADC: 'Xạ Thủ',
  SUP: 'Hỗ Trợ',
};

export const TEAM_COLOR_THEMES: Record<TeamColorThemeId, TeamColorPalette> = {
  cyan: {
    id: 'cyan',
    labelVi: 'Xanh Neon',
    labelEn: 'Neon Cyan',
    primaryHex: '#00f2fe',
    secondaryHex: '#38bdf8',
    accentHex: '#22d3ee',
    critHex: '#67e8f9',
    swatchClass: 'bg-cyan-400',
    textClass: 'text-cyan-300',
    textStrongClass: 'text-cyan-400',
    textMutedClass: 'text-cyan-200',
    borderClass: 'border-cyan-400/80',
    borderSoftClass: 'border-cyan-500/60',
    borderSubtleClass: 'border-cyan-800/50',
    bgSoftClass: 'bg-cyan-950/80',
    bgBadgeClass: 'bg-cyan-400 text-slate-950',
    badgePillClass: 'bg-cyan-950 text-cyan-300 border border-cyan-800/60',
    pillButtonClass: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300',
    adminActiveBtnClass: 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_#06b6d4]',
    tugBarLeftClass: 'bg-gradient-to-r from-blue-700 via-cyan-500 to-cyan-300 shadow-[0_0_14px_#06b6d4]',
    tugBarRightClass: 'bg-gradient-to-r from-cyan-300 via-cyan-500 to-blue-700 shadow-[0_0_14px_#06b6d4]',
    winPipActiveClass: 'bg-cyan-400 border-cyan-300 shadow-[0_0_6px_#06b6d4]',
    glowOrbClass: 'bg-cyan-500',
    glowStyle: '0 0 18px rgba(0, 242, 254, 0.55)',
    giftBannerGradientClass:
      'bg-gradient-to-r from-slate-950/95 via-cyan-950/90 to-slate-950/95 border-cyan-400/90 shadow-[0_0_28px_rgba(6,182,212,0.55)]',
    rosterCardActiveClass:
      'bg-gradient-to-r from-cyan-950/80 to-slate-950/75 border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.4)]',
    summonPortalBorderClass: 'border-cyan-400/80',
    avatarInitialsBgClass: 'bg-cyan-900 text-cyan-200',
    avatarFallbackIconClass: 'text-cyan-400',
    likeBadgeBorderClass: 'border-cyan-500/45',
    chatAvatarClass: 'bg-cyan-500 text-slate-950',
  },
  amber: {
    id: 'amber',
    labelVi: 'Vàng Kim',
    labelEn: 'Imperial Gold',
    primaryHex: '#fbbf24',
    secondaryHex: '#f59e0b',
    accentHex: '#ffa751',
    critHex: '#fde047',
    swatchClass: 'bg-amber-400',
    textClass: 'text-amber-300',
    textStrongClass: 'text-amber-400',
    textMutedClass: 'text-amber-200',
    borderClass: 'border-amber-400/80',
    borderSoftClass: 'border-amber-500/60',
    borderSubtleClass: 'border-amber-800/50',
    bgSoftClass: 'bg-amber-950/80',
    bgBadgeClass: 'bg-amber-400 text-slate-950',
    badgePillClass: 'bg-amber-950 text-amber-300 border border-amber-800/60',
    pillButtonClass: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
    adminActiveBtnClass: 'bg-amber-500 text-slate-950 shadow-[0_0_8px_#f59e0b]',
    tugBarLeftClass: 'bg-gradient-to-r from-yellow-600 via-amber-500 to-amber-300 shadow-[0_0_14px_#f59e0b]',
    tugBarRightClass: 'bg-gradient-to-r from-amber-300 via-amber-500 to-yellow-600 shadow-[0_0_14px_#f59e0b]',
    winPipActiveClass: 'bg-amber-400 border-amber-300 shadow-[0_0_6px_#f59e0b]',
    glowOrbClass: 'bg-amber-500',
    glowStyle: '0 0 18px rgba(251, 191, 36, 0.55)',
    giftBannerGradientClass:
      'bg-gradient-to-r from-slate-950/95 via-amber-950/90 to-slate-950/95 border-amber-400/90 shadow-[0_0_28px_rgba(245,158,11,0.55)]',
    rosterCardActiveClass:
      'bg-gradient-to-r from-amber-950/80 to-slate-950/75 border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
    summonPortalBorderClass: 'border-amber-400/80',
    avatarInitialsBgClass: 'bg-amber-900 text-amber-200',
    avatarFallbackIconClass: 'text-amber-400',
    likeBadgeBorderClass: 'border-amber-500/45',
    chatAvatarClass: 'bg-amber-500 text-slate-950',
  },
  rose: {
    id: 'rose',
    labelVi: 'Đỏ Crimson',
    labelEn: 'Crimson Rose',
    primaryHex: '#fb7185',
    secondaryHex: '#f43f5e',
    accentHex: '#e11d48',
    critHex: '#fda4af',
    swatchClass: 'bg-rose-500',
    textClass: 'text-rose-300',
    textStrongClass: 'text-rose-400',
    textMutedClass: 'text-rose-200',
    borderClass: 'border-rose-400/80',
    borderSoftClass: 'border-rose-500/60',
    borderSubtleClass: 'border-rose-800/50',
    bgSoftClass: 'bg-rose-950/80',
    bgBadgeClass: 'bg-rose-400 text-slate-950',
    badgePillClass: 'bg-rose-950 text-rose-300 border border-rose-800/60',
    pillButtonClass: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
    adminActiveBtnClass: 'bg-rose-500 text-white shadow-[0_0_8px_#f43f5e]',
    tugBarLeftClass: 'bg-gradient-to-r from-rose-700 via-rose-500 to-rose-300 shadow-[0_0_14px_#f43f5e]',
    tugBarRightClass: 'bg-gradient-to-r from-rose-300 via-rose-500 to-rose-700 shadow-[0_0_14px_#f43f5e]',
    winPipActiveClass: 'bg-rose-400 border-rose-300 shadow-[0_0_6px_#f43f5e]',
    glowOrbClass: 'bg-rose-500',
    glowStyle: '0 0 18px rgba(244, 63, 94, 0.55)',
    giftBannerGradientClass:
      'bg-gradient-to-r from-slate-950/95 via-rose-950/90 to-slate-950/95 border-rose-400/90 shadow-[0_0_28px_rgba(244,63,94,0.55)]',
    rosterCardActiveClass:
      'bg-gradient-to-r from-rose-950/80 to-slate-950/75 border-rose-400/80 shadow-[0_0_10px_rgba(244,63,94,0.4)]',
    summonPortalBorderClass: 'border-rose-400/80',
    avatarInitialsBgClass: 'bg-rose-900 text-rose-200',
    avatarFallbackIconClass: 'text-rose-400',
    likeBadgeBorderClass: 'border-rose-500/45',
    chatAvatarClass: 'bg-rose-500 text-white',
  },
  orange: {
    id: 'orange',
    labelVi: 'Cam Lửa',
    labelEn: 'Blazing Orange',
    primaryHex: '#fb923c',
    secondaryHex: '#f97316',
    accentHex: '#ea580c',
    critHex: '#fdba74',
    swatchClass: 'bg-orange-500',
    textClass: 'text-orange-300',
    textStrongClass: 'text-orange-400',
    textMutedClass: 'text-orange-200',
    borderClass: 'border-orange-400/80',
    borderSoftClass: 'border-orange-500/60',
    borderSubtleClass: 'border-orange-800/50',
    bgSoftClass: 'bg-orange-950/80',
    bgBadgeClass: 'bg-orange-400 text-slate-950',
    badgePillClass: 'bg-orange-950 text-orange-300 border border-orange-800/60',
    pillButtonClass: 'bg-orange-950/80 border-orange-500/60 text-orange-300',
    adminActiveBtnClass: 'bg-orange-500 text-slate-950 shadow-[0_0_8px_#f97316]',
    tugBarLeftClass: 'bg-gradient-to-r from-orange-700 via-orange-500 to-orange-300 shadow-[0_0_14px_#f97316]',
    tugBarRightClass: 'bg-gradient-to-r from-orange-300 via-orange-500 to-orange-700 shadow-[0_0_14px_#f97316]',
    winPipActiveClass: 'bg-orange-400 border-orange-300 shadow-[0_0_6px_#f97316]',
    glowOrbClass: 'bg-orange-500',
    glowStyle: '0 0 18px rgba(249, 115, 22, 0.55)',
    giftBannerGradientClass:
      'bg-gradient-to-r from-slate-950/95 via-orange-950/90 to-slate-950/95 border-orange-400/90 shadow-[0_0_28px_rgba(249,115,22,0.55)]',
    rosterCardActiveClass:
      'bg-gradient-to-r from-orange-950/80 to-slate-950/75 border-orange-400/80 shadow-[0_0_10px_rgba(249,115,22,0.4)]',
    summonPortalBorderClass: 'border-orange-400/80',
    avatarInitialsBgClass: 'bg-orange-900 text-orange-200',
    avatarFallbackIconClass: 'text-orange-400',
    likeBadgeBorderClass: 'border-orange-500/45',
    chatAvatarClass: 'bg-orange-500 text-slate-950',
  },
  violet: {
    id: 'violet',
    labelVi: 'Tím Hư Không',
    labelEn: 'Void Violet',
    primaryHex: '#a78bfa',
    secondaryHex: '#8b5cf6',
    accentHex: '#7c3aed',
    critHex: '#ddd6fe',
    swatchClass: 'bg-violet-500',
    textClass: 'text-violet-300',
    textStrongClass: 'text-violet-400',
    textMutedClass: 'text-violet-200',
    borderClass: 'border-violet-400/80',
    borderSoftClass: 'border-violet-500/60',
    borderSubtleClass: 'border-violet-800/50',
    bgSoftClass: 'bg-violet-950/80',
    bgBadgeClass: 'bg-violet-400 text-slate-950',
    badgePillClass: 'bg-violet-950 text-violet-300 border border-violet-800/60',
    pillButtonClass: 'bg-violet-950/80 border-violet-500/60 text-violet-300',
    adminActiveBtnClass: 'bg-violet-500 text-white shadow-[0_0_8px_#8b5cf6]',
    tugBarLeftClass: 'bg-gradient-to-r from-violet-700 via-violet-500 to-violet-300 shadow-[0_0_14px_#8b5cf6]',
    tugBarRightClass: 'bg-gradient-to-r from-violet-300 via-violet-500 to-violet-700 shadow-[0_0_14px_#8b5cf6]',
    winPipActiveClass: 'bg-violet-400 border-violet-300 shadow-[0_0_6px_#8b5cf6]',
    glowOrbClass: 'bg-violet-500',
    glowStyle: '0 0 18px rgba(139, 92, 246, 0.55)',
    giftBannerGradientClass:
      'bg-gradient-to-r from-slate-950/95 via-violet-950/90 to-slate-950/95 border-violet-400/90 shadow-[0_0_28px_rgba(139,92,246,0.55)]',
    rosterCardActiveClass:
      'bg-gradient-to-r from-violet-950/80 to-slate-950/75 border-violet-400/80 shadow-[0_0_10px_rgba(139,92,246,0.4)]',
    summonPortalBorderClass: 'border-violet-400/80',
    avatarInitialsBgClass: 'bg-violet-900 text-violet-200',
    avatarFallbackIconClass: 'text-violet-400',
    likeBadgeBorderClass: 'border-violet-500/45',
    chatAvatarClass: 'bg-violet-500 text-white',
  },
  emerald: {
    id: 'emerald',
    labelVi: 'Xanh Ngọc',
    labelEn: 'Emerald',
    primaryHex: '#34d399',
    secondaryHex: '#10b981',
    accentHex: '#059669',
    critHex: '#6ee7b7',
    swatchClass: 'bg-emerald-400',
    textClass: 'text-emerald-300',
    textStrongClass: 'text-emerald-400',
    textMutedClass: 'text-emerald-200',
    borderClass: 'border-emerald-400/80',
    borderSoftClass: 'border-emerald-500/60',
    borderSubtleClass: 'border-emerald-800/50',
    bgSoftClass: 'bg-emerald-950/80',
    bgBadgeClass: 'bg-emerald-400 text-slate-950',
    badgePillClass: 'bg-emerald-950 text-emerald-300 border border-emerald-800/60',
    pillButtonClass: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
    adminActiveBtnClass: 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_#10b981]',
    tugBarLeftClass: 'bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-300 shadow-[0_0_14px_#10b981]',
    tugBarRightClass: 'bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-700 shadow-[0_0_14px_#10b981]',
    winPipActiveClass: 'bg-emerald-400 border-emerald-300 shadow-[0_0_6px_#10b981]',
    glowOrbClass: 'bg-emerald-500',
    glowStyle: '0 0 18px rgba(16, 185, 129, 0.55)',
    giftBannerGradientClass:
      'bg-gradient-to-r from-slate-950/95 via-emerald-950/90 to-slate-950/95 border-emerald-400/90 shadow-[0_0_28px_rgba(16,185,129,0.55)]',
    rosterCardActiveClass:
      'bg-gradient-to-r from-emerald-950/80 to-slate-950/75 border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.4)]',
    summonPortalBorderClass: 'border-emerald-400/80',
    avatarInitialsBgClass: 'bg-emerald-900 text-emerald-200',
    avatarFallbackIconClass: 'text-emerald-400',
    likeBadgeBorderClass: 'border-emerald-500/45',
    chatAvatarClass: 'bg-emerald-500 text-slate-950',
  },
  blue: {
    id: 'blue',
    labelVi: 'Xanh Dương',
    labelEn: 'Royal Blue',
    primaryHex: '#60a5fa',
    secondaryHex: '#3b82f6',
    accentHex: '#2563eb',
    critHex: '#93c5fd',
    swatchClass: 'bg-blue-500',
    textClass: 'text-blue-300',
    textStrongClass: 'text-blue-400',
    textMutedClass: 'text-blue-200',
    borderClass: 'border-blue-400/80',
    borderSoftClass: 'border-blue-500/60',
    borderSubtleClass: 'border-blue-800/50',
    bgSoftClass: 'bg-blue-950/80',
    bgBadgeClass: 'bg-blue-400 text-slate-950',
    badgePillClass: 'bg-blue-950 text-blue-300 border border-blue-800/60',
    pillButtonClass: 'bg-blue-950/80 border-blue-500/60 text-blue-300',
    adminActiveBtnClass: 'bg-blue-500 text-white shadow-[0_0_8px_#3b82f6]',
    tugBarLeftClass: 'bg-gradient-to-r from-blue-800 via-blue-500 to-blue-300 shadow-[0_0_14px_#3b82f6]',
    tugBarRightClass: 'bg-gradient-to-r from-blue-300 via-blue-500 to-blue-800 shadow-[0_0_14px_#3b82f6]',
    winPipActiveClass: 'bg-blue-400 border-blue-300 shadow-[0_0_6px_#3b82f6]',
    glowOrbClass: 'bg-blue-500',
    glowStyle: '0 0 18px rgba(59, 130, 246, 0.55)',
    giftBannerGradientClass:
      'bg-gradient-to-r from-slate-950/95 via-blue-950/90 to-slate-950/95 border-blue-400/90 shadow-[0_0_28px_rgba(59,130,246,0.55)]',
    rosterCardActiveClass:
      'bg-gradient-to-r from-blue-950/80 to-slate-950/75 border-blue-400/80 shadow-[0_0_10px_rgba(59,130,246,0.4)]',
    summonPortalBorderClass: 'border-blue-400/80',
    avatarInitialsBgClass: 'bg-blue-900 text-blue-200',
    avatarFallbackIconClass: 'text-blue-400',
    likeBadgeBorderClass: 'border-blue-500/45',
    chatAvatarClass: 'bg-blue-500 text-white',
  },
  red: {
    id: 'red',
    labelVi: 'Đỏ Rực',
    labelEn: 'Fierce Red',
    primaryHex: '#f87171',
    secondaryHex: '#ef4444',
    accentHex: '#dc2626',
    critHex: '#fca5a5',
    swatchClass: 'bg-red-500',
    textClass: 'text-red-300',
    textStrongClass: 'text-red-400',
    textMutedClass: 'text-red-200',
    borderClass: 'border-red-400/80',
    borderSoftClass: 'border-red-500/60',
    borderSubtleClass: 'border-red-800/50',
    bgSoftClass: 'bg-red-950/80',
    bgBadgeClass: 'bg-red-400 text-slate-950',
    badgePillClass: 'bg-red-950 text-red-300 border border-red-800/60',
    pillButtonClass: 'bg-red-950/80 border-red-500/60 text-red-300',
    adminActiveBtnClass: 'bg-red-500 text-white shadow-[0_0_8px_#ef4444]',
    tugBarLeftClass: 'bg-gradient-to-r from-red-800 via-red-500 to-red-300 shadow-[0_0_14px_#ef4444]',
    tugBarRightClass: 'bg-gradient-to-r from-red-300 via-red-500 to-red-800 shadow-[0_0_14px_#ef4444]',
    winPipActiveClass: 'bg-red-400 border-red-300 shadow-[0_0_6px_#ef4444]',
    glowOrbClass: 'bg-red-500',
    glowStyle: '0 0 18px rgba(239, 68, 68, 0.55)',
    giftBannerGradientClass:
      'bg-gradient-to-r from-slate-950/95 via-red-950/90 to-slate-950/95 border-red-400/90 shadow-[0_0_28px_rgba(239,68,68,0.55)]',
    rosterCardActiveClass:
      'bg-gradient-to-r from-red-950/80 to-slate-950/75 border-red-400/80 shadow-[0_0_10px_rgba(239,68,68,0.4)]',
    summonPortalBorderClass: 'border-red-400/80',
    avatarInitialsBgClass: 'bg-red-900 text-red-200',
    avatarFallbackIconClass: 'text-red-400',
    likeBadgeBorderClass: 'border-red-500/45',
    chatAvatarClass: 'bg-red-500 text-white',
  },
};

export const TEAM_COLOR_THEME_OPTIONS: TeamColorPalette[] = Object.values(TEAM_COLOR_THEMES);

export const getTeamTheme = (themeId?: TeamColorThemeId): TeamColorPalette => {
  if (themeId && TEAM_COLOR_THEMES[themeId]) {
    return TEAM_COLOR_THEMES[themeId];
  }
  return TEAM_COLOR_THEMES.cyan;
};

export const HOT_MATCHUPS: readonly HotMatchupPreset[] = [
  { id: 't1-blg', label: 'T1 vs BLG', leftTeamId: 'preset-t1', rightTeamId: 'preset-blg' },
  { id: 't1-gen', label: 'T1 vs GEN', leftTeamId: 'preset-t1', rightTeamId: 'preset-geng' },
  { id: 'blg-gen', label: 'BLG vs GEN', leftTeamId: 'preset-blg', rightTeamId: 'preset-geng' },
  { id: 'hle-t1', label: 'HLE vs T1', leftTeamId: 'preset-hle', rightTeamId: 'preset-t1' },
  { id: 'gam-g2', label: 'GAM vs G2', leftTeamId: 'preset-gam', rightTeamId: 'preset-g2' },
  { id: 'tes-al', label: 'TES vs AL', leftTeamId: 'preset-tes', rightTeamId: 'preset-al' },
];

const createChampionPortrait = createChampionPortraitUrl;
const PLAYER_ROLE_LABEL_VI = PLAYER_ROLE_LABEL_MAP;

export const PRESET_TEAMS: TeamProfile[] = [
  {
    id: 'preset-blg',
    name: 'Bilibili Gaming',
    shortTag: 'BLG',
    aliases: ['BLG', 'BILIBILI'],
    colorTheme: 'cyan',
    logoUrl: '/images/teams/blg.png',
    isPreset: true,
    roster: [
      {
        id: 'blg-bin',
        name: 'Bin',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Jax',
        championKey: 'Jax',
        team: 'BLG',
        color: '#38bdf8',
        avatarUrl: '/images/players/bin.png',
      },
      {
        id: 'blg-xun',
        name: 'Xun',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Xin Zhao',
        championKey: 'XinZhao',
        team: 'BLG',
        color: '#06b6d4',
        avatarUrl: '/images/players/xun.png',
      },
      {
        id: 'blg-knight',
        name: 'Knight',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Ahri',
        championKey: 'Ahri',
        team: 'BLG',
        color: '#60a5fa',
        avatarUrl: '/images/players/knight.png',
      },
      {
        id: 'blg-elk',
        name: 'Elk',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Kalista',
        championKey: 'Kalista',
        team: 'BLG',
        color: '#22d3ee',
        avatarUrl: createChampionPortrait('Kalista'),
      },
      {
        id: 'blg-on',
        name: 'ON',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Rakan',
        championKey: 'Rakan',
        team: 'BLG',
        color: '#34d399',
        avatarUrl: '/images/players/on.png',
      },
    ],
  },
  {
    id: 'preset-geng',
    name: 'Gen.G Esports',
    shortTag: 'GEN',
    aliases: ['GEN', 'GENG', 'GEN.G'],
    colorTheme: 'amber',
    logoUrl: '/images/teams/geng.svg',
    isPreset: true,
    roster: [
      {
        id: 'gen-kiin',
        name: 'Kiin',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: "K'Sante",
        championKey: 'KSante',
        team: 'GENG',
        color: '#f59e0b',
        avatarUrl: '/images/players/kiin.png',
      },
      {
        id: 'gen-canyon',
        name: 'Canyon',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Nidalee',
        championKey: 'Nidalee',
        team: 'GENG',
        color: '#fbbf24',
        avatarUrl: '/images/players/canyon.png',
      },
      {
        id: 'gen-chovy',
        name: 'Chovy',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Yone',
        championKey: 'Yone',
        team: 'GENG',
        color: '#eab308',
        avatarUrl: '/images/players/chovy.png',
      },
      {
        id: 'gen-ruler',
        name: 'Ruler',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Ezreal',
        championKey: 'Ezreal',
        team: 'GENG',
        color: '#f97316',
        avatarUrl: '/images/players/ruler.png',
      },
      {
        id: 'gen-duro',
        name: 'Duro',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Nautilus',
        championKey: 'Nautilus',
        team: 'GENG',
        color: '#d97706',
        avatarUrl: '/images/players/duro.png',
      },
    ],
  },
  {
    id: 'preset-t1',
    name: 'T1',
    shortTag: 'T1',
    aliases: ['T1', 'SKT', 'FAKER'],
    colorTheme: 'rose',
    logoUrl: '/images/teams/t1.svg',
    isPreset: true,
    roster: [
      {
        id: 't1-doran',
        name: 'Doran',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Ambessa',
        championKey: 'Ambessa',
        team: 'BLG',
        color: '#fb7185',
        avatarUrl: createChampionPortrait('Ambessa'),
      },
      {
        id: 't1-oner',
        name: 'Oner',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Vi',
        championKey: 'Vi',
        team: 'BLG',
        color: '#f43f5e',
        avatarUrl: createChampionPortrait('Vi'),
      },
      {
        id: 't1-faker',
        name: 'Faker',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Azir',
        championKey: 'Azir',
        team: 'BLG',
        color: '#e11d48',
        avatarUrl: createChampionPortrait('Azir'),
      },
      {
        id: 't1-gumayusi',
        name: 'Gumayusi',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Jinx',
        championKey: 'Jinx',
        team: 'BLG',
        color: '#fb7185',
        avatarUrl: createChampionPortrait('Jinx'),
      },
      {
        id: 't1-keria',
        name: 'Keria',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Thresh',
        championKey: 'Thresh',
        team: 'BLG',
        color: '#fda4af',
        avatarUrl: createChampionPortrait('Thresh'),
      },
    ],
  },
  {
    id: 'preset-hle',
    name: 'Hanwha Life Esports',
    shortTag: 'HLE',
    aliases: ['HLE', 'HANWHA'],
    colorTheme: 'orange',
    logoUrl: '/images/teams/hle.svg',
    isPreset: true,
    roster: [
      {
        id: 'hle-zeus',
        name: 'Zeus',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Aatrox',
        championKey: 'Aatrox',
        team: 'GENG',
        color: '#fb923c',
        avatarUrl: createChampionPortrait('Aatrox'),
      },
      {
        id: 'hle-peanut',
        name: 'Peanut',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Sejuani',
        championKey: 'Sejuani',
        team: 'GENG',
        color: '#f97316',
        avatarUrl: createChampionPortrait('Sejuani'),
      },
      {
        id: 'hle-zeka',
        name: 'Zeka',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Sylas',
        championKey: 'Sylas',
        team: 'GENG',
        color: '#fdba74',
        avatarUrl: createChampionPortrait('Sylas'),
      },
      {
        id: 'hle-viper',
        name: 'Viper',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: "Kai'Sa",
        championKey: 'Kaisa',
        team: 'GENG',
        color: '#ea580c',
        avatarUrl: '/images/players/viper.png',
      },
      {
        id: 'hle-delight',
        name: 'Delight',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Rell',
        championKey: 'Rell',
        team: 'GENG',
        color: '#fb923c',
        avatarUrl: createChampionPortrait('Rell'),
      },
    ],
  },
  {
    id: 'preset-tes',
    name: 'Top Esports',
    shortTag: 'TES',
    aliases: ['TES', 'TOP ESPORTS'],
    colorTheme: 'red',
    logoUrl: '/images/teams/tes.png',
    isPreset: true,
    roster: [
      {
        id: 'tes-369',
        name: '369',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Renekton',
        championKey: 'Renekton',
        team: 'BLG',
        color: '#f87171',
        avatarUrl: createChampionPortrait('Renekton'),
      },
      {
        id: 'tes-kanavi',
        name: 'Kanavi',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Wukong',
        championKey: 'MonkeyKing',
        team: 'BLG',
        color: '#ef4444',
        avatarUrl: createChampionPortrait('MonkeyKing'),
      },
      {
        id: 'tes-creme',
        name: 'Creme',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Akali',
        championKey: 'Akali',
        team: 'BLG',
        color: '#fca5a5',
        avatarUrl: createChampionPortrait('Akali'),
      },
      {
        id: 'tes-jackeylove',
        name: 'JackeyLove',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Draven',
        championKey: 'Draven',
        team: 'BLG',
        color: '#dc2626',
        avatarUrl: createChampionPortrait('Draven'),
      },
      {
        id: 'tes-crisp',
        name: 'Crisp',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Nautilus',
        championKey: 'Nautilus',
        team: 'BLG',
        color: '#f87171',
        avatarUrl: createChampionPortrait('Nautilus'),
      },
    ],
  },
  {
    id: 'preset-al',
    name: "Anyone's Legend",
    shortTag: 'AL',
    aliases: ['AL', 'ANYONE'],
    colorTheme: 'violet',
    logoUrl: '/images/teams/al.webp',
    isPreset: true,
    roster: [
      {
        id: 'al-flandre',
        name: 'Flandre',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Gnar',
        championKey: 'Gnar',
        team: 'GENG',
        color: '#a78bfa',
        avatarUrl: createChampionPortrait('Gnar'),
      },
      {
        id: 'al-tarzan',
        name: 'Tarzan',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Lee Sin',
        championKey: 'LeeSin',
        team: 'GENG',
        color: '#8b5cf6',
        avatarUrl: createChampionPortrait('LeeSin'),
      },
      {
        id: 'al-shanks',
        name: 'Shanks',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Orianna',
        championKey: 'Orianna',
        team: 'GENG',
        color: '#c4b5fd',
        avatarUrl: createChampionPortrait('Orianna'),
      },
      {
        id: 'al-hope',
        name: 'Hope',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Lucian',
        championKey: 'Lucian',
        team: 'GENG',
        color: '#7c3aed',
        avatarUrl: createChampionPortrait('Lucian'),
      },
      {
        id: 'al-kael',
        name: 'Kael',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Alistar',
        championKey: 'Alistar',
        team: 'GENG',
        color: '#a78bfa',
        avatarUrl: createChampionPortrait('Alistar'),
      },
    ],
  },
  {
    id: 'preset-dk',
    name: 'Dplus KIA',
    shortTag: 'DK',
    aliases: ['DK', 'DPLUS', 'DAMWON'],
    colorTheme: 'blue',
    logoUrl: '/images/teams/dk.svg',
    isPreset: true,
    roster: [
      {
        id: 'dk-siwoo',
        name: 'Siwoo',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Camille',
        championKey: 'Camille',
        team: 'BLG',
        color: '#60a5fa',
        avatarUrl: createChampionPortrait('Camille'),
      },
      {
        id: 'dk-lucid',
        name: 'Lucid',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Viego',
        championKey: 'Viego',
        team: 'BLG',
        color: '#3b82f6',
        avatarUrl: createChampionPortrait('Viego'),
      },
      {
        id: 'dk-showmaker',
        name: 'ShowMaker',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'LeBlanc',
        championKey: 'Leblanc',
        team: 'BLG',
        color: '#93c5fd',
        avatarUrl: createChampionPortrait('Leblanc'),
      },
      {
        id: 'dk-aiming',
        name: 'Aiming',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Zeri',
        championKey: 'Zeri',
        team: 'BLG',
        color: '#2563eb',
        avatarUrl: createChampionPortrait('Zeri'),
      },
      {
        id: 'dk-beryl',
        name: 'BeryL',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Braum',
        championKey: 'Braum',
        team: 'BLG',
        color: '#60a5fa',
        avatarUrl: createChampionPortrait('Braum'),
      },
    ],
  },
  {
    id: 'preset-gam',
    name: 'GAM Esports',
    shortTag: 'GAM',
    aliases: ['GAM', 'GIGABYTE', 'VCS'],
    colorTheme: 'amber',
    logoUrl: '/images/teams/gam.png',
    isPreset: true,
    roster: [
      {
        id: 'gam-kiaya',
        name: 'Kiaya',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Garen',
        championKey: 'Garen',
        team: 'BLG',
        color: '#facc15',
        avatarUrl: createChampionPortrait('Garen'),
      },
      {
        id: 'gam-levi',
        name: 'Levi',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Karthus',
        championKey: 'Karthus',
        team: 'BLG',
        color: '#eab308',
        avatarUrl: createChampionPortrait('Karthus'),
      },
      {
        id: 'gam-aress',
        name: 'Aress',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Syndra',
        championKey: 'Syndra',
        team: 'BLG',
        color: '#fde047',
        avatarUrl: createChampionPortrait('Syndra'),
      },
      {
        id: 'gam-artemis',
        name: 'Artemis',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Aphelios',
        championKey: 'Aphelios',
        team: 'BLG',
        color: '#f59e0b',
        avatarUrl: createChampionPortrait('Aphelios'),
      },
      {
        id: 'gam-elio',
        name: 'Elio',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Leona',
        championKey: 'Leona',
        team: 'BLG',
        color: '#fbbf24',
        avatarUrl: createChampionPortrait('Leona'),
      },
    ],
  },
  {
    id: 'preset-g2',
    name: 'G2 Esports',
    shortTag: 'G2',
    aliases: ['G2', 'SAMURAI'],
    colorTheme: 'rose',
    logoUrl: '/images/teams/g2.svg',
    isPreset: true,
    roster: [
      {
        id: 'g2-bb',
        name: 'BrokenBlade',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Darius',
        championKey: 'Darius',
        team: 'GENG',
        color: '#fb7185',
        avatarUrl: createChampionPortrait('Darius'),
      },
      {
        id: 'g2-skewmond',
        name: 'SkewMond',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Jarvan IV',
        championKey: 'JarvanIV',
        team: 'GENG',
        color: '#f43f5e',
        avatarUrl: createChampionPortrait('JarvanIV'),
      },
      {
        id: 'g2-caps',
        name: 'Caps',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Yasuo',
        championKey: 'Yasuo',
        team: 'GENG',
        color: '#e11d48',
        avatarUrl: createChampionPortrait('Yasuo'),
      },
      {
        id: 'g2-hans',
        name: 'Hans Sama',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Miss Fortune',
        championKey: 'MissFortune',
        team: 'GENG',
        color: '#fda4af',
        avatarUrl: createChampionPortrait('MissFortune'),
      },
      {
        id: 'g2-labrov',
        name: 'Labrov',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Pyke',
        championKey: 'Pyke',
        team: 'GENG',
        color: '#fb7185',
        avatarUrl: createChampionPortrait('Pyke'),
      },
    ],
  },
  {
    id: 'preset-fly',
    name: 'FlyQuest',
    shortTag: 'FLY',
    aliases: ['FLY', 'FLYQUEST'],
    colorTheme: 'emerald',
    logoUrl: '/images/teams/fly.svg',
    isPreset: true,
    roster: [
      {
        id: 'fly-bwipo',
        name: 'Bwipo',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Mordekaiser',
        championKey: 'Mordekaiser',
        team: 'GENG',
        color: '#34d399',
        avatarUrl: createChampionPortrait('Mordekaiser'),
      },
      {
        id: 'fly-inspired',
        name: 'Inspired',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Nocturne',
        championKey: 'Nocturne',
        team: 'GENG',
        color: '#10b981',
        avatarUrl: createChampionPortrait('Nocturne'),
      },
      {
        id: 'fly-quad',
        name: 'Quad',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Hwei',
        championKey: 'Hwei',
        team: 'GENG',
        color: '#6ee7b7',
        avatarUrl: createChampionPortrait('Hwei'),
      },
      {
        id: 'fly-massu',
        name: 'Massu',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Sivir',
        championKey: 'Sivir',
        team: 'GENG',
        color: '#059669',
        avatarUrl: createChampionPortrait('Sivir'),
      },
      {
        id: 'fly-busio',
        name: 'Busio',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Bard',
        championKey: 'Bard',
        team: 'GENG',
        color: '#34d399',
        avatarUrl: createChampionPortrait('Bard'),
      },
    ],
  },
];

export const mountTeamToSlot = (team: TeamProfile, slot: TeamType): TeamProfile => ({
  ...team,
  aliases: [...team.aliases],
  autoSyncRosterAliases: team.autoSyncRosterAliases ?? true,
  roster: team.roster.map((player, index) => ({
    ...player,
    id: `${slot.toLowerCase()}-${team.id}-${player.role.toLowerCase()}-${index}`,
    team: slot,
  })),
});

export const createDefaultTeamConfig = (): TeamConfigState => {
  const catalog = PRESET_TEAMS.map((t) => ({
    ...t,
    aliases: [...t.aliases],
    autoSyncRosterAliases: true,
    roster: t.roster.map((p) => ({ ...p })),
  }));
  return {
    activeTeams: {
      [TEAM_KEY.BLG]: mountTeamToSlot(catalog[0], TEAM_KEY.BLG),
      [TEAM_KEY.GENG]: mountTeamToSlot(catalog[1], TEAM_KEY.GENG),
    },
    teamCatalog: catalog,
    matchQueue: [],
  };
};

export const getPresetTeamTemplate = (teamId: string): TeamProfile | undefined => {
  const preset = PRESET_TEAMS.find((item) => item.id === teamId);
  return preset ? mountTeamToSlot(preset, TEAM_KEY.BLG) : undefined;
};

export const createDuplicateTeamTemplate = (
  source: TeamProfile,
  copySuffix = 'Copy'
): TeamProfile => {
  const uid = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
  const cleanName = `${source.name} (${copySuffix})`.slice(0, 40);
  return {
    ...source,
    id: uid,
    name: cleanName,
    isPreset: false,
    autoSyncRosterAliases: source.autoSyncRosterAliases ?? true,
    aliases: [...source.aliases],
    roster: source.roster.map((p, idx) => ({
      ...p,
      id: `${uid}-${p.role.toLowerCase()}-${idx}`,
    })),
  };
};

export const createCustomTeamTemplate = (seedName = 'Đội Tuyển Mới'): TeamProfile => {
  const defaultRoster = [
    { name: 'Player 1', role: 'TOP' as PlayerRole, champ: 'Aatrox', key: 'Aatrox', color: '#38bdf8' },
    { name: 'Player 2', role: 'JUG' as PlayerRole, champ: 'Lee Sin', key: 'LeeSin', color: '#22d3ee' },
    { name: 'Player 3', role: 'MID' as PlayerRole, champ: 'Ahri', key: 'Ahri', color: '#60a5fa' },
    { name: 'Player 4', role: 'ADC' as PlayerRole, champ: 'Jinx', key: 'Jinx', color: '#f59e0b' },
    { name: 'Player 5', role: 'SUP' as PlayerRole, champ: 'Thresh', key: 'Thresh', color: '#34d399' },
  ];
  const uid = `custom-${Date.now().toString(36)}`;
  return {
    id: uid,
    name: seedName,
    shortTag: 'NEW',
    aliases: ['NEW'],
    colorTheme: 'violet',
    logoUrl: '',
    isPreset: false,
    roster: defaultRoster.map((item, idx) => ({
      id: `${uid}-${item.role.toLowerCase()}-${idx}`,
      name: item.name,
      role: item.role,
      roleName: PLAYER_ROLE_LABEL_MAP[item.role],
      signatureChampion: item.champ,
      championKey: item.key,
      team: TEAM_KEY.BLG,
      color: item.color,
      avatarUrl: createChampionPortraitUrl(item.key),
    })),
  };
};

const VALID_THEME_IDS = new Set<TeamColorThemeId>(Object.keys(TEAM_COLOR_THEMES) as TeamColorThemeId[]);

export const sanitizeMediaUrl = (rawUrl: unknown, fallbackUrl: string): string => {
  if (typeof rawUrl !== 'string') return fallbackUrl;
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) {
    if (
      DATA_IMAGE_URI_PREFIX_REGEX.test(trimmed) &&
      trimmed.length <= TEAM_DATA_LIMITS.MAX_BASE64_MEDIA_LENGTH
    ) {
      return trimmed;
    }
    return fallbackUrl;
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed.slice(0, 2048);
  }
  return fallbackUrl;
};

const sanitizePlayer = (
  raw: unknown,
  fallback: TeamPlayerProfile,
  slot: TeamType
): TeamPlayerProfile => {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback, team: slot };
  }
  const src = raw as Record<string, unknown>;
  const role: PlayerRole =
    src.role === 'TOP' ||
    src.role === 'JUG' ||
    src.role === 'MID' ||
    src.role === 'ADC' ||
    src.role === 'SUP'
      ? src.role
      : fallback.role;
  const signatureChampion =
    typeof src.signatureChampion === 'string' && src.signatureChampion.trim()
      ? src.signatureChampion.trim().slice(0, 40)
      : fallback.signatureChampion;
  const championKey =
    typeof src.championKey === 'string' && src.championKey.trim()
      ? src.championKey.trim().slice(0, 40)
      : fallback.championKey;
  const name =
    typeof src.name === 'string' && src.name.trim()
      ? src.name.trim().slice(0, 32)
      : fallback.name;
  const avatarUrl =
    typeof src.avatarUrl === 'string' && src.avatarUrl.trim()
      ? sanitizeMediaUrl(src.avatarUrl, createChampionPortraitUrl(championKey))
      : createChampionPortraitUrl(championKey);

  return {
    id: typeof src.id === 'string' && src.id.trim() ? src.id.trim().slice(0, 64) : fallback.id,
    name,
    role,
    roleName:
      typeof src.roleName === 'string' && src.roleName.trim()
        ? src.roleName.trim().slice(0, 24)
        : PLAYER_ROLE_LABEL_MAP[role],
    signatureChampion,
    championKey,
    team: slot,
    color:
      typeof src.color === 'string' && src.color.trim()
        ? src.color.trim().slice(0, 20)
        : fallback.color,
    avatarUrl,
  };
};

export const sanitizeTeamProfile = (
  raw: unknown,
  fallback: TeamProfile,
  slot: TeamType = TEAM_KEY.BLG
): TeamProfile => {
  if (!raw || typeof raw !== 'object') {
    return mountTeamToSlot(fallback, slot);
  }
  const src = raw as Record<string, unknown>;
  const id = typeof src.id === 'string' && src.id.trim() ? src.id.trim().slice(0, 64) : fallback.id;
  const name =
    typeof src.name === 'string' && src.name.trim() ? src.name.trim().slice(0, 40) : fallback.name;
  const shortTag =
    typeof src.shortTag === 'string' && src.shortTag.trim()
      ? src.shortTag.trim().toUpperCase().slice(0, 8)
      : fallback.shortTag;
  const rawAliases = Array.isArray(src.aliases) ? src.aliases : fallback.aliases;
  const aliases = Array.from(
    new Set(
      [
        shortTag,
        ...rawAliases
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim().toUpperCase()),
      ].filter(Boolean)
    )
  ).slice(0, TEAM_DATA_LIMITS.MAX_ALIASES);

  const colorTheme = VALID_THEME_IDS.has(src.colorTheme as TeamColorThemeId)
    ? (src.colorTheme as TeamColorThemeId)
    : fallback.colorTheme;
  const logoUrl =
    typeof src.logoUrl === 'string'
      ? sanitizeMediaUrl(src.logoUrl, fallback.logoUrl)
      : fallback.logoUrl;
  const rawRoster = Array.isArray(src.roster) ? src.roster : [];
  const roster = fallback.roster.map((fallbackPlayer, index) =>
    sanitizePlayer(rawRoster[index], fallbackPlayer, slot)
  );

  return mountTeamToSlot(
    {
      id,
      name,
      shortTag,
      aliases,
      autoSyncRosterAliases:
        typeof src.autoSyncRosterAliases === 'boolean'
          ? src.autoSyncRosterAliases
          : fallback.autoSyncRosterAliases ?? true,
      colorTheme,
      logoUrl,
      isPreset: typeof src.isPreset === 'boolean' ? src.isPreset : fallback.isPreset,
      roster,
    },
    slot
  );
};

export const sanitizeMatchQueue = (
  rawQueue: unknown,
  catalog: TeamProfile[]
): QueuedMatchup[] => {
  if (!Array.isArray(rawQueue)) return [];
  const teamById = new Map(catalog.map((team) => [team.id, team]));
  const result: QueuedMatchup[] = [];
  for (let i = 0; i < rawQueue.length && result.length < TEAM_DATA_LIMITS.MAX_QUEUE_ITEMS; i++) {
    const item = rawQueue[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    const leftTeamId = typeof item.leftTeamId === 'string' ? item.leftTeamId.trim() : '';
    const rightTeamId = typeof item.rightTeamId === 'string' ? item.rightTeamId.trim() : '';
    const leftTeam = teamById.get(leftTeamId);
    const rightTeam = teamById.get(rightTeamId);
    if (!leftTeam || !rightTeam) continue;
    const id =
      typeof item.id === 'string' && item.id.trim()
        ? item.id.trim().slice(0, 64)
        : `q-${i}-${leftTeamId}-${rightTeamId}`;
    const label =
      typeof item.label === 'string' && item.label.trim()
        ? item.label.trim().slice(0, 48)
        : `${leftTeam.shortTag} vs ${rightTeam.shortTag}`;
    result.push({ id, label, leftTeamId, rightTeamId });
  }
  return result;
};

export const sanitizeTeamConfigState = (raw: unknown): TeamConfigState | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const defaults = createDefaultTeamConfig();
  const src = raw as Record<string, unknown>;
  const rawActive = (src.activeTeams || {}) as Record<string, unknown>;
  const left = sanitizeTeamProfile(rawActive[TEAM_KEY.BLG], defaults.activeTeams[TEAM_KEY.BLG], TEAM_KEY.BLG);
  const right = sanitizeTeamProfile(rawActive[TEAM_KEY.GENG], defaults.activeTeams[TEAM_KEY.GENG], TEAM_KEY.GENG);

  const rawCatalog = Array.isArray(src.teamCatalog) ? src.teamCatalog : [];
  const catalogMap = new Map<string, TeamProfile>();
  for (const preset of defaults.teamCatalog) {
    catalogMap.set(preset.id, preset);
  }
  for (const item of rawCatalog) {
    if (catalogMap.size >= TEAM_DATA_LIMITS.MAX_CATALOG_ITEMS) break;
    const cleanItem = sanitizeTeamProfile(item, defaults.activeTeams[TEAM_KEY.BLG], TEAM_KEY.BLG);
    catalogMap.set(cleanItem.id, cleanItem);
  }

  const catalog = Array.from(catalogMap.values());
  return {
    activeTeams: {
      [TEAM_KEY.BLG]: left,
      [TEAM_KEY.GENG]: right,
    },
    teamCatalog: catalog,
    matchQueue: sanitizeMatchQueue(src.matchQueue, catalog),
  };
};

const compactChampionName = (rawName: string): string => {
  const compact = normalizeMatchText(rawName).replace(/[^A-Z0-9]/g, '');
  return compact === 'MONKEYKING' ? 'WUKONG' : compact;
};

export const findExactSignaturePlayer = (
  championName: string,
  roster: TeamPlayerProfile[]
): TeamPlayerProfile | undefined => {
  if (!championName || !roster || roster.length === 0) return undefined;
  const target = compactChampionName(championName);
  if (!target) return undefined;
  return roster.find((player) => {
    const sigMatch = compactChampionName(player.signatureChampion) === target;
    const keyMatch = compactChampionName(player.championKey) === target;
    return sigMatch || keyMatch;
  });
};

export const getEffectiveTeamKeywords = (team: TeamProfile): string[] => {
  const baseKeywords = [team.shortTag, ...team.aliases, team.name];
  if (team.autoSyncRosterAliases === false) {
    return Array.from(new Set(baseKeywords.map((kw) => kw.trim()).filter(Boolean)));
  }
  const rosterNames = team.roster.map((player) => player.name);
  return Array.from(
    new Set([...baseKeywords, ...rosterNames].map((kw) => kw.trim()).filter(Boolean))
  );
};

export const findTeamAliasConflicts = (
  leftTeam: TeamProfile,
  rightTeam: TeamProfile
): string[] => {
  const leftSet = new Set(
    getEffectiveTeamKeywords(leftTeam)
      .map((kw) => normalizeMatchText(kw).replace(/\./g, ''))
      .filter(Boolean)
  );
  const conflicts: string[] = [];
  const seen = new Set<string>();
  for (const rawKw of getEffectiveTeamKeywords(rightTeam)) {
    const norm = normalizeMatchText(rawKw).replace(/\./g, '');
    if (norm && leftSet.has(norm) && !seen.has(norm)) {
      seen.add(norm);
      conflicts.push(rawKw.trim());
    }
  }
  return conflicts;
};

export const buildTeamPackExport = (config: TeamConfigState): TeamPackExport => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  teams: config.teamCatalog,
  matchQueue: config.matchQueue,
});

export const parseImportedTeamPack = (
  rawJsonText: string,
  currentCatalog: TeamProfile[]
): { teams: TeamProfile[]; matchQueue: QueuedMatchup[] } | null => {
  try {
    const parsed = JSON.parse(rawJsonText) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const fallback = PRESET_TEAMS[0];
    let rawTeams: unknown[] = [];
    let rawQueue: unknown[] = [];

    if (Array.isArray(parsed)) {
      rawTeams = parsed;
    } else {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.teams)) {
        rawTeams = obj.teams;
      } else if (Array.isArray(obj.teamCatalog)) {
        rawTeams = obj.teamCatalog;
      }
      if (Array.isArray(obj.matchQueue)) {
        rawQueue = obj.matchQueue;
      }
    }

    if (rawTeams.length === 0) return null;
    const teams = rawTeams
      .slice(0, TEAM_DATA_LIMITS.MAX_CATALOG_ITEMS)
      .map((item) => sanitizeTeamProfile(item, fallback, TEAM_KEY.BLG));
    const mergedCatalog = [...currentCatalog];
    const seenIds = new Set(mergedCatalog.map((t) => t.id));
    for (const item of teams) {
      if (!seenIds.has(item.id)) {
        mergedCatalog.push(item);
        seenIds.add(item.id);
      }
    }
    return {
      teams,
      matchQueue: sanitizeMatchQueue(rawQueue, mergedCatalog),
    };
  } catch {
    return null;
  }
};

export const findRosterPlayerInRoster = (
  championName: string,
  roster: TeamPlayerProfile[]
): TeamPlayerProfile | undefined => {
  if (!roster || roster.length === 0) return undefined;
  const norm = championName.trim().toLowerCase();
  const matched = roster.find(
    (p) =>
      norm.includes(p.name.toLowerCase()) ||
      norm.includes(p.signatureChampion.toLowerCase()) ||
      p.signatureChampion.toLowerCase().includes(norm)
  );
  if (matched) return matched;
  return roster[Math.floor(Math.random() * roster.length)];
};

export const findSignatureChampionByPlayer = (input: string): string | undefined => {
  if (!input || !input.trim()) return undefined;
  const norm = input.trim().toLowerCase();

  for (const team of PRESET_TEAMS) {
    const matched = team.roster.find(
      (p) => p.name.toLowerCase() === norm || norm.includes(p.name.toLowerCase())
    );
    if (matched?.signatureChampion) {
      return matched.signatureChampion;
    }
  }

  return undefined;
};

const normalizeMatchText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .trim();

const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findKeywordMatchIndex = (normalizedText: string, keywords: string[]): number => {
  const sorted = [...keywords]
    .map((k) => normalizeMatchText(k))
    .filter((k) => k.length > 0)
    .sort((a, b) => b.length - a.length);

  let bestIndex = -1;
  const compactText = normalizedText.replace(/\./g, '');

  for (const kw of sorted) {
    const compactKw = kw.replace(/\./g, '');
    const boundaryRegex = new RegExp(`(?:^|[^A-Z0-9])${escapeRegExp(compactKw)}(?:$|[^A-Z0-9])`);
    const boundaryMatch = boundaryRegex.exec(compactText);
    if (boundaryMatch) {
      const idx = boundaryMatch.index;
      if (bestIndex === -1 || idx < bestIndex) {
        bestIndex = idx;
      }
      continue;
    }

    if (compactKw.length >= 3) {
      const subIdx = compactText.indexOf(compactKw);
      if (subIdx !== -1 && (bestIndex === -1 || subIdx < bestIndex)) {
        bestIndex = subIdx;
      }
    }
  }

  return bestIndex;
};

export const matchCommentTeam = (
  comment: string,
  activeTeams: ActiveTeamsMap
): TeamType | undefined => {
  if (!comment || !comment.trim()) return undefined;
  const normalized = normalizeMatchText(comment);
  const leftKeywords = getEffectiveTeamKeywords(activeTeams[TEAM_KEY.BLG]);
  const rightKeywords = getEffectiveTeamKeywords(activeTeams[TEAM_KEY.GENG]);

  const leftIdx = findKeywordMatchIndex(normalized, leftKeywords);
  const rightIdx = findKeywordMatchIndex(normalized, rightKeywords);

  if (leftIdx === -1 && rightIdx === -1) return undefined;
  if (leftIdx !== -1 && rightIdx === -1) return TEAM_KEY.BLG;
  if (rightIdx !== -1 && leftIdx === -1) return TEAM_KEY.GENG;
  return leftIdx <= rightIdx ? TEAM_KEY.BLG : TEAM_KEY.GENG;
};
