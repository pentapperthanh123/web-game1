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
  progressDone: string;
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
    giftLineMedium: 'Quà 5+ → Ối! Trượt tay',
    giftLineLarge: 'Quà 30+ → Khung Hoàng Gia',
    queueTitle: 'Hàng chờ',
    queueEmpty: 'Gõ "tóc" hoặc "nail" để xếp hàng!',
    vipBadge: 'VIP',
    royalBadge: 'HOÀNG GIA',
    vipTopPinLabel: 'VIP TOP 1',
    wallTitle: 'THÀNH QUẢ HÔM NAY',
    wallEmpty: 'Chờ vị khách đầu tiên...',
    waitingTitle: 'Khán giả chờ',
    readyStatus: 'Sẵn sàng đón khách!',
    stylistWorkingHair: 'Tách tách... sắp đẹp rồi nha!',
    stylistWorkingNail: 'Sơn đều tay cho bóng mịn nè!',
    stylistFast: 'Tim nhiều quá, tăng tốc luôn! ⚡',
    stylistGlow: 'Mở khóa màu Pastel & phụ kiện xinh! ✨',
    stylistOops: 'Ối lỡ tay rồi!! Xin lỗi khách ơi! 💦',
    stylistRoyal: 'GÓI HOÀNG GIA! Lấp lánh hết nấc! 👑',
    stylistDone: 'Ting! Thành phẩm ra lò rồi nè! 🎉',
    thankYouSuffix: 'Cảm ơn bạn! ✨',
    trollBannerSuffix: 'kích hoạt Trượt Tay! 😂',
    royalBannerSuffix: 'tặng Gói Hoàng Gia! 👑',
    progressDone: 'HOÀN THÀNH!',
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
    giftLineMedium: 'Gift 5+ → Oops! Troll',
    giftLineLarge: 'Big Gift → Royal Frame',
    queueTitle: 'Queue',
    queueEmpty: 'Type "hair" or "nail" to join!',
    vipBadge: 'VIP',
    royalBadge: 'ROYAL',
    vipTopPinLabel: 'VIP TOP 1',
    wallTitle: 'TODAY GALLERY',
    wallEmpty: 'Waiting for first guest...',
    waitingTitle: 'Waiting crowd',
    readyStatus: 'Ready for next guest!',
    stylistWorkingHair: 'Snip snip... looking fresh!',
    stylistWorkingNail: 'Glossy coat coming right up!',
    stylistFast: 'So many likes! Speed boost! ⚡',
    stylistGlow: 'Pastel shimmer & cute charm unlocked! ✨',
    stylistOops: 'Oops! My hand slipped!! 💦',
    stylistRoyal: 'ROYAL IDOL PACKAGE! Shine bright! 👑',
    stylistDone: 'Ting! Brand new look ready! 🎉',
    thankYouSuffix: 'Thank you! ✨',
    trollBannerSuffix: 'triggered Oops! Troll! 😂',
    royalBannerSuffix: 'unlocked Royal Package! 👑',
    progressDone: 'ALL DONE!',
  },
};
