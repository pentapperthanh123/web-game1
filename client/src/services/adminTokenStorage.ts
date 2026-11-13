/** Admin token persistence for the overlay client (contract: localStorage key + ?adminToken= URL param). */
export const ADMIN_TOKEN_STORAGE_KEY = 'lol_admin_token';
export const ADMIN_TOKEN_URL_PARAM = 'adminToken';
export const ADMIN_TOKEN_HEADER = 'x-admin-token';

const MUTATING_HTTP_METHODS = new Set(['POST', 'PUT', 'DELETE']);

export function readStoredAdminToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? '';
  } catch (error) {
    console.warn('[AdminToken] Cannot read localStorage', error);
    return '';
  }
}

export function saveAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.warn('[AdminToken] Cannot write localStorage', error);
  }
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('[AdminToken] Cannot clear localStorage', error);
  }
}

/** Saves `?adminToken=` from the URL (if any) and strips it from the address bar. */
function consumeUrlAdminToken(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  const urlToken = url.searchParams.get(ADMIN_TOKEN_URL_PARAM);
  if (!urlToken) return '';
  saveAdminToken(urlToken);
  url.searchParams.delete(ADMIN_TOKEN_URL_PARAM);
  window.history.replaceState(window.history.state, '', url.toString());
  return urlToken;
}

/** Resolves the admin token: URL param first (persisted), then localStorage. Empty = read-only overlay. */
export function resolveAdminToken(): string {
  return consumeUrlAdminToken() || readStoredAdminToken();
}

/** Builds headers for a fetch call, adding the admin token header on mutating methods. */
export function buildAdminHeaders(method: string, baseHeaders: Record<string, string> = {}): Record<string, string> {
  const token = readStoredAdminToken();
  if (!token || !MUTATING_HTTP_METHODS.has(method.toUpperCase())) return baseHeaders;
  return { ...baseHeaders, [ADMIN_TOKEN_HEADER]: token };
}
