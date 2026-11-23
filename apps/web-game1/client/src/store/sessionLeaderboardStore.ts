import { useEffect } from 'react';
import { create } from 'zustand';
import {
  LEADERBOARD_BOARD_MODE,
  LEADERBOARD_CYCLER_CONSTANTS,
  LeaderboardBoardMode,
  SESSION_APEX_MIN_DAMAGE,
  SESSION_APEX_POSITIONS,
  SESSION_APEX_TIER_RULES,
  SESSION_DAMAGE_TIER_RULES,
  SESSION_LEADERBOARD_CONSTANTS,
  SESSION_TIER,
  SESSION_TIER_STYLE,
  SESSION_TIER_UP_ANNOUNCE_MIN,
  SESSION_TIER_UP_CONSTANTS,
  SessionTier,
  isSessionTierAtLeast,
} from '../constants/sessionLeaderboard';
import { TeamColorThemeId } from '../types/team';
import { isViewerActor, toCanonicalViewerName } from './roundDamageTracker';

export interface SessionLeaderboardEntry {
  userName: string;
  /** Team tag and colour at the viewer's last hit (the session spans several matchups). */
  teamTag: string;
  colorTheme?: TeamColorThemeId;
  totalDamage: number;
}

export interface LeaderboardDonatorInput {
  userName: string;
  teamTag?: string;
  colorTheme?: TeamColorThemeId;
}

interface SessionAnnouncementBase {
  id: string;
  userName: string;
  teamTag: string;
  colorTheme?: TeamColorThemeId;
  at: number;
}

export interface SessionTakeover extends SessionAnnouncementBase {
  previousUserName: string;
}

export interface SessionTierUp extends SessionAnnouncementBase {
  tier: SessionTier;
}

export interface SessionLeaderboardState {
  /** Legacy alias kept in sync with `sessionDonators` for existing HUD consumers. */
  topEntries: SessionLeaderboardEntry[];
  /** Cumulative top donators/attackers across the entire live stream session (sorted descending). */
  sessionDonators: SessionLeaderboardEntry[];
  /** Cumulative top donators/attackers in the current match/round only (sorted descending). */
  matchDonators: SessionLeaderboardEntry[];
  /** Current-round MVP per team tag (highest match damage within each team). */
  matchMvpByTag: Readonly<Record<string, SessionLeaderboardEntry>>;
  /** Active leaderboard board mode ('SESSION' | 'MATCH'). Cycles every 10s. */
  currentBoard: LeaderboardBoardMode;
  /** Timestamp (ms) when current board was last switched. */
  lastBoardSwitchedAt: number;
  /** Tier of every ranked viewer; replaced only when someone's tier changes (cheap selector for tokens). */
  tierByName: Readonly<Record<string, SessionTier>>;
  takeover: SessionTakeover | null;
  tierUp: SessionTierUp | null;
  /** Adds score/damage to BOTH `sessionDonators` and `matchDonators` and sorts both descending. */
  addScore: (user: LeaderboardDonatorInput | string, amount: number) => void;
  /** Clears `matchDonators` back to empty when a round ends / transitions. */
  resetMatch: () => void;
  /** Toggles between 'SESSION' and 'MATCH' boards. */
  toggleBoard: () => void;
  /** Explicitly sets current board mode. */
  setBoardMode: (mode: LeaderboardBoardMode) => void;
}

interface PersistedSession {
  lastActivityAt: number;
  entries: SessionLeaderboardEntry[];
}

interface TierChange {
  userName: string;
  previous: SessionTier | undefined;
  next: SessionTier | undefined;
}

const LOG_PREFIX = '[SessionLeaderboard]';
const DEFAULT_TEAM_TAG = 'VIP';
const EMPTY_TIERS: Readonly<Record<string, SessionTier>> = Object.freeze({});
const NOT_ON_APEX_BOARD = 0;
const NO_TIER_ORDER = 0;

