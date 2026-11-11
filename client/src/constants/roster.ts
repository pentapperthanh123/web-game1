import { TEAM_KEY, TeamType } from './game';

export interface RosterPlayer {
  id: string;
  name: string;
  role: 'TOP' | 'JUG' | 'MID' | 'ADC' | 'SUP';
  roleName: string;
  signatureChampion: string;
  championKey: string;
  team: TeamType;
  color: string;
  avatarUrl: string;
}

export const OFFICIAL_TEAM_LOGOS: Record<TeamType, string> = {
  [TEAM_KEY.BLG]: 'https://am-a.akamaihd.net/image?resize=400:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1682322954525_Bilibili_Gaming_logo_20211.png',
  [TEAM_KEY.GENG]: 'https://am-a.akamaihd.net/image?resize=400:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1773829250929_GENGLOGO_GOLD.png',
};

export const BARON_AVATAR_URL = '/images/boss_baron_2d.png';

export const DDRAGON_CHAMPION_CDN = 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion';

const CHAMPION_KEY_ALIAS_MAP: Record<string, string> = {
  zed: 'Zed',
  lux: 'Lux',
  yasuo: 'Yasuo',
  ahri: 'Ahri',
  jax: 'Jax',
  xinzhao: 'XinZhao',
  'xin zhao': 'XinZhao',
  kaisa: 'Kaisa',
  "kai'sa": 'Kaisa',
  rakan: 'Rakan',
  ksante: 'KSante',
  "k'sante": 'KSante',
  nidalee: 'Nidalee',
  yone: 'Yone',
  ezreal: 'Ezreal',
  nautilus: 'Nautilus',
  azir: 'Azir',
  leesin: 'LeeSin',
  'lee sin': 'LeeSin',
  vayne: 'Vayne',
  jinx: 'Jinx',
  syndra: 'Syndra',
  orianna: 'Orianna',
  aatrox: 'Aatrox',
  akali: 'Akali',
  irelia: 'Irelia',
  caitlyn: 'Caitlyn',
  sylas: 'Sylas',
  viper: 'Kaisa',
  faker: 'Azir',
  chovy: 'Yone',
  bin: 'Jax',
  knight: 'Ahri',
  xun: 'XinZhao',
  elk: 'Kaisa',
  on: 'Rakan',
  kiin: 'KSante',
  canyon: 'Nidalee',
  ruler: 'Ezreal',
  duro: 'Nautilus',
};

const TEAM_FALLBACK_CHAMPION_KEY: Record<TeamType, string> = {
  [TEAM_KEY.BLG]: 'Ahri',
  [TEAM_KEY.GENG]: 'Yone',
};

export const getChampionAvatarUrl = (championName: string, team: TeamType): string => {
  const normalized = championName.trim().toLowerCase();
  if (!normalized) {
    return `${DDRAGON_CHAMPION_CDN}/${TEAM_FALLBACK_CHAMPION_KEY[team]}.png`;
  }

  for (const [alias, championKey] of Object.entries(CHAMPION_KEY_ALIAS_MAP)) {
    if (normalized === alias || normalized.includes(alias)) {
      return `${DDRAGON_CHAMPION_CDN}/${championKey}.png`;
    }
  }

  const fallbackKey = TEAM_FALLBACK_CHAMPION_KEY[team];
  return `${DDRAGON_CHAMPION_CDN}/${fallbackKey}.png`;
};

export const TEAM_ROSTERS: Record<TeamType, RosterPlayer[]> = {
  [TEAM_KEY.BLG]: [
    {
      id: 'blg-bin',
      name: 'Bin',
      role: 'TOP',
      roleName: 'Đường Trên',
      signatureChampion: 'Jax',
      championKey: 'Jax',
      team: TEAM_KEY.BLG,
      color: '#38bdf8',
      avatarUrl: '/images/players/bin.png',
    },
    {
      id: 'blg-xun',
      name: 'Xun',
      role: 'JUG',
      roleName: 'Đi Rừng',
      signatureChampion: 'Xin Zhao',
      championKey: 'XinZhao',
      team: TEAM_KEY.BLG,
      color: '#06b6d4',
      avatarUrl: '/images/players/xun.png',
    },
    {
      id: 'blg-knight',
      name: 'Knight',
      role: 'MID',
      roleName: 'Đường Giữa',
      signatureChampion: 'Ahri',
      championKey: 'Ahri',
      team: TEAM_KEY.BLG,
      color: '#60a5fa',
      avatarUrl: '/images/players/knight.png',
    },
    {
      id: 'blg-viper',
      name: 'Viper',
      role: 'ADC',
      roleName: 'Xạ Thủ',
      signatureChampion: "Kai'Sa",
      championKey: 'Kaisa',
      team: TEAM_KEY.BLG,
      color: '#22d3ee',
      avatarUrl: '/images/players/viper.png',
    },
    {
      id: 'blg-on',
      name: 'ON',
      role: 'SUP',
      roleName: 'Hỗ Trợ',
      signatureChampion: 'Rakan',
      championKey: 'Rakan',
      team: TEAM_KEY.BLG,
      color: '#34d399',
      avatarUrl: '/images/players/on.png',
    },
  ],
  [TEAM_KEY.GENG]: [
    {
      id: 'gen-kiin',
      name: 'Kiin',
      role: 'TOP',
      roleName: 'Đường Trên',
      signatureChampion: "K'Sante",
      championKey: 'KSante',
      team: TEAM_KEY.GENG,
      color: '#f59e0b',
      avatarUrl: '/images/players/kiin.png',
    },
    {
      id: 'gen-canyon',
      name: 'Canyon',
      role: 'JUG',
      roleName: 'Đi Rừng',
      signatureChampion: 'Nidalee',
      championKey: 'Nidalee',
      team: TEAM_KEY.GENG,
      color: '#fbbf24',
      avatarUrl: '/images/players/canyon.png',
    },
    {
      id: 'gen-chovy',
      name: 'Chovy',
      role: 'MID',
      roleName: 'Đường Giữa',
      signatureChampion: 'Yone',
      championKey: 'Yone',
      team: TEAM_KEY.GENG,
      color: '#eab308',
      avatarUrl: '/images/players/chovy.png',
    },
    {
      id: 'gen-ruler',
      name: 'Ruler',
      role: 'ADC',
      roleName: 'Xạ Thủ',
      signatureChampion: 'Ezreal',
      championKey: 'Ezreal',
      team: TEAM_KEY.GENG,
      color: '#f97316',
      avatarUrl: '/images/players/ruler.png',
    },
    {
      id: 'gen-duro',
      name: 'Duro',
      role: 'SUP',
      roleName: 'Hỗ Trợ',
      signatureChampion: 'Nautilus',
      championKey: 'Nautilus',
      team: TEAM_KEY.GENG,
      color: '#d97706',
      avatarUrl: '/images/players/duro.png',
    },
  ],
};

export const findRosterPlayer = (championName: string, team: TeamType): RosterPlayer => {
  const norm = championName.trim().toLowerCase();
  const list = TEAM_ROSTERS[team];
  const matched = list.find(
    (p) =>
      norm.includes(p.name.toLowerCase()) ||
      norm.includes(p.signatureChampion.toLowerCase()) ||
      p.signatureChampion.toLowerCase().includes(norm)
  );
  if (matched) return matched;
  return list[Math.floor(Math.random() * list.length)];
};
