import type { StudioLocale } from '../types/studio';

export interface StudioStrings {
  waitingForModel: string;
  queueCountLabel: string;
  vipCountLabel: string;
  paintingNowLabel: string;
  speedBoostLabel: string;
  communityGoalLabel: string;
  rulesTitle: string;
  ruleJoinLine: string;
  ruleVipJump: string;
  ruleLikeSpeed: string;
  giftGuideTitle: string;
  giftTier1: string;
  giftTier2: string;
  giftTier3: string;
  speechIdleInvite: string;
  speechWalkIn: (name: string) => string;
  speechVipWelcome: (name: string) => string;
  speechRoyalVip: (name: string) => string;
  speechStyleSwitch: (styleLabel: string) => string;
  speechTrollActivate: (name: string) => string;
  speechFastPainting: string;
  speechRevealDone: (name: string) => string;
  speechCommunityGoalHit: string;
  trollStamps: readonly string[];
}

export const STUDIO_STRINGS: Record<StudioLocale, StudioStrings> = {
  vi: {
    waitingForModel: 'Đang chờ...',
    queueCountLabel: 'Chờ',
    vipCountLabel: 'VIP',
    paintingNowLabel: 'Đang vẽ',
    speedBoostLabel: 'Tốc độ cọ',
    communityGoalLabel: 'Mục tiêu tim',
    rulesTitle: 'HƯỚNG DẪN',
    ruleJoinLine: '💬 Gõ "vẽ" → Xếp hàng',
    ruleVipJump: '🌹 Tặng Hoa → Lên ngay',
    ruleLikeSpeed: '❤️ Thả tim → Vẽ nhanh',
    giftGuideTitle: 'MỐC QUÀ TẶNG',
    giftTier1: '🌹 1–4 xu: Nhảy hàng VIP',
    giftTier2: '🎨 5–29 xu: Đổi style / Vẽ Troll',
    giftTier3: '👑 30+ xu: Khung Hoàng Gia + Đổi Mũ',
    speechIdleInvite: 'Gõ "vẽ" lên nào! 🎨',
    speechWalkIn: (_name) => 'Ngồi yên nhé! ✨',
    speechVipWelcome: (_name) => 'Lên VIP ngay! 🌹',
    speechRoyalVip: (_name) => 'Khung hoàng gia! 👑',
    speechStyleSwitch: (_styleLabel) => 'Đổi phong cách! 🎨',
    speechTrollActivate: (_name) => 'Vẽ Troll nha! 😜',
    speechFastPainting: 'Vẽ siêu tốc! 🔥',
    speechRevealDone: (_name) => 'Xong rồi nè! 🖼️✨',
    speechCommunityGoalHit: 'Đạt mốc tim! 🎉❤️',
    trollStamps: ['10/10 Siêu Đẹp', 'Chủ Tịch Tương Lai', 'Ngầu Bá Cháy', 'Đẹp Hết Nước Chấm'],
  },
  en: {
    waitingForModel: 'Waiting...',
    queueCountLabel: 'Queue',
    vipCountLabel: 'VIP',
    paintingNowLabel: 'Drawing',
    speedBoostLabel: 'Brush Speed',
    communityGoalLabel: 'Heart Goal',
    rulesTitle: 'RULES',
    ruleJoinLine: '💬 Type "me" → Join line',
    ruleVipJump: '🌹 Rose → Jump line',
    ruleLikeSpeed: '❤️ Tap → Paint faster',
    giftGuideTitle: 'GIFT PERKS',
    giftTier1: '🌹 1–4 coins: VIP Line Jump',
    giftTier2: '🎨 5–29 coins: Style / Troll Mode',
    giftTier3: '👑 30+ coins: Royal Frame + New Hat',
    speechIdleInvite: 'Type "me" to pose! 🎨',
    speechWalkIn: (_name) => 'Hold still! ✨',
    speechVipWelcome: (_name) => 'VIP jump! 🌹',
    speechRoyalVip: (_name) => 'Royal VIP! 👑',
    speechStyleSwitch: (_styleLabel) => 'New style! 🎨',
    speechTrollActivate: (_name) => 'Troll time! 😜',
    speechFastPainting: 'Fast mode! 🔥',
    speechRevealDone: (_name) => 'Ta-da! 🖼️✨',
    speechCommunityGoalHit: 'Goal reached! 🎉❤️',
    trollStamps: ['10/10 Iconic', 'Future CEO', 'Too Cool', 'Masterpiece?'],
  },
};
