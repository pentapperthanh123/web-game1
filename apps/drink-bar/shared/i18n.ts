import type { AutoBotPace, DanceStyle, Language, TikTokConnectionState } from './types';

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
  ctaOrderTitle: string;
  ctaOrderChatHint: string;
  ctaOrderCustomizeHint: string;
  ctaDonateTitle: string;
  ctaDanceSmall: string;
  ctaDanceMedium: string;
  ctaDanceLarge: string;
  queueCardTitle: string;
  nowLabel: string;
  waitingIdle: string;
  queueEmptyHint: string;
  lobbyIdleTitle: string;
  lobbyIdleDesc: string;
  lobbyIdleOneLine: string;
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
  testChatTitle: string;
  testChatNamePlaceholder: string;
  testChatTextPlaceholder: string;
  btnSendTestChat: string;
  btnRandomViewer: string;
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
  unlimitedInventoryLabel: string;
  unlimitedBadge: string;
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
  maxOrdersPerUserLabel: string;
  maxOrdersPerUserHint: string;
  cupsPerUserUnit: string;
  unlimitedCupsPerUserLabel: string;
  quickActionsLabel: string;
  btnCompleteNow: string;
  btnAddTopping: string;
  btnNextCustomer: string;
  btnClearShelf: string;
  btnResetDefault: string;
  btnTestSleep: string;
  audioLabel: string;
  sfxLabel: string;
  sfxMusicLabel: string;
  bgmLabel: string;
  voiceTtsLabel: string;
  voiceToggleOnLabel: string;
  voiceToggleOffLabel: string;
  voiceToggleTitle: string;
  danceNameHeart: string;
  danceNameWave: string;
  danceNameHype: string;
  ttsIdlePhrases: readonly string[];
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
  btnCheckConfig: string;
  btnCheckingConfig: string;
  btnConnect: string;
  btnDisconnect: string;
  roomIdLabel: string;
  roomIdPending: string;
  roomIdOffline: string;
  streamerOwnerLabel: string;
  viewerCountLabel: string;
  viewerOfflineText: string;
  liveTitleLabel: string;
  liveTitleFallback: string;
  liveTitleOffline: string;
  checkStatusLive: string;
  checkStatusOffline: string;
  checkStatusNotFound: string;
  checkStatusBlocked: string;
  checkStatusError: string;
  stageUrlLabel: string;
  btnCopyUrl: string;
  btnCopied: string;
  btnOpenStage: string;
  previewHeaderTitle: string;
  btnShowPreview: string;
  btnHidePreview: string;
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
  giftRowBigLabel: 'Big (10+)',
  giftRowBigDesc: 'Top 1 + Signature',
  ctaOrderTitle: 'HOW TO ORDER',
  ctaOrderChatHint: 'Comment a drink:',
  ctaOrderCustomizeHint: 'less ice · less sugar · no ice',
  ctaDonateTitle: 'TIPS FOR DANCE',
  ctaDanceSmall: 'VIP + Heart Sway',
  ctaDanceMedium: 'VIP + Groove Wave',
  ctaDanceLarge: 'Top 1 + Party Hype',
  queueCardTitle: 'ORDER QUEUE',
  nowLabel: 'NOW',
  waitingIdle: 'Type a drink keyword!',
  queueEmptyHint: 'Type matcha / tradao / cafe...',
  lobbyIdleTitle: 'LOBBY IS OPEN — PLACE YOUR ORDER!',
  lobbyIdleDesc: 'Type a drink (matcha, tradao, cafe, soda...) in chat to join • Gift to dance!',
  lobbyIdleOneLine: 'LOBBY IS OPEN — TYPE A DRINK NAME TO QUEUE UP!',
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
  testChatTitle: 'Test Viewer Comment & Order Commands',
  testChatNamePlaceholder: 'Viewer name...',
  testChatTextPlaceholder: 'Type comment (e.g. tradao it da, matcha it duong)...',
  btnSendTestChat: 'Send Comment',
  btnRandomViewer: 'Random Name',
  donateDanceTitle: 'Donate & TikTok Dance (3 Hot Styles)',
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
  unlimitedInventoryLabel: '∞ Unlimited',
  unlimitedBadge: '∞ Unlimited',
  defaultCapacityLabel: 'Default Tank (ml)',
  adminTitle: 'Drink Bar — Host Console',
  adminSubtitle: 'TikTok LIVE Interactive · 720×1080 @ 30 FPS',
  autoBotTitle: 'Auto-Bot Bar',
  autoBotSubtitle: 'Auto menu keywords & TikTok Dance gifts',
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
  btnTestDance: 'Test TikTok Dance',
  liveControlsTitle: 'Live Bar Controls',
  languageLabel: 'Stage Language',
  brewDurationLabel: 'Standard Brew Time',
  maxOrdersPerUserLabel: 'Max Cups / Viewer in Queue',
  maxOrdersPerUserHint: 'How many cups 1 viewer can queue at the same time',
  cupsPerUserUnit: 'cup',
  unlimitedCupsPerUserLabel: '∞ Unlimited',
  quickActionsLabel: 'Quick Actions',
  btnCompleteNow: 'Complete Now',
  btnAddTopping: 'Add Topping',
  btnNextCustomer: 'Next Customer',
  btnClearShelf: 'Clear Shelf',
  btnResetDefault: 'Reset Empty Lobby',
  btnTestSleep: 'Test Sleep',
  audioLabel: 'Chill SFX & Voice',
  sfxLabel: 'Bar ASMR',
  sfxMusicLabel: 'Dance Music',
  bgmLabel: 'Cafe BGM',
  voiceTtsLabel: 'AI Voice',
  voiceToggleOnLabel: 'Voice',
  voiceToggleOffLabel: 'Muted',
  voiceToggleTitle: 'Toggle AI Voice Announcements',
  danceNameHeart: 'Heart Sway',
  danceNameWave: 'Groove Wave',
  danceNameHype: 'Party Hype',
  ttsIdlePhrases: [
    'Hey cuties! The drink bar is open, drop matcha, tradao, coffee or soda in chat so I can mix one for you!',
    'Yawn... getting a tiny bit sleepy waiting for orders! Someone order an iced coffee to wake me up!',
    'Send a little rose to watch a cute TikTok dance, or drop a drink name to queue up!',
    'Fresh peach tea, iced matcha and sparkling soda are waiting for your order right here!',
  ],
  masterVolumeLabel: 'Master Volume',
  btnTestAudio: 'Test Audio',
  btnEnableAudioStage: 'Click to Enable Sound',
  audioStatusActive: 'Audio Ready',
  audioStatusLocked: 'Click anywhere for Audio',
  micModeLabel: 'micMode',
  micModeHint: 'Ducks SFX while Host speaks',
  safeZoneToggleLabel: 'Stage Safe-Zone Guide',
  tiktokConnectTitle: 'TikTok LIVE Connect (server/)',
  tiktokPlaceholder: 'bap.daily.lifestyle99 or Room ID...',
  btnCheckConfig: 'Check Room ID',
  btnCheckingConfig: 'Checking...',
  btnConnect: 'Connect',
  btnDisconnect: 'Disconnect',
  roomIdLabel: 'Room ID',
  roomIdPending: 'Resolving...',
  roomIdOffline: 'None (Offline)',
  streamerOwnerLabel: 'Channel',
  viewerCountLabel: 'Viewers',
  viewerOfflineText: '0 (Offline)',
  liveTitleLabel: 'Live Title',
  liveTitleFallback: 'Untitled stream',
  liveTitleOffline: 'Not streaming',
  checkStatusLive: 'LIVE STREAMING',
  checkStatusOffline: 'OFFLINE (NOT LIVE)',
  checkStatusNotFound: 'USER NOT FOUND',
  checkStatusBlocked: 'TIKTOK WAF / IP BLOCKED',
  checkStatusError: 'API CONNECT ERROR',
  stageUrlLabel: 'OBS / Studio URL',
  btnCopyUrl: 'Copy',
  btnCopied: 'Copied',
  btnOpenStage: 'Open',
  previewHeaderTitle: 'Live Preview (9:16)',
  btnShowPreview: 'Show Preview',
  btnHidePreview: 'Hide Preview',
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
  giftRowBigLabel: 'Big (10+)',
  giftRowBigDesc: 'Top 1 + Signature',
  ctaOrderTitle: 'CÁCH ORDER',
  ctaOrderChatHint: 'Gõ tên món vào chat:',
  ctaOrderCustomizeHint: 'ít đá · ít đường · không đá',
  ctaDonateTitle: 'TIẾT MỤC NHẢY',
  ctaDanceSmall: 'VIP + Nhảy Bắn Tim',
  ctaDanceMedium: 'VIP + Nhảy Sóng Tay',
  ctaDanceLarge: 'Top 1 + Quẩy Nhiệt',
  queueCardTitle: 'HÀNG CHỜ PHA',
  nowLabel: 'NOW',
  waitingIdle: 'Gõ tên món trên Menu!',
  queueEmptyHint: 'Gõ matcha / trà đào / cà phê...',
  lobbyIdleTitle: 'SẢNH CHỜ ĐANG MỞ — MỜI BẠN ORDER!',
  lobbyIdleDesc: 'Gõ tên món (matcha, tradao, cafe, soda...) vào chat để xếp hàng • Donate nhảy TikTok!',
  lobbyIdleOneLine: 'SẢNH CHỜ ĐANG MỞ — GÕ TÊN MÓN ĐỂ XẾP HÀNG!',
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
  testChatTitle: 'Test Bình Luận Khán Giả (Thử Cú Pháp Chat)',
  testChatNamePlaceholder: 'Tên người xem...',
  testChatTextPlaceholder: 'Nhập comment (VD: cho e order 1 matcha, 1 cà phê, 1 cf cà phê)...',
  btnSendTestChat: 'Gửi Comment',
  btnRandomViewer: 'Đổi tên',
  donateDanceTitle: 'Donate & Nhảy TikTok (3 Điệu Hot)',
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
  unlimitedInventoryLabel: '∞ Không giới hạn',
  unlimitedBadge: '∞ Không giới hạn',
  defaultCapacityLabel: 'Dung tích chuẩn',
  adminTitle: 'Drink Bar — Bảng Điều Khiển',
  adminSubtitle: 'Tương tác TikTok LIVE · 720×1080 @ 30 FPS',
  autoBotTitle: 'Auto-Bot Bar',
  autoBotSubtitle: 'Tự gõ từ khóa Menu & donate nhảy TikTok',
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
  maxOrdersPerUserLabel: 'Số ly tối đa / 1 người cùng lúc',
  maxOrdersPerUserHint: 'Cho phép 1 khán giả đặt liên tiếp nhiều ly vào hàng chờ',
  cupsPerUserUnit: 'ly',
  unlimitedCupsPerUserLabel: '∞ Không giới hạn',
  quickActionsLabel: 'Thao tác nhanh',
  btnCompleteNow: 'Complete Now',
  btnAddTopping: 'Add Topping',
  btnNextCustomer: 'Next Customer',
  btnClearShelf: 'Clear Shelf',
  btnResetDefault: 'Reset Trống Khách',
  btnTestSleep: 'Test Ngủ gật',
  audioLabel: 'Âm thanh & Giọng Host',
  sfxLabel: 'Âm ASMR',
  sfxMusicLabel: 'Nhạc nhảy',
  bgmLabel: 'Nhạc quán',
  voiceTtsLabel: 'Giọng đọc',
  voiceToggleOnLabel: 'Giọng',
  voiceToggleOffLabel: 'Tắt giọng',
  voiceToggleTitle: 'Bật / Tắt giọng đọc Chị Google',
  danceNameHeart: 'Bắn Tim',
  danceNameWave: 'Sóng Tay',
  danceNameHype: 'Quẩy Nhiệt',
  ttsIdlePhrases: [
    'Sảnh chờ đang vắng nè mấy bạn yêu ơi! Gõ matcha, trà đào, cafe hay soda vào chat để mình pha cho nha!',
    'Ngáp một cái nhẹ luôn á! Buồn ngủ quá trời rồi nè, ai order ly cafe sữa cho chủ quán tỉnh táo đi nào!',
    'Tặng hoa hồng là có ngay điệu nhảy Bắn Tim siêu cưng nha, hoặc gõ tên món để mình pha liền tay!',
    'Trà đào, trà chanh, nước cam tươi mát lạnh đang chờ mấy bạn chốt đơn nè, gõ liền tay nha!',
    'Ngồi gật gù chờ khách nè mấy bạn ơi, vào bình luận món yêu thích để mình pha liền tay nha!',
    'Vào xem live nhớ gọi một ly nước thiệt ngon cho vui nha mấy bạn yêu ơi!',
  ],
  masterVolumeLabel: 'Âm lượng tổng',
  btnTestAudio: 'Thử âm thanh',
  btnEnableAudioStage: 'Chạm để bật âm thanh',
  audioStatusActive: 'Âm thanh Sẵn sàng',
  audioStatusLocked: 'Chạm để kích hoạt loa',
  micModeLabel: 'micMode',
  micModeHint: 'Giảm âm lượng SFX khi Host nói',
  safeZoneToggleLabel: 'Vạch vùng chat trên Stage',
  tiktokConnectTitle: 'Kết nối TikTok LIVE (server/)',
  tiktokPlaceholder: 'bap.daily.lifestyle99 hoặc Room ID...',
  btnCheckConfig: 'Kiểm Tra & Lấy Room ID',
  btnCheckingConfig: 'Đang kiểm tra...',
  btnConnect: 'Kết nối',
  btnDisconnect: 'Ngắt',
  roomIdLabel: 'Room ID',
  roomIdPending: 'Đang tìm...',
  roomIdOffline: 'Chưa có (Chưa Live)',
  streamerOwnerLabel: 'Chủ Kênh',
  viewerCountLabel: 'Người Xem',
  viewerOfflineText: '0 (Ngoại Tuyến)',
  liveTitleLabel: 'Tiêu Đề',
  liveTitleFallback: 'Không có tiêu đề',
  liveTitleOffline: 'Chưa phát trực tiếp',
  checkStatusLive: 'ĐANG PHÁT TRỰC TIẾP',
  checkStatusOffline: 'NGOẠI TUYẾN (CHƯA LIVE)',
  checkStatusNotFound: 'KHÔNG TÌM THẤY USER',
  checkStatusBlocked: 'TIKTOK CHẶN WAF / IP',
  checkStatusError: 'LỖI KẾT NỐI API',
  stageUrlLabel: 'URL TikTok Studio',
  btnCopyUrl: 'Copy',
  btnCopied: 'Đã copy',
  btnOpenStage: 'Mở',
  previewHeaderTitle: 'Live Preview (9:16)',
  btnShowPreview: 'Hiện Preview',
  btnHidePreview: 'Ẩn Preview',
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

