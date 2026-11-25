import { create } from 'zustand';
import { SALON_I18N } from '@shared/constants/i18n';
import {
  BASE_COLOR_KEYS,
  HAIR_STYLES,
  HAIR_TROLL_TYPES,
  NAIL_SHAPES,
  NAIL_TROLL_TYPES,
  PASTEL_SHIMMER_COLOR_KEYS,
  SHIRT_COLORS,
  SKIN_TONES,
  SMALL_GIFT_ACCESSORIES,
} from '@shared/constants/presets';
import { CHAT_KEYWORDS, GAMEPLAY_LIMITS, GIFT_TIERS } from '@shared/constants/salonConfig';
import type {
  ActiveCustomerSession,
  AudienceBubble,
  FinishedWorkItem,
  HairStyleKey,
  NailShapeKey,
  PreviewPresetKey,
  QueuedCustomer,
  QueuePriority,
  SalonColorKey,
  SalonLanguage,
  SalonLiveState,
  SalonScheduleMode,
  SalonServiceMode,
  TrollEffectType,
  ViewerProfile,
} from '@shared/types/salon';
import { salonParticles } from '../engine/particlePool';
import { salonAudio } from '../services/audioManager';

let orderSeq = 1;
const userChatCooldowns = new Map<string, number>();

function makeId(prefix: string): string {
  orderSeq += 1;
  return `${prefix}_${Date.now()}_${orderSeq}`;
}

function normalizeVietnamese(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickHashItem<T>(seed: string, items: readonly T[]): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return items[Math.abs(hash) % items.length];
}

function mapHairStyleToNailShape(style: HairStyleKey): NailShapeKey {
  switch (style) {
    case 'long':
      return 'long';
    case 'cool':
      return 'almond';
    case 'short':
      return 'square';
    default:
      return 'oval';
  }
}

function parseChatPreferences(rawText: string): {
  isQueueJoin: boolean;
  preferredService?: SalonServiceMode;
  colorKey?: SalonColorKey;
  hairStyle?: HairStyleKey;
  nailShape?: NailShapeKey;
} {
  const normalized = normalizeVietnamese(rawText);
  const words = normalized.split(/[\s,!.?]+/).filter(Boolean);
  const hasWord = (candidates: readonly string[]): boolean =>
    candidates.some((kw) => {
      const cleanKw = normalizeVietnamese(kw);
      return words.includes(cleanKw) || normalized === cleanKw;
    });

  const isQueueJoin = hasWord(CHAT_KEYWORDS.QUEUE_JOIN);
  let preferredService: SalonServiceMode | undefined;
  if (hasWord(CHAT_KEYWORDS.SERVICE_NAIL)) {
    preferredService = 'NAIL';
  } else if (hasWord(CHAT_KEYWORDS.SERVICE_HAIR)) {
    preferredService = 'HAIR';
  }

  let colorKey: SalonColorKey | undefined;
  for (const [key, keywords] of Object.entries(CHAT_KEYWORDS.COLORS)) {
    if (hasWord(keywords)) {
      colorKey = key as SalonColorKey;
      break;
    }
  }

  let hairStyle: HairStyleKey | undefined;
  for (const [key, keywords] of Object.entries(CHAT_KEYWORDS.STYLES)) {
    if (hasWord(keywords)) {
      hairStyle = key as HairStyleKey;
      break;
    }
  }

  const nailShape = hairStyle ? mapHairStyleToNailShape(hairStyle) : undefined;
  return { isQueueJoin, preferredService, colorKey, hairStyle, nailShape };
}

function buildActiveSession(
  order: QueuedCustomer,
  service: SalonServiceMode,
  durationSec: number
): ActiveCustomerSession {
  const isRoyal = order.priority === 'ROYAL';
  const isVip = order.priority === 'VIP' || isRoyal;
  const defaultColor = isVip ? pickRandom(PASTEL_SHIMMER_COLOR_KEYS) : pickRandom(BASE_COLOR_KEYS);
  const hairStyle = order.requestedHairStyle ?? pickRandom(HAIR_STYLES);
  const nailShape = order.requestedNailShape ?? pickRandom(NAIL_SHAPES);

  return {
    orderId: order.orderId,
    user: order.user,
    service,
    priority: order.priority,
    colorKey: order.requestedColor ?? defaultColor,
    hasPastelShimmer: isVip,
    hairStyle,
    nailShape,
    nailArtStyle: 'FRENCH_TIP',
    accessory: isRoyal ? 'ROYAL_CROWN' : isVip ? pickRandom(SMALL_GIFT_ACCESSORIES) : 'NONE',
    expression: isRoyal ? 'ROYAL_PROUD' : 'HAPPY',
    trollEffect: null,
    trollTriggeredBy: null,
    isRoyal,
    royalTriggeredBy: isRoyal ? order.user.nickname : null,
    progress: 0,
    durationSec,
    elapsedSec: 0,
    startedAt: Date.now(),
    completedAt: null,
    skinTone: pickHashItem(order.user.id, SKIN_TONES),
    shirtColor: pickHashItem(`${order.user.id}_shirt`, SHIRT_COLORS),
  };
}

