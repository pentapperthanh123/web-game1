import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const PLAYER_PROFILES_FILE = path.join(DATA_DIR, 'player_profiles.json');
const SAVE_DEBOUNCE_MS = 5000;
const JSON_INDENT = 2;

export interface PeriodStats {
  totalDamage: number;
  roundsPlayed: number;
  mvpCount: number;
}

export interface PlayerProfile extends PeriodStats {
  userName: string;
  lastSeenAt: number;
  /** Keyed by ISO week ("2026-W46") or month ("2026-11"). */
  periods: Record<string, PeriodStats>;
}

export interface PlayerProfileData {
  profiles: Record<string, PlayerProfile>;
  recentRoundIds: string[];
}

function createEmptyData(): PlayerProfileData {
  return { profiles: {}, recentRoundIds: [] };
}

function isPlayerProfileData(value: unknown): value is PlayerProfileData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.profiles === 'object' &&
    candidate.profiles !== null &&
    Array.isArray(candidate.recentRoundIds)
  );
}

export function loadPlayerProfilesFromDisk(): PlayerProfileData {
  try {
    if (!fs.existsSync(PLAYER_PROFILES_FILE)) return createEmptyData();
    const parsed: unknown = JSON.parse(fs.readFileSync(PLAYER_PROFILES_FILE, 'utf-8'));
    if (isPlayerProfileData(parsed)) return parsed;
    console.warn('[PlayerProfiles] Invalid profile file shape, starting empty.');
  } catch (err) {
    console.warn('[PlayerProfiles] Could not read player profiles from disk:', err);
  }
  return createEmptyData();
}

function writePlayerProfilesNow(data: PlayerProfileData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PLAYER_PROFILES_FILE, JSON.stringify(data, null, JSON_INDENT), 'utf-8');
  } catch (err) {
    console.error('[PlayerProfiles] Could not persist player profiles:', err);
  }
}

export interface PlayerProfileStore {
  scheduleSave: (data: PlayerProfileData) => void;
  flush: () => void;
}

/** Debounced writer: coalesces saves within SAVE_DEBOUNCE_MS; flush() writes synchronously. */
export function createPlayerProfileStore(): PlayerProfileStore {
  let pendingData: PlayerProfileData | null = null;
  let saveTimer: NodeJS.Timeout | null = null;

  const flush = (): void => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!pendingData) return;
    writePlayerProfilesNow(pendingData);
    pendingData = null;
  };

  const scheduleSave = (data: PlayerProfileData): void => {
    pendingData = data;
    if (saveTimer) return;
    saveTimer = setTimeout(flush, SAVE_DEBOUNCE_MS);
  };

  return { scheduleSave, flush };
}
