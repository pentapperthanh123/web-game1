import type { Socket } from 'socket.io';
import {
  createPlayerProfileStore,
  loadPlayerProfilesFromDisk,
  PeriodStats,
  PlayerProfile,
  PlayerProfileData,
} from '../storage/playerProfileStore.js';
import { ServerContext } from '../types/serverState.js';

export const ROUND_RESULT_EVENT = 'game:round-result';
export const PLAYER_LEADERBOARD_EVENT = 'game:player-leaderboard';

const MAX_PLAYERS_PER_ROUND = 50;
const MAX_USERNAME_LENGTH = 40;
const MAX_ROUND_ID_LENGTH = 100;
const MAX_TRACKED_ROUND_IDS = 200;
const LEADERBOARD_SIZE = 10;
const ROUND_RESULT_RATE_LIMIT_MS = 3000;
const PERIOD_RETENTION_DAYS = 92;
const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const ISO_THURSDAY_OFFSET = 4;
const SUNDAY_JS_DAY = 0;
const ISO_SUNDAY_DAY = 7;
const JANUARY_INDEX = 0;
const FIRST_DAY_OF_MONTH = 1;
const KEY_PAD_LENGTH = 2;
const KEY_PAD_CHAR = '0';
const MONTH_INDEX_OFFSET = 1;

export interface LeaderboardEntry {
  userName: string;
  totalDamage: number;
  mvpCount: number;
  roundsPlayed: number;
}

export interface PlayerLeaderboard {
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
}

interface RoundPlayer {
  userName: string;
  team: string;
  damage: number;
}

interface RoundResult {
  roundId: string;
  players: RoundPlayer[];
}

export interface PlayerProfileService {
  getLeaderboard: () => PlayerLeaderboard;
  registerSocketHandlers: (socket: Socket) => void;
  flush: () => void;
}

function padKeyPart(value: number): string {
  return String(value).padStart(KEY_PAD_LENGTH, KEY_PAD_CHAR);
}

/** ISO-8601 week key, e.g. "2026-W46" (UTC). */
export function getIsoWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jsDay = utc.getUTCDay();
  const isoDay = jsDay === SUNDAY_JS_DAY ? ISO_SUNDAY_DAY : jsDay;
  utc.setUTCDate(utc.getUTCDate() + ISO_THURSDAY_OFFSET - isoDay);
  const yearStart = Date.UTC(utc.getUTCFullYear(), JANUARY_INDEX, FIRST_DAY_OF_MONTH);
  const week = Math.ceil(((utc.getTime() - yearStart) / MS_PER_DAY + 1) / DAYS_PER_WEEK);
  return `${utc.getUTCFullYear()}-W${padKeyPart(week)}`;
}

