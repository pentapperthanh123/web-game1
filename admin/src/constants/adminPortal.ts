import { GameThemeType } from '../services/socket';
import { ALL_CHAMPIONS } from './champions';
import { ADMIN_PORTAL_TAB, AdminPortalTabId } from './tabs';

export const ADMIN_APP_TITLE = 'LOL CKTG';

export interface LogItem {
  id: string;
  time: string;
  type: string;
  message: string;
  team?: string;
}

export interface BossThemeOption {
  id: GameThemeType;
  name: string;
  sub: string;
  desc: string;
  icon: string;
  bgActive: string;
  borderActive: string;
  badgeBg: string;
  badgeText: string;
}

export const VALID_THEMES = new Set<GameThemeType>([
  'BARON',
  'ELDER_DRAGON',
  'XU_GIA',
  'RONG_NUI',
  'RONG_GIA',
  'VOID_TITAN',
]);

export const THEME_OPTIONS: BossThemeOption[] = [
  {
    id: 'XU_GIA',
    name: 'Sứ Giả Khe Nứt',
    sub: 'Ván 1 (0.5x HP)',
    desc: 'Cua Kỳ Cục đột biến • Tông xanh lục bảo',
    icon: '/images/boss_rift_herald_2d.png',
    bgActive: 'bg-emerald-950/90',
    borderActive: 'border-emerald-400',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
  },
  {
    id: 'RONG_NUI',
    name: 'Rồng Núi Nham Thạch',
    sub: 'Ván 2 (0.7x HP)',
    desc: 'Địa Long Núi Lửa • Tông đỏ cam dung nham',
    icon: '/images/boss_mountain_dragon_2d.png',
    bgActive: 'bg-orange-950/90',
    borderActive: 'border-orange-400',
    badgeBg: 'bg-orange-600',
    badgeText: 'text-white',
  },
  {
    id: 'RONG_GIA',
    name: 'Rồng Già Bão Tố',
    sub: 'Ván 3 (0.85x HP)',
    desc: 'Lôi Long Cổ Đại • Tông tím sấm sét',
    icon: '/images/boss_storm_dragon_2d.png',
    bgActive: 'bg-indigo-950/90',
    borderActive: 'border-indigo-400',
    badgeBg: 'bg-indigo-600',
    badgeText: 'text-white',
  },
  {
    id: 'ELDER_DRAGON',
    name: 'Rồng Ngàn Tuổi',
    sub: 'Kinh Điển (1.0x HP)',
    desc: 'Long Thần CKTG • Lửa Thiên Thanh & Vàng Kim',
    icon: '/images/boss_elder_dragon_2d.png',
    bgActive: 'bg-gradient-to-r from-amber-950/90 to-cyan-950/90',
    borderActive: 'border-amber-400',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-slate-950',
  },
  {
    id: 'BARON',
    name: 'Baron Nashor',
    sub: 'Tiêu Chuẩn (1.0x HP)',
    desc: 'Chúa tể Hư Không • Tông tím Void huyền bí',
    icon: '/images/boss_baron_2d.png',
    bgActive: 'bg-purple-950/90',
    borderActive: 'border-purple-400',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white',
  },
  {
    id: 'VOID_TITAN',
    name: 'Thần Hư Vô Nguyên Thủy',
    sub: 'Ván 5 Quyết Đấu (1.3x HP)',
    desc: 'Đại Cổ Thần Hư Không • Void Aura tối thượng',
    icon: '/images/boss_void_titan_2d.png',
    bgActive: 'bg-violet-950/95',
    borderActive: 'border-fuchsia-400',
    badgeBg: 'bg-fuchsia-600',
    badgeText: 'text-white',
  },
];

export const RANDOM_CHAMPION_LIST = ALL_CHAMPIONS.map((c) => c.name);

export const RANDOM_SPECTATOR_NAMES = [
  'Gamer_Pro_99',
  'Esports_VIP_88',
  'Mid_Diff_VN',
  'Jungle_Carry',
  'ADC_Crit_99',
  'Support_God',
  'Top1_ThachDau',
  'HuyHuyenThoai',
  'ThanhLong_CKTG',
  'Baron_Stealer',
  'Pentakill_Pro',
  'Worlds_Legend',
];

export interface GiftPreset {
  name: string;
  coins: number;
  label: string;
}

export const GIFT_PRESETS: GiftPreset[] = [
  { name: 'Hoa Hồng 🌹', coins: 1, label: 'Thường' },
  { name: 'Bánh Quy 🍪', coins: 10, label: 'Thường' },
  { name: 'Súng Nước 🔫', coins: 50, label: 'Hiếm' },
  { name: 'Trái Tim CKTG 💖', coins: 199, label: 'Hiếm' },
  { name: 'Rồng Thần CKTG 🐉', coins: 1000, label: 'VIP' },
  { name: 'Phượng Hoàng Lửa 🔥', coins: 2500, label: 'VIP' },
  { name: 'Tàu Vũ Trụ TikTok 🚀', coins: 10000, label: 'Huyền Thoại' },
];

export const TIKTOK_STATUS_STYLE_MAP: Record<string, { dotClass: string; textClass: string }> = {
  CONNECTED: {
    dotClass: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
    textClass: 'text-emerald-400 font-bold',
  },
  CONNECTING: {
    dotClass: 'bg-yellow-400 animate-ping',
    textClass: 'text-yellow-400 font-bold',
  },
  DISCONNECTED: {
    dotClass: 'bg-rose-500',
    textClass: 'text-slate-400',
  },
};

export function getTiktokStatusStyle(status: string): { dotClass: string; textClass: string } {
  return TIKTOK_STATUS_STYLE_MAP[status] || TIKTOK_STATUS_STYLE_MAP.DISCONNECTED;
}

export type ChampionTagFilter =
  | 'ALL'
  | 'Fighter'
  | 'Mage'
  | 'Assassin'
  | 'Marksman'
  | 'Tank'
  | 'Support';

export const CHAMPION_TAG_FILTERS: Array<{ key: ChampionTagFilter; label: string }> = [
  { key: 'ALL', label: `Tất cả (${ALL_CHAMPIONS.length})` },
  { key: 'Fighter', label: 'Đấu Sĩ' },
  { key: 'Mage', label: 'Pháp Sư' },
  { key: 'Assassin', label: 'Sát Thủ' },
  { key: 'Marksman', label: 'Xạ Thủ' },
  { key: 'Tank', label: 'Đỡ Đòn' },
  { key: 'Support', label: 'Hỗ Trợ' },
];

export const TAB_SECTION_ID_MAP: Partial<Record<AdminPortalTabId, string>> = {
  [ADMIN_PORTAL_TAB.OVERLAYS]: 'section-overlays',
  [ADMIN_PORTAL_TAB.BOSS_MAP]: 'section-boss-map',
  [ADMIN_PORTAL_TAB.LOGS]: 'section-logs',
  [ADMIN_PORTAL_TAB.TEAMS]: 'section-teams',
  [ADMIN_PORTAL_TAB.SERIES_DUEL]: 'section-series-duel',
  [ADMIN_PORTAL_TAB.INTERACTION]: 'section-interaction',
};

/**
 * Returns the responsive grid class for the main interaction/match section based on the active tab.
 */
export function getMainGridClassName(activeTab: AdminPortalTabId): string {
  switch (activeTab) {
    case ADMIN_PORTAL_TAB.INTERACTION:
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5';
    case ADMIN_PORTAL_TAB.BOSS_MAP:
      return 'grid grid-cols-1 gap-5';
    case ADMIN_PORTAL_TAB.ALL:
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5';
    default:
      return 'hidden';
  }
}
