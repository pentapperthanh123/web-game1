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

export interface QueuedMatchup {
  id: string;
  label: string;
  leftTeamId: string;
  rightTeamId: string;
}

export interface TeamProfile {
  id: string;
  name: string;
  shortTag: string;
  aliases: string[];
  autoSyncRosterAliases?: boolean;
  colorTheme: TeamColorThemeId;
  logoUrl: string;
  isPreset?: boolean;
  roster: TeamPlayerProfile[];
}

export type ActiveTeamsMap = Record<TeamSlotKey, TeamProfile>;

export interface TeamConfigState {
  activeTeams: ActiveTeamsMap;
  teamCatalog: TeamProfile[];
  matchQueue: QueuedMatchup[];
}

export const TEAM_LIMITS = {
  MAX_BASE64_MEDIA_LENGTH: 400_000,
  MAX_QUEUE_ITEMS: 24,
  MAX_CATALOG_ITEMS: 60,
  MAX_ALIASES: 16,
} as const;

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
    aliases: ["BLG", "BILIBILI"],
    colorTheme: 'cyan',
    logoUrl: '/images/teams/blg.png',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-blg-top-0',
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
        id: 'blg-preset-blg-jug-1',
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
        id: 'blg-preset-blg-mid-2',
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
        id: 'blg-preset-blg-adc-3',
        name: 'Viper',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Kai\'Sa',
        championKey: 'Kaisa',
        team: 'BLG',
        color: '#22d3ee',
        avatarUrl: '/images/players/viper.png',
      },
      {
        id: 'blg-preset-blg-sup-4',
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
    aliases: ["GEN", "GENG", "GEN.G"],
    colorTheme: 'amber',
    logoUrl: '/images/teams/geng.svg',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-geng-top-0',
        name: 'Kiin',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'K\'Sante',
        championKey: 'KSante',
        team: 'BLG',
        color: '#f59e0b',
        avatarUrl: '/images/players/kiin.png',
      },
      {
        id: 'blg-preset-geng-jug-1',
        name: 'Canyon',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Nidalee',
        championKey: 'Nidalee',
        team: 'BLG',
        color: '#fbbf24',
        avatarUrl: '/images/players/canyon.png',
      },
      {
        id: 'blg-preset-geng-mid-2',
        name: 'Chovy',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Yone',
        championKey: 'Yone',
        team: 'BLG',
        color: '#eab308',
        avatarUrl: '/images/players/chovy.png',
      },
      {
        id: 'blg-preset-geng-adc-3',
        name: 'Ruler',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Ezreal',
        championKey: 'Ezreal',
        team: 'BLG',
        color: '#f97316',
        avatarUrl: '/images/players/ruler.png',
      },
      {
        id: 'blg-preset-geng-sup-4',
        name: 'Duro',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Nautilus',
        championKey: 'Nautilus',
        team: 'BLG',
        color: '#d97706',
        avatarUrl: '/images/players/duro.png',
      },
    ],
  },
  {
    id: 'preset-t1',
    name: 'T1',
    shortTag: 'T1',
    aliases: ["T1", "SKT", "FAKER"],
    colorTheme: 'rose',
    logoUrl: '/images/teams/t1.svg',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-t1-top-0',
        name: 'Doran',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Ambessa',
        championKey: 'Ambessa',
        team: 'BLG',
        color: '#fb7185',
        avatarUrl: '/images/players/doran.png',
      },
      {
        id: 'blg-preset-t1-jug-1',
        name: 'Oner',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Vi',
        championKey: 'Vi',
        team: 'BLG',
        color: '#f43f5e',
        avatarUrl: '/images/players/oner.png',
      },
      {
        id: 'blg-preset-t1-mid-2',
        name: 'Faker',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Azir',
        championKey: 'Azir',
        team: 'BLG',
        color: '#e11d48',
        avatarUrl: '/images/players/faker.png',
      },
      {
        id: 'blg-preset-t1-adc-3',
        name: 'Peyz',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Xayah',
        championKey: 'Xayah',
        team: 'BLG',
        color: '#fb7185',
        avatarUrl: '/images/players/peyz.png',
      },
      {
        id: 'blg-preset-t1-sup-4',
        name: 'Keria',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Thresh',
        championKey: 'Thresh',
        team: 'BLG',
        color: '#fda4af',
        avatarUrl: '/images/players/keria.png',
      },
    ],
  },
  {
    id: 'preset-hle',
    name: 'Hanwha Life Esports',
    shortTag: 'HLE',
    aliases: ["HLE", "HANWHA"],
    colorTheme: 'orange',
    logoUrl: '/images/teams/hle.svg',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-hle-top-0',
        name: 'Zeus',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Aatrox',
        championKey: 'Aatrox',
        team: 'BLG',
        color: '#fb923c',
        avatarUrl: '/images/players/zeus.png',
      },
      {
        id: 'blg-preset-hle-jug-1',
        name: 'Peanut',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Sejuani',
        championKey: 'Sejuani',
        team: 'BLG',
        color: '#f97316',
        avatarUrl: '/images/players/peanut.png',
      },
      {
        id: 'blg-preset-hle-mid-2',
        name: 'Zeka',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Sylas',
        championKey: 'Sylas',
        team: 'BLG',
        color: '#fdba74',
        avatarUrl: '/images/players/zeka.png',
      },
      {
        id: 'blg-preset-hle-adc-3',
        name: 'Viper',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Kai\'Sa',
        championKey: 'Kaisa',
        team: 'BLG',
        color: '#ea580c',
        avatarUrl: '/images/players/viper.png',
      },
      {
        id: 'blg-preset-hle-sup-4',
        name: 'Delight',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Rell',
        championKey: 'Rell',
        team: 'BLG',
        color: '#fb923c',
        avatarUrl: '/images/players/delight.png',
      },
    ],
  },
  {
    id: 'preset-tes',
    name: 'Top Esports',
    shortTag: 'TES',
    aliases: ["TES", "TOP ESPORTS"],
    colorTheme: 'red',
    logoUrl: '/images/teams/tes.png',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-tes-top-0',
        name: '369',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Renekton',
        championKey: 'Renekton',
        team: 'BLG',
        color: '#f87171',
        avatarUrl: '/images/players/369.png',
      },
      {
        id: 'blg-preset-tes-jug-1',
        name: 'Kanavi',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Wukong',
        championKey: 'MonkeyKing',
        team: 'BLG',
        color: '#ef4444',
        avatarUrl: '/images/players/kanavi.png',
      },
      {
        id: 'blg-preset-tes-mid-2',
        name: 'Creme',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Akali',
        championKey: 'Akali',
        team: 'BLG',
        color: '#fca5a5',
        avatarUrl: '/images/players/creme.png',
      },
      {
        id: 'blg-preset-tes-adc-3',
        name: 'JackeyLove',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Draven',
        championKey: 'Draven',
        team: 'BLG',
        color: '#dc2626',
        avatarUrl: '/images/players/jackeylove.png',
      },
      {
        id: 'blg-preset-tes-sup-4',
        name: 'Crisp',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Nautilus',
        championKey: 'Nautilus',
        team: 'BLG',
        color: '#f87171',
        avatarUrl: '/images/players/crisp.png',
      },
    ],
  },
  {
    id: 'preset-al',
    name: "Anyone's Legend",
    shortTag: 'AL',
    aliases: ["AL", "ANYONE"],
    colorTheme: 'violet',
    logoUrl: '/images/teams/al.webp',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-al-top-0',
        name: 'Flandre',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Gnar',
        championKey: 'Gnar',
        team: 'BLG',
        color: '#a78bfa',
        avatarUrl: '/images/players/flandre.png',
      },
      {
        id: 'blg-preset-al-jug-1',
        name: 'Tarzan',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Lee Sin',
        championKey: 'LeeSin',
        team: 'BLG',
        color: '#8b5cf6',
        avatarUrl: '/images/players/tarzan.png',
      },
      {
        id: 'blg-preset-al-mid-2',
        name: 'Shanks',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Orianna',
        championKey: 'Orianna',
        team: 'BLG',
        color: '#c4b5fd',
        avatarUrl: '/images/players/shanks.png',
      },
      {
        id: 'blg-preset-al-adc-3',
        name: 'Hope',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Lucian',
        championKey: 'Lucian',
        team: 'BLG',
        color: '#7c3aed',
        avatarUrl: '/images/players/hope.png',
      },
      {
        id: 'blg-preset-al-sup-4',
        name: 'Kael',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Alistar',
        championKey: 'Alistar',
        team: 'BLG',
        color: '#a78bfa',
        avatarUrl: '/images/players/kael.png',
      },
    ],
  },
  {
    id: 'preset-dk',
    name: 'Dplus KIA',
    shortTag: 'DK',
    aliases: ["DK", "DPLUS", "DAMWON"],
    colorTheme: 'blue',
    logoUrl: '/images/teams/dk.svg',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-dk-top-0',
        name: 'Siwoo',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Camille',
        championKey: 'Camille',
        team: 'BLG',
        color: '#60a5fa',
        avatarUrl: '/images/players/siwoo.png',
      },
      {
        id: 'blg-preset-dk-jug-1',
        name: 'Lucid',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Viego',
        championKey: 'Viego',
        team: 'BLG',
        color: '#3b82f6',
        avatarUrl: '/images/players/lucid.png',
      },
      {
        id: 'blg-preset-dk-mid-2',
        name: 'ShowMaker',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'LeBlanc',
        championKey: 'Leblanc',
        team: 'BLG',
        color: '#93c5fd',
        avatarUrl: '/images/players/showmaker.png',
      },
      {
        id: 'blg-preset-dk-adc-3',
        name: 'Aiming',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Zeri',
        championKey: 'Zeri',
        team: 'BLG',
        color: '#2563eb',
        avatarUrl: '/images/players/aiming.png',
      },
      {
        id: 'blg-preset-dk-sup-4',
        name: 'BeryL',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Braum',
        championKey: 'Braum',
        team: 'BLG',
        color: '#60a5fa',
        avatarUrl: '/images/players/beryl.png',
      },
    ],
  },
  {
    id: 'preset-gam',
    name: 'GAM Esports',
    shortTag: 'GAM',
    aliases: ["GAM", "GIGABYTE", "VCS"],
    colorTheme: 'amber',
    logoUrl: '/images/teams/gam.png',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-gam-top-0',
        name: 'Kiaya',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Garen',
        championKey: 'Garen',
        team: 'BLG',
        color: '#facc15',
        avatarUrl: '/images/players/kiaya.png',
      },
      {
        id: 'blg-preset-gam-jug-1',
        name: 'Levi',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Karthus',
        championKey: 'Karthus',
        team: 'BLG',
        color: '#eab308',
        avatarUrl: '/images/players/levi.png',
      },
      {
        id: 'blg-preset-gam-mid-2',
        name: 'Aress',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Syndra',
        championKey: 'Syndra',
        team: 'BLG',
        color: '#fde047',
        avatarUrl: '/images/players/aress.png',
      },
      {
        id: 'blg-preset-gam-adc-3',
        name: 'Artemis',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Aphelios',
        championKey: 'Aphelios',
        team: 'BLG',
        color: '#f59e0b',
        avatarUrl: '/images/players/artemis.png',
      },
      {
        id: 'blg-preset-gam-sup-4',
        name: 'Elio',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Leona',
        championKey: 'Leona',
        team: 'BLG',
        color: '#fbbf24',
        avatarUrl: '/images/players/elio.png',
      },
    ],
  },
  {
    id: 'preset-g2',
    name: 'G2 Esports',
    shortTag: 'G2',
    aliases: ["G2", "SAMURAI"],
    colorTheme: 'rose',
    logoUrl: '/images/teams/g2.svg',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-g2-top-0',
        name: 'BrokenBlade',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Darius',
        championKey: 'Darius',
        team: 'BLG',
        color: '#fb7185',
        avatarUrl: '/images/players/brokenblade.png',
      },
      {
        id: 'blg-preset-g2-jug-1',
        name: 'SkewMond',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Jarvan IV',
        championKey: 'JarvanIV',
        team: 'BLG',
        color: '#f43f5e',
        avatarUrl: '/images/players/skewmond.png',
      },
      {
        id: 'blg-preset-g2-mid-2',
        name: 'Caps',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Yasuo',
        championKey: 'Yasuo',
        team: 'BLG',
        color: '#e11d48',
        avatarUrl: '/images/players/caps.png',
      },
      {
        id: 'blg-preset-g2-adc-3',
        name: 'Hans Sama',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Miss Fortune',
        championKey: 'MissFortune',
        team: 'BLG',
        color: '#fda4af',
        avatarUrl: '/images/players/hanssama.png',
      },
      {
        id: 'blg-preset-g2-sup-4',
        name: 'Labrov',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Pyke',
        championKey: 'Pyke',
        team: 'BLG',
        color: '#fb7185',
        avatarUrl: '/images/players/labrov.png',
      },
    ],
  },
  {
    id: 'preset-fly',
    name: 'FlyQuest',
    shortTag: 'FLY',
    aliases: ["FLY", "FLYQUEST"],
    colorTheme: 'emerald',
    logoUrl: '/images/teams/fly.svg',
    isPreset: true,
    roster: [
      {
        id: 'blg-preset-fly-top-0',
        name: 'Bwipo',
        role: 'TOP',
        roleName: PLAYER_ROLE_LABEL_VI.TOP,
        signatureChampion: 'Mordekaiser',
        championKey: 'Mordekaiser',
        team: 'BLG',
        color: '#34d399',
        avatarUrl: '/images/players/bwipo.png',
      },
      {
        id: 'blg-preset-fly-jug-1',
        name: 'Inspired',
        role: 'JUG',
        roleName: PLAYER_ROLE_LABEL_VI.JUG,
        signatureChampion: 'Nocturne',
        championKey: 'Nocturne',
        team: 'BLG',
        color: '#10b981',
        avatarUrl: '/images/players/inspired.png',
      },
      {
        id: 'blg-preset-fly-mid-2',
        name: 'Quad',
        role: 'MID',
        roleName: PLAYER_ROLE_LABEL_VI.MID,
        signatureChampion: 'Hwei',
        championKey: 'Hwei',
        team: 'BLG',
        color: '#6ee7b7',
        avatarUrl: '/images/players/quad.png',
      },
      {
        id: 'blg-preset-fly-adc-3',
        name: 'Massu',
        role: 'ADC',
        roleName: PLAYER_ROLE_LABEL_VI.ADC,
        signatureChampion: 'Sivir',
        championKey: 'Sivir',
        team: 'BLG',
        color: '#059669',
        avatarUrl: '/images/players/massu.png',
      },
      {
        id: 'blg-preset-fly-sup-4',
        name: 'Busio',
        role: 'SUP',
        roleName: PLAYER_ROLE_LABEL_VI.SUP,
        signatureChampion: 'Bard',
        championKey: 'Bard',
        team: 'BLG',
        color: '#34d399',
        avatarUrl: '/images/players/busio.png',
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
  const defaultLeft = mountTeamToSlot(catalog[0], 'BLG');
  const defaultRight = mountTeamToSlot(catalog[1], 'GENG');
  return {
    activeTeams: {
      BLG: defaultLeft,
      GENG: defaultRight,
    },
    teamCatalog: catalog,
    matchQueue: [],
  };
};

const DATA_IMAGE_URI_PREFIX_REGEX = /^data:image\/(png|jpeg|jpg|webp|svg\+xml|gif);base64,/i;

export const sanitizeMediaUrl = (rawUrl: unknown, fallbackUrl: string): string => {
  if (typeof rawUrl !== 'string') return fallbackUrl;
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) {
    if (
      DATA_IMAGE_URI_PREFIX_REGEX.test(trimmed) &&
      trimmed.length <= TEAM_LIMITS.MAX_BASE64_MEDIA_LENGTH
    ) {
      return trimmed;
    }
    return fallbackUrl;
  }
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  ) {
    return trimmed.slice(0, 2048);
  }
  return fallbackUrl;
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
      ? sanitizeMediaUrl(src.avatarUrl, createChampionPortrait(championKey))
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
  ).slice(0, TEAM_LIMITS.MAX_ALIASES);
  const colorTheme: TeamColorThemeId = VALID_COLOR_THEMES.includes(
    src.colorTheme as TeamColorThemeId
  )
    ? (src.colorTheme as TeamColorThemeId)
    : fallbackTeam.colorTheme;
  const logoUrl =
    typeof src.logoUrl === 'string'
      ? sanitizeMediaUrl(src.logoUrl, fallbackTeam.logoUrl)
      : fallbackTeam.logoUrl;
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
      autoSyncRosterAliases:
        typeof src.autoSyncRosterAliases === 'boolean'
          ? src.autoSyncRosterAliases
          : fallbackTeam.autoSyncRosterAliases ?? true,
      colorTheme,
      logoUrl,
      isPreset: typeof src.isPreset === 'boolean' ? src.isPreset : fallbackTeam.isPreset,
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
  for (let i = 0; i < rawQueue.length && result.length < TEAM_LIMITS.MAX_QUEUE_ITEMS; i++) {
    const item = rawQueue[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    const leftTeamId = typeof item.leftTeamId === 'string' ? item.leftTeamId.trim() : '';
    const rightTeamId = typeof item.rightTeamId === 'string' ? item.rightTeamId.trim() : '';
    const leftTeam = teamById.get(leftTeamId);
    const rightTeam = teamById.get(rightTeamId);
    if (!leftTeam || !rightTeam) continue;
    const rawId = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `q-${i}-${leftTeamId}-${rightTeamId}`;
    const rawLabel =
      typeof item.label === 'string' && item.label.trim()
        ? item.label.trim().slice(0, 48)
        : `${leftTeam.shortTag} vs ${rightTeam.shortTag}`;
    result.push({
      id: rawId.slice(0, 64),
      label: rawLabel,
      leftTeamId,
      rightTeamId,
    });
  }
  return result;
};

