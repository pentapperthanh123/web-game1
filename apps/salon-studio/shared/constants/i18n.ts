import type { SalonLanguage } from '../types/salon.js';

export interface SalonLocaleStrings {
  signTitle: string;
  signSubtitle: string;
  todayLabel: string;
  watchingLabel: string;
  modeHair: string;
  modeNail: string;
  giftCardTitle: string;
  giftLineLike: string;
  giftLineSmall: string;
  giftLineMedium: string;
  giftLineLarge: string;
  queueTitle: string;
  queueEmpty: string;
  vipBadge: string;
  royalBadge: string;
  vipTopPinLabel: string;
  wallTitle: string;
  wallTitleNail: string;
  wallEmpty: string;
  waitingTitle: string;
  readyStatus: string;
  stylistWorkingHair: string;
  stylistWorkingNail: string;
  stylistFast: string;
  stylistGlow: string;
  stylistOops: string;
  stylistRoyal: string;
  stylistDone: string;
  thankYouSuffix: string;
  trollBannerSuffix: string;
  royalBannerSuffix: string;
  artBannerSuffix: string;
  progressDone: string;
  activeCustomerTitle: string;
  activeCustomerNailTitle: string;
  stylistNailArt: string;
}

export const SALON_I18N: Record<SalonLanguage, SalonLocaleStrings> = {
  VI: {
    signTitle: 'TIỆM TÓC & NAIL',
    signSubtitle: 'SALON STUDIO',
    todayLabel: 'Hôm nay',
    watchingLabel: 'Đang hóng',
    modeHair: 'CẮT TÓC',
    modeNail: 'LÀM MÓNG',
    giftCardTitle: 'BẢNG GIÁ QUÀ',
    giftLineLike: 'Thả tim → Làm nhanh hơn',
    giftLineSmall: 'Hoa hồng → Hàng VIP + Nhũ',
    giftLineMedium: 'Quà 5+ → Mẫu VIP + Tăng tốc',
    giftLineLarge: 'Quà 30+ → Khung Hoàng Gia',
    queueTitle: 'Hàng chờ',
    queueEmpty: 'Gõ "tóc" hoặc "nail" để xếp hàng!',
    vipBadge: 'VIP',
    royalBadge: 'HOÀNG GIA',
    vipTopPinLabel: 'VIP TOP 1',
    wallTitle: 'BẢNG MẪU TÓC',
    wallTitleNail: 'BẢNG MẪU NAIL',
    wallEmpty: 'Chờ vị khách đầu tiên...',
    waitingTitle: 'Khán giả chờ',
    readyStatus: 'Sẵn sàng đón khách!',
    stylistWorkingHair: 'Tách tách... sắp đẹp rồi nha!',
    stylistWorkingNail: 'Sơn bóng xinh nè! 💅',
    stylistNailArt: 'Đính nhũ lấp lánh! ✨',
    stylistFast: 'Tăng tốc luôn nè! ⚡',
    stylistGlow: 'Màu Pastel cực xinh! ✨',
    stylistOops: 'Ấy, cắt lẹ quá tay! ✨',
    stylistRoyal: 'Gói Hoàng Gia VIP! 👑',
    stylistDone: 'Xong rồi, xinh quá! 🎉',
    thankYouSuffix: 'Cảm ơn bạn! ✨',
    trollBannerSuffix: 'kích hoạt Tăng Tốc Điệu Nghệ! ✨',
    artBannerSuffix: 'mở khóa Họa Tiết VIP! 🌸',
    royalBannerSuffix: 'tặng Gói Hoàng Gia! 👑',
    progressDone: 'HOÀN THÀNH!',
    activeCustomerTitle: 'ĐANG TRÊN GHẾ',
    activeCustomerNailTitle: 'ĐANG LÀM NAIL',
  },
  EN: {
    signTitle: 'SALON STUDIO',
    signSubtitle: 'HAIR & NAIL BAR',
    todayLabel: 'Today',
    watchingLabel: 'Watching',
    modeHair: 'HAIR MODE',
    modeNail: 'NAIL MODE',
    giftCardTitle: 'GIFT MENU',
    giftLineLike: 'Heart → Faster',
    giftLineSmall: 'Rose → VIP Queue + Glow',
    giftLineMedium: 'Gift 5+ → VIP Art + Speed',
    giftLineLarge: 'Big Gift → Royal Frame',
    queueTitle: 'Queue',
    queueEmpty: 'Type "hair" or "nail" to join!',
    vipBadge: 'VIP',
    royalBadge: 'ROYAL',
    vipTopPinLabel: 'VIP TOP 1',
    wallTitle: 'HAIR STYLE BOARD',
    wallTitleNail: 'NAIL ART BOARD',
    wallEmpty: 'Waiting for first guest...',
    waitingTitle: 'Waiting crowd',
    readyStatus: 'Ready for next guest!',
    stylistWorkingHair: 'Snip snip... looking fresh!',
    stylistWorkingNail: 'Glossy coat time! 💅',
    stylistNailArt: 'Sparkle nail art! ✨',
    stylistFast: 'Speed boost on! ⚡',
    stylistGlow: 'Pastel glow unlocked! ✨',
    stylistOops: 'Fast snipping flair! ✨',
    stylistRoyal: 'ROYAL VIP PACKAGE! 👑',
    stylistDone: 'All done, so cute! 🎉',
    thankYouSuffix: 'Thank you! ✨',
    trollBannerSuffix: 'activated Styling Speed Boost! ✨',
    artBannerSuffix: 'unlocked VIP Art Style! 🌸',
    royalBannerSuffix: 'unlocked Royal Package! 👑',
    progressDone: 'ALL DONE!',
    activeCustomerTitle: 'IN SALON CHAIR',
    activeCustomerNailTitle: 'IN NAIL SALON',
  },
};
