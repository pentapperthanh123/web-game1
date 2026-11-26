import type { AutoBotPace, Language, TikTokConnectionState } from './types';

export interface DrinkBarMessages {
  brandTitle: string;
  doneBadge: string;
  queueBadge: string;
  vipBadge: string;
  topOneBadge: string;
  signatureTag: string;
  shelfTitle: string;
  shelfEmpty: string;
  menuCardTitle: string;
  menuTypePrefix: string;
  giftCardTitle: string;
  giftRowLikeLabel: string;
  giftRowLikeDesc: string;
  giftRowRoseLabel: string;
  giftRowRoseDesc: string;
  giftRowMediumLabel: string;
  giftRowMediumDesc: string;
  giftRowBigLabel: string;
  giftRowBigDesc: string;
  queueCardTitle: string;
  nowLabel: string;
  waitingIdle: string;
  queueEmptyHint: string;
  nextUpLabel: string;
  safeZoneLabel: string;
  thanksPrefix: string;
  flavorUpdatedPrefix: string;
  readyLabel: string;
  sugarLess: string;
  sugarSweet: string;
  iceExtra: string;
  iceLess: string;
  iceNone: string;
  iceNormal: string;
  orderMenuLabel: string;
  icePickerLabel: string;
  donateDanceTitle: string;
  btnDanceSmall: string;
  btnDanceMedium: string;
  btnDanceLarge: string;
  dancingPauseLabel: string;
  soldOutBadge: string;
  soldOutSpeech: string;
  station1Label: string;
  station2Label: string;
  stationIdleLabel: string;
  // 5-phase brew labels + step test buttons
  stepJumpTitle: string;
  btnStep1: string;
  btnStep2: string;
  btnStep3: string;
  btnStep4: string;
  btnStep5: string;
  // Inventory & Restock Admin strings
  inventoryTitle: string;
  btnRestockAll: string;
  btnPlusMl: string;
  autoRestockLabel: string;
  defaultCapacityLabel: string;
  // Admin UI strings
  adminTitle: string;
  adminSubtitle: string;
  autoBotTitle: string;
  autoBotSubtitle: string;
  autoBotOn: string;
  autoBotOff: string;
  paceLabel: string;
  paceSlow: string;
  paceNormal: string;
  paceFast: string;
  quickTestTitle: string;
  btnAddOrder: string;
  btnGift1: string;
  btnGift2: string;
  btnGift3: string;
  btnTestDance: string;
  liveControlsTitle: string;
  languageLabel: string;
  brewDurationLabel: string;
  quickActionsLabel: string;
  btnCompleteNow: string;
  btnAddTopping: string;
  btnNextCustomer: string;
  btnClearShelf: string;
  audioLabel: string;
  sfxLabel: string;
  sfxMusicLabel: string;
  masterVolumeLabel: string;
  btnTestAudio: string;
  btnEnableAudioStage: string;
  audioStatusActive: string;
  audioStatusLocked: string;
  micModeLabel: string;
  micModeHint: string;
  safeZoneToggleLabel: string;
  tiktokConnectTitle: string;
  tiktokPlaceholder: string;
  btnConnect: string;
  btnDisconnect: string;
  stageUrlLabel: string;
  btnCopyUrl: string;
  btnCopied: string;
  btnOpenStage: string;
  previewHeaderTitle: string;
  mirrorLiveBadge: string;
  telemetryNow: string;
  telemetryIdle: string;
  telemetryQueue: string;
  telemetryDone: string;
  statusConnected: string;
  statusConnecting: string;
  statusReconnecting: string;
  statusError: string;
  statusDisconnected: string;
  connectErrorMissingId: string;
  connectErrorServer: string;
}

