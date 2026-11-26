import { DEFAULT_DRINK_BAR_CONFIG, GAMEPLAY_LIMITS } from './config';
import { formatShortThanks, getMessages } from './i18n';
import {
  createInitialInventory,
  deductDrinkStock,
  isRecipeAvailable,
  pickAvailableRecipeId,
  refundDrinkStock,
  restockAllRecipes,
  restockSingleRecipe,
  resupplyLowestOnGift,
  tickInventoryAutoRestock,
  updateInventoryMaxCapacity,
} from './inventory';
import { parseDrinkChat } from './recipes';
import {
  GLOW_LAYER_TOPPINGS,
  mergeUniqueToppings,
  pickNextMissingTopping,
  resolveGiftTier,
  SIGNATURE_TOPPINGS,
} from './toppings';
import type {
  ActiveDrink,
  DanceStyle,
  DrinkBarLiveState,
  DrinkOrder,
  FinishedDrink,
  GiftTier,
  GuestBubble,
  RecipeId,
  SfxKind,
  ToppingId,
  ViewerProfile,
} from './types';

const TIER_RANK: Record<GiftTier, number> = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
};

const TIER_TO_DANCE_STYLE: Record<GiftTier, DanceStyle> = {
  SMALL: 'heart_sway',
  MEDIUM: 'groove_wave',
  LARGE: 'party_hype',
};

const DANCE_STYLE_TO_TIER: Record<DanceStyle, GiftTier> = {
  heart_sway: 'SMALL',
  groove_wave: 'MEDIUM',
  party_hype: 'LARGE',
};

export function resolveDanceStyleForTier(tier: GiftTier): DanceStyle {
  return TIER_TO_DANCE_STYLE[tier];
}

export function resolveTierForDanceStyle(style: DanceStyle): GiftTier {
  return DANCE_STYLE_TO_TIER[style];
}

export interface QueueStepSideEffects {
  sfxToPlay?: SfxKind;
  burstKind?: 'topping' | 'complete' | 'signature' | 'like';
}

export interface QueueTransitionResult {
  state: DrinkBarLiveState;
  effects: QueueStepSideEffects;
}

let orderSequence = 100;

function createOrderId(prefix: string): string {
  orderSequence += 1;
  return `${prefix}_${Date.now()}_${orderSequence}`;
}

export function normalizeUserId(user: ViewerProfile): string {
  const cleanId = user.id.trim().toLowerCase();
  if (cleanId) return cleanId;
  return `guest_${user.nickname.trim().toLowerCase().replace(/\s+/g, '_')}`;
}

export function getDanceDurationMs(tier: GiftTier): number {
  const durationMap: Record<GiftTier, number> = {
    SMALL: GAMEPLAY_LIMITS.DANCE_SMALL_DURATION_MS,
    MEDIUM: GAMEPLAY_LIMITS.DANCE_MEDIUM_DURATION_MS,
    LARGE: GAMEPLAY_LIMITS.DANCE_LARGE_DURATION_MS,
  };
  return durationMap[tier];
}

function toActiveDrink(order: DrinkOrder, now: number): ActiveDrink {
  return {
    ...order,
    progress: 0,
    phase: 'BREWING',
    showcaseRemainingMs: 0,
    lastUpdatedAt: now,
  };
}

function toFinishedDrink(drink: ActiveDrink, now: number): FinishedDrink {
  return {
    orderId: drink.orderId,
    user: drink.user,
    recipeId: drink.recipeId,
    toppings: [...drink.toppings],
    isVip: drink.isVip,
    isSignature: drink.isSignature,
    completedAt: now,
  };
}

export function isUserAlreadyInQueue(state: DrinkBarLiveState, userId: string): boolean {
  const inVip = state.vipQueue.some((item) => normalizeUserId(item.user) === userId);
  if (inVip) return true;
  return state.normalQueue.some((item) => normalizeUserId(item.user) === userId);
}

export function isUserActiveNow(state: DrinkBarLiveState, userId: string): boolean {
  return Boolean(
    state.activeDrink && normalizeUserId(state.activeDrink.user) === userId
  );
}

