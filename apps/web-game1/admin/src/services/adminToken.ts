import { ADMIN_TOKEN_HEADER, ADMIN_TOKEN_STORAGE_KEY, MUTATING_HTTP_METHODS } from '../constants/adminAuth';

export function readAdminToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? '';
  } catch (error) {
    console.warn('[AdminToken] Cannot read localStorage', error);
    return '';
  }
}

/** Saves the token; an empty token clears it. */
export function writeAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
      return;
    }
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('[AdminToken] Cannot write localStorage', error);
  }
}

/** Adds `x-admin-token` for POST/PUT/DELETE calls. */
export function buildAdminHeaders(method: string, baseHeaders: Record<string, string> = {}): Record<string, string> {
  const token = readAdminToken();
  if (!token || !MUTATING_HTTP_METHODS.has(method.toUpperCase())) return baseHeaders;
  return { ...baseHeaders, [ADMIN_TOKEN_HEADER]: token };
}