const EN_MESSAGES: DrinkBarMessages = {
  brandTitle: 'DRINK BAR',
  doneBadge: 'DONE',
  queueBadge: 'Queue',
  vipBadge: 'VIP',
  topOneBadge: 'TOP 1',
  signatureTag: 'Signature',
  shelfTitle: 'RECENT DRINKS',
  shelfEmpty: 'Fresh drinks appear here',
  menuCardTitle: 'DRINK MENU',
  menuTypePrefix: 'type',
  giftCardTitle: 'GIFT PERKS',
  giftRowLikeLabel: 'Like',
  giftRowLikeDesc: 'Faster brew',
  giftRowRoseLabel: 'Rose (1+)',
  giftRowRoseDesc: 'VIP + Topping',
  giftRowMediumLabel: 'Gift (5+)',
  giftRowMediumDesc: 'VIP + Glow Layer',
  giftRowBigLabel: 'Big (30+)',
  giftRowBigDesc: 'Top 1 + Signature',
  queueCardTitle: 'ORDER QUEUE',
  nowLabel: 'NOW',
  waitingIdle: 'Type a drink keyword!',
  queueEmptyHint: 'Type matcha / tra / cafe...',
  nextUpLabel: 'NEXT UP',
  safeZoneLabel: 'TikTok LIVE Chat Safe Zone (960–1280)',
  thanksPrefix: 'Thanks',
  flavorUpdatedPrefix: 'Switched:',
  readyLabel: 'READY!',
  sugarLess: 'Less sugar',
  sugarSweet: 'Extra sweet',
  iceExtra: 'Extra ice',
  iceLess: 'Less ice',
  iceNone: 'No ice',
  iceNormal: 'Normal ice',
  orderMenuLabel: 'Click to Order Specific Drink',
  icePickerLabel: 'Ice',
  donateDanceTitle: 'Donate & TikTok Dance (Barista)',
  btnDanceSmall: 'Dance 1: Heart Sway',
  btnDanceMedium: 'Dance 2: Groove Wave',
  btnDanceLarge: 'Dance 3: Party Hype',
  dancingPauseLabel: 'Dancing ✨',
  soldOutBadge: 'Sold Out',
  soldOutSpeech: 'Sold out! Pick another!',
  station1Label: 'NV1',
  station2Label: '',
  stationIdleLabel: 'Ready',
  stepJumpTitle: 'TEST 5 BREW PHASES (0% → 100%)',
  btnStep1: 'P1 (12%)',
  btnStep2: 'P2 (34%)',
  btnStep3: 'P3 (58%)',
  btnStep4: 'P4 (82%)',
  btnStep5: 'P5 (95%)',
  inventoryTitle: 'Drink Inventory (ml)',
  btnRestockAll: 'Refill All Menu',
  btnPlusMl: '+500ml',
  autoRestockLabel: 'Auto Restock (45s)',
  defaultCapacityLabel: 'Default Tank (ml)',
  adminTitle: 'Drink Bar — Host Console',
  adminSubtitle: 'TikTok LIVE Interactive · 720×1280 @ 30 FPS',
  autoBotTitle: 'Auto-Bot Bar',
  autoBotSubtitle: 'Auto menu keywords (1 cup/user), likes & TikTok Dance gifts',
  autoBotOn: 'Running',
  autoBotOff: 'Paused',
  paceLabel: 'Pace',
  paceSlow: 'Slow',
  paceNormal: 'Normal',
  paceFast: 'Fast',
  quickTestTitle: 'Quick Test Triggers',
  btnAddOrder: '+1 Order (Menu)',
  btnGift1: 'Gift 1★ (VIP + Topping)',
  btnGift2: 'Gift 2★ (VIP + Glow)',
  btnGift3: 'Gift 3★ (Signature)',
  btnTestDance: 'Test Barista Dance',
  liveControlsTitle: 'Live Bar Controls',
  languageLabel: 'Stage Language',
  brewDurationLabel: 'Standard Brew Time',
  quickActionsLabel: 'Quick Actions',
  btnCompleteNow: 'Complete Now',
  btnAddTopping: 'Add Topping',
  btnNextCustomer: 'Next Customer',
  btnClearShelf: 'Clear Shelf',
  audioLabel: 'Chill SFX & Voice',
  sfxLabel: 'Bar ASMR',
  sfxMusicLabel: 'Dance Music',
  masterVolumeLabel: 'Master Volume',
  btnTestAudio: 'Test Audio',
  btnEnableAudioStage: 'Click to Enable Sound',
  audioStatusActive: 'Audio Ready',
  audioStatusLocked: 'Click anywhere for Audio',
  micModeLabel: 'micMode',
  micModeHint: 'Ducks SFX while Host speaks',
  safeZoneToggleLabel: 'Stage Safe-Zone Guide',
  tiktokConnectTitle: 'TikTok LIVE Connect (server/)',
  tiktokPlaceholder: 'Enter @username or Room ID...',
  btnConnect: 'Connect',
  btnDisconnect: 'Disconnect',
  stageUrlLabel: 'OBS / Studio URL',
  btnCopyUrl: 'Copy',
  btnCopied: 'Copied',
  btnOpenStage: 'Open',
  previewHeaderTitle: 'Live Preview (9:16)',
  mirrorLiveBadge: 'Mirror Live',
  telemetryNow: 'Brewing',
  telemetryIdle: 'Bar Ready',
  telemetryQueue: 'Queue',
  telemetryDone: 'Done',
  statusConnected: 'Connected',
  statusConnecting: 'Connecting...',
  statusReconnecting: 'Reconnecting...',
  statusError: 'Error',
  statusDisconnected: 'Offline',
  connectErrorMissingId: 'Please enter a TikTok @username or Room ID.',
  connectErrorServer: 'Cannot reach Core server (port 4000). Run pnpm dev:server first.',
};

