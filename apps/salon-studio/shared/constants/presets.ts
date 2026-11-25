import type {
  AccessoryKey,
  HairStyleKey,
  HairTrollType,
  NailShapeKey,
  NailTrollType,
  SalonColorKey,
} from '../types/salon.js';

export interface ColorSwatch {
  key: SalonColorKey;
  hex: string;
  highlight: string;
  shadow: string;
  isPastelShimmer?: boolean;
  labelVi: string;
  labelEn: string;
}

export const COLOR_SWATCHES: Record<SalonColorKey, ColorSwatch> = {
  pink: {
    key: 'pink',
    hex: '#FF9EB8',
    highlight: '#FFD2E0',
    shadow: '#DE6E8F',
    labelVi: 'Hồng Dâu',
    labelEn: 'Berry Pink',
  },
  gold: {
    key: 'gold',
    hex: '#FFD06B',
    highlight: '#FFF0B8',
    shadow: '#D99E30',
    labelVi: 'Vàng Mật',
    labelEn: 'Honey Gold',
  },
  blue: {
    key: 'blue',
    hex: '#8CD5F7',
    highlight: '#D3F0FF',
    shadow: '#54A7D1',
    labelVi: 'Xanh Biển',
    labelEn: 'Sky Blue',
  },
  purple: {
    key: 'purple',
    hex: '#C6A7F5',
    highlight: '#EADDFD',
    shadow: '#9273CC',
    labelVi: 'Tím Mơ',
    labelEn: 'Lilac',
  },
  black: {
    key: 'black',
    hex: '#463A3E',
    highlight: '#75666B',
    shadow: '#2A2124',
    labelVi: 'Đen Tuyền',
    labelEn: 'Jet Black',
  },
  pastel_peach: {
    key: 'pastel_peach',
    hex: '#FFB79B',
    highlight: '#FFE7DB',
    shadow: '#E28668',
    isPastelShimmer: true,
    labelVi: 'Đào Nhũ Pastel',
    labelEn: 'Pastel Peach',
  },
  pastel_mint: {
    key: 'pastel_mint',
    hex: '#92E6CB',
    highlight: '#D9FFF2',
    shadow: '#53B999',
    isPastelShimmer: true,
    labelVi: 'Bạc Hà Nhũ',
    labelEn: 'Mint Shimmer',
  },
  shimmer_rose: {
    key: 'shimmer_rose',
    hex: '#FFA3CA',
    highlight: '#FFF0F7',
    shadow: '#DF6D9E',
    isPastelShimmer: true,
    labelVi: 'Hồng Kim Tuyến',
    labelEn: 'Rose Glitter',
  },
};

export const BASE_COLOR_KEYS: readonly SalonColorKey[] = ['pink', 'gold', 'blue', 'purple', 'black'];
export const PASTEL_SHIMMER_COLOR_KEYS: readonly SalonColorKey[] = [
  'pastel_peach',
  'pastel_mint',
  'shimmer_rose',
];

export const HAIR_STYLES: readonly HairStyleKey[] = ['short', 'long', 'curly', 'cool', 'bob'];
export const NAIL_SHAPES: readonly NailShapeKey[] = ['oval', 'square', 'almond', 'long'];

export const HAIR_STYLE_LABELS: Record<HairStyleKey, string> = {
  curly: 'Pink Curls',
  long: 'Long Straight',
  bob: 'Blonde Ombre',
  short: 'Purple Pixie',
  cool: 'Cool Balayage',
};

export const NAIL_SHAPE_LABELS: Record<NailShapeKey, string> = {
  almond: 'Rose French',
  oval: 'Mint Daisy',
  long: 'Crystal Glow',
  square: 'Peach Glitter',
};

export const HAIR_TROLL_TYPES: readonly HairTrollType[] = ['BALD_STRIPE', 'BURNT_AFRO', 'BOWL_CUT'];
export const NAIL_TROLL_TYPES: readonly NailTrollType[] = ['SUPER_LONG_CURLED', 'FUNNY_CHARMS'];

export const SMALL_GIFT_ACCESSORIES: readonly AccessoryKey[] = ['BOW', 'SUNGLASSES', 'SPARKLE_CLIP'];

export const SKIN_TONES: readonly string[] = ['#FFE1C8', '#FAD2B4', '#F3BE98', '#FFE8D6'];
export const SHIRT_COLORS: readonly string[] = ['#BFECE0', '#FFD8E4', '#FFE5B4', '#C9E4FF', '#FDE2C8'];

export const AVATAR_PASTEL_COLORS: readonly string[] = [
  '#FFD4E2',
  '#C9F2E3',
  '#FFE5B4',
  '#D7E3FC',
  '#E8D7FF',
  '#FFF0A6',
  '#FFCCD5',
  '#D4F0B8',
];

export function getDeterministicAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % AVATAR_PASTEL_COLORS.length;
  return AVATAR_PASTEL_COLORS[idx];
}

export const DEMO_VIEWER_NAMES: readonly string[] = [
  'Bánh Mì Trứng',
  'Mèo Béo',
  'Trà Sữa Ít Đường',
  'Bé Na 2k4',
  'Anh Huy Đẹp Trai',
  'Chị Thảo Nails',
  'Cáo Nhỏ',
  'Khánh Linh',
  'Minh Quân',
  'Tí Nị Cute',
  'Gấu Bông',
  'Sóc Nâu',
];

export const DEMO_AUDIENCE_COMMENTS_VI: readonly string[] = [
  'Cắt cho em với chủ tiệm ơi!',
  'Đẹp xuất sắc luôn á ✨',
  'Hóng quả đầu mới nha!',
  'Làm bộ nail hồng xinh đi chị!',
  'Đừng trượt tay nha thợ ơi 😂',
  'Xếp hàng nãy giờ rồi nè!',
  'Tóc xoăn vàng nhìn cháy quá!',
  'Ê cái ghế VIP kia đẹp ghê!',
];

export const DEMO_AUDIENCE_COMMENTS_EN: readonly string[] = [
  'Cut my hair next please!',
  'So cute and sparkly ✨',
  'Can not wait for the reveal!',
  'Pink nails look amazing!',
  'Please do not slip the clipper 😂',
  'Waiting in line right here!',
  'Curly gold style looks fresh!',
];
