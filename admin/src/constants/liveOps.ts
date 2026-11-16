import { ChatLimitConfig, OpsAlertFailure } from '../types/liveOps';

/** Socket event names — must match server/src/constants/liveOps.ts (LIVE_OPS_EVENT). */
export const LIVE_OPS_EVENT = {
  ADMIN_STATE: 'admin:live-ops-state',
  ADMIN_REQUEST_STATE: 'admin:live-ops-request',
  ADMIN_CHAT_LIMITS: 'admin:chat-limits',
  ADMIN_CASTER_CONFIG: 'admin:caster-config',
  ADMIN_MODERATION_UPDATE: 'admin:moderation-update',
  ADMIN_OPS_ALERT_TEST: 'admin:ops-alert-test',
} as const;

export const LIVE_OPS_ACK_TIMEOUT_MS = 10_000;
export const MS_PER_SECOND = 1000;

/** Splits pasted blocklist input on commas, semicolons and line breaks. */
export const TERM_INPUT_SEPARATOR = /[,;\n]+/;
export const MAX_VISIBLE_TERMS = 300;

export const DEFAULT_CHAT_LIMIT_CONFIG: ChatLimitConfig = {
  summonCooldownMs: 30_000,
  maxSummonsPerMinute: 8,
  sameChampionRepeatMs: 30_000,
  softMuteTrigger: 15,
  softMuteMs: 300_000,
};

export interface ChatLimitFieldMeta {
  key: keyof ChatLimitConfig;
  label: string;
  hint: string;
  /** Stored in ms on the server, edited in seconds. */
  isMilliseconds: boolean;
  min: number;
  max: number;
}

/** Bounds in edit units (seconds for ms fields) — server clamps again. */
export const CHAT_LIMIT_FIELDS: readonly ChatLimitFieldMeta[] = [
  { key: 'summonCooldownMs', label: 'Giãn cách lệnh (giây)', hint: '1 lệnh triệu hồi / người / N giây', isMilliseconds: true, min: 0, max: 60 },
  { key: 'maxSummonsPerMinute', label: 'Tối đa lệnh / phút', hint: 'Mỗi người, cửa sổ trượt 60 giây', isMilliseconds: false, min: 1, max: 60 },
  { key: 'sameChampionRepeatMs', label: 'Lặp cùng tướng (giây)', hint: 'Cùng người + cùng tướng chỉ tính 1 lần', isMilliseconds: true, min: 0, max: 300 },
  { key: 'softMuteTrigger', label: 'Ngưỡng tắt tiếng', hint: 'Số lệnh bị chặn trong 60 giây', isMilliseconds: false, min: 3, max: 200 },
  { key: 'softMuteMs', label: 'Thời gian tắt tiếng (giây)', hint: 'Game bỏ qua người này, không đọc tên', isMilliseconds: true, min: 10, max: 3600 },
];

export const OPS_ALERT_FAILURE_LABEL: Record<OpsAlertFailure, string> = {
  NOT_CONFIGURED: 'Chưa cấu hình Telegram, tin chỉ ghi vào log server.',
  SUPPRESSED: 'Bị chặn lặp (đã gửi loại này gần đây).',
  REQUEST_FAILED: 'Gửi thất bại, xem log server.',
};

export const LIVE_OPS_TEXT = {
  SECTION_TITLE: 'Live Ops · Kiểm duyệt & BLV AI',
  SECTION_HINT: 'Áp dụng ngay, không cần khởi động lại. Lưu trên server.',
  LOADING: 'Đang tải cấu hình Live Ops… (cần admin token hợp lệ)',
  SWITCHES_TITLE: 'Công tắc BLV',
  TTS_LABEL: 'Bật giọng đọc BLV trên overlay',
  TTS_HINT: 'Overlay dùng công tắc này khi bộ BLV mới được bật (đợt 2).',
  NAME_READING_LABEL: 'Đọc tên người xem',
  NAME_READING_HINT: 'TẮT = khẩn cấp: BLV không đọc bất kỳ tên người xem nào.',
  NAME_READING_OFF_BADGE: 'ĐANG TẮT ĐỌC TÊN',
  TELEGRAM_TITLE: 'Cảnh báo Telegram',
  TELEGRAM_CONFIGURED: 'Đã cấu hình',
  TELEGRAM_NOT_CONFIGURED: 'Chưa cấu hình (chỉ ghi log)',
  TELEGRAM_TEST_BUTTON: 'Gửi tin thử',
  TELEGRAM_TEST_SENDING: 'Đang gửi…',
  TELEGRAM_TEST_DELIVERED: 'Đã gửi tin thử.',
  TELEGRAM_TEST_NO_RESPONSE: 'Server không phản hồi.',
  LIMITS_TITLE: 'Chống spam lệnh triệu hồi',
  LIMITS_SAVE: 'Lưu',
  LIMITS_RESET: 'Mặc định',
  LIMITS_SAVED: 'Đã lưu',
  TERMS_TITLE: 'Từ cấm (tên & chat)',
  TERMS_HINT: 'Từ tiếng Việt giữ dấu. Có thể dán nhiều từ, cách nhau bằng dấu phẩy hoặc xuống dòng.',
  TERMS_PLACEHOLDER: 'vd: từ cấm 1, từ cấm 2',
  TERMS_ADD: 'Thêm',
  TERMS_SEARCH_PLACEHOLDER: 'Tìm trong danh sách…',
  TERMS_REMOVE_TITLE: 'Xóa từ này',
  TERMS_TRUNCATED: 'Chỉ hiện một phần, hãy tìm để lọc.',
  ALIASES_TITLE: 'Biệt danh tướng trong chat',
  ALIASES_HINT: 'Một từ, không dấu. vd: "mf" → Miss Fortune.',
  ALIASES_ALIAS_PLACEHOLDER: 'biệt danh',
  ALIASES_CHAMPION_PLACEHOLDER: 'Chọn tướng',
  ALIASES_ADD: 'Thêm',
  ALIASES_EMPTY: 'Chưa có biệt danh nào.',
  ALIASES_REJECTED: 'Không thêm được (sai tên tướng hoặc bảng đầy):',
} as const;