function upsertGuestBubble(
  existing: readonly GuestBubble[],
  user: ViewerProfile,
  rawText: string,
  now: number
): GuestBubble[] {
  const clean = rawText.trim();
  if (!clean) return [...existing];

  const clipped =
    clean.length > GAMEPLAY_LIMITS.GUEST_BUBBLE_MAX_CHARS
      ? `${clean.slice(0, GAMEPLAY_LIMITS.GUEST_BUBBLE_MAX_CHARS - 1).trim()}…`
      : clean;

  const userId = normalizeUserId(user);
  const alive = existing.filter((b) => b.expiresAt > now && b.userId !== userId);
  const usedSlots = new Set(alive.map((b) => b.slotIndex));

  let slotIndex = 0;
  for (let i = 0; i < GAMEPLAY_LIMITS.MAX_GUEST_SLOTS; i += 1) {
    if (!usedSlots.has(i)) {
      slotIndex = i;
      break;
    }
  }

  const nextBubble: GuestBubble = {
    id: createOrderId('bubble'),
    userId,
    nickname: user.nickname,
    text: clipped,
    slotIndex,
    expiresAt: now + GAMEPLAY_LIMITS.GUEST_BUBBLE_TTL_MS,
  };

  return [...alive.slice(-(GAMEPLAY_LIMITS.MAX_GUEST_SLOTS - 1)), nextBubble];
}

function popNextOrderFromQueues(
  vipQueue: readonly DrinkOrder[],
  normalQueue: readonly DrinkOrder[]
): {
  order: DrinkOrder | null;
  vipQueue: DrinkOrder[];
  normalQueue: DrinkOrder[];
} {
  if (vipQueue.length > 0) {
    const [nextVip, ...restVip] = vipQueue;
    return {
      order: nextVip,
      vipQueue: restVip,
      normalQueue: [...normalQueue],
    };
  }
  if (normalQueue.length > 0) {
    const [nextNormal, ...restNormal] = normalQueue;
    return {
      order: nextNormal,
      vipQueue: [...vipQueue],
      normalQueue: restNormal,
    };
  }
  return {
    order: null,
    vipQueue: [...vipQueue],
    normalQueue: [...normalQueue],
  };
}

export function promoteNextFromQueue(
  state: DrinkBarLiveState,
  now: number
): DrinkBarLiveState {
  let nextActive = state.activeDrink;
  let nextVip = [...state.vipQueue];
  let nextNormal = [...state.normalQueue];

  // Single primary barista station (NV1): promote only into activeDrink; keep secondaryDrink null
  if (nextActive === null) {
    const popped = popNextOrderFromQueues(nextVip, nextNormal);
    if (popped.order) {
      nextActive = toActiveDrink(popped.order, now);
      nextVip = popped.vipQueue;
      nextNormal = popped.normalQueue;
    }
  }

  const isDancing = now < state.danceUntil;
  const hasAnyActive = nextActive !== null;
  let nextMood = state.bartenderMood;
  if (isDancing) {
    nextMood = 'TIKTOK_DANCE';
  } else if (hasAnyActive) {
    nextMood = 'BREWING';
  } else {
    nextMood = 'IDLE';
  }

  return {
    ...state,
    activeDrink: nextActive,
    secondaryDrink: null,
    activeSlots: [nextActive, null],
    vipQueue: nextVip,
    normalQueue: nextNormal,
    bartenderMood: nextMood,
  };
}

