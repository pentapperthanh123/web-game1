import { create } from 'zustand';
import { GAMEPLAY_LIMITS } from '@shared/config';
import {
  activatePendingDanceOnState,
  addToppingToActiveDrink,
  advanceDrinkBarTick,
  applyChatToState,
  applyGiftToState,
  applyLikesToState,
  completeActiveDrink,
  createEmptyResetDrinkBarState,
  createInitialDrinkBarState,
  promoteNextFromQueue,
  restockAllInState,
  restockRecipeInState,
  setBrewProgressOnState,
  setDefaultCapacityInState,
  triggerManualTikTokDance,
  type PendingDancePlan,
  type QueueStepSideEffects,
} from '@shared/queue';
import { RECIPE_MAP } from '@shared/recipes';
import type {
  ActiveDrink,
  DanceStyle,
  DrinkBarLiveState,
  DrinkOrder,
  GiftTier,
  Language,
  RecipeId,
  ToppingId,
  ViewerProfile,
} from '@shared/types';
import { MANEKI_NEKO_ANCHOR } from '../engine/drawBarScene';
import { drinkParticles } from '../engine/particlePool';
import { drinkBarAudio } from '../services/audioManager';
import { drinkBarTts } from '../services/ttsEngine';

function detectIsMirrorPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('mirror') === '1';
}

const PENDING_DANCE_FALLBACK_MS = GAMEPLAY_LIMITS.TTS_WATCHDOG_MS + 1500;
const TIER_PRIORITY: Record<GiftTier, number> = { SMALL: 1, MEDIUM: 2, LARGE: 3 };

let activePendingDancePlan: PendingDancePlan | null = null;
let pendingDanceSafetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearPendingDanceSync(): void {
  activePendingDancePlan = null;
  if (pendingDanceSafetyTimer) {
    clearTimeout(pendingDanceSafetyTimer);
    pendingDanceSafetyTimer = null;
  }
}

function schedulePendingDance(
  plan: PendingDancePlan,
  onActivate: () => void
): void {
  if (
    activePendingDancePlan &&
    TIER_PRIORITY[activePendingDancePlan.tier] > TIER_PRIORITY[plan.tier]
  ) {
    activePendingDancePlan = {
      ...activePendingDancePlan,
      durationMs: Math.min(
        GAMEPLAY_LIMITS.DANCE_MAX_DURATION_MS,
        activePendingDancePlan.durationMs + plan.durationMs
      ),
      thanksText: plan.thanksText,
    };
  } else {
    activePendingDancePlan = plan;
  }

  if (pendingDanceSafetyTimer) {
    clearTimeout(pendingDanceSafetyTimer);
  }
  pendingDanceSafetyTimer = setTimeout(() => {
    pendingDanceSafetyTimer = null;
    onActivate();
  }, PENDING_DANCE_FALLBACK_MS);
}

function runTtsSideEffect(
  state: DrinkBarLiveState,
  effects: QueueStepSideEffects,
  onDonateSpeechDone?: () => void
): void {
  const hint = effects.ttsHint;
  if (!hint) return;
  const lang = state.config.language;
  if (hint.kind === 'donate') {
    drinkBarTts.enqueueDonate(
      hint.nickname,
      hint.danceStyle ?? state.danceStyle,
      lang,
      Boolean(hint.isManual),
      onDonateSpeechDone
    );
    return;
  }
  if (hint.kind === 'order' && hint.recipeId) {
    drinkBarTts.enqueueOrder(hint.nickname, hint.recipeId, lang);
    return;
  }
  if (hint.kind === 'ready' && hint.recipeId) {
    drinkBarTts.enqueueReady(hint.nickname, hint.recipeId, lang);
    return;
  }
  if (hint.kind === 'switch' && hint.recipeId) {
    drinkBarTts.enqueueFlavorSwitch(hint.nickname, hint.recipeId, lang);
    return;
  }
  if (hint.kind === 'like') {
    drinkBarTts.enqueueLikeCheer(lang);
  }
}