/** Full session board (every viewer of the stream); hits mutate it, re-ranking happens on flush. */
const damageByName = new Map<string, SessionLeaderboardEntry>();
/** Current round/match board (reset on `resetMatch()`). */
const matchDamageByName = new Map<string, SessionLeaderboardEntry>();
const canonicalNameCache = new Map<string, string>();
/** Current tiers (mirror of the store map, mutated in place between store updates). */
const tierCache = new Map<string, SessionTier>();
/** Viewers hit since the last flush: only they (and the apex board) can change tier. */
const dirtyNames = new Set<string>();
let apexNames: string[] = [];
let lastActivityAt = 0;
let leaderName: string | null = null;
let lastTakeoverAnnouncedAt = 0;
let lastTierUpAnnouncedAt = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let hasUnsavedChanges = false;

/** Actor labels repeat on every hit ("An (Ahri)"), so the regex work is cached. */
export const getCanonicalViewerName = (actorName: string): string => {
  const cached = canonicalNameCache.get(actorName);
  if (cached !== undefined) return cached;
  if (canonicalNameCache.size >= SESSION_LEADERBOARD_CONSTANTS.MAX_NAME_CACHE) {
    canonicalNameCache.clear();
  }
  const canonical = toCanonicalViewerName(actorName);
  canonicalNameCache.set(actorName, canonical);
  return canonical;
};

/** O(1) lookup for a viewer's total cumulative session damage. */
export const getViewerSessionDamage = (actorName: string): number => {
  const canonical = getCanonicalViewerName(actorName);
  return damageByName.get(canonical)?.totalDamage ?? 0;
};

const isRankableViewer = (userName: string): boolean =>
  Boolean(userName) && isViewerActor(userName);

const getTierOrder = (tier: SessionTier | undefined): number =>
  tier ? SESSION_TIER_STYLE[tier].order : NO_TIER_ORDER;

/** Apex tiers by board position (with a damage floor), otherwise the damage milestones. */
export const resolveSessionTier = (totalDamage: number, position: number): SessionTier | undefined => {
  const isApexCandidate = position !== NOT_ON_APEX_BOARD && totalDamage >= SESSION_APEX_MIN_DAMAGE;
  const apexRule = isApexCandidate
    ? SESSION_APEX_TIER_RULES.find((rule) => position <= rule.maxPosition)
    : undefined;
  if (apexRule) return apexRule.tier;
  return SESSION_DAMAGE_TIER_RULES.find((rule) => totalDamage >= rule.minDamage)?.tier;
};

/** Linear top-k sorted descending: avoids full O(N log N) sort on thousands of viewers per flush. */
const pickTopEntriesFromMap = (
  sourceMap: Map<string, SessionLeaderboardEntry>,
  limit: number
): SessionLeaderboardEntry[] => {
  const top: SessionLeaderboardEntry[] = [];
  for (const entry of sourceMap.values()) {
    if (top.length === limit && entry.totalDamage <= top[limit - 1].totalDamage) continue;
    const insertAt = top.findIndex((ranked) => entry.totalDamage > ranked.totalDamage);
    top.splice(insertAt < 0 ? top.length : insertAt, 0, { ...entry });
    if (top.length > limit) top.pop();
  }
  return top;
};

/** Re-tiers the viewers that may have moved; returns what changed (the cache is updated in place). */
const updateTiers = (apexBoard: SessionLeaderboardEntry[]): TierChange[] => {
  const positionByName = new Map(apexBoard.map((entry, index) => [entry.userName, index + 1]));
  const candidates = new Set<string>([...dirtyNames, ...apexNames, ...positionByName.keys()]);
  const changes: TierChange[] = [];
  for (const userName of candidates) {
    const entry = damageByName.get(userName);
    const next = entry
      ? resolveSessionTier(entry.totalDamage, positionByName.get(userName) ?? NOT_ON_APEX_BOARD)
      : undefined;
    const previous = tierCache.get(userName);
    if (next === previous) continue;
    if (next) tierCache.set(userName, next);
    else tierCache.delete(userName);
    changes.push({ userName, previous, next });
  }
  return changes;
};

const buildAnnouncementBase = (
  userName: string,
  now: number,
  idPrefix: string
): SessionAnnouncementBase => {
  const entry = damageByName.get(userName);
  return {
    id: `${idPrefix}-${now}`,
    userName,
    teamTag: entry?.teamTag ?? '',
    colorTheme: entry?.colorTheme,
    at: now,
  };
};