export function createInitialDrinkBarState(now = Date.now()): DrinkBarLiveState {
  let inventory = createInitialInventory(DEFAULT_DRINK_BAR_CONFIG.defaultCapacityMl);
  inventory = deductDrinkStock(inventory, 'matcha', true, now);
  inventory = deductDrinkStock(inventory, 'thai_tea', true, now);
  inventory = deductDrinkStock(inventory, 'berry_soda', true, now);
  inventory = deductDrinkStock(inventory, 'coffee_milk', true, now);

  const starterActive: ActiveDrink = {
    orderId: 'demo_active_1',
    user: { id: 'demo_linh', nickname: 'Linh Chi' },
    recipeId: 'matcha',
    toppings: [],
    sugarLevel: 'NORMAL',
    iceLevel: 'NORMAL',
    isVip: false,
    isSignature: false,
    isGlowUpgraded: false,
    createdAt: now - 4000,
    progress: 14,
    phase: 'BREWING',
    showcaseRemainingMs: 0,
    lastUpdatedAt: now,
  };

  const starterVipQueue: DrinkOrder[] = [
    {
      orderId: 'demo_vip_1',
      user: { id: 'demo_huy', nickname: 'Gia Huy' },
      recipeId: 'thai_tea',
      toppings: ['cream_swirl'],
      sugarLevel: 'NORMAL',
      iceLevel: 'EXTRA',
      isVip: true,
      isSignature: false,
      isGlowUpgraded: true,
      createdAt: now - 2500,
    },
  ];

  const starterNormalQueue: DrinkOrder[] = [
    {
      orderId: 'demo_normal_1',
      user: { id: 'demo_ngoc', nickname: 'Bảo Ngọc' },
      recipeId: 'coffee_milk',
      toppings: [],
      sugarLevel: 'NORMAL',
      iceLevel: 'NORMAL',
      isVip: false,
      isSignature: false,
      isGlowUpgraded: false,
      createdAt: now - 1800,
    },
    {
      orderId: 'demo_normal_2',
      user: { id: 'demo_minh', nickname: 'Minh Anh' },
      recipeId: 'blue_citrus',
      toppings: [],
      sugarLevel: 'LESS',
      iceLevel: 'NORMAL',
      isVip: false,
      isSignature: false,
      isGlowUpgraded: false,
      createdAt: now - 1200,
    },
  ];

  const starterShelf: FinishedDrink[] = [
    {
      orderId: 'demo_done_1',
      user: { id: 'demo_nam', nickname: 'Hoàng Nam' },
      recipeId: 'coffee_milk',
      toppings: ['cream_swirl', 'sparkle_aura'],
      isVip: true,
      isSignature: true,
      completedAt: now - 45000,
    },
    {
      orderId: 'demo_done_2',
      user: { id: 'demo_vy', nickname: 'Khánh Vy' },
      recipeId: 'blue_citrus',
      toppings: ['fruit_slice'],
      isVip: false,
      isSignature: false,
      completedAt: now - 20000,
    },
  ];

  return {
    config: { ...DEFAULT_DRINK_BAR_CONFIG },
    activeDrink: starterActive,
    secondaryDrink: null,
    activeSlots: [starterActive, null],
    vipQueue: starterVipQueue,
    normalQueue: starterNormalQueue,
    finishedShelf: starterShelf,
    inventory,
    todayDoneCount: starterShelf.length,
    bartenderMood: 'BREWING',
    bartenderSpeech: null,
    speedBoostUntil: 0,
    waveUntil: 0,
    danceUntil: 0,
    danceStartedAt: 0,
    danceTier: 'SMALL',
    danceStyle: 'heart_sway',
    guestBubbles: [],
    lastEventAt: now,
  };
}

export function applyChatToState(
  state: DrinkBarLiveState,
  user: ViewerProfile,
  text: string,
  now: number
): QueueTransitionResult {
  const cleanText = text.trim();
  if (!cleanText) {
    return { state, effects: {} };
  }

  const parsed = parseDrinkChat(cleanText);
  const userId = normalizeUserId(user);
  let nextState: DrinkBarLiveState = {
    ...state,
    guestBubbles: upsertGuestBubble(state.guestBubbles, user, cleanText, now),
    lastEventAt: now,
  };

  const isAlreadyActive = isUserActiveNow(nextState, userId);
  const isAlreadyQueued = isUserAlreadyInQueue(nextState, userId);

  // Rule: Strict 1 cup per user at a time (either active on Station 1/2 or queued)
  if (!isAlreadyActive && !isAlreadyQueued && parsed.isOrderIntent) {
    const requestedId = parsed.recipeId;

    if (requestedId && !isRecipeAvailable(nextState.inventory, requestedId)) {
      const msg = getMessages(nextState.config.language);
      return {
        state: {
          ...nextState,
          bartenderSpeech: {
            text: msg.soldOutSpeech,
            expiresAt: now + GAMEPLAY_LIMITS.SPEECH_TTL_MS,
          },
        },
        effects: {},
      };
    }

    const totalQueued = nextState.vipQueue.length + nextState.normalQueue.length;
    if (totalQueued < GAMEPLAY_LIMITS.MAX_QUEUE_TOTAL) {
      const recipeId: RecipeId = requestedId ?? pickAvailableRecipeId(nextState.inventory);
      const nextInventory = deductDrinkStock(
        nextState.inventory,
        recipeId,
        nextState.config.autoRestockEnabled,
        now
      );

      const newOrder: DrinkOrder = {
        orderId: createOrderId('order'),
        user: { ...user, id: userId },
        recipeId,
        toppings: [],
        sugarLevel: parsed.sugarLevel ?? 'NORMAL',
        iceLevel: parsed.iceLevel ?? 'NORMAL',
        isVip: false,
        isSignature: false,
        isGlowUpgraded: false,
        createdAt: now,
      };
      nextState = {
        ...nextState,
        inventory: nextInventory,
        normalQueue: [...nextState.normalQueue, newOrder],
      };
      nextState = promoteNextFromQueue(nextState, now);
      return { state: nextState, effects: { sfxToPlay: 'chat_pop' } };
    }
  }

  // If user is queued (not brewing yet) and requests a flavor change
  if (isAlreadyQueued && parsed.hasFlavorModifier) {
    let workingInventory = nextState.inventory;

    if (parsed.recipeId && !isRecipeAvailable(workingInventory, parsed.recipeId)) {
      const msg = getMessages(nextState.config.language);
      return {
        state: {
          ...nextState,
          bartenderSpeech: {
            text: msg.soldOutSpeech,
            expiresAt: now + GAMEPLAY_LIMITS.SPEECH_TTL_MS,
          },
        },
        effects: {},
      };
    }

    const updateOrder = (order: DrinkOrder): DrinkOrder => {
      if (normalizeUserId(order.user) !== userId) return order;
      const nextRecipeId = parsed.recipeId ?? order.recipeId;
      if (nextRecipeId !== order.recipeId) {
        workingInventory = refundDrinkStock(workingInventory, order.recipeId);
        workingInventory = deductDrinkStock(
          workingInventory,
          nextRecipeId,
          nextState.config.autoRestockEnabled,
          now
        );
      }
      return {
        ...order,
        recipeId: nextRecipeId,
        sugarLevel: parsed.sugarLevel ?? order.sugarLevel,
        iceLevel: parsed.iceLevel ?? order.iceLevel,
      };
    };

    nextState = {
      ...nextState,
      vipQueue: nextState.vipQueue.map(updateOrder),
      normalQueue: nextState.normalQueue.map(updateOrder),
      inventory: workingInventory,
    };
    return { state: nextState, effects: { sfxToPlay: 'shaker' } };
  }

  return { state: nextState, effects: {} };
}

