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
    waitingForModel: 'Đang chờ người mẫu...',
    queueCountLabel: 'Chờ',
    vipCountLabel: 'VIP',
    paintingNowLabel: 'Đang vẽ',
    speedBoostLabel: 'Tốc độ cọ',
    communityGoalLabel: 'Mục tiêu tim',
    rulesTitle: 'BẢNG HƯỚNG DẪN',
    ruleJoinLine: '💬 Gõ "vẽ" → Xếp hàng',
    ruleVipJump: '🌹 Tặng Hoa → Lên vẽ ngay',
    ruleLikeSpeed: '❤️ Thả tim → Vẽ siêu tốc',
    giftGuideTitle: 'MỐC QUÀ TẶNG',
    giftTier1: '🌹 1–4 xu: Nhảy hàng VIP',
    giftTier2: '🎨 5–29 xu: Đổi style / Vẽ Troll',
    giftTier3: '👑 30+ xu: Khung Hoàng Gia + Đổi Mũ',
    speechIdleInvite: 'Ai muốn mình vẽ chân dung không nào? Gõ "vẽ" ngay nhé! 🎨',
    speechWalkIn: (name) => `Mời ${name} ngồi ngay ngắn để mình bắt đầu phác họa nhé! ✨`,
    speechVipWelcome: (name) => `Cảm ơn ${name} đã tặng hoa! Lên hàng VIP ngay thôi! 🌹`,
    speechRoyalVip: (name) => `Woaa! Cảm ơn ${name}! Khung vàng hoàng gia & mũ mới sẵn sàng! 👑`,
    speechStyleSwitch: (styleLabel) => `Đổi phong cách sang ${styleLabel} ngay lập tức! 🎨`,
    speechTrollActivate: (name) => `Hihi! Tặng ${name} một nét vẽ Troll cực đáng yêu nha! 😜`,
    speechFastPainting: 'Tim bay quá trời, tay cọ bốc khói luôn rồi nè! 🔥💨',
    speechRevealDone: (name) => `Xong rồi nè! Tác phẩm chân dung của ${name} ra lò! 🖼️✨`,
    speechCommunityGoalHit: 'Đạt mốc mục tiêu tim cộng đồng! Cả xưởng nổ pháo hoa! 🎉❤️',
    trollStamps: ['10/10 Siêu Đẹp', 'Chủ Tịch Tương Lai', 'Ngầu Bá Cháy', 'Đẹp Hết Nước Chấm'],
  },
  en: {
    waitingForModel: 'Waiting for next model...',
    queueCountLabel: 'Line',
    vipCountLabel: 'VIP',
    paintingNowLabel: 'Painting',
    speedBoostLabel: 'Brush Speed',
    communityGoalLabel: 'Heart Goal',
    rulesTitle: 'STUDIO RULES',
    ruleJoinLine: '💬 Type "me" → Join line',
    ruleVipJump: '🌹 Send Rose → Jump line',
    ruleLikeSpeed: '❤️ Tap screen → Paint faster',
    giftGuideTitle: 'GIFT PERKS',
    giftTier1: '🌹 1–4 coins: VIP Line Jump',
    giftTier2: '🎨 5–29 coins: Style / Troll Mode',
    giftTier3: '👑 30+ coins: Royal Frame + New Hat',
    speechIdleInvite: 'Who wants a 3D portrait next? Type "me" in chat! 🎨',
    speechWalkIn: (name) => `Have a seat, ${name}! Let us sketch your portrait! ✨`,
    speechVipWelcome: (name) => `Thank you ${name} for the rose! Jumping to VIP line! 🌹`,
    speechRoyalVip: (name) => `Whoa! Royal VIP ${name}! Golden frame & special beret! 👑`,
    speechStyleSwitch: (styleLabel) => `Switching canvas to ${styleLabel} right now! 🎨`,
    speechTrollActivate: (name) => `Hehe! Adding a mischievous Troll doodle for ${name}! 😜`,
    speechFastPainting: 'So many likes! My brush is flying at turbo speed! 🔥💨',
    speechRevealDone: (name) => `Ta-da! ${name}'s portrait is ready for the gallery! 🖼️✨`,
    speechCommunityGoalHit: 'Community heart goal reached! Confetti for everyone! 🎉❤️',
    trollStamps: ['10/10 Iconic', 'Future CEO', 'Too Cool', 'Masterpiece?'],
  },
};
