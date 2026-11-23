import { create } from 'zustand';

/** Contract entry for `game:player-leaderboard` / GET /api/player-leaderboard. */
export interface PlayerLeaderboardEntry {
  userName: string;
  totalDamage: number;
  mvpCount: number;
  roundsPlayed: number;
}

export interface PlayerLeaderboardSnapshot {
  weekly: PlayerLeaderboardEntry[];
  monthly: PlayerLeaderboardEntry[];
  allTime: PlayerLeaderboardEntry[];
}

export const PLAYER_LEADERBOARD_PERIOD = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ALL_TIME: 'allTime',
} as const;

export type PlayerLeaderboardPeriod =
  (typeof PLAYER_LEADERBOARD_PERIOD)[keyof typeof PLAYER_LEADERBOARD_PERIOD];

interface PlayerLeaderboardState extends PlayerLeaderboardSnapshot {
  updatedAt: number;
  setLeaderboard: (snapshot: PlayerLeaderboardSnapshot) => void;
}

const EMPTY_TIMESTAMP = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toEntry(raw: unknown): PlayerLeaderboardEntry | null {
  if (!isRecord(raw) || typeof raw.userName !== 'string') return null;
  return {
    userName: raw.userName,
    totalDamage: Number(raw.totalDamage) || 0,
    mvpCount: Number(raw.mvpCount) || 0,
    roundsPlayed: Number(raw.roundsPlayed) || 0,
  };
}

function toEntryList(raw: unknown): PlayerLeaderboardEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(toEntry).filter((entry): entry is PlayerLeaderboardEntry => entry !== null);
}

/** Validates an untrusted server payload; returns null when it is not a leaderboard object. */
export function sanitizePlayerLeaderboard(raw: unknown): PlayerLeaderboardSnapshot | null {
  if (!isRecord(raw)) return null;
  return {
    weekly: toEntryList(raw[PLAYER_LEADERBOARD_PERIOD.WEEKLY]),
    monthly: toEntryList(raw[PLAYER_LEADERBOARD_PERIOD.MONTHLY]),
    allTime: toEntryList(raw[PLAYER_LEADERBOARD_PERIOD.ALL_TIME]),
  };
}

/** Persistent (server-side) viewer leaderboard: weekly / monthly / all-time. */
export const usePlayerLeaderboardStore = create<PlayerLeaderboardState>()((set) => ({
  weekly: [],
  monthly: [],
  allTime: [],
  updatedAt: EMPTY_TIMESTAMP,
  setLeaderboard: (snapshot) => set({ ...snapshot, updatedAt: Date.now() }),
}));