function advanceSlotProgressByDelta(
  drink: ActiveDrink | null,
  deltaProgress: number,
  now: number
): ActiveDrink | null {
  if (!drink || drink.phase !== 'BREWING') {
    return drink;
  }
  return {
    ...drink,
    progress: Math.min(100, drink.progress + deltaProgress),
    lastUpdatedAt: now,
  };
}

export function applyLikesToState(
  state: DrinkBarLiveState,
  likeCount: number,
  now: number
): QueueTransitionResult {
  if (likeCount <= 0) {
    return { state, effects: {} };
  }

  const boostUntil = Math.max(
    state.speedBoostUntil,
    now + GAMEPLAY_LIMITS.SPEED_BOOST_DURATION_MS
  );
  // Pause progress while bartenders are performing TikTok Dance
  if (now < state.danceUntil) {
    return {
      state: {
        ...state,
        speedBoostUntil: boostUntil,
        lastEventAt: now,
      },
      effects: {
        burstKind: state.activeDrink ? 'like' : undefined,
        sfxToPlay: 'like_pop',
      },
    };
  }

  const deltaProgress = Math.min(
    GAMEPLAY_LIMITS.LIKE_MAX_BATCH_PROGRESS,
    likeCount * GAMEPLAY_LIMITS.LIKE_PROGRESS_PER_HEART
  );

  const nextActiveSlot = advanceSlotProgressByDelta(state.activeDrink, deltaProgress, now);

  let workingState: DrinkBarLiveState = {
    ...state,
    activeDrink: nextActiveSlot,
    secondaryDrink: null,
    activeSlots: [nextActiveSlot, null],
    speedBoostUntil: boostUntil,
    lastEventAt: now,
  };

  let burstKind: QueueStepSideEffects['burstKind'] =
    workingState.activeDrink ? 'like' : undefined;
  let sfxToPlay: SfxKind | undefined;

  if (
    workingState.activeDrink &&
    workingState.activeDrink.phase === 'BREWING' &&
    workingState.activeDrink.progress >= 100
  ) {
    const res1 = completeDrinkInSlot(workingState, 1, now);
    workingState = res1.state;
    burstKind = res1.effects.burstKind ?? burstKind;
    sfxToPlay = res1.effects.sfxToPlay ?? sfxToPlay;
  }

  return {
    state: workingState,
    effects: { burstKind, sfxToPlay: sfxToPlay ?? (burstKind ? 'like_pop' : undefined) },
  };
}

function upgradeActiveDrinkOnGift(
  drink: ActiveDrink | null,
  donorUserId: string,
  tier: GiftTier,
  now: number
): ActiveDrink | null {
  if (!drink || drink.phase !== 'BREWING') {
    return drink;
  }
  const addedTopping = pickNextMissingTopping(drink.toppings, undefined, drink.recipeId);
  const nextToppings = mergeUniqueToppings(drink.toppings, [addedTopping]);
  const isDonorActive = normalizeUserId(drink.user) === donorUserId;
  const upgradedToppings = resolveActiveDrinkToppings(nextToppings, isDonorActive, tier, drink.recipeId);

  return {
    ...drink,
    toppings: upgradedToppings,
    isVip: isDonorActive ? true : drink.isVip,
    isGlowUpgraded:
      isDonorActive && (tier === 'MEDIUM' || tier === 'LARGE')
        ? true
        : drink.isGlowUpgraded,
    isSignature: isDonorActive && tier === 'LARGE' ? true : drink.isSignature,
    lastUpdatedAt: now,
  };
}

