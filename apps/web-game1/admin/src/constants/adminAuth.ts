export const ADMIN_TOKEN_STORAGE_KEY = 'lol_admin_token';
export const ADMIN_TOKEN_HEADER = 'x-admin-token';
export const SERVER_AUTH_ERROR_EVENT = 'server:auth-error';
export const MUTATING_HTTP_METHODS = new Set(['POST', 'PUT', 'DELETE']);

export const TOKEN_GATE_TEXT = {
  TITLE: 'Mã quản trị (Admin Token)',
  DESCRIPTION: 'Nhập ADMIN_TOKEN của server để điều khiển game. Mã được lưu trên trình duyệt này.',
  UNAUTHORIZED: 'Server từ chối thao tác: thiếu hoặc sai mã admin',
  PLACEHOLDER: 'admin token',
  SAVE: 'Lưu & kết nối lại',
  CLEAR: 'Xoá mã',
  CLOSE: 'Đóng',
  OPEN: 'Mã admin',
} as const;

export const TIKTOK_STATUS = {
  CONNECTED: 'CONNECTED',
  CONNECTING: 'CONNECTING',
  RECONNECTING: 'RECONNECTING',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
} as const;

export const TIKTOK_CHECK_STATUS = {
  LIVE: 'LIVE',
  OFFLINE: 'OFFLINE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  BLOCKED: 'BLOCKED',
  ERROR: 'ERROR',
} as const;

export type TikTokCheckStatusCode = (typeof TIKTOK_CHECK_STATUS)[keyof typeof TIKTOK_CHECK_STATUS];

export const TIKTOK_DIAGNOSTIC_TEXT = {
  CHECK_BUTTON: 'Kiểm Tra Cấu Hình',
  CHECKING_BUTTON: 'Đang kiểm tra...',
  CHECK_TOOLTIP: '1 click kiểm tra cấu hình & kết nối tới tiktok-live-connector',
  DISMISS: 'Đóng',
  COPY_ROOM_ID: 'Sao chép Room ID',
  COPIED: 'Đã chép!',
  STATUS_LABELS: {
    LIVE: 'ĐANG PHÁT TRỰC TIẾP',
    OFFLINE: 'NGOẠI TUYẾN (CHƯA LIVE)',
    USER_NOT_FOUND: 'KHÔNG TÌM THẤY USER',
    BLOCKED: 'TIKTOK CHẶN WAF / IP',
    ERROR: 'LỖI KẾT NỐI API',
  },
} as const;

export const TIKTOK_RECONNECT_TEXT = {
  ATTEMPT: 'lần thử',
  RETRY_IN: 'thử lại sau',
  SECONDS_SUFFIX: 's',
  SEPARATOR: ' · ',
} as const;

export const COUNTDOWN_TICK_MS = 1000;
export const MS_PER_SECOND = 1000;

export const DEFAULT_TIKTOK_USERNAME = 'bap.daily.lifestyle99';

