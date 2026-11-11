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
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Jax.png',
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
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/XinZhao.png',
    },
    {
      id: 'blg-knight',
      name: 'knight',
      role: 'MID',
      roleName: 'Đường Giữa',
      signatureChampion: 'Ahri',
      championKey: 'Ahri',
      team: TEAM_KEY.BLG,
      color: '#60a5fa',
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Ahri.png',
    },
    {
      id: 'blg-elk',
      name: 'Elk',
      role: 'ADC',
      roleName: 'Xạ Thủ',
      signatureChampion: 'Kai\'Sa',
      championKey: 'Kaisa',
      team: TEAM_KEY.BLG,
      color: '#22d3ee',
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Kaisa.png',
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
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Rakan.png',
    },
  ],
  [TEAM_KEY.GENG]: [
    {
      id: 'gen-kiin',
      name: 'Kiin',
      role: 'TOP',
      roleName: 'Đường Trên',
      signatureChampion: 'K\'Sante',
      championKey: 'KSante',
      team: TEAM_KEY.GENG,
      color: '#f59e0b',
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/KSante.png',
    },
    {
      id: 'gen-canyon',
      name: 'Canyon',
      role: 'JUG',
      roleName: 'Đi Rừng',
      signatureChampion: 'Nidalee',
      championKey: 'Nidalee',
      team: TEAM_KEY.GENG,
      color: '#eab308',
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Nidalee.png',
    },
    {
      id: 'gen-chovy',
      name: 'Chovy',
      role: 'MID',
      roleName: 'Đường Giữa',
      signatureChampion: 'Yone',
      championKey: 'Yone',
      team: TEAM_KEY.GENG,
      color: '#fbbf24',
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Yone.png',
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
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Ezreal.png',
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
      avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Nautilus.png',
    },
  ],
};
