import { create } from 'zustand';
import { GAMEPLAY_LIMITS } from '@shared/config';
import {
  addToppingToActiveDrink,
  advanceDrinkBarTick,
  applyChatToState,
  applyGiftToState,
  applyLikesToState,
  completeActiveDrink,
  createInitialDrinkBarState,
  promoteNextFromQueue,
  restockAllInState,
  restockRecipeInState,
  setBrewProgressOnState,
  setDefaultCapacityInState,
  triggerManualTikTokDance,
  type QueueStepSideEffects,
} from '@shared/queue';
import { RECIPE_MAP } from '@shared/recipes';
import type {
  DanceStyle,
  DrinkBarLiveState,
  DrinkOrder,
  GiftTier,
  Language,
  RecipeId,
  ToppingId,
  ViewerProfile,
} from '@shared/types';
import { drinkParticles } from '../engine/particlePool';
import { drinkBarAudio } from '../services/audioManager';

function detectIsMirrorPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('mirror') === '1';
}

function runSideEffects(
  state: DrinkBarLiveState,
  effects: QueueStepSideEffects
): void {
  if (effects.sfxToPlay) {
    drinkBarAudio.play(effects.sfxToPlay, state.danceTier, state.danceStyle);
  }
  if (effects.burstKind) {
    const isCompletion =
      effects.burstKind === 'complete' || effects.burstKind === 'signature';

    if (isCompletion) {
      const hasShow1 = state.activeDrink?.phase === 'SHOWCASE';
      const hasShow2 = state.secondaryDrink?.phase === 'SHOWCASE';
      if (hasShow1 && state.activeDrink) {
        drinkParticles.emitBurst(
          effects.burstKind,
          RECIPE_MAP[state.activeDrink.recipeId].accentColor,
          1
        );
      }
      if (hasShow2 && state.secondaryDrink) {
        drinkParticles.emitBurst(
          effects.burstKind,
          RECIPE_MAP[state.secondaryDrink.recipeId].accentColor,
          2
        );
      }
      if (!hasShow1 && !hasShow2) {
        drinkParticles.emitBurst(effects.burstKind, '#F49E60', 1);
      }
      return;
    }

    if (state.activeDrink) {
      drinkParticles.emitBurst(
        effects.burstKind,
        RECIPE_MAP[state.activeDrink.recipeId].accentColor,
        1
      );
    }
    if (state.secondaryDrink) {
      drinkParticles.emitBurst(
        effects.burstKind,
        RECIPE_MAP[state.secondaryDrink.recipeId].accentColor,
        2
      );
    }
  }
}

export type GuestLaneIndex = 0 | 1;

const MAX_GUESTS_PER_LANE = 2;

function reconcileGuestLanes(
  prevLanes: Readonly<Record<string, GuestLaneIndex>>,
  vipQueue: readonly DrinkOrder[],
  normalQueue: readonly DrinkOrder[]
): Record<string, GuestLaneIndex> {
  const visible = [...vipQueue, ...normalQueue].slice(0, GAMEPLAY_LIMITS.MAX_GUEST_SLOTS);
  const nextLanes: Record<string, GuestLaneIndex> = {};
  const counts: [number, number] = [0, 0];

  for (const order of visible) {
    const prev = prevLanes[order.orderId];
    if ((prev === 0 || prev === 1) && counts[prev] < MAX_GUESTS_PER_LANE) {
      nextLanes[order.orderId] = prev;
      counts[prev] += 1;
    }
  }

  for (const order of visible) {
    if (nextLanes[order.orderId] !== undefined) continue;
    const lane: GuestLaneIndex = counts[0] <= counts[1] ? 0 : 1;
    nextLanes[order.orderId] = lane;
    counts[lane] += 1;
  }

  return nextLanes;
}