export function getDanceDisplayName(style: DanceStyle, language: Language): string {
  const msg = getMessages(language);
  const nameMap: Record<DanceStyle, string> = {
    heart_sway: msg.danceNameHeart,
    groove_wave: msg.danceNameWave,
    party_hype: msg.danceNameHype,
  };
  return nameMap[style];
}

function pickRandomVariant(variants: readonly string[]): string {
  return variants[Math.floor(Math.random() * variants.length)];
}

/** Patterns matching external links, phone numbers, or social handles */
const SENSITIVE_URL_OR_CONTACT_PATTERNS: readonly RegExp[] = [
  /(https?:\/\/|www\.)\S+/i,
  /\b[a-z0-9-]{2,}\.(com|net|org|vn|io|me|xyz|link|shop|top|info|biz|cc|vip|live|online|site|app)\b/i,
  /(?:\+?84|\b0)(?:[\s.-]?\d){8,10}\b/,
  /@[a-z0-9_.]{2,}/i,
];

const LEETSPEAK_MAP: Readonly<Record<string, string>> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

/**
 * Substring keywords in collapsed ASCII (accents stripped, leetspeak folded, non-alphanumeric removed).
 * Catches evasions such as "k u b e t", "k.u.b.e.t", "sh0pee", "s-e-x-y".
 */