/** A new #1 is announced when the lead really changes hands, with a cooldown against flip-flopping. */
const detectTakeover = (apexBoard: SessionLeaderboardEntry[], now: number): SessionTakeover | null => {
  const newLeader = apexBoard[0];
  const previousLeader = leaderName;
  leaderName = newLeader?.userName ?? null;
  if (!newLeader || !previousLeader || newLeader.userName === previousLeader) return null;
  if (newLeader.totalDamage < SESSION_LEADERBOARD_CONSTANTS.TAKEOVER_MIN_DAMAGE) return null;
  if (now - lastTakeoverAnnouncedAt < SESSION_LEADERBOARD_CONSTANTS.TAKEOVER_COOLDOWN_MS) return null;
  lastTakeoverAnnouncedAt = now;
  return {
    ...buildAnnouncementBase(newLeader.userName, now, 'takeover'),
    previousUserName: previousLeader,
  };
};

/** The best promotion of this flush (Diamond and up; Challenger is the takeover banner's job). */
const detectTierUp = (changes: TierChange[], now: number): SessionTierUp | null => {
  if (now - lastTierUpAnnouncedAt < SESSION_TIER_UP_CONSTANTS.COOLDOWN_MS) return null;
  const promotions = changes.filter(
    (change) =>
      change.next !== undefined &&
      change.next !== SESSION_TIER.CHALLENGER &&
      isSessionTierAtLeast(change.next, SESSION_TIER_UP_ANNOUNCE_MIN) &&
      getTierOrder(change.next) > getTierOrder(change.previous)
  );
  if (promotions.length === 0) return null;
  const best = promotions.reduce((top, change) =>
    getTierOrder(change.next) > getTierOrder(top.next) ? change : top
  );
  lastTierUpAnnouncedAt = now;
  return { ...buildAnnouncementBase(best.userName, now, 'tierup'), tier: best.next as SessionTier };
};

const accumulateMapEntry = (
  targetMap: Map<string, SessionLeaderboardEntry>,
  userName: string,
  teamTag: string,
  colorTheme: TeamColorThemeId | undefined,
  damage: number
): void => {
  const existing = targetMap.get(userName);
  if (existing) {
    existing.totalDamage += damage;
    existing.teamTag = teamTag;
    existing.colorTheme = colorTheme;
    return;
  }
  targetMap.set(userName, { userName, teamTag, colorTheme, totalDamage: damage });
};

const pickMatchMvpByTag = (): Record<string, SessionLeaderboardEntry> => {
  const mvpByTag: Record<string, SessionLeaderboardEntry> = {};
  for (const entry of matchDamageByName.values()) {
    if (!entry.teamTag) continue;
    const current = mvpByTag[entry.teamTag];
    if (!current || entry.totalDamage > current.totalDamage) {
      mvpByTag[entry.teamTag] = entry;
      mvpByTag[entry.teamTag.toUpperCase()] = entry;
    }
  }
  return mvpByTag;
};

const flushRanking = (shouldAnnounce = true): void => {
  flushTimer = null;
  const now = Date.now();
  const apexBoard = pickTopEntriesFromMap(damageByName, SESSION_APEX_POSITIONS);
  const topSession = apexBoard.slice(0, SESSION_LEADERBOARD_CONSTANTS.DISPLAY_SIZE);
  const topMatch = pickTopEntriesFromMap(
    matchDamageByName,
    SESSION_LEADERBOARD_CONSTANTS.DISPLAY_SIZE
  );
  const changes = updateTiers(apexBoard);
  apexNames = apexBoard.map((entry) => entry.userName);
  dirtyNames.clear();

  const state = useSessionLeaderboardStore.getState();
  const takeover = shouldAnnounce ? detectTakeover(apexBoard, now) : null;
  const tierUp = shouldAnnounce ? detectTierUp(changes, now) : null;
  if (!shouldAnnounce) leaderName = apexBoard[0]?.userName ?? null;

  useSessionLeaderboardStore.setState({
    topEntries: topSession,
    sessionDonators: topSession,
    matchDonators: topMatch,
    matchMvpByTag: pickMatchMvpByTag(),
    tierByName: changes.length > 0 ? Object.fromEntries(tierCache) : state.tierByName,
    takeover: takeover ?? state.takeover,
    tierUp: tierUp ?? state.tierUp,
  });
};

