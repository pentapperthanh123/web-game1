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

export const TIKTOK_RECONNECT_TEXT = {
  ATTEMPT: 'lần thử',
  RETRY_IN: 'thử lại sau',
  SECONDS_SUFFIX: 's',
  SEPARATOR: ' · ',
} as const;

export const COUNTDOWN_TICK_MS = 1000;
export const MS_PER_SECOND = 1000;