const SENSITIVE_ASCII_SUBSTRINGS: readonly string[] = [
  // Competitor platforms, redirection & live commerce policy violations
  'shopee',
  'lazada',
  'tiki',
  'sendo',
  'amazon',
  'ebay',
  'facebook',
  'telegram',
  'instagram',
  'youtube',
  'wechat',
  'whatsapp',
  // TikTok official impersonation & moderation triggers
  'tiktok',
  'douyin',
  'bytedance',
  'quantri',
  'moderator',
  'tiktokshop',
  'ttshop',
  // Gambling, betting, lottery, casino, scams
  'kubet',
  'thabet',
  'sunwin',
  'go88',
  'sin88',
  'rikvip',
  'nagavip',
  'socvip',
  'nohu',
  '789club',
  'b52club',
  'bet168',
  'fb88',
  'w88',
  '188bet',
  'm88',
  'jun88',
  'new88',
  'shbet',
  'hi88',
  'bk8',
  'dafabet',
  'taixiu',
  'banca',
  'danhbac',
  'cado',
  'lode',
  'soicau',
  'nhacai',
  'casino',
  'gambling',
  'betting',
  'luadao',
  'kiemtienonline',
  'cobac',
  'keobong',
  // Adult, NSFW, prostitution, dating scam
  'gaigoi',
  'chatsex',
  'showhang',
  'phimsex',
  'kichduc',
  'baocaosu',
  'damdang',
  'thudam',
  'loclip',
  'sugarbaby',
  'sugardaddy',
  'sextoy',
  // Profanity & slurs (compounded)
  'ditme',
  'duma',
  'dume',
  'dauma',
  'occho',
  'sucvat',
  'thangcho',
  'concho',
  'khonnan',
  'memay',
  'bomay',
  'conmemay',
  'chochet',
  'vailon',
  'clmm',
  'dcmm',
  'dkm',
  'motherfucker',
  'asshole',
  'bastard',
  'faggot',
  'nigger',
  'nigga',
  'pussy',
  // Drugs, self-harm, weapons
  'matuy',
  'cansa',
  'thuocphien',
  'bongcuoi',
  'hangtrang',
  'suicide',
  'tutu',
];

