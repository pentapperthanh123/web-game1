import { create } from 'zustand';
import { ROSE_GRATITUDE_CONSTANTS, TeamType } from '../constants/game';
import { audioService } from '../services/audioService';
import { castCasterSignal, getTeamTag, speakerFor } from '../services/caster/casterSignal';
import { CASTER_SIGNAL } from '../constants/caster';

export interface ActiveRoseToast {
  id: string;
  donorName: string;
  donorAvatarUrl?: string;
  team: TeamType;
  count: number;
  updatedAt: number;
  expiresAt: number;
}

interface DebounceEntry {
  timer: ReturnType<typeof setTimeout>;
  accumulatedCount: number;
  donorName: string;
  team: TeamType;
}

interface RoseGratitudeState {
  activeToasts: ActiveRoseToast[];
  recordRose: (params: {
    donorName: string;
    team: TeamType;
    count?: number;
    donorAvatarUrl?: string;
  }) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

let lastChimeTimestamp = 0;
const debounceRegistry = new Map<string, DebounceEntry>();

const playThrottledChime = (): void => {
  const now = Date.now();
  if (now - lastChimeTimestamp < ROSE_GRATITUDE_CONSTANTS.CHIME_THROTTLE_MS) return;
  lastChimeTimestamp = now;
  audioService.playHeartChime();
};

export const useRoseGratitudeStore = create<RoseGratitudeState>((set) => ({
  activeToasts: [],

  recordRose: ({ donorName, team, count = 1, donorAvatarUrl }) => {
    const now = Date.now();
    const effectiveCount = Math.max(1, count);
    const toastId = `${donorName}_${team}`;

    // 1. Instant playful SFX chime
    playThrottledChime();

    // 2. Update UI active toast list
    set((state) => {
      const existingIndex = state.activeToasts.findIndex((t) => t.id === toastId);
      const expiresAt = now + ROSE_GRATITUDE_CONSTANTS.TOAST_DURATION_MS;

      if (existingIndex >= 0) {
        const nextList = [...state.activeToasts];
        const prevToast = nextList[existingIndex];
        nextList[existingIndex] = {
          ...prevToast,
          count: prevToast.count + effectiveCount,
          donorAvatarUrl: donorAvatarUrl || prevToast.donorAvatarUrl,
          updatedAt: now,
          expiresAt,
        };
        return { activeToasts: nextList };
      }

      const newToast: ActiveRoseToast = {
        id: toastId,
        donorName,
        donorAvatarUrl,
        team,
        count: effectiveCount,
        updatedAt: now,
        expiresAt,
      };

      // Keep only recent active toasts up to MAX_ACTIVE_TOASTS
      const filtered = state.activeToasts.filter((t) => t.expiresAt > now);
      return {
        activeToasts: [...filtered.slice(-(ROSE_GRATITUDE_CONSTANTS.MAX_ACTIVE_TOASTS - 1)), newToast],
      };
    });

    // 3. Debounce Caster / BLV appreciation voice announcement (2.5s)
    const existingEntry = debounceRegistry.get(toastId);
    let totalAccumulated = effectiveCount;

    if (existingEntry) {
      clearTimeout(existingEntry.timer);
      totalAccumulated += existingEntry.accumulatedCount;
    }

    const timer = setTimeout(() => {
      debounceRegistry.delete(toastId);
      castCasterSignal(CASTER_SIGNAL.GIFT_COMBO, {
        name: speakerFor(donorName, team),
        gift: ROSE_GRATITUDE_CONSTANTS.DEFAULT_ROSE_NAME,
        count: totalAccumulated,
        team: getTeamTag(team),
      });
    }, ROSE_GRATITUDE_CONSTANTS.CASTER_DEBOUNCE_MS);

    debounceRegistry.set(toastId, {
      timer,
      accumulatedCount: totalAccumulated,
      donorName,
      team,
    });
  },

  dismissToast: (id: string) => {
    set((state) => ({
      activeToasts: state.activeToasts.filter((t) => t.id !== id),
    }));
  },

  clearAllToasts: () => {
    debounceRegistry.forEach((entry) => clearTimeout(entry.timer));
    debounceRegistry.clear();
    set({ activeToasts: [] });
  },
}));

/** Helper to record rose from any service without React hooks */
export const recordRoseGift = (
  donorName: string,
  team: TeamType,
  count = 1,
  donorAvatarUrl?: string
): void => {
  useRoseGratitudeStore.getState().recordRose({
    donorName,
    team,
    count,
    donorAvatarUrl,
  });
};
