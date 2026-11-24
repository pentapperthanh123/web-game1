import { create } from 'zustand';
import type { PushTier, TeamId } from '../../../shared/types/clash';

export interface GiftTallyEntry {
  giftName: string;
  icon: string;
  /** Number of gifts received (sum of repeat counts). */
  count: number;
  coins: number;
  /** Size of the latest hit, shown as the floating "+N" on the tile. */
  lastAdded: number;
  lastTeam: TeamId;
  lastTier: PushTier;
  /** Increments on every hit so the tile replays its hit animation. */
  hitSeq: number;
  lastAt: number;
}

export interface GiftTallyHit {
  giftName: string;
  icon: string;
  count: number;
  coins: number;
  team: TeamId;
  tier: PushTier;
}

interface GiftTallyState {
  entries: GiftTallyEntry[];
  totalGifts: number;
  totalCoins: number;
  /** Increments on every gift so the total replays its bump animation. */
  totalSeq: number;
  addGift: (hit: GiftTallyHit, now: number) => void;
  reset: () => void;
}

/** Per-round gift totals for the bottom-right panel. */
export const useGiftTallyStore = create<GiftTallyState>()((set) => ({
  entries: [],
  totalGifts: 0,
  totalCoins: 0,
  totalSeq: 0,

  addGift: (hit, now) => {
    set((state) => {
      const index = state.entries.findIndex((entry) => entry.giftName === hit.giftName);
      const previous = index === -1 ? null : state.entries[index];
      const updated: GiftTallyEntry = {
        giftName: hit.giftName,
        icon: hit.icon,
        count: (previous?.count ?? 0) + hit.count,
        coins: (previous?.coins ?? 0) + hit.coins,
        lastAdded: hit.count,
        lastTeam: hit.team,
        lastTier: hit.tier,
        hitSeq: (previous?.hitSeq ?? 0) + 1,
        lastAt: now,
      };
      const entries =
        index === -1
          ? [...state.entries, updated]
          : state.entries.map((entry, i) => (i === index ? updated : entry));

      return {
        entries,
        totalGifts: state.totalGifts + hit.count,
        totalCoins: state.totalCoins + hit.coins,
        totalSeq: state.totalSeq + 1,
      };
    });
  },

  reset: () => set({ entries: [], totalGifts: 0, totalCoins: 0, totalSeq: 0 }),
}));
