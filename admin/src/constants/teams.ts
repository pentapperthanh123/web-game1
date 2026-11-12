export type TeamSlotKey = 'BLG' | 'GENG';

export type TeamColorThemeId =
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'orange'
  | 'violet'
  | 'emerald'
  | 'blue'
  | 'red';

export type PlayerRole = 'TOP' | 'JUG' | 'MID' | 'ADC' | 'SUP';

export interface TeamPlayerProfile {
  id: string;
  name: string;
  role: PlayerRole;
  roleName: string;
  signatureChampion: string;
  championKey: string;
  team: TeamSlotKey;
  color: string;
  avatarUrl: string;
}

export interface TeamProfile {
  id: string;
  name: string;
  shortTag: string;
  aliases: string[];
  colorTheme: TeamColorThemeId;
  logoUrl: string;
  isPreset?: boolean;
  roster: TeamPlayerProfile[];
}

export type ActiveTeamsMap = Record<TeamSlotKey, TeamProfile>;

export interface TeamConfigState {
  activeTeams: ActiveTeamsMap;
  teamCatalog: TeamProfile[];
}

export interface TeamColorPalette {
  id: TeamColorThemeId;
  labelVi: string;
  primaryHex: string;
  critHex: string;
  swatchClass: string;
  textClass: string;
  textStrongClass: string;
  borderSoftClass: string;
  pillButtonClass: string;
  adminActiveBtnClass: string;
  likeBtnClass: string;
  likeBurstBtnClass: string;
}

export interface HotMatchupPreset {
  id: string;
  label: string;
  leftTeamId: string;
  rightTeamId: string;
}

export const DDRAGON_CHAMPION_CDN =
  'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion';