function createFinishedRecord(session: ActiveCustomerSession): FinishedWorkItem {
  return {
    id: makeId('work'),
    nickname: session.user.nickname,
    avatarUrl: session.user.avatarUrl,
    service: session.service,
    colorKey: session.colorKey,
    hasPastelShimmer: session.hasPastelShimmer,
    hairStyle: session.hairStyle,
    nailShape: session.nailShape,
    nailArtStyle: session.nailArtStyle ?? 'FRENCH_TIP',
    accessory: session.accessory,
    trollEffect: session.trollEffect,
    isRoyal: session.isRoyal,
    skinTone: session.skinTone,
    completedAt: Date.now(),
  };
}

function pickNextService(scheduleMode: SalonScheduleMode, current: SalonServiceMode): SalonServiceMode {
  if (scheduleMode === 'HAIR') return 'HAIR';
  if (scheduleMode === 'NAIL') return 'NAIL';
  return current === 'HAIR' ? 'NAIL' : 'HAIR';
}

function createStarterState(isSandboxPreview: boolean): SalonLiveState {
  const lang: SalonLanguage = 'VI';
  const starterOrder: QueuedCustomer = {
    orderId: 'starter_guest',
    user: { id: 'starter_linh', nickname: 'Khánh Linh' },
    priority: 'NORMAL',
    requestedColor: 'pink',
    requestedHairStyle: 'curly',
    requestedNailShape: 'oval',
    enqueuedAt: Date.now(),
  };

  const initialWall: FinishedWorkItem[] = [
    {
      id: 'seed_work_1',
      nickname: 'Pink Bubble Curls',
      service: 'HAIR',
      colorKey: 'pink',
      hasPastelShimmer: true,
      hairStyle: 'curly',
      nailShape: 'oval',
      nailArtStyle: 'FRENCH_TIP',
      accessory: 'BOW',
      trollEffect: null,
      isRoyal: false,
      skinTone: SKIN_TONES[0],
      completedAt: Date.now() - 240000,
    },
    {
      id: 'seed_work_2',
      nickname: 'Long Straight',
      service: 'HAIR',
      colorKey: 'pastel_peach',
      hasPastelShimmer: false,
      hairStyle: 'long',
      nailShape: 'square',
      nailArtStyle: 'FRENCH_TIP',
      accessory: 'NONE',
      trollEffect: null,
      isRoyal: false,
      skinTone: SKIN_TONES[1],
      completedAt: Date.now() - 180000,
    },
    {
      id: 'seed_work_3',
      nickname: 'Blonde Ombre',
      service: 'HAIR',
      colorKey: 'gold',
      hasPastelShimmer: true,
      hairStyle: 'bob',
      nailShape: 'almond',
      nailArtStyle: 'FRENCH_TIP',
      accessory: 'SPARKLE_CLIP',
      trollEffect: null,
      isRoyal: false,
      skinTone: SKIN_TONES[0],
      completedAt: Date.now() - 120000,
    },
    {
      id: 'seed_work_4',
      nickname: 'Purple Pixie',
      service: 'HAIR',
      colorKey: 'purple',
      hasPastelShimmer: false,
      hairStyle: 'short',
      nailShape: 'oval',
      nailArtStyle: 'FRENCH_TIP',
      accessory: 'NONE',
      trollEffect: null,
      isRoyal: false,
      skinTone: SKIN_TONES[2],
      completedAt: Date.now() - 90000,
    },
    {
      id: 'seed_work_5',
      nickname: 'Layered Balayage',
      service: 'HAIR',
      colorKey: 'blue',
      hasPastelShimmer: true,
      hairStyle: 'cool',
      nailShape: 'long',
      nailArtStyle: 'FRENCH_TIP',
      accessory: 'NONE',
      trollEffect: null,
      isRoyal: false,
      skinTone: SKIN_TONES[1],
      completedAt: Date.now() - 60000,
    },
  ];

  const initialService: SalonServiceMode = (() => {
    if (typeof window === 'undefined') return 'HAIR';
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get('mode') ?? params.get('preset') ?? '').toUpperCase();
    return requested === 'NAIL' ? 'NAIL' : 'HAIR';
  })();

  const initialSession = buildActiveSession(
    starterOrder,
    initialService,
    GAMEPLAY_LIMITS.DEFAULT_TURN_DURATION_SEC
  );
  if (initialService === 'NAIL') {
    initialSession.progress = 48;
    initialSession.elapsedSec = 9;
    initialSession.hasPastelShimmer = true;
    initialSession.colorKey = 'shimmer_rose';
    initialSession.nailShape = 'almond';
  }

  return {
    config: {
      scheduleMode: initialService === 'NAIL' ? 'NAIL' : 'AUTO',
      language: lang,
      turnDurationSec: GAMEPLAY_LIMITS.DEFAULT_TURN_DURATION_SEC,
      trollEnabled: true,
      micMode: false,
      masterVolume: 0.7,
      showSafeZone: false,
    },
    activeService: initialService,
    activeCustomer: initialSession,
    vipQueue: [],
    normalQueue: [
      {
        orderId: 'seed_q_1',
        user: { id: 'seed_tra_sua', nickname: 'Trà Sữa Ít Đường' },
        priority: 'NORMAL',
        enqueuedAt: Date.now() - 4000,
      },
      {
        orderId: 'seed_q_2',
        user: { id: 'seed_cao_nho', nickname: 'Cáo Nhỏ' },
        priority: 'NORMAL',
        enqueuedAt: Date.now() - 2000,
      },
    ],
    finishedWall: initialWall,
    royalTopPin: null,
    todayCount: 3,
    watchingCount: GAMEPLAY_LIMITS.INITIAL_WATCHING_COUNT,
    stylistMood: 'WORKING',
    stylistSpeech:
      initialService === 'NAIL'
        ? SALON_I18N[lang].stylistWorkingNail
        : SALON_I18N[lang].stylistWorkingHair,
    stylistSpeedBoostUntil: 0,
    audienceBubbles: [
      {
        id: 'seed_b_1',
        nickname: 'Trà Sữa',
        text:
          initialService === 'NAIL'
            ? 'Làm bộ nail hồng xinh đi chị!'
            : 'Cắt cho em với chủ tiệm ơi!',
        slotIndex: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + GAMEPLAY_LIMITS.AUDIENCE_BUBBLE_TTL_MS,
      },
    ],
    thankYouToast: null,
    autoBotEnabled: false,
    autoBotPace: 'NORMAL',
    autoPauseBotOnRealEvent: true,
    lastRealEventAt: null,
    isSandboxPreview,
  };
}

