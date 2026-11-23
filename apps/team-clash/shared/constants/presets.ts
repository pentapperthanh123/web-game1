import type { TeamPresetConfig } from '../types/clash';

export const TEAM_PRESETS: Record<string, TeamPresetConfig> = {
  girl_vs_boy: {
    id: 'girl_vs_boy',
    name: 'GIRL vs BOY',
    leftTeam: {
      name: 'GIRL',
      subName: 'Nữ',
      primaryColor: '#FF2E93',
      secondaryColor: '#FF70BA',
      glowColor: 'rgba(255, 46, 147, 0.6)',
      keywords: ['g', 'girl', 'nu', 'nữ', '1'],
      characterType: 'girl',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GirlHero&backgroundColor=ff66b2',
    },
    rightTeam: {
      name: 'BOY',
      subName: 'Nam',
      primaryColor: '#00D2FF',
      secondaryColor: '#60EFFF',
      glowColor: 'rgba(0, 210, 255, 0.6)',
      keywords: ['b', 'boy', 'nam', '2'],
      characterType: 'boy',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=BoyHero&backgroundColor=3399ff',
    },
  },
  cat_vs_dog: {
    id: 'cat_vs_dog',
    name: 'CAT vs DOG',
    leftTeam: {
      name: 'CAT',
      subName: 'Mèo',
      primaryColor: '#FF8A00',
      secondaryColor: '#FFB356',
      glowColor: 'rgba(255, 138, 0, 0.6)',
      keywords: ['m', 'meo', 'mèo', 'cat', '1'],
      characterType: 'cat',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=CatHero&backgroundColor=ff9933',
    },
    rightTeam: {
      name: 'DOG',
      subName: 'Cún',
      primaryColor: '#0070F3',
      secondaryColor: '#4599FF',
      glowColor: 'rgba(0, 112, 243, 0.6)',
      keywords: ['c', 'cun', 'cún', 'cho', 'chó', 'dog', '2'],
      characterType: 'dog',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=DogHero&backgroundColor=0070f3',
    },
  },
  red_vs_blue: {
    id: 'red_vs_blue',
    name: 'RED vs BLUE',
    leftTeam: {
      name: 'RED',
      subName: 'Đỏ',
      primaryColor: '#FF1744',
      secondaryColor: '#FF5252',
      glowColor: 'rgba(255, 23, 68, 0.6)',
      keywords: ['red', 'do', 'đỏ', '1'],
      characterType: 'red_fighter',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=RedHero&backgroundColor=ff1744',
    },
    rightTeam: {
      name: 'BLUE',
      subName: 'Xanh',
      primaryColor: '#2979FF',
      secondaryColor: '#82B1FF',
      glowColor: 'rgba(41, 121, 255, 0.6)',
      keywords: ['blue', 'xanh', '2'],
      characterType: 'blue_fighter',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=BlueHero&backgroundColor=2979ff',
    },
  },
};

export const DEFAULT_PRESET_ID = 'girl_vs_boy';