/** Substring keywords in collapsed Accented Vietnamese (separators removed) */
const SENSITIVE_ACCENTED_SUBSTRINGS: readonly string[] = [
  'tàixỉu',
  'bắncá',
  'đánhbạc',
  'cáđộ',
  'lôđề',
  'soicầu',
  'nhàcái',
  'gáigọi',
  'kíchdục',
  'mẹmày',
  'bốmày',
  'ócchó',
  'súcvật',
  'khốnnạn',
  'matúy',
  'cầnsa',
  'thuốcphiện',
  'bóngcười',
  'tựtử',
  'đụmẹ',
  'lừadảo',
  'lừađảo',
  'quảntrị',
];

/** Short sensitive tokens checked against individual words to avoid false positive matches in longer words */
const SENSITIVE_ACCENTED_TOKENS = new Set<string>([
  'đĩ',
  'lồn',
  'cặc',
  'buồi',
  'địt',
  'đụ',
  'đéo',
  'đm',
  'đmm',
  'đcm',
  'đkm',
  'chó',
]);

const SENSITIVE_ASCII_TOKENS = new Set<string>([
  'sex',
  'xxx',
  'porn',
  'fuck',
  'shit',
  'cunt',
  'dick',
  'slut',
  'whore',
  'dm',
  'dmm',
  'dcm',
  'dkm',
  'vcl',
  'vkl',
  'clmm',
  'zalo',
  'zl',
  'fb',
  'admin',
]);