export const createChampionPortraitUrl = (championKey: string): string =>
  `${DDRAGON_CHAMPION_CDN}/${championKey}.png`;

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
    primaryHex: '#00f2fe',
    critHex: '#67e8f9',
    swatchClass: 'bg-cyan-400',
    textClass: 'text-cyan-300',
    textStrongClass: 'text-cyan-400',
    borderSoftClass: 'border-cyan-500/60',
    pillButtonClass: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300',
    adminActiveBtnClass: 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_#06b6d4]',
    likeBtnClass: 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80',
    likeBurstBtnClass: 'bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-200 border border-cyan-700/60',
  },
  amber: {
    id: 'amber',
    labelVi: 'Vàng Kim',
    primaryHex: '#fbbf24',
    critHex: '#fde047',
    swatchClass: 'bg-amber-400',
    textClass: 'text-amber-300',
    textStrongClass: 'text-amber-400',
    borderSoftClass: 'border-amber-500/60',
    pillButtonClass: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
    adminActiveBtnClass: 'bg-amber-500 text-slate-950 shadow-[0_0_8px_#f59e0b]',
    likeBtnClass: 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/80',
    likeBurstBtnClass: 'bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border border-amber-700/60',
  },
  rose: {
    id: 'rose',
    labelVi: 'Đỏ Crimson',
    primaryHex: '#fb7185',
    critHex: '#fda4af',
    swatchClass: 'bg-rose-500',
    textClass: 'text-rose-300',
    textStrongClass: 'text-rose-400',
    borderSoftClass: 'border-rose-500/60',
    pillButtonClass: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
    adminActiveBtnClass: 'bg-rose-500 text-white shadow-[0_0_8px_#f43f5e]',
    likeBtnClass: 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80',
    likeBurstBtnClass: 'bg-rose-900/40 hover:bg-rose-800/60 text-rose-200 border border-rose-700/60',
  },
  orange: {
    id: 'orange',
    labelVi: 'Cam Lửa',
    primaryHex: '#fb923c',
    critHex: '#fdba74',
    swatchClass: 'bg-orange-500',
    textClass: 'text-orange-300',
    textStrongClass: 'text-orange-400',
    borderSoftClass: 'border-orange-500/60',
    pillButtonClass: 'bg-orange-950/80 border-orange-500/60 text-orange-300',
    adminActiveBtnClass: 'bg-orange-500 text-slate-950 shadow-[0_0_8px_#f97316]',
    likeBtnClass: 'bg-orange-950 hover:bg-orange-900 text-orange-300 border border-orange-800/80',
    likeBurstBtnClass: 'bg-orange-900/40 hover:bg-orange-800/60 text-orange-200 border border-orange-700/60',
  },
  violet: {
    id: 'violet',
    labelVi: 'Tím Hư Không',
    primaryHex: '#a78bfa',
    critHex: '#ddd6fe',
    swatchClass: 'bg-violet-500',
    textClass: 'text-violet-300',
    textStrongClass: 'text-violet-400',
    borderSoftClass: 'border-violet-500/60',
    pillButtonClass: 'bg-violet-950/80 border-violet-500/60 text-violet-300',
    adminActiveBtnClass: 'bg-violet-500 text-white shadow-[0_0_8px_#8b5cf6]',
    likeBtnClass: 'bg-violet-950 hover:bg-violet-900 text-violet-300 border border-violet-800/80',
    likeBurstBtnClass: 'bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-700/60',
  },
  emerald: {
    id: 'emerald',
    labelVi: 'Xanh Ngọc',
    primaryHex: '#34d399',
    critHex: '#6ee7b7',
    swatchClass: 'bg-emerald-400',
    textClass: 'text-emerald-300',
    textStrongClass: 'text-emerald-400',
    borderSoftClass: 'border-emerald-500/60',
    pillButtonClass: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
    adminActiveBtnClass: 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_#10b981]',
    likeBtnClass: 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80',
    likeBurstBtnClass: 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-700/60',
  },
  blue: {
    id: 'blue',
    labelVi: 'Xanh Dương',
    primaryHex: '#60a5fa',
    critHex: '#93c5fd',
    swatchClass: 'bg-blue-500',
    textClass: 'text-blue-300',
    textStrongClass: 'text-blue-400',
    borderSoftClass: 'border-blue-500/60',
    pillButtonClass: 'bg-blue-950/80 border-blue-500/60 text-blue-300',
    adminActiveBtnClass: 'bg-blue-500 text-white shadow-[0_0_8px_#3b82f6]',
    likeBtnClass: 'bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/80',
    likeBurstBtnClass: 'bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 border border-blue-700/60',
  },
  red: {
    id: 'red',
    labelVi: 'Đỏ Rực',
    primaryHex: '#f87171',
    critHex: '#fca5a5',
    swatchClass: 'bg-red-500',
    textClass: 'text-red-300',
    textStrongClass: 'text-red-400',
    borderSoftClass: 'border-red-500/60',
    pillButtonClass: 'bg-red-950/80 border-red-500/60 text-red-300',
    adminActiveBtnClass: 'bg-red-500 text-white shadow-[0_0_8px_#ef4444]',
    likeBtnClass: 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/80',
    likeBurstBtnClass: 'bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-700/60',
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

export const PRESET_TEAMS: TeamProfile[] = [
  {
    id: 'preset-blg',
    name: 'Bilibili Gaming',
    shortTag: 'BLG',
    aliases: ['BLG', 'BILIBILI'],
    colorTheme: 'cyan',
    logoUrl:
      'https://am-a.akamaihd.net/image?resize=400:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1682322954525_Bilibili_Gaming_logo_20211.png',
    isPreset: true,
    roster: [
      { id: 'blg-bin', name: 'Bin', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: 'Jax', championKey: 'Jax', team: 'BLG', color: '#38bdf8', avatarUrl: '/images/players/bin.png' },
      { id: 'blg-xun', name: 'Xun', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Xin Zhao', championKey: 'XinZhao', team: 'BLG', color: '#06b6d4', avatarUrl: '/images/players/xun.png' },
      { id: 'blg-knight', name: 'Knight', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'Ahri', championKey: 'Ahri', team: 'BLG', color: '#60a5fa', avatarUrl: '/images/players/knight.png' },
      { id: 'blg-viper', name: 'Viper', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: "Kai'Sa", championKey: 'Kaisa', team: 'BLG', color: '#22d3ee', avatarUrl: '/images/players/viper.png' },
      { id: 'blg-on', name: 'ON', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Rakan', championKey: 'Rakan', team: 'BLG', color: '#34d399', avatarUrl: '/images/players/on.png' },
    ],
  },
  {
    id: 'preset-geng',
    name: 'Gen.G Esports',
    shortTag: 'GEN',
    aliases: ['GEN', 'GENG', 'GEN.G'],
    colorTheme: 'amber',
    logoUrl:
      'https://am-a.akamaihd.net/image?resize=400:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1773829250929_GENGLOGO_GOLD.png',
    isPreset: true,
    roster: [
      { id: 'gen-kiin', name: 'Kiin', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: "K'Sante", championKey: 'KSante', team: 'GENG', color: '#f59e0b', avatarUrl: '/images/players/kiin.png' },
      { id: 'gen-canyon', name: 'Canyon', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Nidalee', championKey: 'Nidalee', team: 'GENG', color: '#fbbf24', avatarUrl: '/images/players/canyon.png' },
      { id: 'gen-chovy', name: 'Chovy', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'Yone', championKey: 'Yone', team: 'GENG', color: '#eab308', avatarUrl: '/images/players/chovy.png' },
      { id: 'gen-ruler', name: 'Ruler', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: 'Ezreal', championKey: 'Ezreal', team: 'GENG', color: '#f97316', avatarUrl: '/images/players/ruler.png' },
      { id: 'gen-duro', name: 'Duro', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Nautilus', championKey: 'Nautilus', team: 'GENG', color: '#d97706', avatarUrl: '/images/players/duro.png' },
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
      { id: 't1-doran', name: 'Doran', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: 'Ambessa', championKey: 'Ambessa', team: 'BLG', color: '#fb7185', avatarUrl: createChampionPortraitUrl('Ambessa') },
      { id: 't1-oner', name: 'Oner', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Vi', championKey: 'Vi', team: 'BLG', color: '#f43f5e', avatarUrl: createChampionPortraitUrl('Vi') },
      { id: 't1-faker', name: 'Faker', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'Azir', championKey: 'Azir', team: 'BLG', color: '#e11d48', avatarUrl: createChampionPortraitUrl('Azir') },
      { id: 't1-gumayusi', name: 'Gumayusi', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: 'Jinx', championKey: 'Jinx', team: 'BLG', color: '#fb7185', avatarUrl: createChampionPortraitUrl('Jinx') },
      { id: 't1-keria', name: 'Keria', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Thresh', championKey: 'Thresh', team: 'BLG', color: '#fda4af', avatarUrl: createChampionPortraitUrl('Thresh') },
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
      { id: 'hle-zeus', name: 'Zeus', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: 'Aatrox', championKey: 'Aatrox', team: 'GENG', color: '#fb923c', avatarUrl: createChampionPortraitUrl('Aatrox') },
      { id: 'hle-peanut', name: 'Peanut', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Sejuani', championKey: 'Sejuani', team: 'GENG', color: '#f97316', avatarUrl: createChampionPortraitUrl('Sejuani') },
      { id: 'hle-zeka', name: 'Zeka', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'Sylas', championKey: 'Sylas', team: 'GENG', color: '#fdba74', avatarUrl: createChampionPortraitUrl('Sylas') },
      { id: 'hle-peyz', name: 'Peyz', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: 'Ashe', championKey: 'Ashe', team: 'GENG', color: '#ea580c', avatarUrl: createChampionPortraitUrl('Ashe') },
      { id: 'hle-delight', name: 'Delight', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Rell', championKey: 'Rell', team: 'GENG', color: '#fb923c', avatarUrl: createChampionPortraitUrl('Rell') },
    ],
  },
  {
    id: 'preset-tes',
    name: 'Top Esports',
    shortTag: 'TES',
    aliases: ['TES', 'TOP ESPORTS'],
    colorTheme: 'red',
    logoUrl: '/images/teams/tes.svg',
    isPreset: true,
    roster: [
      { id: 'tes-369', name: '369', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: 'Renekton', championKey: 'Renekton', team: 'BLG', color: '#f87171', avatarUrl: createChampionPortraitUrl('Renekton') },
      { id: 'tes-kanavi', name: 'Kanavi', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Wukong', championKey: 'MonkeyKing', team: 'BLG', color: '#ef4444', avatarUrl: createChampionPortraitUrl('MonkeyKing') },
      { id: 'tes-creme', name: 'Creme', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'Akali', championKey: 'Akali', team: 'BLG', color: '#fca5a5', avatarUrl: createChampionPortraitUrl('Akali') },
      { id: 'tes-jackeylove', name: 'JackeyLove', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: 'Draven', championKey: 'Draven', team: 'BLG', color: '#dc2626', avatarUrl: createChampionPortraitUrl('Draven') },
      { id: 'tes-crisp', name: 'Crisp', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Nautilus', championKey: 'Nautilus', team: 'BLG', color: '#f87171', avatarUrl: createChampionPortraitUrl('Nautilus') },
    ],
  },
  {
    id: 'preset-al',
    name: "Anyone's Legend",
    shortTag: 'AL',
    aliases: ['AL', 'ANYONE'],
    colorTheme: 'violet',
    logoUrl: '/images/teams/al.svg',
    isPreset: true,
    roster: [
      { id: 'al-flandre', name: 'Flandre', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: 'Gnar', championKey: 'Gnar', team: 'GENG', color: '#a78bfa', avatarUrl: createChampionPortraitUrl('Gnar') },
      { id: 'al-tarzan', name: 'Tarzan', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Lee Sin', championKey: 'LeeSin', team: 'GENG', color: '#8b5cf6', avatarUrl: createChampionPortraitUrl('LeeSin') },
      { id: 'al-shanks', name: 'Shanks', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'Orianna', championKey: 'Orianna', team: 'GENG', color: '#c4b5fd', avatarUrl: createChampionPortraitUrl('Orianna') },
      { id: 'al-hope', name: 'Hope', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: 'Lucian', championKey: 'Lucian', team: 'GENG', color: '#7c3aed', avatarUrl: createChampionPortraitUrl('Lucian') },
      { id: 'al-kael', name: 'Kael', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Alistar', championKey: 'Alistar', team: 'GENG', color: '#a78bfa', avatarUrl: createChampionPortraitUrl('Alistar') },
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
      { id: 'dk-siwoo', name: 'Siwoo', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: 'Camille', championKey: 'Camille', team: 'BLG', color: '#60a5fa', avatarUrl: createChampionPortraitUrl('Camille') },
      { id: 'dk-lucid', name: 'Lucid', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Viego', championKey: 'Viego', team: 'BLG', color: '#3b82f6', avatarUrl: createChampionPortraitUrl('Viego') },
      { id: 'dk-showmaker', name: 'ShowMaker', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'LeBlanc', championKey: 'Leblanc', team: 'BLG', color: '#93c5fd', avatarUrl: createChampionPortraitUrl('Leblanc') },
      { id: 'dk-aiming', name: 'Aiming', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: 'Zeri', championKey: 'Zeri', team: 'BLG', color: '#2563eb', avatarUrl: createChampionPortraitUrl('Zeri') },
      { id: 'dk-beryl', name: 'BeryL', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Braum', championKey: 'Braum', team: 'BLG', color: '#60a5fa', avatarUrl: createChampionPortraitUrl('Braum') },
    ],
  },
  {
    id: 'preset-gam',
    name: 'GAM Esports',
    shortTag: 'GAM',
    aliases: ['GAM', 'GIGABYTE', 'VCS'],
    colorTheme: 'amber',
    logoUrl: '/images/teams/gam.svg',
    isPreset: true,
    roster: [
      { id: 'gam-kiaya', name: 'Kiaya', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: 'Garen', championKey: 'Garen', team: 'BLG', color: '#facc15', avatarUrl: createChampionPortraitUrl('Garen') },
      { id: 'gam-levi', name: 'Levi', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Karthus', championKey: 'Karthus', team: 'BLG', color: '#eab308', avatarUrl: createChampionPortraitUrl('Karthus') },
      { id: 'gam-aress', name: 'Aress', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'Syndra', championKey: 'Syndra', team: 'BLG', color: '#fde047', avatarUrl: createChampionPortraitUrl('Syndra') },
      { id: 'gam-artemis', name: 'Artemis', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: 'Aphelios', championKey: 'Aphelios', team: 'BLG', color: '#f59e0b', avatarUrl: createChampionPortraitUrl('Aphelios') },
      { id: 'gam-elio', name: 'Elio', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Leona', championKey: 'Leona', team: 'BLG', color: '#fbbf24', avatarUrl: createChampionPortraitUrl('Leona') },
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
      { id: 'g2-bb', name: 'BrokenBlade', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: 'Darius', championKey: 'Darius', team: 'GENG', color: '#fb7185', avatarUrl: createChampionPortraitUrl('Darius') },
      { id: 'g2-skewmond', name: 'SkewMond', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Jarvan IV', championKey: 'JarvanIV', team: 'GENG', color: '#f43f5e', avatarUrl: createChampionPortraitUrl('JarvanIV') },
      { id: 'g2-caps', name: 'Caps', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'Yasuo', championKey: 'Yasuo', team: 'GENG', color: '#e11d48', avatarUrl: createChampionPortraitUrl('Yasuo') },
      { id: 'g2-hans', name: 'Hans Sama', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: 'Miss Fortune', championKey: 'MissFortune', team: 'GENG', color: '#fda4af', avatarUrl: createChampionPortraitUrl('MissFortune') },
      { id: 'g2-labrov', name: 'Labrov', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Pyke', championKey: 'Pyke', team: 'GENG', color: '#fb7185', avatarUrl: createChampionPortraitUrl('Pyke') },
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
      { id: 'fly-bwipo', name: 'Bwipo', role: 'TOP', roleName: PLAYER_ROLE_LABEL_MAP.TOP, signatureChampion: 'Mordekaiser', championKey: 'Mordekaiser', team: 'GENG', color: '#34d399', avatarUrl: createChampionPortraitUrl('Mordekaiser') },
      { id: 'fly-inspired', name: 'Inspired', role: 'JUG', roleName: PLAYER_ROLE_LABEL_MAP.JUG, signatureChampion: 'Nocturne', championKey: 'Nocturne', team: 'GENG', color: '#10b981', avatarUrl: createChampionPortraitUrl('Nocturne') },
      { id: 'fly-quad', name: 'Quad', role: 'MID', roleName: PLAYER_ROLE_LABEL_MAP.MID, signatureChampion: 'Hwei', championKey: 'Hwei', team: 'GENG', color: '#6ee7b7', avatarUrl: createChampionPortraitUrl('Hwei') },
      { id: 'fly-massu', name: 'Massu', role: 'ADC', roleName: PLAYER_ROLE_LABEL_MAP.ADC, signatureChampion: 'Sivir', championKey: 'Sivir', team: 'GENG', color: '#059669', avatarUrl: createChampionPortraitUrl('Sivir') },
      { id: 'fly-busio', name: 'Busio', role: 'SUP', roleName: PLAYER_ROLE_LABEL_MAP.SUP, signatureChampion: 'Bard', championKey: 'Bard', team: 'GENG', color: '#34d399', avatarUrl: createChampionPortraitUrl('Bard') },
    ],
  },
];

export const mountTeamToSlot = (team: TeamProfile, slot: TeamSlotKey): TeamProfile => ({
  ...team,
  aliases: [...team.aliases],
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
    roster: t.roster.map((p) => ({ ...p })),
  }));
  return {
    activeTeams: {
      BLG: mountTeamToSlot(catalog[0], 'BLG'),
      GENG: mountTeamToSlot(catalog[1], 'GENG'),
    },
    teamCatalog: catalog,
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
      team: 'BLG',
      color: item.color,
      avatarUrl: createChampionPortraitUrl(item.key),
    })),
  };
};

const VALID_THEME_IDS = new Set<TeamColorThemeId>(Object.keys(TEAM_COLOR_THEMES) as TeamColorThemeId[]);

const sanitizePlayer = (
  raw: unknown,
  fallback: TeamPlayerProfile,
  slot: TeamSlotKey
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
      ? src.avatarUrl.trim()
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
  slot: TeamSlotKey = 'BLG'
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
  ).slice(0, 10);

  const colorTheme = VALID_THEME_IDS.has(src.colorTheme as TeamColorThemeId)
    ? (src.colorTheme as TeamColorThemeId)
    : fallback.colorTheme;
  const logoUrl = typeof src.logoUrl === 'string' ? src.logoUrl.trim() : fallback.logoUrl;
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
      colorTheme,
      logoUrl,
      isPreset: typeof src.isPreset === 'boolean' ? src.isPreset : fallback.isPreset,
      roster,
    },
    slot
  );
};

export const sanitizeTeamConfigState = (raw: unknown): TeamConfigState | null => {
  if (!raw || typeof raw !== 'object') return null;
  const defaults = createDefaultTeamConfig();
  const src = raw as Record<string, unknown>;
  const rawActive = (src.activeTeams || {}) as Record<string, unknown>;
  const left = sanitizeTeamProfile(rawActive.BLG, defaults.activeTeams.BLG, 'BLG');
  const right = sanitizeTeamProfile(rawActive.GENG, defaults.activeTeams.GENG, 'GENG');

  const rawCatalog = Array.isArray(src.teamCatalog) ? src.teamCatalog : [];
  const catalogMap = new Map<string, TeamProfile>();
  for (const preset of defaults.teamCatalog) {
    catalogMap.set(preset.id, preset);
  }
  for (const item of rawCatalog) {
    const cleanItem = sanitizeTeamProfile(item, defaults.activeTeams.BLG, 'BLG');
    catalogMap.set(cleanItem.id, cleanItem);
  }

  return {
    activeTeams: { BLG: left, GENG: right },
    teamCatalog: Array.from(catalogMap.values()),
  };
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
      if (bestIndex === -1 || idx < bestIndex) bestIndex = idx;
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
): TeamSlotKey | undefined => {
  if (!comment || !comment.trim()) return undefined;
  const normalized = normalizeMatchText(comment);
  const leftKeywords = [activeTeams.BLG.shortTag, ...activeTeams.BLG.aliases, activeTeams.BLG.name];
  const rightKeywords = [activeTeams.GENG.shortTag, ...activeTeams.GENG.aliases, activeTeams.GENG.name];
  const leftIdx = findKeywordMatchIndex(normalized, leftKeywords);
  const rightIdx = findKeywordMatchIndex(normalized, rightKeywords);
  if (leftIdx === -1 && rightIdx === -1) return undefined;
  if (leftIdx !== -1 && rightIdx === -1) return 'BLG';
  if (rightIdx !== -1 && leftIdx === -1) return 'GENG';
  return leftIdx <= rightIdx ? 'BLG' : 'GENG';
};
