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
import { parseDrinkChat, pickRandomRecipeId } from './recipes';
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
  DrinkBarConfig,
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

export interface QueueTtsHint {
  kind: 'donate' | 'order' | 'start_brew' | 'ready' | 'like' | 'switch';
  nickname: string;
  recipeId?: RecipeId;
  recipeIds?: RecipeId[];
  danceStyle?: DanceStyle;
  tier?: GiftTier;
  isManual?: boolean;
}

export interface PendingDancePlan {
  tier: GiftTier;
  style: DanceStyle;
  durationMs: number;
  thanksText: string;
}

export interface QueueStepSideEffects {
  sfxToPlay?: SfxKind;
  burstKind?: 'topping' | 'complete' | 'signature' | 'like';
  pendingDance?: PendingDancePlan;
  ttsHint?: QueueTtsHint;
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

// Queue already orders guests cleanly; keep steady configured pacing so animations and TTS stay 1:1 synchronized
export function computeCrowdSpeedMultiplier(_waitingCount: number): number {
  return 1;
}

export function computeCrowdShowcaseMs(_waitingCount: number): number {
  return GAMEPLAY_LIMITS.SHOWCASE_DURATION_MS;
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

export function countUserActiveAndQueuedOrders(state: DrinkBarLiveState, userId: string): number {
  let count = isUserActiveNow(state, userId) ? 1 : 0;
  for (const item of state.vipQueue) {
    if (normalizeUserId(item.user) === userId) count += 1;
  }
  for (const item of state.normalQueue) {
    if (normalizeUserId(item.user) === userId) count += 1;
  }
  return count;
}

/**
 * Counts how many orders currently waiting in queue (vip + normal) belong to other viewers.
 */
export function countOtherUsersQueuedOrders(state: DrinkBarLiveState, userId: string): number {
  let count = 0;
  for (const item of state.vipQueue) {
    if (normalizeUserId(item.user) !== userId) count += 1;
  }
  for (const item of state.normalQueue) {
    if (normalizeUserId(item.user) !== userId) count += 1;
  }
  return count;
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
  return createEmptyResetDrinkBarState(DEFAULT_DRINK_BAR_CONFIG, now);
}

export function createEmptyResetDrinkBarState(
  currentConfig: DrinkBarConfig,
  now = Date.now()
): DrinkBarLiveState {
  clearOrderSpamTracker();
  return {
    config: { ...currentConfig },
    resetEpoch: now,
    activeDrink: null,
    secondaryDrink: null,
    activeSlots: [null, null],
    vipQueue: [],
    normalQueue: [],
    finishedShelf: [],
    inventory: createInitialInventory(currentConfig.defaultCapacityMl),
    todayDoneCount: 0,
    bartenderMood: 'IDLE',
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

interface UserChatSpamRecord {
  lastOrderAt: number;
  lastSwitchAt: number;
  lastText: string;
  lastTextAt: number;
}

const USER_SPAM_TRACKER_LIMIT = 300;
const userChatSpamMap = new Map<string, UserChatSpamRecord>();
let lastInactivePruneAt = 0;

function clearOrderSpamTracker(): void {
  userChatSpamMap.clear();
  lastInactivePruneAt = 0;
}

export function markUsersActiveInState(
  state: DrinkBarLiveState,
  userIds: readonly string[],
  now: number
): DrinkBarLiveState {
  if (userIds.length === 0 || state.normalQueue.length === 0) {
    return state;
  }
  const activeSet = new Set(
    userIds.map((id) => id.trim().toLowerCase()).filter(Boolean)
  );
  if (activeSet.size === 0) {
    return state;
  }

  let didChange = false;
  const nextNormalQueue = state.normalQueue.map((order) => {
    if (!activeSet.has(normalizeUserId(order.user))) {
      return order;
    }
    didChange = true;
    return {
      ...order,
      lastActiveAt: now,
    };
  });

  if (!didChange) {
    return state;
  }
  return {
    ...state,
    normalQueue: nextNormalQueue,
  };
}

function pruneInactiveQueueOrders(
  state: DrinkBarLiveState,
  now: number
): DrinkBarLiveState {
  const totalWaiting = state.vipQueue.length + state.normalQueue.length;
  if (
    totalWaiting < GAMEPLAY_LIMITS.INACTIVE_PRUNE_MIN_QUEUE ||
    state.normalQueue.length === 0
  ) {
    return state;
  }
  if (now - lastInactivePruneAt < GAMEPLAY_LIMITS.INACTIVE_PRUNE_INTERVAL_MS) {
    return state;
  }
  lastInactivePruneAt = now;

  let workingInventory = state.inventory;
  const keptOrders: DrinkOrder[] = [];
  let removedCount = 0;
  const isUnlimited = state.config.unlimitedInventory;

  for (const order of state.normalQueue) {
    const lastSeen = order.lastActiveAt ?? order.createdAt;
    if (now - lastSeen >= GAMEPLAY_LIMITS.INACTIVE_ORDER_TTL_MS) {
      removedCount += 1;
      if (!isUnlimited) {
        workingInventory = refundDrinkStock(workingInventory, order.recipeId);
      }
      continue;
    }
    keptOrders.push(order);
  }

  if (removedCount === 0) {
    return state;
  }

  return {
    ...state,
    normalQueue: keptOrders,
    inventory: workingInventory,
  };
}

function getOrCreateSpamRecord(userId: string): UserChatSpamRecord {
  const existing = userChatSpamMap.get(userId);
  if (existing) {
    return existing;
  }
  if (userChatSpamMap.size >= USER_SPAM_TRACKER_LIMIT) {
    const oldestKey = userChatSpamMap.keys().next().value;
    if (oldestKey !== undefined) {
      userChatSpamMap.delete(oldestKey);
    }
  }
  const created: UserChatSpamRecord = {
    lastOrderAt: 0,
    lastSwitchAt: 0,
    lastText: '',
    lastTextAt: 0,
  };
  userChatSpamMap.set(userId, created);
  return created;
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

  const userId = normalizeUserId(user);
  const normalizedChatText = cleanText.toLowerCase().replace(/\s+/g, ' ');
  const spamRecord = getOrCreateSpamRecord(userId);
  const parsed = parseDrinkChat(cleanText);

  // Check if there are other viewers currently waiting in queue (ít người / không có hàng chờ)
  const otherQueuedCount = countOtherUsersQueuedOrders(state, userId);
  const isQueueFreeForUser = otherQueuedCount === 0;

  // Duplicate chat check:
  // When no other viewers are waiting in queue, allow repeated drink orders after a brief 1.2s gap;
  // otherwise enforce full DUPLICATE_CHAT_COOLDOWN_MS (10s)
  const duplicateCooldownMs =
    isQueueFreeForUser && parsed.isOrderIntent
      ? 1200
      : GAMEPLAY_LIMITS.DUPLICATE_CHAT_COOLDOWN_MS;

  const isDuplicateSpam =
    spamRecord.lastText === normalizedChatText &&
    now - spamRecord.lastTextAt < duplicateCooldownMs;

  if (isDuplicateSpam) {
    return { state: markUsersActiveInState(state, [userId], now), effects: {} };
  }
  spamRecord.lastText = normalizedChatText;
  spamRecord.lastTextAt = now;

  let nextState: DrinkBarLiveState = markUsersActiveInState(
    {
      ...state,
      guestBubbles: upsertGuestBubble(state.guestBubbles, user, cleanText, now),
      lastEventAt: now,
    },
    [userId],
    now
  );

  const isAlreadyQueued = isUserAlreadyInQueue(nextState, userId);
  const userOrderCount = countUserActiveAndQueuedOrders(nextState, userId);
  const maxPerUser = nextState.config.maxOrdersPerUser ?? 1;

  // When few viewers / no queue from other viewers, allow the user to order continuously (up to 10 cups);
  // but once there are other orders waiting in queue ("nhưng khi có order rồi"),
  // strictly enforce the maxPerUser quota!
  const MAX_FREE_QUEUE_USER_ORDERS = 10;
  const canAddAnotherCup =
    maxPerUser <= 0
      ? userOrderCount < GAMEPLAY_LIMITS.MAX_QUEUE_TOTAL
      : isQueueFreeForUser
      ? userOrderCount < MAX_FREE_QUEUE_USER_ORDERS
      : userOrderCount < maxPerUser;

  const isPureModifierUpdate =
    isAlreadyQueued && !parsed.recipeId && Boolean(parsed.sugarLevel || parsed.iceLevel);

  // Order cooldown: 1.2s when queue is free to allow continuous ordering, 5s when other people are queued
  const orderCooldownMs = isQueueFreeForUser
    ? 1200
    : GAMEPLAY_LIMITS.ORDER_SPAM_COOLDOWN_MS;

  const isOrderOnCooldown =
    spamRecord.lastOrderAt > 0 &&
    now - spamRecord.lastOrderAt < orderCooldownMs;

  const isUnlimited = nextState.config.unlimitedInventory;

  // Allow viewer to queue 1 or multiple cups parsed from chat up to MAX_CUPS_PER_COMMENT & quota
  if (canAddAnotherCup && !isPureModifierUpdate && parsed.isOrderIntent && !isOrderOnCooldown) {
    const requestedSpecs =
      parsed.items.length > 0
        ? parsed.items.flatMap((item) =>
            Array.from({ length: item.quantity }, () => ({
              recipeId: item.recipeId,
              sugarLevel: item.sugarLevel ?? parsed.sugarLevel ?? 'NORMAL',
              iceLevel: item.iceLevel ?? parsed.iceLevel ?? 'NORMAL',
            }))
          )
        : [
            {
              recipeId: isUnlimited
                ? pickRandomRecipeId()
                : pickAvailableRecipeId(nextState.inventory),
              sugarLevel: parsed.sugarLevel ?? 'NORMAL',
              iceLevel: parsed.iceLevel ?? 'NORMAL',
            },
          ];

    const effectiveLimit =
      maxPerUser <= 0
        ? GAMEPLAY_LIMITS.MAX_QUEUE_TOTAL
        : isQueueFreeForUser
        ? MAX_FREE_QUEUE_USER_ORDERS
        : maxPerUser;
    const remainingUserQuota = Math.max(0, effectiveLimit - userOrderCount);
    const totalQueued = nextState.vipQueue.length + nextState.normalQueue.length;
    const remainingStageSpace = Math.max(0, GAMEPLAY_LIMITS.MAX_QUEUE_TOTAL - totalQueued);
    const maxToEnqueue = Math.min(
      requestedSpecs.length,
      GAMEPLAY_LIMITS.MAX_CUPS_PER_COMMENT,
      remainingUserQuota,
      remainingStageSpace
    );

    let workingInventory = nextState.inventory;
    const createdOrders: DrinkOrder[] = [];
    let sawSoldOut = false;

    for (let i = 0; i < maxToEnqueue; i += 1) {
      const spec = requestedSpecs[i];
      if (!isUnlimited && !isRecipeAvailable(workingInventory, spec.recipeId)) {
        sawSoldOut = true;
        continue;
      }
      if (!isUnlimited) {
        workingInventory = deductDrinkStock(
          workingInventory,
          spec.recipeId,
          nextState.config.autoRestockEnabled,
          now
        );
      }
      createdOrders.push({
        orderId: createOrderId('order'),
        user: { ...user, id: userId },
        recipeId: spec.recipeId,
        toppings: [],
        sugarLevel: spec.sugarLevel,
        iceLevel: spec.iceLevel,
        isVip: false,
        isSignature: false,
        isGlowUpgraded: false,
        createdAt: now,
        lastActiveAt: now,
      });
    }

    if (createdOrders.length === 0 && sawSoldOut) {
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

    if (createdOrders.length > 0) {
      spamRecord.lastOrderAt = now;
      nextState = {
        ...nextState,
        inventory: workingInventory,
        normalQueue: [...nextState.normalQueue, ...createdOrders],
      };
      const wasIdleBeforeOrder = nextState.activeDrink === null;
      nextState = promoteNextFromQueue(nextState, now);
      if (wasIdleBeforeOrder && nextState.activeDrink) {
        // Kickstart progress > 0 immediately on the exact arrival frame so barista & HUD react in 0ms
        nextState = {
          ...nextState,
          activeDrink: {
            ...nextState.activeDrink,
            progress: 1.5,
          },
          activeSlots: [
            {
              ...nextState.activeDrink,
              progress: 1.5,
            },
            null,
          ],
        };
      }
      const firstOrder = createdOrders[0];
      return {
        state: nextState,
        effects: {
          sfxToPlay: 'chat_pop',
          ttsHint: {
            kind: 'order',
            nickname: firstOrder.user.nickname,
            recipeId: firstOrder.recipeId,
            recipeIds: createdOrders.map((o) => o.recipeId),
          },
        },
      };
    }
  }

  // If user is queued (not brewing yet) and requests a flavor change
  const isSwitchOnCooldown =
    spamRecord.lastSwitchAt > 0 &&
    now - spamRecord.lastSwitchAt < GAMEPLAY_LIMITS.FLAVOR_SWITCH_COOLDOWN_MS;
  if (isAlreadyQueued && parsed.hasFlavorModifier && !isSwitchOnCooldown) {
    spamRecord.lastSwitchAt = now;
    let workingInventory = nextState.inventory;

    if (!isUnlimited && parsed.recipeId && !isRecipeAvailable(workingInventory, parsed.recipeId)) {
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

    let targetOrderId: string | null = null;
    for (let i = nextState.vipQueue.length - 1; i >= 0; i -= 1) {
      if (normalizeUserId(nextState.vipQueue[i].user) === userId) {
        targetOrderId = nextState.vipQueue[i].orderId;
        break;
      }
    }
    if (!targetOrderId) {
      for (let i = nextState.normalQueue.length - 1; i >= 0; i -= 1) {
        if (normalizeUserId(nextState.normalQueue[i].user) === userId) {
          targetOrderId = nextState.normalQueue[i].orderId;
          break;
        }
      }
    }

    const updateOrder = (order: DrinkOrder): DrinkOrder => {
      if (order.orderId !== targetOrderId) return order;
      const nextRecipeId = parsed.recipeId ?? order.recipeId;
      if (!isUnlimited && nextRecipeId !== order.recipeId) {
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
    return {
      state: nextState,
      effects: {
        sfxToPlay: 'shaker',
        ttsHint: parsed.recipeId
          ? {
              kind: 'switch',
              nickname: user.nickname,
              recipeId: parsed.recipeId,
            }
          : undefined,
      },
    };
  }

  return { state: nextState, effects: {} };
}

export function applyLikesToState(
  state: DrinkBarLiveState,
  likeCount: number,
  now: number
): QueueTransitionResult {
  if (likeCount <= 0) {
    return { state, effects: {} };
  }

  // Likes no longer boost brew speed or alter active drink progress; keep telemetry timestamp updated
  return {
    state: {
      ...state,
      speedBoostUntil: 0,
      lastEventAt: now,
    },
    effects: {},
  };
}

function upgradeActiveDrinkOnGift(
  drink: ActiveDrink | null,
  donorUserId: string,
  tier: GiftTier,
  now: number
): ActiveDrink | null {
  if (!drink) {
    return null;
  }
  const isDonorActive = normalizeUserId(drink.user) === donorUserId;
  if (drink.phase !== 'BREWING' && !isDonorActive) {
    return drink;
  }
  if (drink.phase !== 'BREWING') {
    return {
      ...drink,
      isVip: true,
      isGlowUpgraded: tier === 'MEDIUM' || tier === 'LARGE' ? true : drink.isGlowUpgraded,
      isSignature: tier === 'LARGE' ? true : drink.isSignature,
      lastUpdatedAt: now,
    };
  }
  const addedTopping = pickNextMissingTopping(drink.toppings, undefined, drink.recipeId);
  const nextToppings = mergeUniqueToppings(drink.toppings, [addedTopping]);
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

function resolveOrderTierRank(order: DrinkOrder): number {
  if (order.isSignature) return TIER_RANK.LARGE;
  if (order.isGlowUpgraded) return TIER_RANK.MEDIUM;
  return TIER_RANK.SMALL;
}

function insertVipOrdersByTier(
  vipQueue: readonly DrinkOrder[],
  incoming: readonly DrinkOrder[],
  tier: GiftTier
): DrinkOrder[] {
  const next = [...vipQueue];
  const incomingRank = TIER_RANK[tier];
  const insertIdx = next.findIndex((item) => resolveOrderTierRank(item) < incomingRank);
  if (insertIdx === -1) {
    next.push(...incoming);
  } else {
    next.splice(insertIdx, 0, ...incoming);
  }
  return next;
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

  // Step 3: VIP Queue placement — donate upgrades ONLY existing waiting orders (or active counter cup); never creates phantom orders
  const donorVipOrders = state.vipQueue.filter((o) => normalizeUserId(o.user) === userId);
  const donorNormalOrders = state.normalQueue.filter((o) => normalizeUserId(o.user) === userId);
  let nextVipQueue = state.vipQueue.filter((o) => normalizeUserId(o.user) !== userId);
  const nextNormalQueue = state.normalQueue.filter((o) => normalizeUserId(o.user) !== userId);

  const donorExistingOrders = [...donorVipOrders, ...donorNormalOrders];
  if (donorExistingOrders.length > 0) {
    const upgradedOrders: DrinkOrder[] = donorExistingOrders.map((baseOrder) => ({
      ...baseOrder,
      user: normalizedUser,
      isVip: true,
      isGlowUpgraded: baseOrder.isGlowUpgraded || tier === 'MEDIUM' || tier === 'LARGE',
      isSignature: baseOrder.isSignature || tier === 'LARGE',
      toppings: resolveOrderToppingsForTier(baseOrder.toppings, tier, baseOrder.recipeId),
    }));

    nextVipQueue = insertVipOrdersByTier(nextVipQueue, upgradedOrders, tier);
  }

  // Step 4: Trigger TikTok Dance IMMEDIATELY on gift arrival; cap continuous pause by danceStartedAt so rush orders never starve
  const danceDurationMs = getDanceDurationMs(tier);
  const wasAlreadyDancing = now < state.danceUntil && state.danceStartedAt > 0;
  const sessionAnchor = wasAlreadyDancing ? state.danceStartedAt : now;
  const maxAllowedUntil = sessionAnchor + GAMEPLAY_LIMITS.DANCE_MAX_DURATION_MS;
  const nextDanceUntil = wasAlreadyDancing
    ? Math.min(maxAllowedUntil, state.danceUntil + GAMEPLAY_LIMITS.DANCE_BURST_EXTEND_MS)
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

  const burstKind = nextTier === 'LARGE' ? 'signature' : 'topping';

  return {
    state: nextState,
    effects: {
      sfxToPlay: 'dance_jingle',
      burstKind,
      ttsHint: {
        kind: 'donate',
        nickname: normalizedUser.nickname,
        danceStyle: nextStyle,
        tier: nextTier,
        isManual: false,
      },
    },
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
      danceStartedAt: now,
      danceTier: effectiveTier,
      danceStyle: effectiveStyle,
      lastEventAt: now,
    },
    effects: {
      sfxToPlay: 'dance_jingle',
      burstKind: effectiveTier === 'LARGE' ? 'signature' : 'topping',
      ttsHint: {
        kind: 'donate',
        nickname: '',
        danceStyle: effectiveStyle,
        tier: effectiveTier,
        isManual: true,
      },
    },
  };
}

export function activatePendingDanceOnState(
  state: DrinkBarLiveState,
  plan: PendingDancePlan,
  now: number
): QueueTransitionResult {
  const cappedDurationMs = Math.min(GAMEPLAY_LIMITS.DANCE_MAX_DURATION_MS, plan.durationMs);
  const danceUntil = now + cappedDurationMs;
  return {
    state: {
      ...state,
      bartenderMood: 'TIKTOK_DANCE',
      bartenderSpeech: {
        text: plan.thanksText,
        expiresAt: danceUntil,
      },
      waveUntil: danceUntil,
      danceUntil,
      danceStartedAt: now,
      danceTier: plan.tier,
      danceStyle: plan.style,
      lastEventAt: now,
    },
    effects: {
      sfxToPlay: 'dance_jingle',
      burstKind: plan.tier === 'LARGE' ? 'signature' : 'topping',
    },
  };
}

function isBobaExcludedRecipe(recipeId?: RecipeId): boolean {
  return (
    recipeId === 'matcha' ||
    recipeId === 'blue_citrus' ||
    recipeId === 'peach_tea' ||
    recipeId === 'lime_tea' ||
    recipeId === 'cacao' ||
    recipeId === 'coffee_milk' ||
    recipeId === 'berry_soda'
  );
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
  return isBobaExcludedRecipe(recipeId) ? resolved.filter((t) => t !== 'boba_pearls') : resolved;
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
  return isBobaExcludedRecipe(recipeId) ? resolved.filter((t) => t !== 'boba_pearls') : resolved;
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

  const waitingCount = state.vipQueue.length + state.normalQueue.length;
  const completed: ActiveDrink = {
    ...target,
    progress: 100,
    phase: 'SHOWCASE',
    showcaseRemainingMs: computeCrowdShowcaseMs(waitingCount),
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
      ttsHint: {
        kind: 'ready',
        nickname: completed.user.nickname,
        recipeId: completed.recipeId,
      },
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

  workingState = pruneInactiveQueueOrders(workingState, now);
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

  const waitingCount = workingState.vipQueue.length + workingState.normalQueue.length;
  const crowdSpeedMultiplier = computeCrowdSpeedMultiplier(waitingCount);
  const durationSec = Math.max(
    GAMEPLAY_LIMITS.MIN_BREW_DURATION_SEC,
    workingState.config.brewDurationSec
  );

  const s1 = tickSingleStation(
    workingState.activeDrink,
    dtSec,
    crowdSpeedMultiplier,
    durationSec,
    now
  );

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
      effects = {
        ...effects,
        sfxToPlay: effects.sfxToPlay ?? 'pour',
        ttsHint: effects.ttsHint ?? {
          kind: 'start_brew',
          nickname: workingState.activeDrink.user.nickname,
          recipeId: workingState.activeDrink.recipeId,
        },
      };
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
