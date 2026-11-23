import type { ActionBadgeConfig, PrankActionType } from './types/prank.js';

export interface ActionGiftRule {
  id: PrankActionType;
  labelEn: string;
  labelVi: string;
  chatTriggers: string[];
  requiredCoins: number;
  rageGain: number; // Percentage added to rageMeter
  decalType: 'EGG_SPLAT' | 'CAKE_SMEAR' | 'MILK_SPLASH' | 'BUMP_STARS' | 'WIND_GUST' | 'SURPRISE_BOX';
  flightSpeed: number;
  descriptionEn: string;
  descriptionVi: string;
}

export const ACTION_GIFT_RULES: Record<PrankActionType, ActionGiftRule> = {
  EGG: {
    id: 'EGG',
    labelEn: 'EGG',
    labelVi: 'TRỨNG',
    chatTriggers: ['egg', 'trung', 'trứng', '1'],
    requiredCoins: 1,
    rageGain: 8,
    decalType: 'EGG_SPLAT',
    flightSpeed: 0.045,
    descriptionEn: 'Parabolic egg throw, splatters yolk & eggshells on nose/lap',
    descriptionVi: 'Quả trứng bay đập vào mặt/đầu gối, vỡ tung lòng đỏ & vỏ trứng',
  },
  CAKE: {
    id: 'CAKE',
    labelEn: 'CAKE',
    labelVi: 'BÁNH',
    chatTriggers: ['cake', 'banh', 'bánh', '3'],
    requiredCoins: 3,
    rageGain: 14,
    decalType: 'CAKE_SMEAR',
    flightSpeed: 0.045,
    descriptionEn: 'Cake smash onto face, leaving white cream smears',
    descriptionVi: 'Bánh kem úp thẳng vào mặt, văng mảng kem bám má và mũ',
  },
  MILK: {
    id: 'MILK',
    labelEn: 'MILK',
    labelVi: 'SỮA',
    chatTriggers: ['milk', 'sua', 'sữa', '2'],
    requiredCoins: 2,
    rageGain: 10,
    decalType: 'MILK_SPLASH',
    flightSpeed: 0.05,
    descriptionEn: 'Liquid milk stream splashing across orange vest and chin',
    descriptionVi: 'Tia sữa trắng bắn tung tóe lên áo phản quang và cằm',
  },
  WIND: {
    id: 'WIND',
    labelEn: 'WIND',
    labelVi: 'GIÓ',
    chatTriggers: ['wind', 'gio', 'gió', '1'],
    requiredCoins: 1,
    rageGain: 7,
    decalType: 'WIND_GUST',
    flightSpeed: 0.07,
    descriptionEn: 'Whirlwind blowing beanie & jacket violently',
    descriptionVi: 'Lốc xoáy thổi giật mũ len, tóc và áo rung bần bật',
  },
  BALL: {
    id: 'BALL',
    labelEn: 'BALL',
    labelVi: 'BÓNG',
    chatTriggers: ['ball', 'bong', 'bóng', '2'],
    requiredCoins: 2,
    rageGain: 11,
    decalType: 'BUMP_STARS',
    flightSpeed: 0.06,
    descriptionEn: 'Basketball bonk causing head knock & rotating stars for 2.5s',
    descriptionVi: 'Bóng rổ đập đầu nảy ra, sao vàng xoay quanh đầu 2.5s',
  },
  SURPRISE: {
    id: 'SURPRISE',
    labelEn: 'SURPRISE',
    labelVi: 'BẤT NGỜ',
    chatTriggers: ['surprise', 'batngo', 'bất ngờ', 'box', '5'],
    requiredCoins: 5,
    rageGain: 22,
    decalType: 'SURPRISE_BOX',
    flightSpeed: 0.045,
    descriptionEn: 'Mystery gift box popping random multi-item combo and screen shake',
    descriptionVi: 'Hộp quà nảy tung hiệu ứng troll ngẫu nhiên + rung màn hình',
  },
  TAUNT: {
    id: 'TAUNT',
    labelEn: 'TAUNT',
    labelVi: 'CHỌC CÁU',
    chatTriggers: ['wtf', 'haha', 'lol', 'kaka', '4'],
    requiredCoins: 4,
    rageGain: 6,
    decalType: 'SURPRISE_BOX',
    flightSpeed: 0.05,
    descriptionEn: 'Taunt the old man causing angry grimace and rage surge',
    descriptionVi: 'Chọc tức khiến ông lão nhăn mặt và bốc hoả',
  },
};

// 3 Left Badges for HUD: EGG, CAKE, MILK
export const HUD_BADGES_LEFT: ActionBadgeConfig[] = [
  {
    id: 'badge-egg',
    action: 'EGG',
    icon: '🥚',
    labelEn: 'EGG',
    labelVi: 'TRỨNG',
    subTextEn: '"egg" / 1',
    subTextVi: '"trung" / 1',
    requiredCoins: 1,
    keywords: ACTION_GIFT_RULES.EGG.chatTriggers,
  },
  {
    id: 'badge-cake',
    action: 'CAKE',
    icon: '🎂',
    labelEn: 'CAKE',
    labelVi: 'BÁNH',
    subTextEn: '"cake" / 3',
    subTextVi: '"banh" / 3',
    requiredCoins: 3,
    keywords: ACTION_GIFT_RULES.CAKE.chatTriggers,
  },
  {
    id: 'badge-milk',
    action: 'MILK',
    icon: '🥛',
    labelEn: 'MILK',
    labelVi: 'SỮA',
    subTextEn: '"milk" / 2',
    subTextVi: '"sua" / 2',
    requiredCoins: 2,
    keywords: ACTION_GIFT_RULES.MILK.chatTriggers,
  },
];

// 3 Right Badges for HUD: WIND, BALL, SURPRISE
export const HUD_BADGES_RIGHT: ActionBadgeConfig[] = [
  {
    id: 'badge-wind',
    action: 'WIND',
    icon: '💨',
    labelEn: 'WIND',
    labelVi: 'GIÓ',
    subTextEn: '"wind" / 1',
    subTextVi: '"gio" / 1',
    requiredCoins: 1,
    keywords: ACTION_GIFT_RULES.WIND.chatTriggers,
  },
  {
    id: 'badge-ball',
    action: 'BALL',
    icon: '🏀',
    labelEn: 'BALL',
    labelVi: 'BÓNG',
    subTextEn: '"ball" / 2',
    subTextVi: '"bong" / 2',
    requiredCoins: 2,
    keywords: ACTION_GIFT_RULES.BALL.chatTriggers,
  },
  {
    id: 'badge-surprise',
    action: 'SURPRISE',
    icon: '🎁',
    labelEn: 'SURPRISE',
    labelVi: 'BẤT NGỜ',
    subTextEn: '5+ Coins',
    subTextVi: '5+ Xu',
    requiredCoins: 5,
    keywords: ACTION_GIFT_RULES.SURPRISE.chatTriggers,
  },
];
