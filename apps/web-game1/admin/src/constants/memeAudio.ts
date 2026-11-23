export const MEME_AUDIO_EVENT = {
  ADMIN_TRIGGER: 'admin:trigger_meme',
  CLIENT_PLAY: 'client:play_meme',
} as const;

export interface MemeSoundItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  badgeColor: string;
}

export const MEME_SOUND_ITEMS: readonly MemeSoundItem[] = [
  {
    id: 'quet-sach',
    name: 'Quét Sạch',
    description: 'Ace / Teamfight Wipeout',
    icon: '💀',
    badgeColor: 'border-red-500/40 bg-red-950/40 text-red-300 hover:bg-red-900/60 hover:border-red-400',
  },
  {
    id: 'nhac-lat-keo',
    name: 'Nhạc Lật Kèo',
    description: 'Comeback / Epic Victory Stinger',
    icon: '🔥',
    badgeColor: 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 hover:border-amber-400',
  },
  {
    id: 'oh-my-god',
    name: 'Oh My God!',
    description: 'Kinh ngạc / Thảng thốt',
    icon: '😱',
    badgeColor: 'border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 hover:border-purple-400',
  },
  {
    id: 'nhac-cang-thang',
    name: 'Nhạc Căng Thẳng',
    description: 'Climax / Boss Tense Phase',
    icon: '⚡',
    badgeColor: 'border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:border-rose-400',
  },
  {
    id: 'cham-hoi',
    name: 'Dấu Chấm Hỏi',
    description: 'Ping hỏi chấm / Troll',
    icon: '❓',
    badgeColor: 'border-sky-500/40 bg-sky-950/40 text-sky-300 hover:bg-sky-900/60 hover:border-sky-400',
  },
  {
    id: 'siuuu',
    name: 'Siuuu!',
    description: 'Ăn mừng chiến thắng bùng nổ',
    icon: '🎉',
    badgeColor: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 hover:border-emerald-400',
  },
] as const;