const scheduleFlush = (): void => {
  if (flushTimer) return;
  flushTimer = setTimeout(flushRanking, SESSION_LEADERBOARD_CONSTANTS.FLUSH_INTERVAL_MS);
};

/** Called from damageBoss for every viewer hit; updates BOTH sessionDonators and matchDonators. */
export const recordSessionDamage = (
  actorName: string,
  teamTag: string,
  colorTheme: TeamColorThemeId | undefined,
  damage: number
): void => {
  if (!Number.isFinite(damage) || damage <= 0) return;
  const userName = getCanonicalViewerName(actorName);
  if (!isRankableViewer(userName)) return;

  accumulateMapEntry(damageByName, userName, teamTag, colorTheme, damage);
  accumulateMapEntry(matchDamageByName, userName, teamTag, colorTheme, damage);

  dirtyNames.add(userName);
  lastActivityAt = Date.now();
  hasUnsavedChanges = true;
  scheduleFlush();
};

/** Resets only the current match's leaderboard (`matchDonators`), keeping `sessionDonators` intact. */
export const resetMatchLeaderboard = (): void => {
  matchDamageByName.clear();
  useSessionLeaderboardStore.setState({ matchDonators: [], matchMvpByTag: {} });
};

export const useSessionLeaderboardStore = create<SessionLeaderboardState>(() => ({
  topEntries: [],
  sessionDonators: [],
  matchDonators: [],
  matchMvpByTag: {},
  currentBoard: LEADERBOARD_BOARD_MODE.SESSION,
  lastBoardSwitchedAt: Date.now(),
  tierByName: EMPTY_TIERS,
  takeover: null,
  tierUp: null,
  addScore: (user, amount) => {
    const isStringUser = typeof user === 'string';
    const rawName = isStringUser ? user : user.userName;
    const teamTag = isStringUser ? DEFAULT_TEAM_TAG : user.teamTag || DEFAULT_TEAM_TAG;
    const colorTheme = isStringUser ? undefined : user.colorTheme;
    recordSessionDamage(rawName, teamTag, colorTheme, amount);
  },
  resetMatch: () => {
    resetMatchLeaderboard();
  },
  toggleBoard: () => {
    const current = useSessionLeaderboardStore.getState().currentBoard;
    const next =
      current === LEADERBOARD_BOARD_MODE.SESSION
        ? LEADERBOARD_BOARD_MODE.MATCH
        : LEADERBOARD_BOARD_MODE.SESSION;
    useSessionLeaderboardStore.setState({
      currentBoard: next,
      lastBoardSwitchedAt: Date.now(),
    });
  },
  setBoardMode: (mode: LeaderboardBoardMode) => {
    useSessionLeaderboardStore.setState({
      currentBoard: mode,
      lastBoardSwitchedAt: Date.now(),
    });
  },
}));

let cyclerTimer: ReturnType<typeof setInterval> | null = null;

/** Starts the automatic 10-second multi-board cycler. Idempotent across callers. */
export const startLeaderboardCycler = (): void => {
  if (cyclerTimer) return;
  cyclerTimer = setInterval(() => {
    const state = useSessionLeaderboardStore.getState();
    const elapsed = Date.now() - state.lastBoardSwitchedAt;
    if (elapsed >= LEADERBOARD_CYCLER_CONSTANTS.CYCLE_INTERVAL_MS) {
      state.toggleBoard();
    }
  }, LEADERBOARD_CYCLER_CONSTANTS.TICK_INTERVAL_MS);
};

export const stopLeaderboardCycler = (): void => {
  if (cyclerTimer) {
    clearInterval(cyclerTimer);
    cyclerTimer = null;
  }
};

// Start the cycler automatically on module evaluation
startLeaderboardCycler();

/** Alias for consumers importing `useLeaderboardStore`. */
export const useLeaderboardStore = useSessionLeaderboardStore;

/** Hook for DOM components (chat, banners); the tier map only changes when someone changes tier. */
export const useSessionTier = (actorName: string | undefined): SessionTier | undefined =>
  useSessionLeaderboardStore((state) =>
    actorName ? state.tierByName[getCanonicalViewerName(actorName)] : undefined
  );