interface SalonStoreActions {
  processChat: (user: ViewerProfile, text: string, isReal?: boolean) => void;
  processLikes: (count: number, isReal?: boolean) => void;
  processGift: (user: ViewerProfile, coinValue: number, giftName?: string, isReal?: boolean) => void;
  processJoin: (viewerCount?: number) => void;
  tick: (dtSec: number) => void;
  setScheduleMode: (mode: SalonScheduleMode) => void;
  setLanguage: (lang: SalonLanguage) => void;
  setTurnDuration: (sec: number) => void;
  setTrollEnabled: (enabled: boolean) => void;
  setMicMode: (enabled: boolean) => void;
  setMasterVolume: (vol: number) => void;
  setSafeZone: (visible: boolean) => void;
  forceCompleteNow: () => void;
  triggerTrollNow: (triggeredBy?: string) => void;
  callNextCustomer: () => void;
  clearFinishedWall: () => void;
  applyPreviewPreset: (preset: PreviewPresetKey) => void;
}

export type SalonStore = SalonLiveState & SalonStoreActions;

const isPreviewModeFromUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('preview') === '1';
};

export const useSalonStore = create<SalonStore>((set, get) => ({
  ...createStarterState(isPreviewModeFromUrl()),

  processChat: (user, rawText, isReal = false) => {
    const now = Date.now();
    const lastAt = userChatCooldowns.get(user.id) ?? 0;
    if (now - lastAt < GAMEPLAY_LIMITS.CHAT_COOLDOWN_PER_USER_MS) return;
    userChatCooldowns.set(user.id, now);
    if (userChatCooldowns.size > 400) {
      const oldest = userChatCooldowns.keys().next().value;
      if (oldest) userChatCooldowns.delete(oldest);
    }

    const parsed = parseChatPreferences(rawText);
    const state = get();
    const strings = SALON_I18N[state.config.language];

    let nextActive = state.activeCustomer;
    let nextVipQueue = state.vipQueue;
    let nextNormalQueue = state.normalQueue;
    let nextService = state.activeService;
    let nextSpeech = state.stylistSpeech;

    const alreadyActive = nextActive?.user.id === user.id;
    const alreadyInVip = nextVipQueue.some((q) => q.user.id === user.id);
    const alreadyInNormal = nextNormalQueue.some((q) => q.user.id === user.id);

    // 1. Fair queue enqueue (never kicks active customer)
    if (parsed.isQueueJoin && !alreadyActive && !alreadyInVip && !alreadyInNormal) {
      const newOrder: QueuedCustomer = {
        orderId: makeId('ord'),
        user,
        priority: 'NORMAL',
        preferredService: parsed.preferredService,
        requestedColor: parsed.colorKey,
        requestedHairStyle: parsed.hairStyle,
        requestedNailShape: parsed.nailShape,
        enqueuedAt: now,
      };

      if (!nextActive) {
        const chosenService =
          state.config.scheduleMode === 'AUTO'
            ? parsed.preferredService ?? state.activeService
            : state.config.scheduleMode;
        nextService = chosenService;
        nextActive = buildActiveSession(newOrder, chosenService, state.config.turnDurationSec);
        nextSpeech =
          chosenService === 'HAIR' ? strings.stylistWorkingHair : strings.stylistWorkingNail;
      } else if (nextNormalQueue.length < GAMEPLAY_LIMITS.MAX_QUEUE_SIZE) {
        nextNormalQueue = [...nextNormalQueue, newOrder];
      }
    }

    // 2. Apply color/style preference to active session if still in progress
    if (nextActive && nextActive.completedAt === null && (parsed.colorKey || parsed.hairStyle)) {
      nextActive = {
        ...nextActive,
        colorKey: parsed.colorKey ?? nextActive.colorKey,
        hairStyle: parsed.hairStyle ?? nextActive.hairStyle,
        nailShape: parsed.nailShape ?? nextActive.nailShape,
      };
      salonParticles.spawn('SPARKLE', 465, 515, 5);
    }

    // 3. Display short community comment on waiting audience speech bubbles
    const cleanComment = rawText.trim().slice(0, 42);
    let nextBubbles = state.audienceBubbles.filter((b) => b.expiresAt > now);
    if (cleanComment.length >= 2) {
      const usedSlots = nextBubbles.map((b) => b.slotIndex);
      const nextSlot = [0, 1, 2].find((slot) => !usedSlots.includes(slot)) ?? Math.floor(Math.random() * 3);
      const bubble: AudienceBubble = {
        id: makeId('bub'),
        nickname: user.nickname.slice(0, 14),
        text: cleanComment,
        slotIndex: nextSlot,
        createdAt: now,
        expiresAt: now + GAMEPLAY_LIMITS.AUDIENCE_BUBBLE_TTL_MS,
      };
      nextBubbles = [...nextBubbles.filter((b) => b.slotIndex !== nextSlot), bubble].slice(
        -GAMEPLAY_LIMITS.MAX_AUDIENCE_BUBBLES
      );
    }

    set({
      activeService: nextService,
      activeCustomer: nextActive,
      vipQueue: nextVipQueue,
      normalQueue: nextNormalQueue,
      audienceBubbles: nextBubbles,
      stylistSpeech: nextSpeech,
      lastRealEventAt: isReal ? now : state.lastRealEventAt,
    });
  },

  processLikes: (count, isReal = false) => {
    const state = get();
    const now = Date.now();
    if (!state.activeCustomer || state.activeCustomer.completedAt !== null) {
      if (isReal) set({ lastRealEventAt: now });
      return;
    }

    const boostProgress = Math.min(
      GAMEPLAY_LIMITS.LIKE_MAX_BATCH_PROGRESS,
      Math.max(1, count) * GAMEPLAY_LIMITS.LIKE_PROGRESS_PER_HEART
    );
    const nextProgress = Math.min(100, state.activeCustomer.progress + boostProgress);
    const strings = SALON_I18N[state.config.language];

    salonParticles.spawn('HEART', 460, 560, Math.min(6, Math.max(2, Math.ceil(count / 3))));

    set({
      activeCustomer: {
        ...state.activeCustomer,
        progress: nextProgress,
      },
      stylistMood: state.activeCustomer.trollEffect ? 'OOPS' : 'FAST',
      stylistSpeech: state.activeCustomer.trollEffect ? strings.stylistOops : strings.stylistFast,
      stylistSpeedBoostUntil: now + GAMEPLAY_LIMITS.STYLIST_BOOST_MS,
      lastRealEventAt: isReal ? now : state.lastRealEventAt,
    });
  },

  processGift: (user, rawCoins, giftName = 'Gift', isReal = false) => {
    const now = Date.now();
    const coins = Math.max(1, Math.round(rawCoins));
    const state = get();
    const strings = SALON_I18N[state.config.language];

    const isLarge = coins >= GIFT_TIERS.LARGE_MIN_COINS;
    const isMedium = !isLarge && coins >= GIFT_TIERS.MEDIUM_MIN_COINS;
    const priority: QueuePriority = isLarge ? 'ROYAL' : 'VIP';

    // 1. Fair VIP Queue placement (never kicks current customer!)
    let nextVipQueue = [...state.vipQueue];
    let nextNormalQueue = state.normalQueue.filter((q) => q.user.id !== user.id);
    const isCurrentlySeated = state.activeCustomer?.user.id === user.id;

    if (!isCurrentlySeated) {
      const existingIdx = nextVipQueue.findIndex((q) => q.user.id === user.id);
      const order: QueuedCustomer =
        existingIdx >= 0
          ? {
              ...nextVipQueue[existingIdx],
              priority: isLarge ? 'ROYAL' : nextVipQueue[existingIdx].priority,
              giftTag: giftName,
            }
          : {
              orderId: makeId('vip'),
              user,
              priority,
              giftTag: giftName,
              enqueuedAt: now,
            };

      if (existingIdx >= 0) {
        nextVipQueue.splice(existingIdx, 1);
      }

      if (isLarge) {
        // Big gift jumps straight to #1 of VIP Queue
        nextVipQueue.unshift(order);
      } else {
        // Keep Royal orders ahead, place new VIP right after Royal orders
        const firstNonRoyalIdx = nextVipQueue.findIndex((item) => item.priority !== 'ROYAL');
        if (firstNonRoyalIdx === -1) {
          nextVipQueue.push(order);
        } else {
          nextVipQueue.splice(firstNonRoyalIdx, 0, order);
        }
      }
      nextVipQueue = nextVipQueue.slice(0, GAMEPLAY_LIMITS.MAX_QUEUE_SIZE);
    }

    // 2. Apply immediate gift visual/gameplay effect to active customer (or seat if empty)
    let nextActive = state.activeCustomer;
    let nextService = state.activeService;
    if (!nextActive && nextVipQueue.length > 0) {
      const nextOrder = nextVipQueue.shift()!;
      nextService = pickNextService(state.config.scheduleMode, state.activeService);
      nextActive = buildActiveSession(nextOrder, nextService, state.config.turnDurationSec);
    }

    let nextMood = state.stylistMood;
    let nextSpeech = state.stylistSpeech;
    let toastTier: 'SMALL' | 'MEDIUM' | 'LARGE' = 'SMALL';

    if (nextActive && nextActive.completedAt === null) {
      if (isLarge) {
        toastTier = 'LARGE';
        nextActive = {
          ...nextActive,
          isRoyal: true,
          royalTriggeredBy: user.nickname,
          hasPastelShimmer: true,
          trollEffect: null,
          accessory: 'ROYAL_CROWN',
          expression: 'ROYAL_PROUD',
          colorKey: pickRandom(PASTEL_SHIMMER_COLOR_KEYS),
        };
        nextMood = 'ROYAL';
        nextSpeech = strings.stylistRoyal;
        salonAudio.play('ROYAL');
        salonParticles.spawn('CONFETTI', 450, 460, 20);
        salonParticles.spawn('SPARKLE', 460, 520, 10);
      } else if (isMedium && state.config.trollEnabled) {
        toastTier = 'MEDIUM';
        if (nextActive.service === 'NAIL') {
          // In NAIL mode, troll mechanism is completely removed: unlock VIP Art Style + Speed Up
          nextActive = {
            ...nextActive,
            nailArtStyle: pickRandom(['FLORAL', 'STARS'] as const),
            hasPastelShimmer: true,
            colorKey: pickRandom(PASTEL_SHIMMER_COLOR_KEYS),
            expression: 'EXCITED',
            trollEffect: null,
            trollTriggeredBy: null,
          };
          nextMood = 'PROUD';
          nextSpeech = strings.stylistNailArt;
          salonAudio.play('GIFT');
          salonParticles.spawn('SPARKLE', 465, 560, 16);
        } else {
          const trollEffect: TrollEffectType = pickRandom(HAIR_TROLL_TYPES);
          nextActive = {
            ...nextActive,
            trollEffect,
            trollTriggeredBy: user.nickname,
            expression: 'CRYING_TROLL',
          };
          nextMood = 'OOPS';
          nextSpeech = strings.stylistOops;
          salonAudio.play('OOPS');
          salonAudio.play('CLIPPER');
          salonParticles.spawn('SMOKE', 450, 440, 10);
          salonParticles.spawn('SWEAT', 580, 470, 5);
        }
      } else {
        toastTier = 'SMALL';
        nextActive = {
          ...nextActive,
          hasPastelShimmer: true,
          colorKey: pickRandom(PASTEL_SHIMMER_COLOR_KEYS),
          accessory:
            nextActive.accessory === 'ROYAL_CROWN'
              ? 'ROYAL_CROWN'
              : pickRandom(SMALL_GIFT_ACCESSORIES),
          expression: nextActive.trollEffect ? nextActive.expression : 'EXCITED',
        };
        nextMood = nextActive.trollEffect ? 'OOPS' : 'PROUD';
        nextSpeech = nextActive.trollEffect ? strings.stylistOops : strings.stylistGlow;
        salonAudio.play('GIFT');
        salonParticles.spawn('SPARKLE', 460, 500, 12);
      }
    } else {
      salonAudio.play(isLarge ? 'ROYAL' : 'GIFT');
    }

    set({
      activeService: nextService,
      activeCustomer: nextActive,
      vipQueue: nextVipQueue,
      normalQueue: nextNormalQueue,
      stylistMood: nextMood,
      stylistSpeech: nextSpeech,
      thankYouToast: {
        id: makeId('toast'),
        donorName: user.nickname,
        tier: toastTier,
        giftName,
        createdAt: now,
        expiresAt: now + GAMEPLAY_LIMITS.THANK_YOU_TOAST_TTL_MS,
      },
      lastRealEventAt: isReal ? now : state.lastRealEventAt,
    });
  },

  processJoin: (viewerCount) => {
    set((state) => ({
      watchingCount:
        typeof viewerCount === 'number' && viewerCount > 0
          ? viewerCount
          : Math.min(9999, state.watchingCount + 1),
    }));
  },

  tick: (dtSec) => {
    const state = get();
    const now = Date.now();
    const strings = SALON_I18N[state.config.language];

    // Prune expired UI overlays cleanly
    const prunedBubbles = state.audienceBubbles.filter((b) => b.expiresAt > now);
    const activeToast =
      state.thankYouToast && state.thankYouToast.expiresAt > now ? state.thankYouToast : null;

    const current = state.activeCustomer;

    if (!current) {
      // Auto-seat next waiting customer if available
      const nextOrder = state.vipQueue[0] ?? state.normalQueue[0];
      if (!nextOrder) {
        if (
          prunedBubbles.length !== state.audienceBubbles.length ||
          activeToast !== state.thankYouToast
        ) {
          set({ audienceBubbles: prunedBubbles, thankYouToast: activeToast });
        }
        return;
      }

      const fromVip = state.vipQueue.length > 0;
      const nextVipQueue = fromVip ? state.vipQueue.slice(1) : state.vipQueue;
      const nextNormalQueue = fromVip ? state.normalQueue : state.normalQueue.slice(1);
      const nextService =
        state.config.scheduleMode === 'AUTO'
          ? nextOrder.preferredService ?? pickNextService('AUTO', state.activeService)
          : state.config.scheduleMode;
      const nextSession = buildActiveSession(nextOrder, nextService, state.config.turnDurationSec);

      set({
        activeService: nextService,
        activeCustomer: nextSession,
        vipQueue: nextVipQueue,
        normalQueue: nextNormalQueue,
        stylistMood: nextSession.isRoyal ? 'ROYAL' : 'WORKING',
        stylistSpeech:
          nextService === 'HAIR' ? strings.stylistWorkingHair : strings.stylistWorkingNail,
        audienceBubbles: prunedBubbles,
        thankYouToast: activeToast,
      });
      return;
    }

    // Showcase completed work briefly before rotating to next customer
    if (current.completedAt !== null) {
      if (now - current.completedAt >= GAMEPLAY_LIMITS.COMPLETION_SHOWCASE_MS) {
        get().callNextCustomer();
      } else if (
        prunedBubbles.length !== state.audienceBubbles.length ||
        activeToast !== state.thankYouToast
      ) {
        set({ audienceBubbles: prunedBubbles, thankYouToast: activeToast });
      }
      return;
    }

    const isBoosted = now < state.stylistSpeedBoostUntil;
    const speedMultiplier = isBoosted ? 1.55 : 1;
    const nextElapsed = current.elapsedSec + dtSec * speedMultiplier;
    const timeProgress = (nextElapsed / Math.max(4, current.durationSec)) * 100;
    const nextProgress = Math.min(100, Math.max(current.progress, timeProgress));

    // Periodic ambient snips/sparkles while working
    if (Math.random() < dtSec * (isBoosted ? 3.5 : 1.7)) {
      if (current.service === 'HAIR') {
        salonParticles.spawn('HAIR_SNIP', 455, 505, 1);
        if (Math.random() < 0.35) salonAudio.play('SNIP');
      } else {
        salonParticles.spawn('SPARKLE', 460, 610, 1);
      }
    }

    if (nextProgress >= 100) {
      const completedSession: ActiveCustomerSession = {
        ...current,
        progress: 100,
        elapsedSec: current.durationSec,
        completedAt: now,
      };
      const finishedItem = createFinishedRecord(completedSession);
      const nextWall = [finishedItem, ...state.finishedWall].slice(0, GAMEPLAY_LIMITS.MAX_WALL_ITEMS);
      const nextRoyalPin = completedSession.isRoyal ? finishedItem : state.royalTopPin;

      salonAudio.play(completedSession.isRoyal ? 'ROYAL' : 'DONE');
      salonParticles.spawn(completedSession.isRoyal ? 'CONFETTI' : 'SPARKLE', 460, 490, 14);

      set({
        activeCustomer: completedSession,
        finishedWall: nextWall,
        royalTopPin: nextRoyalPin,
        todayCount: state.todayCount + 1,
        stylistMood: completedSession.trollEffect ? 'OOPS' : completedSession.isRoyal ? 'ROYAL' : 'PROUD',
        stylistSpeech: completedSession.trollEffect ? strings.stylistOops : strings.stylistDone,
        audienceBubbles: prunedBubbles,
        thankYouToast: activeToast,
      });
      return;
    }

    const settledMood =
      current.trollEffect
        ? 'OOPS'
        : current.isRoyal
          ? 'ROYAL'
          : isBoosted
            ? 'FAST'
            : 'WORKING';

    set({
      activeCustomer: {
        ...current,
        elapsedSec: nextElapsed,
        progress: nextProgress,
      },
      stylistMood: settledMood,
      audienceBubbles: prunedBubbles,
      thankYouToast: activeToast,
    });
  },

  setScheduleMode: (scheduleMode) => {
    set((state) => {
      const strings = SALON_I18N[state.config.language];
      const nextService = scheduleMode === 'AUTO' ? state.activeService : scheduleMode;
      const updatedActive = state.activeCustomer
        ? { ...state.activeCustomer, service: nextService, trollEffect: null }
        : null;
      return {
        config: { ...state.config, scheduleMode },
        activeService: nextService,
        activeCustomer: updatedActive,
        stylistSpeech:
          nextService === 'HAIR' ? strings.stylistWorkingHair : strings.stylistWorkingNail,
      };
    });
  },

  setLanguage: (language) => {
    set((state) => {
      const strings = SALON_I18N[language];
      const speech =
        state.activeService === 'HAIR' ? strings.stylistWorkingHair : strings.stylistWorkingNail;
      return {
        config: { ...state.config, language },
        stylistSpeech: speech,
      };
    });
  },

  setTurnDuration: (turnDurationSec) => {
    const clamped = Math.max(
      GAMEPLAY_LIMITS.MIN_TURN_DURATION_SEC,
      Math.min(GAMEPLAY_LIMITS.MAX_TURN_DURATION_SEC, Math.round(turnDurationSec))
    );
    set((state) => ({
      config: { ...state.config, turnDurationSec: clamped },
      activeCustomer: state.activeCustomer
        ? { ...state.activeCustomer, durationSec: clamped }
        : null,
    }));
  },

  setTrollEnabled: (trollEnabled) => {
    set((state) => ({ config: { ...state.config, trollEnabled } }));
  },

  setMicMode: (micMode) => {
    salonAudio.setMicMode(micMode);
    set((state) => ({ config: { ...state.config, micMode } }));
  },

  setMasterVolume: (masterVolume) => {
    const clamped = Math.max(0, Math.min(1, masterVolume));
    salonAudio.setVolume(clamped);
    set((state) => ({ config: { ...state.config, masterVolume: clamped } }));
  },

  setSafeZone: (showSafeZone) => {
    set((state) => ({ config: { ...state.config, showSafeZone } }));
  },

  forceCompleteNow: () => {
    const state = get();
    if (!state.activeCustomer || state.activeCustomer.completedAt !== null) return;
    const now = Date.now();
    const strings = SALON_I18N[state.config.language];
    const completed: ActiveCustomerSession = {
      ...state.activeCustomer,
      progress: 100,
      elapsedSec: state.activeCustomer.durationSec,
      completedAt: now,
    };
    const item = createFinishedRecord(completed);
    salonAudio.play('DONE');
    salonParticles.spawn('SPARKLE', 460, 490, 14);
    set({
      activeCustomer: completed,
      finishedWall: [item, ...state.finishedWall].slice(0, GAMEPLAY_LIMITS.MAX_WALL_ITEMS),
      royalTopPin: completed.isRoyal ? item : state.royalTopPin,
      todayCount: state.todayCount + 1,
      stylistMood: completed.trollEffect ? 'OOPS' : 'PROUD',
      stylistSpeech: strings.stylistDone,
    });
  },

  triggerTrollNow: (triggeredBy = 'Host') => {
    const state = get();
    if (!state.activeCustomer || state.activeCustomer.completedAt !== null) return;
    const strings = SALON_I18N[state.config.language];

    if (state.activeCustomer.service === 'NAIL') {
      // In NAIL mode, troll is completely removed: trigger VIP Nail Art & Speed Up instead
      salonAudio.play('GIFT');
      salonParticles.spawn('SPARKLE', 465, 560, 14);
      set({
        activeCustomer: {
          ...state.activeCustomer,
          nailArtStyle: 'FLORAL',
          hasPastelShimmer: true,
          expression: 'EXCITED',
          trollEffect: null,
          trollTriggeredBy: null,
        },
        stylistMood: 'PROUD',
        stylistSpeech: strings.stylistNailArt,
      });
      return;
    }

    const trollEffect: TrollEffectType = pickRandom(HAIR_TROLL_TYPES);
    salonAudio.play('OOPS');
    salonAudio.play('CLIPPER');
    salonParticles.spawn('SMOKE', 455, 440, 10);
    salonParticles.spawn('SWEAT', 580, 470, 5);

    set({
      activeCustomer: {
        ...state.activeCustomer,
        trollEffect,
        trollTriggeredBy: triggeredBy,
        expression: 'CRYING_TROLL',
      },
      stylistMood: 'OOPS',
      stylistSpeech: strings.stylistOops,
    });
  },

  callNextCustomer: () => {
    const state = get();
    const strings = SALON_I18N[state.config.language];
    const nextOrder = state.vipQueue[0] ?? state.normalQueue[0];

    if (!nextOrder) {
      set({
        activeCustomer: null,
        stylistMood: 'WORKING',
        stylistSpeech: strings.readyStatus,
      });
      return;
    }

    const fromVip = state.vipQueue.length > 0;
    const nextVipQueue = fromVip ? state.vipQueue.slice(1) : state.vipQueue;
    const nextNormalQueue = fromVip ? state.normalQueue : state.normalQueue.slice(1);
    const nextService =
      state.config.scheduleMode === 'AUTO'
        ? nextOrder.preferredService ?? pickNextService('AUTO', state.activeService)
        : state.config.scheduleMode;
    const session = buildActiveSession(nextOrder, nextService, state.config.turnDurationSec);

    set({
      activeService: nextService,
      activeCustomer: session,
      vipQueue: nextVipQueue,
      normalQueue: nextNormalQueue,
      stylistMood: session.isRoyal ? 'ROYAL' : 'WORKING',
      stylistSpeech:
        nextService === 'HAIR' ? strings.stylistWorkingHair : strings.stylistWorkingNail,
    });
  },

  clearFinishedWall: () => {
    set({ finishedWall: [], royalTopPin: null, todayCount: 0 });
  },

  applyPreviewPreset: (preset) => {
    const state = get();
    const strings = SALON_I18N[state.config.language];
    const now = Date.now();
    const baseUser: ViewerProfile = { id: 'preview_guest', nickname: 'Khách Preview' };

    const buildMockSession = (
      service: SalonServiceMode,
      overrides: Partial<ActiveCustomerSession>
    ): ActiveCustomerSession => ({
      orderId: makeId('prev'),
      user: baseUser,
      service,
      priority: 'NORMAL',
      colorKey: 'pink',
      hasPastelShimmer: false,
      hairStyle: 'curly',
      nailShape: 'almond',
      nailArtStyle: 'FRENCH_TIP',
      accessory: 'NONE',
      expression: 'HAPPY',
      trollEffect: null,
      trollTriggeredBy: null,
      isRoyal: false,
      royalTriggeredBy: null,
      progress: 58,
      durationSec: 20,
      elapsedSec: 11,
      startedAt: now - 11000,
      completedAt: null,
      skinTone: SKIN_TONES[0],
      shirtColor: SHIRT_COLORS[0],
      ...overrides,
    });

    switch (preset) {
      case 'HAIR':
        set({
          activeService: 'HAIR',
          activeCustomer: buildMockSession('HAIR', {
            colorKey: 'pastel_peach',
            hasPastelShimmer: true,
            hairStyle: 'curly',
            accessory: 'BOW',
          }),
          stylistMood: 'WORKING',
          stylistSpeech: strings.stylistWorkingHair,
          thankYouToast: null,
        });
        break;
      case 'NAIL':
        set({
          activeService: 'NAIL',
          activeCustomer: buildMockSession('NAIL', {
            colorKey: 'shimmer_rose',
            hasPastelShimmer: true,
            nailShape: 'long',
            nailArtStyle: 'FLORAL',
            accessory: 'SPARKLE_CLIP',
            progress: 72,
          }),
          audienceBubbles: [
            {
              id: makeId('bub'),
              nickname: 'Trà Sữa',
              text: 'Làm bộ nail hồng xinh đi chị!',
              slotIndex: 0,
              createdAt: now,
              expiresAt: now + GAMEPLAY_LIMITS.AUDIENCE_BUBBLE_TTL_MS,
            },
          ],
          stylistMood: 'WORKING',
          stylistSpeech: strings.stylistWorkingNail,
          thankYouToast: null,
        });
        break;
      case 'VIP_QUEUE':
        set({
          vipQueue: [
            {
              orderId: 'prev_vip_1',
              user: { id: 'pv1', nickname: 'Đại Gia Hoa Hồng' },
              priority: 'VIP',
              giftTag: 'Rose',
              enqueuedAt: now,
            },
            {
              orderId: 'prev_vip_2',
              user: { id: 'pv2', nickname: 'Công Chúa Pastel' },
              priority: 'ROYAL',
              giftTag: 'Crown',
              enqueuedAt: now,
            },
          ],
          activeCustomer: buildMockSession('HAIR', {
            priority: 'VIP',
            colorKey: 'pastel_mint',
            hasPastelShimmer: true,
            accessory: 'SUNGLASSES',
            expression: 'EXCITED',
          }),
          stylistMood: 'PROUD',
          stylistSpeech: strings.stylistGlow,
          thankYouToast: {
            id: makeId('toast'),
            donorName: 'Đại Gia Hoa Hồng',
            tier: 'SMALL',
            giftName: 'Rose',
            createdAt: now,
            expiresAt: now + 6000,
          },
        });
        salonParticles.spawn('SPARKLE', 460, 500, 12);
        break;
      case 'TROLL': {
        const svc = state.activeService;
        if (svc === 'NAIL') {
          // In NAIL mode, troll is completely removed: preview VIP Floral/Stars Nail Art
          set({
            activeCustomer: buildMockSession('NAIL', {
              colorKey: 'shimmer_rose',
              hasPastelShimmer: true,
              nailArtStyle: 'FLORAL',
              expression: 'EXCITED',
              trollEffect: null,
            }),
            stylistMood: 'PROUD',
            stylistSpeech: strings.stylistNailArt,
            thankYouToast: {
              id: makeId('toast'),
              donorName: 'Fan Cứng Nail VIP',
              tier: 'MEDIUM',
              giftName: 'Hoa & Nhũ VIP',
              createdAt: now,
              expiresAt: now + 6000,
            },
          });
          salonParticles.spawn('SPARKLE', 465, 560, 14);
        } else {
          const trollEffect: TrollEffectType = 'BALD_STRIPE';
          set({
            activeCustomer: buildMockSession('HAIR', {
              colorKey: 'gold',
              trollEffect,
              trollTriggeredBy: 'Thánh Troll',
              expression: 'CRYING_TROLL',
            }),
            stylistMood: 'OOPS',
            stylistSpeech: strings.stylistOops,
            thankYouToast: {
              id: makeId('toast'),
              donorName: 'Thánh Troll',
              tier: 'MEDIUM',
              giftName: 'Ice Cream',
              createdAt: now,
              expiresAt: now + 6000,
            },
          });
          salonParticles.spawn('SMOKE', 455, 440, 10);
          salonParticles.spawn('SWEAT', 580, 470, 5);
        }
        break;
      }
      case 'ROYAL': {
        const royalSession = buildMockSession(state.activeService, {
          priority: 'ROYAL',
          isRoyal: true,
          royalTriggeredBy: 'Idol Top 1',
          colorKey: 'shimmer_rose',
          hasPastelShimmer: true,
          accessory: 'ROYAL_CROWN',
          expression: 'ROYAL_PROUD',
        });
        set({
          activeCustomer: royalSession,
          royalTopPin: createFinishedRecord(royalSession),
          stylistMood: 'ROYAL',
          stylistSpeech: strings.stylistRoyal,
          thankYouToast: {
            id: makeId('toast'),
            donorName: 'Idol Top 1',
            tier: 'LARGE',
            giftName: 'Royal Crown',
            createdAt: now,
            expiresAt: now + 6000,
          },
        });
        salonParticles.spawn('CONFETTI', 460, 470, 20);
        break;
      }
    }
  },
}));