function areLanesEqual(
  a: Readonly<Record<string, GuestLaneIndex>>,
  b: Readonly<Record<string, GuestLaneIndex>>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export interface DrinkBarStore extends DrinkBarLiveState {
  isMirrorPreview: boolean;
  guestLaneByOrderId: Record<string, GuestLaneIndex>;
  tick: (dtSec: number) => void;
  processChat: (user: ViewerProfile, text: string) => void;
  processLikes: (count: number) => void;
  processGift: (user: ViewerProfile, coins: number) => void;
  setLanguage: (language: Language) => void;
  setBrewDuration: (sec: number) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setMicMode: (enabled: boolean) => void;
  setShowSafeZone: (show: boolean) => void;
  completeNow: () => void;
  addTopping: (toppingId?: ToppingId) => void;
  setBrewProgress: (progress: number) => void;
  nextCustomer: () => void;
  clearShelf: () => void;
  triggerTikTokDance: (tier?: GiftTier, danceStyle?: DanceStyle) => void;
  restockRecipe: (recipeId: RecipeId, addMl?: number) => void;
  restockAll: () => void;
  setDefaultCapacity: (capacityMl: number) => void;
  setAutoRestock: (enabled: boolean) => void;
  getSnapshot: () => DrinkBarLiveState;
}

const initialBase = createInitialDrinkBarState();
const initialIsMirror = detectIsMirrorPreview();
const initialLanes = reconcileGuestLanes(
  {},
  initialBase.vipQueue,
  initialBase.normalQueue
);

export const useDrinkBarStore = create<DrinkBarStore>((set, get) => {
  const commitLiveState = (nextState: DrinkBarLiveState): void => {
    const prevLanes = get().guestLaneByOrderId;
    const nextLanes = reconcileGuestLanes(
      prevLanes,
      nextState.vipQueue,
      nextState.normalQueue
    );
    if (areLanesEqual(prevLanes, nextLanes)) {
      set(nextState);
      return;
    }
    set({ ...nextState, guestLaneByOrderId: nextLanes });
  };

  return {
    ...initialBase,
    config: {
      ...initialBase.config,
      // Keep bottom area naturally clean by default; Host can toggle Safe-Zone grid from Admin
      showSafeZone: false,
    },
    isMirrorPreview: initialIsMirror,
    guestLaneByOrderId: initialLanes,

    tick: (dtSec: number) => {
      const now = Date.now();
      const { state, effects } = advanceDrinkBarTick(get().getSnapshot(), dtSec, now);
      commitLiveState(state);
      runSideEffects(state, effects);
    },

    processChat: (user, text) => {
      const now = Date.now();
      const { state, effects } = applyChatToState(get().getSnapshot(), user, text, now);
      commitLiveState(state);
      runSideEffects(state, effects);
    },

    processLikes: (count) => {
      const now = Date.now();
      const { state, effects } = applyLikesToState(get().getSnapshot(), count, now);
      commitLiveState(state);
      runSideEffects(state, effects);
    },

    processGift: (user, coins) => {
      const now = Date.now();
      const { state, effects } = applyGiftToState(get().getSnapshot(), user, coins, now);
      commitLiveState(state);
      runSideEffects(state, effects);
    },

  setLanguage: (language) => {
    set((prev) => ({
      config: { ...prev.config, language },
    }));
  },

  setBrewDuration: (sec) => {
    const clamped = Math.max(
      GAMEPLAY_LIMITS.MIN_BREW_DURATION_SEC,
      Math.min(GAMEPLAY_LIMITS.MAX_BREW_DURATION_SEC, Math.round(sec))
    );
    set((prev) => ({
      config: { ...prev.config, brewDurationSec: clamped },
    }));
  },

  setSfxEnabled: (sfxEnabled) => {
    drinkBarAudio.setEnabled(sfxEnabled);
    set((prev) => ({
      config: { ...prev.config, sfxEnabled },
    }));
  },

  setMusicEnabled: (sfxMusicEnabled) => {
    drinkBarAudio.setMusicEnabled(sfxMusicEnabled);
    set((prev) => ({
      config: { ...prev.config, sfxMusicEnabled },
    }));
  },

  setMasterVolume: (masterVolume) => {
    const clamped = Math.max(0, Math.min(1, masterVolume));
    drinkBarAudio.setMasterVolume(clamped);
    set((prev) => ({
      config: { ...prev.config, masterVolume: clamped },
    }));
  },

  setMicMode: (micMode) => {
    drinkBarAudio.setMicMode(micMode);
    set((prev) => ({
      config: { ...prev.config, micMode },
    }));
  },

  setShowSafeZone: (showSafeZone) => {
    set((prev) => ({
      config: { ...prev.config, showSafeZone },
    }));
  },

    completeNow: () => {
      const now = Date.now();
      const { state, effects } = completeActiveDrink(get().getSnapshot(), now);
      commitLiveState(state);
      runSideEffects(state, effects);
    },

    addTopping: (toppingId) => {
      const now = Date.now();
      const { state, effects } = addToppingToActiveDrink(
        get().getSnapshot(),
        toppingId,
        now
      );
      commitLiveState(state);
      runSideEffects(state, effects);
    },

    setBrewProgress: (progress: number) => {
      const now = Date.now();
      const { state, effects } = setBrewProgressOnState(
        get().getSnapshot(),
        progress,
        now
      );
      commitLiveState(state);
      runSideEffects(state, effects);
    },

    nextCustomer: () => {
      const now = Date.now();
      const snapshot = get().getSnapshot();
      if (snapshot.activeDrink && snapshot.activeDrink.phase === 'BREWING') {
        const finished = completeActiveDrink(snapshot, now);
        const promoted = promoteNextFromQueue(
          { ...finished.state, activeDrink: null },
          now
        );
        commitLiveState(promoted);
        runSideEffects(promoted, finished.effects);
        return;
      }

      const cleared: DrinkBarLiveState = {
        ...snapshot,
        activeDrink: null,
      };
      const promoted = promoteNextFromQueue(cleared, now);
      commitLiveState(promoted);
      if (promoted.activeDrink) {
        drinkBarAudio.play('pour');
      }
    },

    clearShelf: () => {
      set({ finishedShelf: [] });
    },

    triggerTikTokDance: (tier = 'MEDIUM', danceStyle) => {
      const now = Date.now();
      const { state, effects } = triggerManualTikTokDance(
        get().getSnapshot(),
        tier,
        now,
        danceStyle
      );
      commitLiveState(state);
      runSideEffects(state, effects);
    },

    restockRecipe: (recipeId, addMl) => {
      const next = restockRecipeInState(get().getSnapshot(), recipeId, addMl, Date.now());
      commitLiveState(next);
      drinkBarAudio.play('chime');
    },

    restockAll: () => {
      const next = restockAllInState(get().getSnapshot(), Date.now());
      commitLiveState(next);
      drinkBarAudio.play('chime');
    },

    setDefaultCapacity: (capacityMl) => {
      const next = setDefaultCapacityInState(get().getSnapshot(), capacityMl, Date.now());
      commitLiveState(next);
    },

    setAutoRestock: (autoRestockEnabled) => {
      set((prev) => ({
        config: { ...prev.config, autoRestockEnabled },
      }));
    },

    getSnapshot: (): DrinkBarLiveState => {
      const s = get();
      return {
        config: s.config,
        activeDrink: s.activeDrink,
        secondaryDrink: s.secondaryDrink,
        activeSlots: [s.activeDrink, s.secondaryDrink],
        vipQueue: s.vipQueue,
        normalQueue: s.normalQueue,
        finishedShelf: s.finishedShelf,
        inventory: s.inventory,
        todayDoneCount: s.todayDoneCount,
        bartenderMood: s.bartenderMood,
        bartenderSpeech: s.bartenderSpeech,
        speedBoostUntil: s.speedBoostUntil,
        waveUntil: s.waveUntil,
        danceUntil: s.danceUntil,
        danceStartedAt: s.danceStartedAt,
        danceTier: s.danceTier,
        danceStyle: s.danceStyle,
        guestBubbles: s.guestBubbles,
        lastEventAt: s.lastEventAt,
      };
    },
  };
});