function runSideEffects(
  state: DrinkBarLiveState,
  effects: QueueStepSideEffects,
  onActivatePendingDance?: () => void
): void {
  if (effects.sfxToPlay) {
    drinkBarAudio.play(effects.sfxToPlay, state.danceTier, state.danceStyle);
  }
  if (effects.ttsHint?.kind === 'order' || effects.ttsHint?.kind === 'donate') {
    drinkParticles.emitNekoBellSparkles(MANEKI_NEKO_ANCHOR.X, MANEKI_NEKO_ANCHOR.BELL_Y);
  }
  if (effects.pendingDance && onActivatePendingDance) {
    schedulePendingDance(effects.pendingDance, onActivatePendingDance);
  }
  runTtsSideEffect(
    state,
    effects,
    effects.pendingDance ? onActivatePendingDance : undefined
  );
  if (effects.burstKind) {
    const isCompletion =
      effects.burstKind === 'complete' || effects.burstKind === 'signature';

    if (isCompletion) {
      const hasShow1 = state.activeDrink?.phase === 'SHOWCASE';
      if (hasShow1 && state.activeDrink) {
        drinkParticles.emitBurst(
          effects.burstKind,
          RECIPE_MAP[state.activeDrink.recipeId].accentColor,
          1
        );
      } else {
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
    } else {
      drinkParticles.emitBurst(effects.burstKind, '#F48BA3', 1);
    }
  }
}

export type GuestLaneIndex = 0 | 1;

export interface CelebratingGuestState {
  expiresAt: number;
  text: string;
  recipeColor: string;
}

export interface DepartingGuest {
  order: DrinkOrder;
  lane: GuestLaneIndex;
  row: number;
  slotIndex: number;
  totalSlotsAtLeave: number;
  isCenterPickup?: boolean;
  pickupAt: number;
  celebrateUntil: number;
  removeAt: number;
  phase: 'REACHING' | 'CELEBRATING' | 'EXITING';
  bubbleText: string;
  recipeColor: string;
}

const MAX_GUESTS_PER_LANE = 12;
const GUEST_HANDOFF_MS = 680;
const GUEST_CELEBRATE_MS = 520;
const GUEST_EXIT_MS = 600;

const GUEST_THANK_TEXT_MAP: Record<Language, string> = {
  EN: 'Thanks! ♡',
  VI: 'Cảm ơn! ♡',
};

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

function areCelebratingEqual(
  a: Readonly<Record<string, CelebratingGuestState>>,
  b: Readonly<Record<string, CelebratingGuestState>>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const itemA = a[key];
    const itemB = b[key];
    if (!itemB || itemA.expiresAt !== itemB.expiresAt || itemA.text !== itemB.text) {
      return false;
    }
  }
  return true;
}

function areDepartingEqual(
  a: readonly DepartingGuest[],
  b: readonly DepartingGuest[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].order.orderId !== b[i].order.orderId ||
      a[i].phase !== b[i].phase ||
      a[i].lane !== b[i].lane
    ) {
      return false;
    }
  }
  return true;
}

function computeRowInLane(
  visible: readonly DrinkOrder[],
  lanes: Readonly<Record<string, GuestLaneIndex>>,
  targetOrderId: string,
  targetLane: GuestLaneIndex
): number {
  let row = 0;
  for (const item of visible) {
    if (item.orderId === targetOrderId) return row;
    if (lanes[item.orderId] === targetLane) {
      row += 1;
    }
  }
  return 0;
}