/** Month key, e.g. "2026-11" (UTC). */
export function getMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${padKeyPart(date.getUTCMonth() + MONTH_INDEX_OFFSET)}`;
}

function sanitizePlayer(raw: unknown): RoundPlayer | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  if (typeof src.userName !== 'string') return null;
  const userName = src.userName.trim().slice(0, MAX_USERNAME_LENGTH);
  const damage = typeof src.damage === 'number' ? src.damage : Number.NaN;
  if (!userName || !Number.isFinite(damage) || damage < 0) return null;
  const team = typeof src.team === 'string' ? src.team.slice(0, MAX_USERNAME_LENGTH) : '';
  return { userName, team, damage };
}

function sanitizeRoundResult(raw: unknown): RoundResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  if (typeof src.roundId !== 'string' || !src.roundId.trim()) return null;
  if (!Array.isArray(src.players)) return null;
  const players = src.players
    .slice(0, MAX_PLAYERS_PER_ROUND)
    .map(sanitizePlayer)
    .filter((player): player is RoundPlayer => player !== null);
  return { roundId: src.roundId.trim().slice(0, MAX_ROUND_ID_LENGTH), players };
}

function createEmptyStats(): PeriodStats {
  return { totalDamage: 0, roundsPlayed: 0, mvpCount: 0 };
}

function addToStats(stats: PeriodStats, damage: number, isMvp: boolean): void {
  stats.totalDamage += damage;
  stats.roundsPlayed += 1;
  if (isMvp) stats.mvpCount += 1;
}

function getRetainedPeriodKeys(now: Date): Set<string> {
  const keys = new Set<string>();
  for (let dayOffset = 0; dayOffset <= PERIOD_RETENTION_DAYS; dayOffset += 1) {
    const day = new Date(now.getTime() - dayOffset * MS_PER_DAY);
    keys.add(getIsoWeekKey(day));
    keys.add(getMonthKey(day));
  }
  return keys;
}

function prunePeriods(profile: PlayerProfile, retainedKeys: Set<string>): void {
  for (const key of Object.keys(profile.periods)) {
    if (!retainedKeys.has(key)) delete profile.periods[key];
  }
}

function toEntry(userName: string, stats: PeriodStats): LeaderboardEntry {
  return {
    userName,
    totalDamage: stats.totalDamage,
    mvpCount: stats.mvpCount,
    roundsPlayed: stats.roundsPlayed,
  };
}

function rankTop(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries.sort((a, b) => b.totalDamage - a.totalDamage).slice(0, LEADERBOARD_SIZE);
}

function buildPeriodBoard(profiles: PlayerProfile[], periodKey: string): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (const profile of profiles) {
    const stats = profile.periods[periodKey];
    if (stats) entries.push(toEntry(profile.userName, stats));
  }
  return rankTop(entries);
}

function getTopDamage(players: RoundPlayer[]): number {
  return players.reduce((maxDamage, player) => Math.max(maxDamage, player.damage), 0);
}

/**
 * Accumulates per-player round results (all-time + weekly/monthly buckets),
 * persists them with debounced JSON writes, and broadcasts leaderboards.
 */
export function createPlayerProfileService(ctx: ServerContext): PlayerProfileService {
  const store = createPlayerProfileStore();
  const data: PlayerProfileData = loadPlayerProfilesFromDisk();
  const lastResultAtBySocket = new WeakMap<Socket, number>();

  const getLeaderboard = (): PlayerLeaderboard => {
    const now = new Date();
    const profiles = Object.values(data.profiles);
    return {
      weekly: buildPeriodBoard(profiles, getIsoWeekKey(now)),
      monthly: buildPeriodBoard(profiles, getMonthKey(now)),
      allTime: rankTop(profiles.map((profile) => toEntry(profile.userName, profile))),
    };
  };

  const getOrCreateProfile = (userName: string): PlayerProfile => {
    const existing = data.profiles[userName];
    if (existing) return existing;
    const created: PlayerProfile = { userName, lastSeenAt: 0, periods: {}, ...createEmptyStats() };
    data.profiles[userName] = created;
    return created;
  };

  const rememberRoundId = (roundId: string): void => {
    data.recentRoundIds.push(roundId);
    const overflow = data.recentRoundIds.length - MAX_TRACKED_ROUND_IDS;
    if (overflow > 0) data.recentRoundIds.splice(0, overflow);
  };

  const applyPlayer = (
    player: RoundPlayer,
    isMvp: boolean,
    nowMs: number,
    periodKeys: string[],
    retainedKeys: Set<string>
  ): void => {
    const profile = getOrCreateProfile(player.userName);
    addToStats(profile, player.damage, isMvp);
    profile.lastSeenAt = nowMs;
    for (const key of periodKeys) {
      const bucket = profile.periods[key] ?? createEmptyStats();
      addToStats(bucket, player.damage, isMvp);
      profile.periods[key] = bucket;
    }
    prunePeriods(profile, retainedKeys);
  };

  const applyRoundResult = (result: RoundResult): void => {
    const now = new Date();
    const periodKeys = [getIsoWeekKey(now), getMonthKey(now)];
    const retainedKeys = getRetainedPeriodKeys(now);
    const topDamage = getTopDamage(result.players);
    for (const player of result.players) {
      const isMvp = topDamage > 0 && player.damage === topDamage;
      applyPlayer(player, isMvp, now.getTime(), periodKeys, retainedKeys);
    }
    rememberRoundId(result.roundId);
  };

  const isRateLimited = (socket: Socket): boolean => {
    const nowMs = Date.now();
    const lastAt = lastResultAtBySocket.get(socket);
    if (lastAt !== undefined && nowMs - lastAt < ROUND_RESULT_RATE_LIMIT_MS) return true;
    lastResultAtBySocket.set(socket, nowMs);
    return false;
  };

  const handleRoundResult = (socket: Socket, rawPayload: unknown): void => {
    if (isRateLimited(socket)) {
      console.warn(`[PlayerProfiles] Rate-limited round result from ${socket.id}`);
      return;
    }
    const result = sanitizeRoundResult(rawPayload);
    if (!result) {
      console.warn(`[PlayerProfiles] Invalid round result from ${socket.id}`);
      return;
    }
    if (data.recentRoundIds.includes(result.roundId)) return;
    applyRoundResult(result);
    store.scheduleSave(data);
    console.log(`[PlayerProfiles] Round ${result.roundId}: ${result.players.length} players recorded`);
    ctx.io.emit(PLAYER_LEADERBOARD_EVENT, getLeaderboard());
  };

  const registerSocketHandlers = (socket: Socket): void => {
    socket.emit(PLAYER_LEADERBOARD_EVENT, getLeaderboard());
    socket.on(ROUND_RESULT_EVENT, (payload: unknown) => handleRoundResult(socket, payload));
  };

  return { getLeaderboard, registerSocketHandlers, flush: store.flush };
}
