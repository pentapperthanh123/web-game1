/**
 * Tuỳ chọn hiển thị đọc từ URL, tiện cho OBS:
 *   ?avatars=off  (hoặc 0 / false / hide) => ẩn ảnh avatar người xem, chỉ hiện tên / chữ cái đầu.
 * Admin vẫn có thể bật/tắt lại lúc live qua CONFIG_UPDATE { isAvatarVisible }.
 */
const AVATAR_QUERY_PARAM = 'avatars';
const AVATAR_OFF_VALUES = new Set(['off', '0', 'false', 'hide']);

export const readInitialAvatarVisibility = (): boolean => {
  if (typeof window === 'undefined') return true;
  const value = new URLSearchParams(window.location.search).get(AVATAR_QUERY_PARAM);
  if (value === null) return true;
  return !AVATAR_OFF_VALUES.has(value.trim().toLowerCase());
};