export function applyGiftToState(
  state: DrinkBarLiveState,
  user: ViewerProfile,
  coins: number,
  now: number
): QueueTransitionResult {
  const tier = resolveGiftTier(coins);
  const userId = normalizeUserId(user);
  const normalizedUser: ViewerProfile = { ...user, id: userId };

  // Step 1: Upgrade active drink without resetting progress
  const nextActive = upgradeActiveDrinkOnGift(state.activeDrink, userId, tier, now);

  // Step 2: Resupply +500ml to lowest/sold-out recipe on gift!
  let nextInventory = resupplyLowestOnGift(
    state.inventory,
    GAMEPLAY_LIMITS.GIFT_RESUPPLY_ML
  );

  // Step 3: VIP Queue placement for donor if not currently being served on NV1
  let nextVipQueue = [...state.vipQueue];
  let nextNormalQueue = [...state.normalQueue];
  const isDonorServed = Boolean(nextActive && normalizeUserId(nextActive.user) === userId);

  if (!isDonorServed) {
    const existingVipIdx = nextVipQueue.findIndex((o) => normalizeUserId(o.user) === userId);
    const existingNormalIdx = nextNormalQueue.findIndex(
      (o) => normalizeUserId(o.user) === userId
    );

    let baseOrder: DrinkOrder;
    if (existingVipIdx >= 0) {
      baseOrder = nextVipQueue[existingVipIdx];
      nextVipQueue.splice(existingVipIdx, 1);
    } else if (existingNormalIdx >= 0) {
      baseOrder = nextNormalQueue[existingNormalIdx];
      nextNormalQueue.splice(existingNormalIdx, 1);
    } else {
      const recipeId = pickAvailableRecipeId(nextInventory);
      nextInventory = deductDrinkStock(
        nextInventory,
        recipeId,
        state.config.autoRestockEnabled,
        now
      );
      baseOrder = {
        orderId: createOrderId('vip'),
        user: normalizedUser,
        recipeId,
        toppings: [],
        sugarLevel: 'NORMAL',
        iceLevel: 'NORMAL',
        isVip: true,
        isSignature: false,
        isGlowUpgraded: false,
        createdAt: now,
      };
    }

    const upgradedOrder: DrinkOrder = {
      ...baseOrder,
      user: normalizedUser,
      isVip: true,
      isGlowUpgraded: baseOrder.isGlowUpgraded || tier === 'MEDIUM' || tier === 'LARGE',
      isSignature: baseOrder.isSignature || tier === 'LARGE',
      toppings: resolveOrderToppingsForTier(baseOrder.toppings, tier, baseOrder.recipeId),
    };

    if (tier === 'LARGE') {
      nextVipQueue.unshift(upgradedOrder);
    } else {
      const insertIdx = nextVipQueue.findIndex((item) => !item.isSignature);
      if (insertIdx === -1) {
        nextVipQueue.push(upgradedOrder);
      } else {
        nextVipQueue.splice(insertIdx, 0, upgradedOrder);
      }
    }
  }

  // Step 4: Trigger or extend synchronized 2-bartender TikTok Dance (capped at 8s max!)
  const danceDurationMs = getDanceDurationMs(tier);
  const wasAlreadyDancing = now < state.danceUntil;
  const maxAllowedUntil = now + GAMEPLAY_LIMITS.DANCE_MAX_DURATION_MS;
  const nextDanceUntil = wasAlreadyDancing
    ? Math.min(maxAllowedUntil, state.danceUntil + danceDurationMs)
    : Math.min(maxAllowedUntil, now + danceDurationMs);
  const nextTier: GiftTier =
    wasAlreadyDancing && TIER_RANK[state.danceTier] > TIER_RANK[tier]
      ? state.danceTier
      : tier;
  const nextStyle = resolveDanceStyleForTier(nextTier);
  const nextDanceStartedAt = wasAlreadyDancing ? state.danceStartedAt : now;

  const thanksText = formatShortThanks(
    normalizedUser.nickname,
    state.config.language,
    GAMEPLAY_LIMITS.SPEECH_MAX_CHARS
  );

  let nextState: DrinkBarLiveState = {
    ...state,
    activeDrink: nextActive,
    secondaryDrink: null,
    activeSlots: [nextActive, null],
    vipQueue: nextVipQueue,
    normalQueue: nextNormalQueue,
    inventory: nextInventory,
    bartenderMood: 'TIKTOK_DANCE',
    bartenderSpeech: {
      text: thanksText,
      expiresAt: nextDanceUntil,
    },
    waveUntil: nextDanceUntil,
    danceUntil: nextDanceUntil,
    danceStartedAt: nextDanceStartedAt,
    danceTier: nextTier,
    danceStyle: nextStyle,
    lastEventAt: now,
  };

  nextState = promoteNextFromQueue(nextState, now);

  const sfxToPlay: SfxKind = 'dance_jingle';
  const burstKind = nextTier === 'LARGE' ? 'signature' : 'topping';

  return {
    state: nextState,
    effects: { sfxToPlay, burstKind },
  };
}