function toAsciiFolded(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$]/g, (char) => LEETSPEAK_MAP[char] ?? char);
}

/**
 * Checks whether a nickname contains prohibited, sensitive, copyrighted, or policy-violating keywords.
 */
export function isSensitiveTtsNickname(nickname: string): boolean {
  if (!nickname || typeof nickname !== 'string') return false;
  const raw = nickname.trim();
  if (!raw) return false;

  // 1. Unsafe patterns: URLs, links, phone numbers, handles
  if (SENSITIVE_URL_OR_CONTACT_PATTERNS.some((p) => p.test(raw))) {
    return true;
  }

  // 2. Accented collapsed substring match
  const lowerAccented = raw.toLowerCase().normalize('NFC');
  const compactAccented = lowerAccented.replace(/[^\p{L}\p{N}]/gu, '');
  if (SENSITIVE_ACCENTED_SUBSTRINGS.some((sub) => compactAccented.includes(sub))) {
    return true;
  }

  // 3. ASCII collapsed substring match (catches spaced/leetspeak evasions like "k u b e t", "sh0pee")
  const asciiFolded = toAsciiFolded(raw);
  const compactAscii = asciiFolded.replace(/[^a-z0-9]/g, '');
  if (SENSITIVE_ASCII_SUBSTRINGS.some((sub) => compactAscii.includes(sub))) {
    return true;
  }

  // 4. Token match for short terms (splits on spaces/separators + handles single-letter runs like "s . e . x")
  const accentedTokens = lowerAccented
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (accentedTokens.some((tok) => SENSITIVE_ACCENTED_TOKENS.has(tok))) {
    return true;
  }

  const asciiTokens = asciiFolded
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (asciiTokens.some((tok) => SENSITIVE_ASCII_TOKENS.has(tok))) {
    return true;
  }

  // Check single-letter runs in ascii tokens e.g. ["s", "e", "x"] -> "sex"
  let singleRun = '';
  for (const tok of asciiTokens) {
    if (tok.length === 1) {
      singleRun += tok;
    } else {
      if (singleRun.length >= 2 && SENSITIVE_ASCII_TOKENS.has(singleRun)) {
        return true;
      }
      singleRun = '';
    }
  }
  if (singleRun.length >= 2 && SENSITIVE_ASCII_TOKENS.has(singleRun)) {
    return true;
  }

  return false;
}

