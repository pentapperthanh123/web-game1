export const ADMIN_PORTAL_TAB = {
  TEAMS: 'TEAMS',
  INTERACTION: 'INTERACTION',
  BOSS_MAP: 'BOSS_MAP',
  OVERLAYS: 'OVERLAYS',
  LOGS: 'LOGS',
  ALL: 'ALL',
} as const;

export type AdminPortalTabId = (typeof ADMIN_PORTAL_TAB)[keyof typeof ADMIN_PORTAL_TAB];

export const DEFAULT_ADMIN_PORTAL_TAB: AdminPortalTabId = ADMIN_PORTAL_TAB.ALL;
export const ADMIN_TAB_STORAGE_KEY = 'lol_admin_portal_active_tab';

export interface AdminPortalTabMeta {
  id: AdminPortalTabId;
  label: string;
}

export const ADMIN_PORTAL_TABS: readonly AdminPortalTabMeta[] = [
  { id: ADMIN_PORTAL_TAB.ALL, label: 'Xem Tất Cả' },
  { id: ADMIN_PORTAL_TAB.TEAMS, label: 'Đội & Game Thủ' },
  { id: ADMIN_PORTAL_TAB.OVERLAYS, label: 'Ẩn/Hiện Section (Overlay)' },
  { id: ADMIN_PORTAL_TAB.INTERACTION, label: 'Tương Tác & Quà' },
  { id: ADMIN_PORTAL_TAB.BOSS_MAP, label: 'Boss & Bản Đồ' },
  { id: ADMIN_PORTAL_TAB.LOGS, label: 'Nhật Ký Live' },
];

export function isAdminPortalTabId(value: string): value is AdminPortalTabId {
  return ADMIN_PORTAL_TABS.some((tab) => tab.id === value);
}

export function loadStoredAdminTab(): AdminPortalTabId {
  if (typeof window === 'undefined') {
    return DEFAULT_ADMIN_PORTAL_TAB;
  }
  try {
    const raw = localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
    // If the browser previously stored INTERACTION from legacy session, migrate to ALL so all sections are visible
    if (raw && isAdminPortalTabId(raw) && raw !== ADMIN_PORTAL_TAB.INTERACTION) {
      return raw;
    }
    return DEFAULT_ADMIN_PORTAL_TAB;
  } catch {
    return DEFAULT_ADMIN_PORTAL_TAB;
  }
}

export function saveStoredAdminTab(tabId: AdminPortalTabId): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(ADMIN_TAB_STORAGE_KEY, tabId);
  } catch {
    // ignore storage errors
  }
}