export function triggerManualTikTokDance(
  state: DrinkBarLiveState,
  tier: GiftTier = 'MEDIUM',
  now: number,
  requestedStyle?: DanceStyle
): QueueTransitionResult {
  const effectiveTier = requestedStyle ? resolveTierForDanceStyle(requestedStyle) : tier;
  const effectiveStyle = requestedStyle ?? resolveDanceStyleForTier(effectiveTier);
  const danceDurationMs = getDanceDurationMs(effectiveTier);
  const nextDanceUntil = Math.min(
    now + GAMEPLAY_LIMITS.DANCE_MAX_DURATION_MS,
    now + danceDurationMs
  );
  const wasAlreadyDancing = now < state.danceUntil;
  const thanksText = formatShortThanks(
    'TikTok Dance',
    state.config.language,
    GAMEPLAY_LIMITS.SPEECH_MAX_CHARS
  );

  return {
    state: {
      ...state,
      bartenderMood: 'TIKTOK_DANCE',
      bartenderSpeech: {
        text: thanksText,
        expiresAt: nextDanceUntil,
      },
      waveUntil: nextDanceUntil,
      danceUntil: nextDanceUntil,
      danceStartedAt: wasAlreadyDancing ? state.danceStartedAt : now,
      danceTier: effectiveTier,
      danceStyle: effectiveStyle,
      lastEventAt: now,
    },
    effects: {
      sfxToPlay: 'dance_jingle',
      burstKind: effectiveTier === 'LARGE' ? 'signature' : 'topping',
    },
  };
}

function resolveActiveDrinkToppings(
  current: readonly ToppingId[],
  isDonorActive: boolean,
  tier: GiftTier,
  recipeId?: RecipeId
): ToppingId[] {
  let resolved: ToppingId[];
  if (!isDonorActive) {
    resolved = [...current];
  } else if (tier === 'LARGE') {
    resolved = mergeUniqueToppings(current, SIGNATURE_TOPPINGS);
  } else if (tier === 'MEDIUM') {
    resolved = mergeUniqueToppings(current, GLOW_LAYER_TOPPINGS);
  } else {
    resolved = [...current];
  }
  const isBobaExcluded = recipeId === 'matcha' || recipeId === 'blue_citrus';
  return isBobaExcluded ? resolved.filter((t) => t !== 'boba_pearls') : resolved;
}

function resolveOrderToppingsForTier(
  existing: readonly ToppingId[],
  tier: GiftTier,
  recipeId?: RecipeId
): ToppingId[] {
  let resolved: ToppingId[];
  if (tier === 'LARGE') {
    resolved = mergeUniqueToppings(existing, SIGNATURE_TOPPINGS);
  } else if (tier === 'MEDIUM') {
    resolved = mergeUniqueToppings(existing, GLOW_LAYER_TOPPINGS);
  } else {
    const extra = pickNextMissingTopping(existing, undefined, recipeId);
    resolved = mergeUniqueToppings(existing, [extra]);
  }
  const isBobaExcluded = recipeId === 'matcha' || recipeId === 'blue_citrus';
  return isBobaExcluded ? resolved.filter((t) => t !== 'boba_pearls') : resolved;
}