const VI_MESSAGES: DrinkBarMessages = {
  brandTitle: 'QUẦY PHA CHẾ',
  doneBadge: 'ĐÃ LÀM',
  queueBadge: 'Hàng chờ',
  vipBadge: 'VIP',
  topOneBadge: 'TOP 1',
  signatureTag: 'Ly Signature',
  shelfTitle: 'KỆ LY VỪA XONG',
  shelfEmpty: 'Ly hoàn thiện sẽ lên kệ tại đây',
  menuCardTitle: 'MENU THỨC UỐNG',
  menuTypePrefix: 'gõ',
  giftCardTitle: 'QUY ĐỔI QUÀ',
  giftRowLikeLabel: 'Like',
  giftRowLikeDesc: 'Pha nhanh hơn',
  giftRowRoseLabel: 'Rose (1+)',
  giftRowRoseDesc: 'VIP + Topping',
  giftRowMediumLabel: 'Gift (5+)',
  giftRowMediumDesc: 'VIP + Tầng đẹp',
  giftRowBigLabel: 'Big (30+)',
  giftRowBigDesc: 'Top 1 + Signature',
  queueCardTitle: 'HÀNG CHỜ PHA',
  nowLabel: 'NOW',
  waitingIdle: 'Gõ tên món trên Menu!',
  queueEmptyHint: 'Gõ matcha / tra / cafe...',
  nextUpLabel: 'TIẾP THEO',
  safeZoneLabel: 'Vùng an toàn Chat TikTok LIVE (960–1280)',
  thanksPrefix: 'Cảm ơn',
  flavorUpdatedPrefix: 'Đổi món:',
  readyLabel: 'XONG LY!',
  sugarLess: 'Ít đường',
  sugarSweet: 'Thêm ngọt',
  iceExtra: 'Nhiều đá',
  iceLess: 'Ít đá',
  iceNone: 'Không đá',
  iceNormal: 'Đá vừa',
  orderMenuLabel: 'Chọn nước cần Order (1 click)',
  icePickerLabel: 'Mức đá',
  donateDanceTitle: 'Donate & Nhảy TikTok (Barista)',
  btnDanceSmall: 'Nhảy 1: Bắn Tim',
  btnDanceMedium: 'Nhảy 2: Sóng Tay',
  btnDanceLarge: 'Nhảy 3: Quẩy Nhiệt',
  dancingPauseLabel: 'Đang nhảy ✨',
  soldOutBadge: 'Hết hàng',
  soldOutSpeech: 'Tạm hết món này nha!',
  station1Label: 'NV1',
  station2Label: '',
  stationIdleLabel: 'Sẵn sàng',
  stepJumpTitle: 'THỬ NHANH 5 PHA PHA CHẾ (0% → 100%)',
  btnStep1: 'P1 (12%)',
  btnStep2: 'P2 (34%)',
  btnStep3: 'P3 (58%)',
  btnStep4: 'P4 (82%)',
  btnStep5: 'P5 (95%)',
  inventoryTitle: 'Tồn Kho Nguyên Liệu (ml)',
  btnRestockAll: 'Nạp đầy toàn bộ Menu',
  btnPlusMl: '+500ml',
  autoRestockLabel: 'Tự nấu mẻ mới (45s)',
  defaultCapacityLabel: 'Dung tích chuẩn',
  adminTitle: 'Drink Bar — Bảng Điều Khiển',
  adminSubtitle: 'Tương tác TikTok LIVE · 720×1280 @ 30 FPS',
  autoBotTitle: 'Auto-Bot Bar',
  autoBotSubtitle: 'Tự gõ từ khóa Menu (1 người/1 ly), thả tim & donate nhảy TikTok',
  autoBotOn: 'Đang chạy',
  autoBotOff: 'Đang tắt',
  paceLabel: 'Nhịp độ',
  paceSlow: 'Slow',
  paceNormal: 'Normal',
  paceFast: 'Fast',
  quickTestTitle: 'Nút Test Nhanh',
  btnAddOrder: '+1 Order (Menu)',
  btnGift1: 'Gift 1★ (VIP + Topping)',
  btnGift2: 'Gift 2★ (VIP + Glow)',
  btnGift3: 'Gift 3★ (Signature)',
  btnTestDance: 'Test NV Nhảy TikTok',
  liveControlsTitle: 'Điều Khiển Trực Tiếp',
  languageLabel: 'Ngôn ngữ sân khấu',
  brewDurationLabel: 'Thời lượng chuẩn mỗi ly',
  quickActionsLabel: 'Thao tác nhanh',
  btnCompleteNow: 'Complete Now',
  btnAddTopping: 'Add Topping',
  btnNextCustomer: 'Next Customer',
  btnClearShelf: 'Clear Shelf',
  audioLabel: 'Âm thanh & Giọng Host',
  sfxLabel: 'Âm ASMR',
  sfxMusicLabel: 'Nhạc nhảy',
  masterVolumeLabel: 'Âm lượng tổng',
  btnTestAudio: 'Thử âm thanh',
  btnEnableAudioStage: 'Chạm để bật âm thanh',
  audioStatusActive: 'Âm thanh Sẵn sàng',
  audioStatusLocked: 'Chạm để kích hoạt loa',
  micModeLabel: 'micMode',
  micModeHint: 'Giảm âm lượng SFX khi Host nói',
  safeZoneToggleLabel: 'Vạch vùng chat trên Stage',
  tiktokConnectTitle: 'Kết nối TikTok LIVE (server/)',
  tiktokPlaceholder: 'Nhập @username hoặc Room ID...',
  btnConnect: 'Kết nối',
  btnDisconnect: 'Ngắt',
  stageUrlLabel: 'URL TikTok Studio',
  btnCopyUrl: 'Copy',
  btnCopied: 'Đã copy',
  btnOpenStage: 'Mở',
  previewHeaderTitle: 'Live Preview (9:16)',
  mirrorLiveBadge: 'Mirror Live',
  telemetryNow: 'Đang pha',
  telemetryIdle: 'Quầy sẵn sàng',
  telemetryQueue: 'Hàng chờ',
  telemetryDone: 'Đã làm',
  statusConnected: 'Đã kết nối',
  statusConnecting: 'Đang kết nối...',
  statusReconnecting: 'Đang thử lại...',
  statusError: 'Lỗi kết nối',
  statusDisconnected: 'Chưa kết nối',
  connectErrorMissingId: 'Vui lòng nhập TikTok @username hoặc Room ID.',
  connectErrorServer: 'Không gọi được Core server (port 4000). Hãy chạy pnpm dev:server trước.',
};

