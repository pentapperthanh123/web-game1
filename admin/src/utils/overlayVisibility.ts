import {
  OverlayVisibility,
  DEFAULT_OVERLAY_VISIBILITY,
  OVERLAY_STORAGE_KEY,
} from '../types/overlay';

export const OVERLAY_VISIBILITY_KEYS: readonly (keyof OverlayVisibility)[] = [
  'matchTitleBar',
  'chat',
  'leaderboard',
  'teamRosters',
  'bossHealth',
  'teamScores',
  'likeCounter',
  'howToPlay',
  'heartMilestone',
];

export const TOTAL_OVERLAY_SECTIONS = OVERLAY_VISIBILITY_KEYS.length;

export function pickOverlayVisibilityPatch(rawPayload: unknown): Partial<OverlayVisibility> {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {};
  }
  const source = rawPayload as Record<string, unknown>;
  const patch: Partial<OverlayVisibility> = {};

  for (const key of OVERLAY_VISIBILITY_KEYS) {
    if (typeof source[key] === 'boolean') {
      patch[key] = source[key];
    }
  }
  return patch;
}

export function buildUniformOverlayVisibility(isVisible: boolean): OverlayVisibility {
  return OVERLAY_VISIBILITY_KEYS.reduce<OverlayVisibility>(
    (acc, key) => {
      acc[key] = isVisible;
      return acc;
    },
    {} as OverlayVisibility
  );
}

export function countVisibleOverlays(visibility: OverlayVisibility): number {
  return OVERLAY_VISIBILITY_KEYS.reduce((count, key) => {
    return visibility[key] ? count + 1 : count;
  }, 0);
}

export function loadStoredOverlayVisibility(): OverlayVisibility {
  if (typeof window === 'undefined') {
    return DEFAULT_OVERLAY_VISIBILITY;
  }
  try {
    const raw = localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_OVERLAY_VISIBILITY;
    }
    const cleanPatch = pickOverlayVisibilityPatch(JSON.parse(raw));
    return { ...DEFAULT_OVERLAY_VISIBILITY, ...cleanPatch };
  } catch {
    return DEFAULT_OVERLAY_VISIBILITY;
  }
}

export function saveStoredOverlayVisibility(visibility: OverlayVisibility): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // ignore storage errors
  }
}