function completeDrinkInSlot(
  state: DrinkBarLiveState,
  _slotIndex: 1 | 2,
  now: number
): QueueTransitionResult {
  const target = state.activeDrink;
  if (!target || target.phase === 'SHOWCASE') {
    return { state, effects: {} };
  }

  const completed: ActiveDrink = {
    ...target,
    progress: 100,
    phase: 'SHOWCASE',
    showcaseRemainingMs: GAMEPLAY_LIMITS.SHOWCASE_DURATION_MS,
    lastUpdatedAt: now,
  };

  const finishedItem = toFinishedDrink(completed, now);
  const nextShelf = [
    finishedItem,
    ...state.finishedShelf.filter((item) => item.orderId !== finishedItem.orderId),
  ].slice(0, GAMEPLAY_LIMITS.MAX_SHELF_ITEMS);

  const isDancing = now < state.danceUntil;
  const finishMood = completed.isSignature ? 'CHEERING' : 'HAPPY';

  const nextState: DrinkBarLiveState = {
    ...state,
    activeDrink: completed,
    secondaryDrink: null,
    activeSlots: [completed, null],
    finishedShelf: nextShelf,
    todayDoneCount: state.todayDoneCount + 1,
    bartenderMood: isDancing ? 'TIKTOK_DANCE' : finishMood,
    waveUntil: Math.max(state.waveUntil, now + GAMEPLAY_LIMITS.SHOWCASE_DURATION_MS),
    lastEventAt: now,
  };

  return {
    state: nextState,
    effects: {
      sfxToPlay: completed.isSignature ? 'signature' : 'chime',
      burstKind: completed.isSignature ? 'signature' : 'complete',
    },
  };
}

export function completeActiveDrink(
  state: DrinkBarLiveState,
  now: number
): QueueTransitionResult {
  if (state.activeDrink && state.activeDrink.phase === 'BREWING') {
    return completeDrinkInSlot(state, 1, now);
  }
  return { state, effects: {} };
}

export function addToppingToActiveDrink(
  state: DrinkBarLiveState,
  preferredTopping: ToppingId | undefined,
  now: number
): QueueTransitionResult {
  let nextActive = state.activeDrink;
  let didAdd = false;

  if (nextActive && nextActive.phase === 'BREWING') {
    const nextTopping = preferredTopping ?? pickNextMissingTopping(nextActive.toppings);
    nextActive = {
      ...nextActive,
      toppings: mergeUniqueToppings(nextActive.toppings, [nextTopping]),
      lastUpdatedAt: now,
    };
    didAdd = true;
  }

  if (!didAdd) {
    return { state, effects: {} };
  }

  const isDancing = now < state.danceUntil;
  return {
    state: {
      ...state,
      activeDrink: nextActive,
      secondaryDrink: null,
      activeSlots: [nextActive, null],
      bartenderMood: isDancing ? 'TIKTOK_DANCE' : 'HAPPY',
      lastEventAt: now,
    },
    effects: { sfxToPlay: 'topping', burstKind: 'topping' },
  };
}

export function setBrewProgressOnState(
  state: DrinkBarLiveState,
  progress: number,
  now: number
): QueueTransitionResult {
  let workingState = promoteNextFromQueue(state, now);

  if (!workingState.activeDrink) {
    const demoOrder: DrinkOrder = {
      orderId: createOrderId('order_test'),
      user: { id: 'guest_test', nickname: 'Khách Test' },
      recipeId: pickAvailableRecipeId(workingState.inventory),
      toppings: [],
      sugarLevel: 'NORMAL',
      iceLevel: 'NORMAL',
      isVip: false,
      isSignature: false,
      isGlowUpgraded: false,
      createdAt: now,
    };
    workingState = {
      ...workingState,
      activeDrink: toActiveDrink(demoOrder, now),
    };
  }

  const clamped = Math.max(0, Math.min(100, progress));
  if (clamped >= 100) {
    return completeActiveDrink(workingState, now);
  }

  const nextActive: ActiveDrink | null = workingState.activeDrink
    ? {
        ...workingState.activeDrink,
        progress: clamped,
        phase: 'BREWING',
        lastUpdatedAt: now,
      }
    : null;

  return {
    state: {
      ...workingState,
      activeDrink: nextActive,
      secondaryDrink: null,
      activeSlots: [nextActive, null],
      lastEventAt: now,
    },
    effects: { sfxToPlay: clamped >= 90 ? 'lid_snap' : clamped >= 75 ? 'topping' : clamped >= 45 ? 'pour' : 'ice_clink' },
  };
}

export function restockRecipeInState(
  state: DrinkBarLiveState,
  recipeId: RecipeId,
  addMl?: number,
  now: number = Date.now()
): DrinkBarLiveState {
  return {
    ...state,
    inventory: restockSingleRecipe(state.inventory, recipeId, addMl),
    lastEventAt: now,
  };
}