export const dismissSessionTakeover = (takeoverId: string): void => {
  const { takeover } = useSessionLeaderboardStore.getState();
  if (takeover?.id === takeoverId) useSessionLeaderboardStore.setState({ takeover: null });
};

export const dismissSessionTierUp = (tierUpId: string): void => {
  const { tierUp } = useSessionLeaderboardStore.getState();
  if (tierUp?.id === tierUpId) useSessionLeaderboardStore.setState({ tierUp: null });
};

// ── Persistence ───────────────────────────────────────────────────────────────

const isPersistedEntry = (value: unknown): value is SessionLeaderboardEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.userName === 'string' &&
    typeof entry.teamTag === 'string' &&
    Number.isFinite(entry.totalDamage)
  );
};

const readPersistedSession = (): PersistedSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_LEADERBOARD_CONSTANTS.STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const session = parsed as Record<string, unknown>;
    if (!Number.isFinite(session.lastActivityAt) || !Array.isArray(session.entries)) return null;
    return {
      lastActivityAt: Number(session.lastActivityAt),
      entries: session.entries.filter(isPersistedEntry),
    };
  } catch (error) {
    console.warn(`${LOG_PREFIX} cannot read session:`, error);
    return null;
  }
};

export const saveSessionLeaderboard = (): void => {
  if (!hasUnsavedChanges) return;
  const entries = [...damageByName.values()]
    .sort((a, b) => b.totalDamage - a.totalDamage)
    .slice(0, SESSION_LEADERBOARD_CONSTANTS.MAX_PERSISTED_ENTRIES);
  try {
    const session: PersistedSession = { lastActivityAt, entries };
    localStorage.setItem(SESSION_LEADERBOARD_CONSTANTS.STORAGE_KEY, JSON.stringify(session));
    hasUnsavedChanges = false;
  } catch (error) {
    console.warn(`${LOG_PREFIX} cannot save session:`, error);
  }
};

const clearPersistedSession = (): void => {
  try {
    localStorage.removeItem(SESSION_LEADERBOARD_CONSTANTS.STORAGE_KEY);
  } catch (error) {
    console.warn(`${LOG_PREFIX} cannot clear session:`, error);
  }
};

/** Admin "new session": empties both session and match boards, tiers, and the saved copy. */
export const resetSessionLeaderboard = (): void => {
  damageByName.clear();
  matchDamageByName.clear();
  tierCache.clear();
  dirtyNames.clear();
  apexNames = [];
  leaderName = null;
  lastActivityAt = 0;
  hasUnsavedChanges = false;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  clearPersistedSession();
  useSessionLeaderboardStore.setState({
    topEntries: [],
    sessionDonators: [],
    matchDonators: [],
    matchMvpByTag: {},
    tierByName: EMPTY_TIERS,
    takeover: null,
    tierUp: null,
  });
};

/** Restores the board after an OBS reload, unless the room has been quiet long enough to be a new live. */
export const hydrateSessionLeaderboard = (now = Date.now()): void => {
  const session = readPersistedSession();
  if (!session) return;
  if (now - session.lastActivityAt > SESSION_LEADERBOARD_CONSTANTS.IDLE_RESET_MS) {
    clearPersistedSession();
    return;
  }
  session.entries.forEach((entry) => {
    damageByName.set(entry.userName, { ...entry });
    dirtyNames.add(entry.userName);
  });
  lastActivityAt = session.lastActivityAt;
  // Restored tiers and leader are not promotions
  flushRanking(false);
};

/** Mount once at the app root: restore on start, save periodically and right before unload. */
export const useSessionLeaderboardPersistence = (): void => {
  useEffect(() => {
    hydrateSessionLeaderboard();
    startLeaderboardCycler();
    const intervalId = window.setInterval(
      saveSessionLeaderboard,
      SESSION_LEADERBOARD_CONSTANTS.SAVE_INTERVAL_MS
    );
    window.addEventListener('beforeunload', saveSessionLeaderboard);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', saveSessionLeaderboard);
      saveSessionLeaderboard();
    };
  }, []);
};
