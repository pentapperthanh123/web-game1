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

export const DDRAGON_CHAMPION_CDN =
  'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion';

export const PLAYER_ROLE_LABEL_VI: Record<PlayerRole, string> = {
  TOP: 'Đường Trên',
  JUG: 'Đi Rừng',
  MID: 'Đường Giữa',
  ADC: 'Xạ Thủ',
  SUP: 'Hỗ Trợ',
};

const VALID_ROLES: readonly PlayerRole[] = ['TOP', 'JUG', 'MID', 'ADC', 'SUP'];
const VALID_COLOR_THEMES: readonly TeamColorThemeId[] = [
  'cyan',
  'amber',
  'rose',
  'orange',
  'violet',
  'emerald',
  'blue',
  'red',
];

const createChampionPortrait = (championKey: string): string =>
  `${DDRAGON_CHAMPION_CDN}/${championKey}.png`;

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
        id: 'blg-viper',
        name: 'Viper',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: "Kai'Sa",
        championKey: 'Kaisa',
        team: 'BLG',
        color: '#22d3ee',
        avatarUrl: '/images/players/viper.png',
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
    logoUrl:
      'https://am-a.akamaihd.net/image?resize=400:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1773829250929_GENGLOGO_GOLD.png',
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
        id: 'hle-peyz',
        name: 'Peyz',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Ashe',
        championKey: 'Ashe',
        team: 'GENG',
        color: '#ea580c',
        avatarUrl: createChampionPortrait('Ashe'),
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
    logoUrl: '/images/teams/tes.svg',
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
    logoUrl: '/images/teams/al.svg',
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
    logoUrl: '/images/teams/gam.svg',
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

export const mountTeamToSlot = (
  team: TeamProfile,
  slot: TeamSlotKey
): TeamProfile => ({
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
  const defaultLeft = mountTeamToSlot(catalog[0], 'BLG');
  const defaultRight = mountTeamToSlot(catalog[1], 'GENG');
  return {
    activeTeams: {
      BLG: defaultLeft,
      GENG: defaultRight,
    },
    teamCatalog: catalog,
  };
};

const sanitizePlayer = (
  raw: unknown,
  fallbackPlayer: TeamPlayerProfile,
  slot: TeamSlotKey
): TeamPlayerProfile => {
  if (!raw || typeof raw !== 'object') {
    return { ...fallbackPlayer, team: slot };
  }
  const src = raw as Record<string, unknown>;
  const role: PlayerRole = VALID_ROLES.includes(src.role as PlayerRole)
    ? (src.role as PlayerRole)
    : fallbackPlayer.role;
  const signatureChampion =
    typeof src.signatureChampion === 'string' && src.signatureChampion.trim()
      ? src.signatureChampion.trim().slice(0, 40)
      : fallbackPlayer.signatureChampion;
  const championKey =
    typeof src.championKey === 'string' && src.championKey.trim()
      ? src.championKey.trim().slice(0, 40)
      : fallbackPlayer.championKey;
  const name =
    typeof src.name === 'string' && src.name.trim()
      ? src.name.trim().slice(0, 32)
      : fallbackPlayer.name;
  const avatarUrl =
    typeof src.avatarUrl === 'string' && src.avatarUrl.trim()
      ? src.avatarUrl.trim()
      : createChampionPortrait(championKey);

  return {
    id:
      typeof src.id === 'string' && src.id.trim()
        ? src.id.trim().slice(0, 64)
        : fallbackPlayer.id,
    name,
    role,
    roleName:
      typeof src.roleName === 'string' && src.roleName.trim()
        ? src.roleName.trim().slice(0, 24)
        : PLAYER_ROLE_LABEL_VI[role],
    signatureChampion,
    championKey,
    team: slot,
    color:
      typeof src.color === 'string' && src.color.trim()
        ? src.color.trim().slice(0, 20)
        : fallbackPlayer.color,
    avatarUrl,
  };
};

export const sanitizeTeamProfile = (
  raw: unknown,
  fallbackTeam: TeamProfile,
  slot: TeamSlotKey = 'BLG'
): TeamProfile => {
  if (!raw || typeof raw !== 'object') {
    return mountTeamToSlot(fallbackTeam, slot);
  }
  const src = raw as Record<string, unknown>;
  const id =
    typeof src.id === 'string' && src.id.trim()
      ? src.id.trim().slice(0, 64)
      : fallbackTeam.id;
  const name =
    typeof src.name === 'string' && src.name.trim()
      ? src.name.trim().slice(0, 40)
      : fallbackTeam.name;
  const shortTag =
    typeof src.shortTag === 'string' && src.shortTag.trim()
      ? src.shortTag.trim().toUpperCase().slice(0, 8)
      : fallbackTeam.shortTag;
  const rawAliases = Array.isArray(src.aliases) ? src.aliases : fallbackTeam.aliases;
  const aliases = Array.from(
    new Set(
      [
        shortTag,
        ...rawAliases
          .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
          .map((a) => a.trim().toUpperCase()),
      ].filter(Boolean)
    )
  ).slice(0, 10);
  const colorTheme: TeamColorThemeId = VALID_COLOR_THEMES.includes(
    src.colorTheme as TeamColorThemeId
  )
    ? (src.colorTheme as TeamColorThemeId)
    : fallbackTeam.colorTheme;
  const logoUrl = typeof src.logoUrl === 'string' ? src.logoUrl.trim() : fallbackTeam.logoUrl;
  const rawRoster = Array.isArray(src.roster) ? src.roster : [];
  const roster = fallbackTeam.roster.map((fallbackPlayer, index) =>
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
      isPreset: typeof src.isPreset === 'boolean' ? src.isPreset : fallbackTeam.isPreset,
      roster,
    },
    slot
  );
};

export const sanitizeTeamConfigState = (raw: unknown): TeamConfigState | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
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
    activeTeams: {
      BLG: left,
      GENG: right,
    },
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
): TeamSlotKey | undefined => {
  if (!comment || !comment.trim()) {
    return undefined;
  }

  const normalized = normalizeMatchText(comment);
  const leftKeywords = [
    activeTeams.BLG.shortTag,
    ...activeTeams.BLG.aliases,
    activeTeams.BLG.name,
  ];
  const rightKeywords = [
    activeTeams.GENG.shortTag,
    ...activeTeams.GENG.aliases,
    activeTeams.GENG.name,
  ];

  const leftIdx = findKeywordMatchIndex(normalized, leftKeywords);
  const rightIdx = findKeywordMatchIndex(normalized, rightKeywords);

  if (leftIdx === -1 && rightIdx === -1) {
    return undefined;
  }
  if (leftIdx !== -1 && rightIdx === -1) {
    return 'BLG';
  }
  if (rightIdx !== -1 && leftIdx === -1) {
    return 'GENG';
  }
  return leftIdx <= rightIdx ? 'BLG' : 'GENG';
};