/** A saved team is cleaned against its own preset when it has one, never against another team's roster. */
const findFallbackTeam = (raw: unknown, presets: TeamProfile[], defaultTeam: TeamProfile): TeamProfile => {
  if (!raw || typeof raw !== 'object') return defaultTeam;
  const rawId = (raw as Record<string, unknown>).id;
  return presets.find((preset) => preset.id === rawId) ?? defaultTeam;
};

export const sanitizeTeamConfigState = (raw: unknown): TeamConfigState | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const defaults = createDefaultTeamConfig();
  const src = raw as Record<string, unknown>;
  const rawActive = (src.activeTeams || {}) as Record<string, unknown>;
  const left = sanitizeTeamProfile(rawActive.BLG, findFallbackTeam(rawActive.BLG, defaults.teamCatalog, defaults.activeTeams.BLG), 'BLG');
  const right = sanitizeTeamProfile(rawActive.GENG, findFallbackTeam(rawActive.GENG, defaults.teamCatalog, defaults.activeTeams.GENG), 'GENG');

  const rawCatalog = Array.isArray(src.teamCatalog) ? src.teamCatalog : [];
  const catalogMap = new Map<string, TeamProfile>();
  for (const preset of defaults.teamCatalog) {
    catalogMap.set(preset.id, preset);
  }
  for (const item of rawCatalog) {
    if (catalogMap.size >= TEAM_LIMITS.MAX_CATALOG_ITEMS) break;
    const cleanItem = sanitizeTeamProfile(item, findFallbackTeam(item, defaults.teamCatalog, defaults.activeTeams.BLG), 'BLG');
    catalogMap.set(cleanItem.id, cleanItem);
  }

  const catalog = Array.from(catalogMap.values());
  return {
    activeTeams: {
      BLG: left,
      GENG: right,
    },
    teamCatalog: catalog,
    matchQueue: sanitizeMatchQueue(src.matchQueue, catalog),
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

export const matchCommentTeam = (
  comment: string,
  activeTeams: ActiveTeamsMap
): TeamSlotKey | undefined => {
  if (!comment || !comment.trim()) {
    return undefined;
  }

  const normalized = normalizeMatchText(comment);
  const leftKeywords = getEffectiveTeamKeywords(activeTeams.BLG);
  const rightKeywords = getEffectiveTeamKeywords(activeTeams.GENG);

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
