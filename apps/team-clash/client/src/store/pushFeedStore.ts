import { create } from 'zustand';
import { PUSH_FEED_CONFIG } from '../../../shared/constants/clashConfig';
import type { PushResult, PushSource, PushTier, TeamId } from '../../../shared/types/clash';

export interface PushFeedChip {
  /** Stable React key for the chip's lifetime (merges keep it). */
  key: number;
  team: TeamId;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  username: string;
  source: PushSource;
  tier: PushTier;
  /** Accumulated push of merged actions, in % of the clash bar. */
  amount: number;
  giftName?: string;
  giftCount: number;
  /** Increments on every merge so the chip can replay its "bump" animation. */
  bump: number;
  createdAt: number;
  expiresAt: number;
  /** Set once the chip starts sliding out; it is removed CHIP_EXIT_MS later. */
  leavingAt: number | null;
}

interface PushFeedState {
  left: PushFeedChip[];
  right: PushFeedChip[];
  addPush: (push: PushResult, now: number) => void;
  prune: (now: number) => void;
  clear: () => void;
}

let nextChipKey = 1;

function lifetimeFor(source: PushSource): number {
  return source === 'GIFT' ? PUSH_FEED_CONFIG.GIFT_CHIP_LIFETIME_MS : PUSH_FEED_CONFIG.CHIP_LIFETIME_MS;
}

function tierRank(tier: PushTier): number {
  return tier === 'LARGE' ? 2 : tier === 'MEDIUM' ? 1 : 0;
}

/** Chats/likes from the same viewer merge into one chip; gifts merge only with the same gift. */
function canMerge(chip: PushFeedChip, push: PushResult): boolean {
  if (chip.leavingAt !== null || chip.userId !== push.viewer.id) return false;
  if (push.source === 'GIFT' || chip.source === 'GIFT') {
    return chip.source === push.source && chip.giftName === push.giftName;
  }
  return true;
}

/**
 * Keep at most MAX_VISIBLE_PER_TEAM live chips: the overflow chip slides out (gifts are the
 * last to be pushed out), and anything beyond MAX_KEPT_PER_TEAM is dropped immediately.
 */
function enforceCapacity(chips: PushFeedChip[], now: number): PushFeedChip[] {
  let live = 0;
  for (const chip of chips) {
    if (chip.leavingAt === null) live++;
  }

  let result = chips;
  while (live > PUSH_FEED_CONFIG.MAX_VISIBLE_PER_TEAM) {
    // Oldest live non-gift first, otherwise oldest live chip.
    let victim = -1;
    for (let i = result.length - 1; i >= 0; i--) {
      const chip = result[i];
      if (chip.leavingAt !== null) continue;
      if (victim === -1) victim = i;
      if (chip.source !== 'GIFT') {
        victim = i;
        break;
      }
    }
    if (victim === -1) break;
    result = result.map((chip, index) => (index === victim ? { ...chip, leavingAt: now } : chip));
    live--;
  }

  if (result.length > PUSH_FEED_CONFIG.MAX_KEPT_PER_TEAM) {
    // Drop the oldest leaving chips first so live ones keep their slot.
    const kept: PushFeedChip[] = [];
    let overflow = result.length - PUSH_FEED_CONFIG.MAX_KEPT_PER_TEAM;
    for (let i = result.length - 1; i >= 0; i--) {
      if (overflow > 0 && result[i].leavingAt !== null) {
        overflow--;
        continue;
      }
      kept.unshift(result[i]);
    }
    result = kept.slice(0, PUSH_FEED_CONFIG.MAX_KEPT_PER_TEAM);
  }

  return result;
}

function addToList(list: PushFeedChip[], push: PushResult, now: number): PushFeedChip[] {
  const mergeIndex = list.findIndex((chip) => canMerge(chip, push));

  if (mergeIndex !== -1) {
    const existing = list[mergeIndex];
    const merged: PushFeedChip = {
      ...existing,
      nickname: push.viewer.nickname || existing.nickname,
      avatarUrl: push.viewer.avatarUrl || existing.avatarUrl,
      // A merged chat+like chip keeps the "loudest" source label.
      source: existing.source === 'CHAT' || push.source === 'CHAT' ? 'CHAT' : push.source,
      tier: tierRank(push.tier) > tierRank(existing.tier) ? push.tier : existing.tier,
      amount: existing.amount + push.amount,
      giftCount: existing.giftCount + (push.giftCount ?? 0),
      bump: existing.bump + 1,
      expiresAt: Math.max(existing.expiresAt, now + lifetimeFor(push.source)),
    };
    // Move to the front (newest slot, closest to the orb).
    return [merged, ...list.slice(0, mergeIndex), ...list.slice(mergeIndex + 1)];
  }

  const chip: PushFeedChip = {
    key: nextChipKey++,
    team: push.team,
    userId: push.viewer.id,
    nickname: push.viewer.nickname || push.viewer.username,
    username: push.viewer.username,
    avatarUrl: push.viewer.avatarUrl,
    source: push.source,
    tier: push.tier,
    amount: push.amount,
    giftName: push.giftName,
    giftCount: push.giftCount ?? 0,
    bump: 0,
    createdAt: now,
    expiresAt: now + lifetimeFor(push.source),
    leavingAt: null,
  };
  return enforceCapacity([chip, ...list], now);
}

function pruneList(list: PushFeedChip[], now: number): PushFeedChip[] {
  let changed = false;
  const next: PushFeedChip[] = [];
  for (const chip of list) {
    if (chip.leavingAt !== null) {
      if (now - chip.leavingAt >= PUSH_FEED_CONFIG.CHIP_EXIT_MS) {
        changed = true;
        continue;
      }
      next.push(chip);
    } else if (now >= chip.expiresAt) {
      changed = true;
      next.push({ ...chip, leavingAt: now });
    } else {
      next.push(chip);
    }
  }
  return changed ? next : list;
}

export const usePushFeedStore = create<PushFeedState>()((set) => ({
  left: [],
  right: [],

  addPush: (push, now) => {
    set((state) =>
      push.team === 'LEFT'
        ? { left: addToList(state.left, push, now) }
        : { right: addToList(state.right, push, now) }
    );
  },

  prune: (now) => {
    set((state) => {
      const left = pruneList(state.left, now);
      const right = pruneList(state.right, now);
      return left === state.left && right === state.right ? state : { left, right };
    });
  },

  clear: () => set({ left: [], right: [] }),
}));