export function restockAllInState(
  state: DrinkBarLiveState,
  now: number = Date.now()
): DrinkBarLiveState {
  return {
    ...state,
    inventory: restockAllRecipes(state.inventory),
    lastEventAt: now,
  };
}

export function setDefaultCapacityInState(
  state: DrinkBarLiveState,
  capacityMl: number,
  now: number = Date.now()
): DrinkBarLiveState {
  const nextInventory = updateInventoryMaxCapacity(state.inventory, capacityMl);
  return {
    ...state,
    config: {
      ...state.config,
      defaultCapacityMl: nextInventory.matcha.maxMl,
    },
    inventory: nextInventory,
    lastEventAt: now,
  };
}

function tickSingleStation(
  drink: ActiveDrink | null,
  dtSec: number,
  speedMultiplier: number,
  durationSec: number,
  now: number
): { drink: ActiveDrink | null; justHit100: boolean; finishedShowcase: boolean } {
  if (!drink) {
    return { drink: null, justHit100: false, finishedShowcase: false };
  }

  if (drink.phase === 'SHOWCASE') {
    const remainingMs = drink.showcaseRemainingMs - dtSec * 1000;
    if (remainingMs > 0) {
      return {
        drink: { ...drink, showcaseRemainingMs: remainingMs },
        justHit100: false,
        finishedShowcase: false,
      };
    }
    return { drink: null, justHit100: false, finishedShowcase: true };
  }

  const progressDelta = (dtSec / durationSec) * 100 * speedMultiplier;
  const nextProgress = Math.min(100, drink.progress + progressDelta);

  return {
    drink: {
      ...drink,
      progress: nextProgress,
      lastUpdatedAt: now,
    },
    justHit100: nextProgress >= 100,
    finishedShowcase: false,
  };
}

export function advanceDrinkBarTick(
  state: DrinkBarLiveState,
  dtSec: number,
  now: number
): QueueTransitionResult {
  let nextSpeech = state.bartenderSpeech;
  if (nextSpeech && now >= nextSpeech.expiresAt) {
    nextSpeech = null;
  }

  const nextBubbles = state.guestBubbles.filter((b) => b.expiresAt > now);
  const hasBubbleChange = nextBubbles.length !== state.guestBubbles.length;

  const nextInventory = tickInventoryAutoRestock(
    state.inventory,
    state.config.autoRestockEnabled,
    now
  );

  let workingState: DrinkBarLiveState = {
    ...state,
    bartenderSpeech: nextSpeech,
    guestBubbles: hasBubbleChange ? nextBubbles : state.guestBubbles,
    inventory: nextInventory,
  };

  workingState = promoteNextFromQueue(workingState, now);

  if (!workingState.activeDrink) {
    return { state: workingState, effects: {} };
  }

  // PAUSE brewing progress cleanly while barista is performing TikTok Dance
  if (now < workingState.danceUntil) {
    return {
      state: {
        ...workingState,
        bartenderMood: 'TIKTOK_DANCE',
      },
      effects: {},
    };
  }

  const isBoosted = now < workingState.speedBoostUntil;
  const speedMultiplier = isBoosted ? GAMEPLAY_LIMITS.SPEED_BOOST_MULTIPLIER : 1;
  const durationSec = Math.max(
    GAMEPLAY_LIMITS.MIN_BREW_DURATION_SEC,
    workingState.config.brewDurationSec
  );

  const s1 = tickSingleStation(workingState.activeDrink, dtSec, speedMultiplier, durationSec, now);

  workingState = {
    ...workingState,
    activeDrink: s1.drink,
    secondaryDrink: null,
    activeSlots: [s1.drink, null],
  };

  let effects: QueueStepSideEffects = {};

  if (s1.justHit100) {
    const res1 = completeDrinkInSlot(workingState, 1, now);
    workingState = res1.state;
    effects = res1.effects;
  }

  if (s1.finishedShowcase) {
    const before1 = workingState.activeDrink;
    workingState = promoteNextFromQueue(workingState, now);
    if (!before1 && workingState.activeDrink) {
      effects = { ...effects, sfxToPlay: effects.sfxToPlay ?? 'pour' };
    }
  }

  const isDancing = now < workingState.danceUntil;
  const isWaving = now < workingState.waveUntil;
  const hasAnyActive = workingState.activeDrink !== null;

  let nextMood = workingState.bartenderMood;
  if (isDancing) {
    nextMood = 'TIKTOK_DANCE';
  } else if (!isWaving) {
    nextMood = hasAnyActive ? 'BREWING' : 'IDLE';
  }

  return {
    state: {
      ...workingState,
      bartenderMood: nextMood,
    },
    effects,
  };
}