export interface DrinkBarStore extends DrinkBarLiveState {
  isMirrorPreview: boolean;
  manekiExcitedUntil: number;
  guestLaneByOrderId: Record<string, GuestLaneIndex>;
  celebratingByOrderId: Record<string, CelebratingGuestState>;
  departingGuests: DepartingGuest[];
  tick: (dtSec: number) => void;
  processChat: (user: ViewerProfile, text: string) => void;
  processLikes: (count: number) => void;
  processGift: (user: ViewerProfile, coins: number) => void;
  setLanguage: (language: Language) => void;
  setBrewDuration: (sec: number) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setBgmEnabled: (enabled: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setMicMode: (enabled: boolean) => void;
  setShowSafeZone: (show: boolean) => void;
  completeNow: () => void;
  addTopping: (toppingId?: ToppingId) => void;
  setBrewProgress: (progress: number) => void;
  nextCustomer: () => void;
  clearShelf: () => void;
  resetToDefaultEmpty: () => void;
  prepareIdleSleep: () => void;
  activatePendingDance: () => void;
  triggerTikTokDance: (tier?: GiftTier, danceStyle?: DanceStyle) => void;
  restockRecipe: (recipeId: RecipeId, addMl?: number) => void;
  restockAll: () => void;
  setDefaultCapacity: (capacityMl: number) => void;
  setAutoRestock: (enabled: boolean) => void;
  setUnlimitedInventory: (unlimited: boolean) => void;
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
  const commitLiveState = (
    nextState: DrinkBarLiveState,
    effects?: QueueStepSideEffects
  ): void => {
    const prevStore = get();
    // Fast-path: skip allocations and Zustand re-renders on pure idle frames when nothing changed
    if (
      !effects &&
      prevStore.activeDrink === null &&
      nextState.activeDrink === null &&
      prevStore.vipQueue.length === 0 &&
      nextState.vipQueue.length === 0 &&
      prevStore.normalQueue.length === 0 &&
      nextState.normalQueue.length === 0 &&
      prevStore.bartenderSpeech === nextState.bartenderSpeech &&
      prevStore.guestBubbles === nextState.guestBubbles &&
      prevStore.inventory === nextState.inventory &&
      prevStore.departingGuests.length === 0 &&
      Object.keys(prevStore.celebratingByOrderId).length === 0 &&
      Object.keys(prevStore.guestLaneByOrderId).length === 0 &&
      prevStore.bartenderMood === nextState.bartenderMood &&
      prevStore.todayDoneCount === nextState.todayDoneCount &&
      prevStore.speedBoostUntil === nextState.speedBoostUntil &&
      prevStore.waveUntil === nextState.waveUntil &&
      prevStore.danceUntil === nextState.danceUntil
    ) {
      return;
    }

    const now = Date.now();
    const shouldExciteManeki =
      effects?.ttsHint?.kind === 'order' || effects?.ttsHint?.kind === 'donate';
    const nextManekiUntil = shouldExciteManeki
      ? now + GAMEPLAY_LIMITS.MANEKI_NEKO_EXCITED_MS
      : undefined;
    const prevLanes = prevStore.guestLaneByOrderId;
    const nextLanes = reconcileGuestLanes(
      prevLanes,
      nextState.vipQueue,
      nextState.normalQueue
    );

    const prevVisible = [...prevStore.vipQueue, ...prevStore.normalQueue].slice(
      0,
      GAMEPLAY_LIMITS.MAX_GUEST_SLOTS
    );
    const nextVisible = [...nextState.vipQueue, ...nextState.normalQueue].slice(
      0,
      GAMEPLAY_LIMITS.MAX_GUEST_SLOTS
    );
    const nextVisibleIds = new Set(nextVisible.map((o) => o.orderId));

    // 1. Reconcile in-queue celebration states for just-completed drinks matching queued customers
    const nextCelebrating: Record<string, CelebratingGuestState> = {};
    for (const [orderId, celeb] of Object.entries(prevStore.celebratingByOrderId)) {
      if (celeb.expiresAt > now && nextVisibleIds.has(orderId)) {
        nextCelebrating[orderId] = celeb;
      }
    }

    const newlyCompleted: { drink: ActiveDrink; targetLane: GuestLaneIndex }[] = [];
    if (
      prevStore.activeDrink?.phase === 'BREWING' &&
      nextState.activeDrink?.phase === 'SHOWCASE'
    ) {
      newlyCompleted.push({ drink: nextState.activeDrink, targetLane: 0 });
    }

    const thankText = GUEST_THANK_TEXT_MAP[nextState.config.language];
    for (const { drink: completed } of newlyCompleted) {
      const exactMatch = nextVisible.find(
        (order) => order.orderId === completed.orderId || order.user.id === completed.user.id
      );
      if (exactMatch) {
        nextCelebrating[exactMatch.orderId] = {
          expiresAt: now + GUEST_HANDOFF_MS + GUEST_CELEBRATE_MS,
          text: thankText,
          recipeColor: RECIPE_MAP[completed.recipeId].baseColor,
        };
      }
    }

    // 2. Advance & prune departing guests; spawn departing animation when queued guest leaves
    const nextDeparting: DepartingGuest[] = prevStore.departingGuests
      .filter((guest) => guest.removeAt > now)
      .map((guest) => {
        let nextPhase: DepartingGuest['phase'] = 'EXITING';
        if (now < guest.pickupAt) {
          nextPhase = 'REACHING';
        } else if (now < guest.celebrateUntil) {
          nextPhase = 'CELEBRATING';
        }
        return nextPhase === guest.phase ? guest : { ...guest, phase: nextPhase };
      });

    const existingDepartingIds = new Set(nextDeparting.map((g) => g.order.orderId));

    // 2a. Spawn dedicated center-counter pickup & departure animation synchronized 1:1 with SHOWCASE slide -> handoff -> takeaway
    for (const { drink: completed, targetLane } of newlyCompleted) {
      if (existingDepartingIds.has(completed.orderId)) {
        continue;
      }
      const pickupAt = now + GUEST_HANDOFF_MS;
      const celebrateUntil = pickupAt + GUEST_CELEBRATE_MS;
      nextDeparting.push({
        order: completed,
        lane: targetLane,
        row: 0,
        slotIndex: 0,
        totalSlotsAtLeave: Math.max(1, prevVisible.length),
        isCenterPickup: true,
        pickupAt,
        celebrateUntil,
        removeAt: celebrateUntil + GUEST_EXIT_MS,
        phase: 'REACHING',
        bubbleText: thankText,
        recipeColor: RECIPE_MAP[completed.recipeId].baseColor,
      });
      existingDepartingIds.add(completed.orderId);
    }

    for (let prevIdx = 0; prevIdx < prevVisible.length; prevIdx += 1) {
      const prevOrder = prevVisible[prevIdx];
      if (nextVisibleIds.has(prevOrder.orderId) || existingDepartingIds.has(prevOrder.orderId)) {
        continue;
      }
      const lane = prevLanes[prevOrder.orderId] ?? 0;
      const row = computeRowInLane(prevVisible, prevLanes, prevOrder.orderId, lane);
      const remainingCount = nextVisible.length;
      const prevCeleb = prevStore.celebratingByOrderId[prevOrder.orderId];
      // Skip stationary pause when several customers behind are shifting forward
      const celebrateDuration = remainingCount >= 4 ? 0 : GUEST_CELEBRATE_MS;
      const celebrateUntil =
        prevCeleb && prevCeleb.expiresAt > now
          ? Math.min(prevCeleb.expiresAt, now + celebrateDuration)
          : now + celebrateDuration;
      const initialPhase: DepartingGuest['phase'] =
        now >= celebrateUntil ? 'EXITING' : 'CELEBRATING';

      nextDeparting.push({
        order: prevOrder,
        lane,
        row,
        slotIndex: prevIdx,
        totalSlotsAtLeave: prevVisible.length,
        pickupAt: now,
        celebrateUntil,
        removeAt: celebrateUntil + GUEST_EXIT_MS,
        phase: initialPhase,
        bubbleText: thankText,
        recipeColor: RECIPE_MAP[prevOrder.recipeId].baseColor,
      });
    }

    const lanesChanged = !areLanesEqual(prevLanes, nextLanes);
    const celebChanged = !areCelebratingEqual(prevStore.celebratingByOrderId, nextCelebrating);
    const departChanged = !areDepartingEqual(prevStore.departingGuests, nextDeparting);

    if (!lanesChanged && !celebChanged && !departChanged && nextManekiUntil === undefined) {
      set(nextState);
      return;
    }

    set({
      ...nextState,
      ...(lanesChanged ? { guestLaneByOrderId: nextLanes } : {}),
      ...(celebChanged ? { celebratingByOrderId: nextCelebrating } : {}),
      ...(departChanged ? { departingGuests: nextDeparting } : {}),
      ...(nextManekiUntil !== undefined ? { manekiExcitedUntil: nextManekiUntil } : {}),
    });
  };

  return {
    ...initialBase,
    manekiExcitedUntil: 0,
    config: {
      ...initialBase.config,
      // Keep bottom area naturally clean by default; Host can toggle Safe-Zone grid from Admin
      showSafeZone: false,
    },
    isMirrorPreview: initialIsMirror,
    guestLaneByOrderId: initialLanes,
    celebratingByOrderId: {},
    departingGuests: [],

    tick: (dtSec: number) => {
      const now = Date.now();
      const { state, effects } = advanceDrinkBarTick(get().getSnapshot(), dtSec, now);
      commitLiveState(state);
      runSideEffects(state, effects);
      const isShopIdle =
        state.activeDrink === null &&
        state.vipQueue.length === 0 &&
        state.normalQueue.length === 0 &&
        now >= state.danceUntil;
      drinkBarTts.updateShopIdleState(isShopIdle, state.config.language);
    },

    processChat: (user, text) => {
      const now = Date.now();
      const { state, effects } = applyChatToState(get().getSnapshot(), user, text, now);
      commitLiveState(state, effects);
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
      commitLiveState(state, effects);
      runSideEffects(state, effects, () => get().activatePendingDance());
    },

  setLanguage: (language) => {
    drinkBarTts.setLanguage(language);
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

  setBgmEnabled: (bgmEnabled) => {
    drinkBarAudio.setBgmEnabled(bgmEnabled);
    set((prev) => ({
      config: { ...prev.config, bgmEnabled },
    }));
  },

  setTtsEnabled: (ttsEnabled) => {
    drinkBarTts.setEnabled(ttsEnabled);
    set((prev) => ({
      config: { ...prev.config, ttsEnabled },
    }));
    if (!ttsEnabled && activePendingDancePlan) {
      get().activatePendingDance();
    }
  },

  setMasterVolume: (masterVolume) => {
    const clamped = Math.max(0, Math.min(1, masterVolume));
    drinkBarAudio.setMasterVolume(clamped);
    drinkBarTts.setMasterVolume(clamped);
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

    resetToDefaultEmpty: () => {
      const now = Date.now();
      clearPendingDanceSync();
      const emptyState = createEmptyResetDrinkBarState(get().config, now);
      drinkBarAudio.stopBrewingSfx();
      drinkBarAudio.stopDanceMusic();
      drinkParticles.clearDanceParticles();
      drinkBarTts.stopAll();
      set({
        ...emptyState,
        manekiExcitedUntil: 0,
        guestLaneByOrderId: {},
        celebratingByOrderId: {},
        departingGuests: [],
      });
      drinkBarTts.updateShopIdleState(true, emptyState.config.language);
      drinkBarTts.triggerIdlePromptSoon(900);
      drinkBarAudio.play('chime');
    },

    prepareIdleSleep: () => {
      const now = Date.now();
      clearPendingDanceSync();
      const emptyState = createEmptyResetDrinkBarState(get().config, now);
      drinkBarAudio.stopBrewingSfx();
      drinkBarAudio.stopDanceMusic();
      drinkParticles.clearDanceParticles();
      drinkBarTts.stopAll();
      set({
        ...emptyState,
        manekiExcitedUntil: 0,
        guestLaneByOrderId: {},
        celebratingByOrderId: {},
        departingGuests: [],
      });
      drinkBarTts.setBaristaDozing(true);
      drinkBarTts.updateShopIdleState(true, emptyState.config.language);
    },

    activatePendingDance: () => {
      const plan = activePendingDancePlan;
      if (!plan) return;
      clearPendingDanceSync();
      const now = Date.now();
      const { state, effects } = activatePendingDanceOnState(
        get().getSnapshot(),
        plan,
        now
      );
      commitLiveState(state, effects);
      runSideEffects(state, effects);
    },

    triggerTikTokDance: (tier = 'MEDIUM', danceStyle) => {
      const now = Date.now();
      const { state, effects } = triggerManualTikTokDance(
        get().getSnapshot(),
        tier,
        now,
        danceStyle
      );
      commitLiveState(state, effects);
      runSideEffects(state, effects, () => get().activatePendingDance());
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

    setUnlimitedInventory: (unlimitedInventory) => {
      set((prev) => ({
        config: { ...prev.config, unlimitedInventory },
      }));
    },

    getSnapshot: (): DrinkBarLiveState => {
      const s = get();
      return {
        config: s.config,
        activeDrink: s.activeDrink,
        secondaryDrink: null,
        activeSlots: [s.activeDrink, null],
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