export function sanitizeTtsNickname(nickname: string, language: Language): string {
  const fallback = language === 'EN' ? 'friend' : 'bạn yêu';
  if (!nickname || typeof nickname !== 'string') return fallback;

  // Handle coalesced comma-separated names e.g. "User1, User2"
  if (nickname.includes(',')) {
    const parts = nickname.split(',').map((p) => sanitizeTtsNickname(p.trim(), language));
    const unique: string[] = [];
    for (const part of parts) {
      if (!unique.includes(part)) {
        unique.push(part);
      }
    }
    return unique.join(', ') || fallback;
  }

  // If nickname contains sensitive, copyrighted, or policy-violating keywords,
  // do NOT read the nickname aloud — fall back to friendly generic term.
  if (isSensitiveTtsNickname(nickname)) {
    return fallback;
  }

  const clean = nickname
    .replace(/[^\p{L}\p{N}\s._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
  if (clean) return clean;
  return fallback;
}

export function formatTtsDonateMessage(
  nickname: string,
  danceStyle: DanceStyle,
  language: Language,
  isManual = false,
  isShortFollowUp = false
): string {
  const danceName = getDanceDisplayName(danceStyle, language);
  const cleanName = sanitizeTtsNickname(nickname, language);
  if (isShortFollowUp) {
    return language === 'EN'
      ? `Thank you so much ${cleanName} for the gifts!`
      : `Cảm ơn ${cleanName} nhiều lắm luôn nha!`;
  }
  if (language === 'EN') {
    if (isManual) {
      return pickRandomVariant([
        `Cue the music! Starting the cute ${danceName} dance right now!`,
        `Yay! Time to groove with ${danceName} for everyone!`,
      ]);
    }
    return pickRandomVariant([
      `Aww thank you so much ${cleanName} for the sweet gift! Let's dance ${danceName}!`,
      `Yay ${cleanName} sent a gift! Raising the vibe with ${danceName} dance!`,
    ]);
  }
  if (isManual) {
    return pickRandomVariant([
      `Lên nhạc nè cả nhà ơi! Bắt đầu điệu nhảy ${danceName} siêu cưng nha!`,
      `Quẩy lên nào! Nhân viên quầy nhảy điệu ${danceName} tặng mấy bạn yêu nè!`,
    ]);
  }
  return pickRandomVariant([
    `Á á cảm ơn ${cleanName} nhiều lắm luôn nha! Lên nhạc nhảy ${danceName} tặng bạn yêu nè!`,
    `Quà xịn từ ${cleanName} nè trời ơi! Quầy quẩy ngay điệu ${danceName} siêu cưng luôn nha!`,
    `Thương ${cleanName} quá trời ơi! Mời cả nhà cùng xem điệu nhảy ${danceName} nhé!`,
  ]);
}

export function formatTtsOrderMessage(
  nickname: string,
  drinkLabel: string,
  language: Language
): string {
  const cleanName = sanitizeTtsNickname(nickname, language);
  if (language === 'EN') {
    return pickRandomVariant([
      `Yay! Got a fresh ${drinkLabel} order for ${cleanName}!`,
      `Ooh, mixing a yummy ${drinkLabel} for ${cleanName} right away!`,
    ]);
  }
  return pickRandomVariant([
    `Okila ${cleanName} ơi, có ngay một ly ${drinkLabel} mát rượi nè!`,
    `Chốt đơn cho ${cleanName} nha, đợi xíu mình pha ly ${drinkLabel} ngon xỉu luôn!`,
    `Hello ${cleanName} nè, nhận đơn ${drinkLabel} liền tay cho bạn yêu nha!`,
    `Ting ting, lên đơn ly ${drinkLabel} siêu xinh cho ${cleanName} rồi á!`,
  ]);
}

export interface GroupedOrderTtsEntry {
  nickname: string;
  drinkLabel: string;
}

export function formatMultiDrinkLabel(
  drinkLabels: readonly string[],
  language: Language
): string {
  if (drinkLabels.length === 0) return '';
  if (drinkLabels.length === 1) return drinkLabels[0];

  const grouped: { label: string; count: number }[] = [];
  for (const label of drinkLabels) {
    const cleanLabel = label.trim();
    if (!cleanLabel) continue;
    const existing = grouped.find((item) => item.label === cleanLabel);
    if (existing) {
      existing.count += 1;
    } else {
      grouped.push({ label: cleanLabel, count: 1 });
    }
  }

  const parts = grouped.map((item) => {
    if (item.count <= 1) return item.label;
    return language === 'EN' ? `${item.count} ${item.label}` : `${item.count} ly ${item.label}`;
  });

  if (parts.length <= 1) return parts[0] ?? '';
  const connector = language === 'EN' ? ' and ' : ' và ';
  if (parts.length === 2) {
    return `${parts[0]}${connector}${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(', ')}${connector}${parts[parts.length - 1]}`;
}

export function formatTtsMultiDrinkOrderMessage(
  nickname: string,
  drinkLabels: readonly string[],
  language: Language
): string {
  if (drinkLabels.length <= 1) {
    return formatTtsOrderMessage(nickname, drinkLabels[0] ?? '', language);
  }
  const cleanName = sanitizeTtsNickname(nickname, language);
  const summary = formatMultiDrinkLabel(drinkLabels, language);
  if (language === 'EN') {
    return pickRandomVariant([
      `Got ${cleanName}'s order: ${summary} coming right up!`,
      `Yay ${cleanName}, mixing ${summary} for you right away!`,
    ]);
  }
  return pickRandomVariant([
    `Okila ${cleanName} ơi, lên đơn ${summary} liền tay nè!`,
    `Chốt đơn cho ${cleanName} nha: ${summary} ngon xỉu luôn!`,
  ]);
}

export function formatTtsGenericOrderFallback(
  drinkLabels: readonly string[],
  language: Language
): string {
  const summary = formatMultiDrinkLabel(drinkLabels, language);
  if (language === 'EN') {
    return `Got a fresh ${summary} order right away!`;
  }
  return `Chốt đơn ${summary} liền tay nè!`;
}

export function formatTtsGroupedOrderMessage(
  entries: readonly GroupedOrderTtsEntry[],
  language: Language
): string {
  if (entries.length === 0) return '';
  if (entries.length === 1) {
    return formatTtsOrderMessage(entries[0].nickname, entries[0].drinkLabel, language);
  }
  const parts = entries.map((entry) => {
    const cleanName = sanitizeTtsNickname(entry.nickname, language);
    return language === 'EN'
      ? `${entry.drinkLabel} for ${cleanName}`
      : `${entry.drinkLabel} của ${cleanName}`;
  });
  const summary = parts.join(', ');
  if (language === 'EN') {
    return `Got fresh orders right up: ${summary}!`;
  }
  return `Chốt đơn liên tục luôn nè: ${summary}!`;
}

export function formatTtsStartBrewMessage(
  nickname: string,
  drinkLabel: string,
  language: Language
): string {
  const cleanName = sanitizeTtsNickname(nickname, language);
  if (language === 'EN') {
    return pickRandomVariant([
      `Next up, ${drinkLabel} for ${cleanName}!`,
      `Making ${cleanName}'s ${drinkLabel} right now!`,
    ]);
  }
  return pickRandomVariant([
    `Tới lượt ${cleanName}, pha ly ${drinkLabel} liền nè!`,
    `Tiếp theo là ${drinkLabel} cho ${cleanName} nha!`,
  ]);
}

export function formatTtsReadyMessage(
  nickname: string,
  drinkLabel: string,
  language: Language
): string {
  const cleanName = sanitizeTtsNickname(nickname, language);
  if (language === 'EN') {
    return pickRandomVariant([
      `Ding! ${cleanName}, your ${drinkLabel} is ready!`,
      `${cleanName}'s fresh ${drinkLabel} is done!`,
    ]);
  }
  return pickRandomVariant([
    `Ting ting! Ly ${drinkLabel} cho ${cleanName} xong rồi nè!`,
    `Xong ngay ly ${drinkLabel} của ${cleanName} rồi á!`,
    `Mời ${cleanName} nhận ly ${drinkLabel} mát lạnh nè!`,
  ]);
}

export function formatTtsLikeCheerMessage(language: Language): string {
  if (language === 'EN') {
    return pickRandomVariant([
      'So many hearts! Brewing at turbo cute speed right now!',
      'Thank you for the likes cuties, shaking even faster!',
    ]);
  }
  return pickRandomVariant([
    'Ôi tim bay ngập quầy luôn nè, pha nhanh hết tốc lực luôn nha cả nhà!',
    'Cảm ơn mấy bạn yêu thả tim nhiệt tình quá trời, tăng tốc pha nước liền nè!',
    'Tim hồng nhiều xỉu luôn á, quầy pha siêu tốc phục vụ mấy bạn yêu nha!',
  ]);
}

export function formatTtsSwitchFlavorMessage(
  nickname: string,
  drinkLabel: string,
  language: Language
): string {
  const cleanName = sanitizeTtsNickname(nickname, language);
  if (language === 'EN') {
    return `Switched ${cleanName}'s cup to ${drinkLabel} right away!`;
  }
  return `Okila ${cleanName} ơi, đã đổi món sang ${drinkLabel} cho bạn yêu rồi nè!`;
}

export function formatTtsWakeUpMessage(language: Language): string {
  if (language === 'EN') {
    return pickRandomVariant([
      'Ooh customers! Waking up right away!',
      'Yay, someone is here! On it right now!',
    ]);
  }
  return pickRandomVariant([
    'Ối có khách kìa, dậy pha liền!',
    'Ủa có đơn mới rồi, làm ngay làm ngay!',
  ]);
}