const DICTIONARY: Record<Language, DrinkBarMessages> = {
  EN: EN_MESSAGES,
  VI: VI_MESSAGES,
};

export function getMessages(language: Language): DrinkBarMessages {
  return DICTIONARY[language];
}

export function getPaceLabel(pace: AutoBotPace, language: Language): string {
  const msg = getMessages(language);
  const paceMap: Record<AutoBotPace, string> = {
    SLOW: msg.paceSlow,
    NORMAL: msg.paceNormal,
    FAST: msg.paceFast,
  };
  return paceMap[pace];
}

export function getConnectionStatusLabel(
  status: TikTokConnectionState,
  language: Language
): string {
  const msg = getMessages(language);
  const statusMap: Record<TikTokConnectionState, string> = {
    CONNECTED: msg.statusConnected,
    CONNECTING: msg.statusConnecting,
    RECONNECTING: msg.statusReconnecting,
    ERROR: msg.statusError,
    DISCONNECTED: msg.statusDisconnected,
  };
  return statusMap[status];
}

export function formatShortThanks(
  nickname: string,
  language: Language,
  maxChars: number
): string {
  const prefix = getMessages(language).thanksPrefix;
  const trimmedName = nickname.trim() || 'VIP';
  const raw = `${prefix} ${trimmedName}! ✨`;
  if (raw.length <= maxChars) {
    return raw;
  }
  const availableForName = Math.max(3, maxChars - prefix.length - 5);
  const shortName = trimmedName.slice(0, availableForName).trim();
  return `${prefix} ${shortName}! ✨`;
}
