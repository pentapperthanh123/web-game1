import { create } from 'zustand';
import { STUDIO_STRINGS } from '../../../shared/constants/i18nStrings';
import {
  DEFAULT_LIVE_CONFIG,
  GIFT_TIER_COINS,
  PAINT_PROGRESS_THRESHOLDS,
  resolveTier2StyleByCoins,
  STUDIO_LIMITS,
  STYLE_LABELS,
  TURN_TIMING_SEC,
} from '../../../shared/constants/studioConfig';
import type {
  ActivePortraitSession,
  ArtistMood,
  CameraPreset,
  GalleryFrameRecord,
  LiveStudioConfig,
  PortraitStyle,
  QueueEntry,
  StudioStateSnapshot,
  TurnPhase,
  ViewerProfile,
} from '../../../shared/types/studio';
import { studioSfx } from '../engine/audio/studioSfx';
import { clampValue } from '../utils/hashString';

export type StudioVfxSignal =
  | { kind: 'HEARTS'; count: number }
  | { kind: 'CONFETTI'; count: number }
  | { kind: 'PASSERBY' }
  | { kind: 'CLEAR_GALLERY' }
  | { kind: 'CHAT_JOIN_FLASH' }
  | { kind: 'BRUSH_SPARK' }
  | { kind: 'GIFT_EASEL_FLASH'; isRoyal: boolean };

type VfxListener = (signal: StudioVfxSignal) => void;
const vfxListeners = new Set<VfxListener>();

export function subscribeStudioVfx(listener: VfxListener): () => void {
  vfxListeners.add(listener);
  return () => vfxListeners.delete(listener);
}

function emitVfx(signal: StudioVfxSignal): void {
  for (const listener of vfxListeners) {
    listener(signal);
  }
}

function normalizeKeywordText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesJoinKeyword(comment: string, keywords: string[]): boolean {
  const normComment = normalizeKeywordText(comment);
  if (!normComment) return false;
  const words = normComment.split(/\s+/);

  for (const kw of keywords) {
    const cleanKw = normalizeKeywordText(kw);
    if (!cleanKw) continue;
    if (normComment === cleanKw || words.includes(cleanKw)) {
      return true;
    }
  }
  return false;
}

function createQueueId(userId: string): string {
  return `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// Pre-seeded initial showcase state with real user portrait photos (/assets/avatars/user-1.png .. user-8.png)
const INITIAL_ACTIVE_ENTRY: QueueEntry = {
  id: 'seed_active_phuong_nhi_8',
  user: {
    id: 'phuong_nhi_8',
    username: 'phuongnhi8',
    nickname: 'Phương Nhi 8',
    avatarUrl: '/assets/avatars/user-1.png',
  },
  isVip: false,
  isRoyalVip: false,
  enqueuedAt: Date.now() - 12000,
  giftCoins: 0,
};

const INITIAL_VIP_QUEUE: QueueEntry[] = [
  {
    id: 'seed_vip_minh_anh_1',
    user: {
      id: 'minh_anh_1',
      username: 'minhanh1',
      nickname: 'Minh Anh 1',
      avatarUrl: '/assets/avatars/user-2.png',
    },
    isVip: true,
    isRoyalVip: true,
    requestedStyle: 'oil_gold',
    enqueuedAt: Date.now() - 9000,
    giftCoins: 50,
    giftName: 'Vương Miện',
  },
];

const INITIAL_NORMAL_QUEUE: QueueEntry[] = [
  {
    id: 'seed_norm_gia_bao_2',
    user: {
      id: 'gia_bao_2',
      username: 'giabao2',
      nickname: 'Gia Bảo 2',
      avatarUrl: '/assets/avatars/user-3.png',
    },
    isVip: false,
    isRoyalVip: false,
    enqueuedAt: Date.now() - 7500,
    giftCoins: 0,
  },
  {
    id: 'seed_norm_khanh_linh_3',
    user: {
      id: 'khanh_linh_3',
      username: 'khanhlinh3',
      nickname: 'Khánh Linh 3',
      avatarUrl: '/assets/avatars/user-4.png',
    },
    isVip: false,
    isRoyalVip: false,
    enqueuedAt: Date.now() - 5000,
    giftCoins: 0,
  },
  {
    id: 'seed_norm_tuan_kiet_4',
    user: {
      id: 'tuan_kiet_4',
      username: 'tuankiet4',
      nickname: 'Tuấn Kiệt 4',
      avatarUrl: '/assets/avatars/user-5.png',
    },
    isVip: false,
    isRoyalVip: false,
    enqueuedAt: Date.now() - 3000,
    giftCoins: 0,
  },
];

export const INITIAL_SEEDED_GALLERY: GalleryFrameRecord[] = [
  {
    id: 'seed_gal_1',
    userId: 'ngoc_han_seed',
    nickname: 'Ngọc Hân',
    style: 'watercolor',
    isRoyalFrame: false,
    completedAt: Date.now() - 90000,
  },
  {
    id: 'seed_gal_2',
    userId: 'quoc_huy_seed',
    nickname: 'Quốc Huy',
    style: 'oil_gold',
    isRoyalFrame: true,
    completedAt: Date.now() - 60000,
  },
  {
    id: 'seed_gal_3',
    userId: 'thao_vy_seed',
    nickname: 'Thảo Vy',
    style: 'sketch',
    isRoyalFrame: false,
    completedAt: Date.now() - 30000,
  },
];

interface StudioStoreState {
  phase: TurnPhase;
  phaseElapsedSec: number;
  cameraPreset: CameraPreset;
  artistMood: ArtistMood;
  activeSession: ActivePortraitSession | null;
  vipQueue: QueueEntry[];
  normalQueue: QueueEntry[];
  gallery: GalleryFrameRecord[];
  totalPaintedCount: number;
  communityLikes: number;
  paintSpeedMultiplier: number;
  lastLikeAtMs: number;
  vipSpotlightUntilMs: number;
  vipSpotlightLabel: string | null;
  vipHatActiveUntil: number;
  artistSpeech: string | null;
  artistSpeechUntilMs: number;
  lastPasserbyAtMs: number;
  isConnectedToCore: boolean;
  artistMode: 'VRM' | 'PROCEDURAL_CHIBI';
  missingAssets: string[];
  config: LiveStudioConfig;

  handleChat: (user: ViewerProfile, text: string) => void;
  handleLike: (user: ViewerProfile, count: number) => void;
  handleGift: (user: ViewerProfile, giftName: string, coinValue: number, repeatCount?: number) => void;
  handleJoin: (user: ViewerProfile) => void;
  tick: (deltaSec: number) => void;

  updateConfig: (partial: Partial<LiveStudioConfig>) => void;
  promoteUserToFront: (userId: string) => void;
  skipCurrentTurn: () => void;
  removeUserFromStudio: (userId: string) => void;
  triggerTrollOnActive: (donorName?: string) => void;
  setActiveStyle: (style: PortraitStyle) => void;
  setConnectedToCore: (connected: boolean) => void;
  setArtistMode: (mode: 'VRM' | 'PROCEDURAL_CHIBI') => void;
  setMissingAssets: (missingAssets: string[]) => void;
  resetSession: () => void;
  getSnapshot: () => StudioStateSnapshot;
}

function isUserAlreadyWaitingOrSeated(
  userId: string,
  state: Pick<StudioStoreState, 'activeSession' | 'vipQueue' | 'normalQueue'>
): boolean {
  if (state.activeSession?.entry.user.id === userId) return true;
  if (state.vipQueue.some((item) => item.user.id === userId)) return true;
  if (state.normalQueue.some((item) => item.user.id === userId)) return true;
  return false;
}

function startNextQueuedPortrait(state: StudioStoreState, nowMs: number): Partial<StudioStoreState> {
  const nextVip = state.vipQueue[0];
  const nextNormal = state.normalQueue[0];
  const chosen = nextVip ?? nextNormal ?? null;

  if (!chosen) {
    return {
      phase: 'IDLE_WAIT',
      phaseElapsedSec: 0,
      activeSession: null,
      cameraPreset: 'WIDE_STUDIO',
      artistMood: 'IDLE',
    };
  }

  const remainingVip = nextVip ? state.vipQueue.slice(1) : state.vipQueue;
  const remainingNormal = !nextVip && nextNormal ? state.normalQueue.slice(1) : state.normalQueue;
  const chosenStyle = chosen.requestedStyle ?? state.config.defaultStyle;
  const strings = STUDIO_STRINGS[state.config.locale];
  const welcomeLine = strings.speechWalkIn(chosen.user.nickname);

  studioSfx.speakLine(welcomeLine, state.config.locale, state.config.micMode);

  return {
    phase: 'WALK_IN',
    phaseElapsedSec: 0,
    vipQueue: remainingVip,
    normalQueue: remainingNormal,
    activeSession: {
      entry: chosen,
      style: chosenStyle,
      progress: 0,
      startedAt: nowMs,
      isRoyalFrame: chosen.isRoyalVip || chosenStyle === 'oil_gold',
      trollApplied: chosenStyle === 'troll',
      modelSpeech: null,
      modelSpeechUntil: 0,
    },
    cameraPreset: 'WIDE_STUDIO',
    artistMood: chosenStyle === 'troll' ? 'TROLL_SMIRK' : 'PAINTING',
    artistSpeech: welcomeLine,
    artistSpeechUntilMs: nowMs + TURN_TIMING_SEC.ARTIST_SPEECH_DURATION * 1000,
  };
}

export const useStudioStore = create<StudioStoreState>((set, get) => ({
  phase: 'WALK_IN',
  phaseElapsedSec: 0,
  cameraPreset: 'WIDE_STUDIO',
  artistMood: 'IDLE',
  activeSession: {
    entry: INITIAL_ACTIVE_ENTRY,
    style: 'sketch',
    progress: 0,
    startedAt: Date.now(),
    isRoyalFrame: false,
    trollApplied: false,
    modelSpeech: null,
    modelSpeechUntil: 0,
  },
  vipQueue: [...INITIAL_VIP_QUEUE],
  normalQueue: [...INITIAL_NORMAL_QUEUE],
  gallery: [...INITIAL_SEEDED_GALLERY],
  totalPaintedCount: INITIAL_SEEDED_GALLERY.length,
  communityLikes: 120,
  paintSpeedMultiplier: STUDIO_LIMITS.MIN_SPEED_MULTIPLIER,
  lastLikeAtMs: 0,
  vipSpotlightUntilMs: 0,
  vipSpotlightLabel: null,
  vipHatActiveUntil: 0,
  artistSpeech: STUDIO_STRINGS.en.speechWalkIn(INITIAL_ACTIVE_ENTRY.user.nickname),
  artistSpeechUntilMs: Date.now() + TURN_TIMING_SEC.ARTIST_SPEECH_DURATION * 1000,
  lastPasserbyAtMs: 0,
  isConnectedToCore: false,
  artistMode: 'PROCEDURAL_CHIBI',
  missingAssets: [],
  config: { ...DEFAULT_LIVE_CONFIG },

  handleChat: (user, text) => {
    const state = get();
    const nowMs = Date.now();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (state.activeSession?.entry.user.id === user.id) {
      const clipped = trimmed.length > 42 ? `${trimmed.slice(0, 41)}…` : trimmed;
      set({
        activeSession: {
          ...state.activeSession,
          modelSpeech: clipped,
          modelSpeechUntil: nowMs + TURN_TIMING_SEC.MODEL_SPEECH_DURATION * 1000,
        },
      });
      return;
    }

    if (!matchesJoinKeyword(trimmed, state.config.chatKeywords)) return;
    if (isUserAlreadyWaitingOrSeated(user.id, state)) return;
    if (state.vipQueue.length + state.normalQueue.length >= STUDIO_LIMITS.MAX_TOTAL_QUEUE_SIZE) return;

    const entry: QueueEntry = {
      id: createQueueId(user.id),
      user,
      isVip: false,
      isRoyalVip: false,
      enqueuedAt: nowMs,
      giftCoins: 0,
    };

    emitVfx({ kind: 'CHAT_JOIN_FLASH' });
    set({ normalQueue: [...state.normalQueue, entry] });
  },

  handleLike: (_user, count) => {
    const state = get();
    const nowMs = Date.now();
    const safeCount = Math.max(1, Math.min(50, Math.round(count)));
    const nextLikes = state.communityLikes + safeCount;
    const prevBucket = Math.floor(state.communityLikes / state.config.communityLikeGoal);
    const nextBucket = Math.floor(nextLikes / state.config.communityLikeGoal);

    const speedGain = state.config.likeSpeedBoostStep * Math.min(4, Math.ceil(safeCount / 3));
    const nextSpeed = clampValue(
      state.paintSpeedMultiplier + speedGain,
      STUDIO_LIMITS.MIN_SPEED_MULTIPLIER,
      state.config.maxPaintSpeedMultiplier
    );

    const strings = STUDIO_STRINGS[state.config.locale];
    const hitCommunityGoal = nextBucket > prevBucket;

    emitVfx({ kind: 'HEARTS', count: Math.min(12, 3 + Math.ceil(safeCount / 3)) });
    emitVfx({ kind: 'BRUSH_SPARK' });
    if (hitCommunityGoal) {
      emitVfx({ kind: 'CONFETTI', count: 32 });
      studioSfx.playCompleteTing();
    }

    let nextSpeech = state.artistSpeech;
    let nextSpeechUntil = state.artistSpeechUntilMs;
    if (hitCommunityGoal) {
      nextSpeech = strings.speechCommunityGoalHit;
      nextSpeechUntil = nowMs + TURN_TIMING_SEC.ARTIST_SPEECH_DURATION * 1000;
    } else if (nextSpeed >= 2.2 && state.phase === 'PAINTING' && nowMs > state.artistSpeechUntilMs) {
      nextSpeech = strings.speechFastPainting;
      nextSpeechUntil = nowMs + 2400;
    }

    set({
      communityLikes: nextLikes,
      paintSpeedMultiplier: nextSpeed,
      lastLikeAtMs: nowMs,
      artistSpeech: nextSpeech,
      artistSpeechUntilMs: nextSpeechUntil,
    });
  },

  handleGift: (user, giftName, coinValue, repeatCount = 1) => {
    const state = get();
    const nowMs = Date.now();
    const totalCoins = Math.max(1, Math.round(coinValue) * Math.max(1, Math.round(repeatCount)));
    const strings = STUDIO_STRINGS[state.config.locale];

    if (totalCoins >= GIFT_TIER_COINS.ROYAL_VIP_MIN) {
      const cleanedNormal = state.normalQueue.filter((q) => q.user.id !== user.id);
      const cleanedVip = state.vipQueue.filter((q) => q.user.id !== user.id);
      const isAlreadyActive = state.activeSession?.entry.user.id === user.id;

      const royalEntry: QueueEntry = {
        id: createQueueId(user.id),
        user,
        isVip: true,
        isRoyalVip: true,
        requestedStyle: 'oil_gold',
        enqueuedAt: nowMs,
        giftCoins: totalCoins,
        giftName,
      };

      const line = strings.speechRoyalVip(user.nickname);
      studioSfx.playVipChime();
      studioSfx.speakLine(line, state.config.locale, state.config.micMode);
      emitVfx({ kind: 'GIFT_EASEL_FLASH', isRoyal: true });
      emitVfx({ kind: 'CONFETTI', count: 30 });
      emitVfx({ kind: 'HEARTS', count: 14 });

      set({
        vipQueue: isAlreadyActive ? cleanedVip : [royalEntry, ...cleanedVip],
        normalQueue: cleanedNormal,
        activeSession:
          isAlreadyActive && state.activeSession
            ? { ...state.activeSession, isRoyalFrame: true, style: 'oil_gold' }
            : state.activeSession,
        vipHatActiveUntil: nowMs + TURN_TIMING_SEC.VIP_HAT_DURATION * 1000,
        vipSpotlightUntilMs: nowMs + TURN_TIMING_SEC.VIP_SPOTLIGHT_HOLD * 1000,
        vipSpotlightLabel: `👑 ${user.nickname} (${totalCoins} xu)`,
        artistSpeech: line,
        artistSpeechUntilMs: nowMs + TURN_TIMING_SEC.ARTIST_SPEECH_DURATION * 1000,
      });
      return;
    }

    if (totalCoins >= GIFT_TIER_COINS.STYLE_MIN) {
      const targetStyle = resolveTier2StyleByCoins(totalCoins);
      const styleLabel = STYLE_LABELS[targetStyle][state.config.locale];
      const line =
        targetStyle === 'troll'
          ? strings.speechTrollActivate(state.activeSession?.entry.user.nickname ?? user.nickname)
          : strings.speechStyleSwitch(styleLabel);

      if (targetStyle === 'troll') {
        studioSfx.playTrollBoing();
      } else {
        studioSfx.playVipChime();
      }
      studioSfx.speakLine(line, state.config.locale, state.config.micMode);
      emitVfx({ kind: 'GIFT_EASEL_FLASH', isRoyal: false });
      emitVfx({ kind: 'HEARTS', count: 10 });

      if (state.activeSession && (state.phase === 'PAINTING' || state.phase === 'WALK_IN')) {
        set({
          activeSession: {
            ...state.activeSession,
            style: targetStyle,
            isRoyalFrame: state.activeSession.isRoyalFrame || targetStyle === 'oil_gold',
            trollApplied: state.activeSession.trollApplied || targetStyle === 'troll',
          },
          artistMood: targetStyle === 'troll' ? 'TROLL_SMIRK' : state.artistMood,
          artistSpeech: line,
          artistSpeechUntilMs: nowMs + TURN_TIMING_SEC.ARTIST_SPEECH_DURATION * 1000,
        });
        return;
      }

      const cleanedNormal = state.normalQueue.filter((q) => q.user.id !== user.id);
      const cleanedVip = state.vipQueue.filter((q) => q.user.id !== user.id);
      const styledEntry: QueueEntry = {
        id: createQueueId(user.id),
        user,
        isVip: true,
        isRoyalVip: false,
        requestedStyle: targetStyle,
        enqueuedAt: nowMs,
        giftCoins: totalCoins,
        giftName,
      };
      set({
        vipQueue: [...cleanedVip, styledEntry],
        normalQueue: cleanedNormal,
        artistSpeech: line,
        artistSpeechUntilMs: nowMs + TURN_TIMING_SEC.ARTIST_SPEECH_DURATION * 1000,
      });
      return;
    }

    const isAlreadyActive = state.activeSession?.entry.user.id === user.id;
    const cleanedNormal = state.normalQueue.filter((q) => q.user.id !== user.id);
    const alreadyInVip = state.vipQueue.some((q) => q.user.id === user.id);

    const nextVipQueue =
      isAlreadyActive || alreadyInVip
        ? state.vipQueue
        : [
            ...state.vipQueue,
            {
              id: createQueueId(user.id),
              user,
              isVip: true,
              isRoyalVip: false,
              enqueuedAt: nowMs,
              giftCoins: totalCoins,
              giftName,
            },
          ];

    const line = strings.speechVipWelcome(user.nickname);
    studioSfx.playVipChime();
    studioSfx.speakLine(line, state.config.locale, state.config.micMode);
    emitVfx({ kind: 'GIFT_EASEL_FLASH', isRoyal: false });
    emitVfx({ kind: 'HEARTS', count: 14 });

    set({
      vipQueue: nextVipQueue,
      normalQueue: cleanedNormal,
      vipSpotlightUntilMs: nowMs + TURN_TIMING_SEC.VIP_SPOTLIGHT_HOLD * 1000,
      vipSpotlightLabel: `🌹 ${user.nickname}`,
      artistSpeech: line,
      artistSpeechUntilMs: nowMs + TURN_TIMING_SEC.ARTIST_SPEECH_DURATION * 1000,
    });
  },

  handleJoin: (_user) => {
    const state = get();
    const nowMs = Date.now();
    if (nowMs - state.lastPasserbyAtMs < TURN_TIMING_SEC.PASSERBY_COOLDOWN * 1000) return;
    set({ lastPasserbyAtMs: nowMs });
    emitVfx({ kind: 'PASSERBY' });
  },

  tick: (deltaSec) => {
    const state = get();
    const nowMs = Date.now();
    const nextElapsed = state.phaseElapsedSec + deltaSec;

    let nextSpeed = state.paintSpeedMultiplier;
    const likeIdleMs = nowMs - state.lastLikeAtMs;
    if (
      nextSpeed > STUDIO_LIMITS.MIN_SPEED_MULTIPLIER &&
      likeIdleMs > TURN_TIMING_SEC.LIKE_SPEED_DECAY_DELAY * 1000
    ) {
      nextSpeed = Math.max(STUDIO_LIMITS.MIN_SPEED_MULTIPLIER, nextSpeed - deltaSec * 0.45);
    }

    const nextArtistSpeech = nowMs > state.artistSpeechUntilMs ? null : state.artistSpeech;
    const isVipSpotlight = nowMs < state.vipSpotlightUntilMs;
    const nextSpotlightLabel = isVipSpotlight ? state.vipSpotlightLabel : null;

    let activeSession = state.activeSession;
    if (activeSession && activeSession.modelSpeech && nowMs > activeSession.modelSpeechUntil) {
      activeSession = { ...activeSession, modelSpeech: null };
    }

    if (state.phase === 'IDLE_WAIT') {
      if (state.vipQueue.length > 0 || state.normalQueue.length > 0) {
        set({
          ...startNextQueuedPortrait(state, nowMs),
          paintSpeedMultiplier: nextSpeed,
        });
        return;
      }

      const shouldRemind = !nextArtistSpeech && nextElapsed > 8.5;
      const strings = STUDIO_STRINGS[state.config.locale];
      set({
        phaseElapsedSec: shouldRemind ? 0 : nextElapsed,
        paintSpeedMultiplier: nextSpeed,
        cameraPreset: isVipSpotlight ? 'VIP_SPOTLIGHT' : 'WIDE_STUDIO',
        artistMood: isVipSpotlight ? 'VIP_WAVE' : 'IDLE',
        vipSpotlightLabel: nextSpotlightLabel,
        artistSpeech: shouldRemind ? strings.speechIdleInvite : nextArtistSpeech,
        artistSpeechUntilMs: shouldRemind ? nowMs + 4200 : state.artistSpeechUntilMs,
      });
      return;
    }

    if (state.phase === 'WALK_IN') {
      let walkInMood: ArtistMood = 'PAINTING';
      if (isVipSpotlight) {
        walkInMood = 'VIP_WAVE';
      } else if (activeSession?.style === 'troll') {
        walkInMood = 'TROLL_SMIRK';
      }

      if (nextElapsed >= TURN_TIMING_SEC.WALK_IN) {
        set({
          phase: 'PAINTING',
          phaseElapsedSec: 0,
          activeSession: activeSession ? { ...activeSession, progress: 0 } : null,
          paintSpeedMultiplier: nextSpeed,
          cameraPreset: isVipSpotlight ? 'VIP_SPOTLIGHT' : 'WIDE_STUDIO',
          artistMood: walkInMood,
          artistSpeech: null,
          artistSpeechUntilMs: 0,
          vipSpotlightLabel: nextSpotlightLabel,
        });
        return;
      }
      set({
        phaseElapsedSec: nextElapsed,
        activeSession,
        paintSpeedMultiplier: nextSpeed,
        cameraPreset: isVipSpotlight ? 'VIP_SPOTLIGHT' : 'WIDE_STUDIO',
        artistMood: isVipSpotlight ? 'VIP_WAVE' : 'PAINTING',
        artistSpeech: nextArtistSpeech,
        vipSpotlightLabel: nextSpotlightLabel,
      });
      return;
    }

    if (state.phase === 'PAINTING' && activeSession) {
      const duration = clampValue(
        state.config.basePaintDurationSec,
        STUDIO_LIMITS.MIN_PAINT_DURATION_SEC,
        STUDIO_LIMITS.MAX_PAINT_DURATION_SEC
      );
      const progressDelta = (deltaSec * nextSpeed) / duration;
      const nextProgress = Math.min(1, activeSession.progress + progressDelta);
      const updatedSession: ActivePortraitSession = {
        ...activeSession,
        progress: nextProgress,
      };

      studioSfx.playBrushSwish(nextSpeed);

      if (nextProgress >= PAINT_PROGRESS_THRESHOLDS.COMPLETE) {
        const strings = STUDIO_STRINGS[state.config.locale];
        const doneLine = strings.speechRevealDone(activeSession.entry.user.nickname);
        studioSfx.playCompleteTing();
        studioSfx.playCameraShutter();
        studioSfx.speakLine(doneLine, state.config.locale, state.config.micMode);
        emitVfx({ kind: 'CONFETTI', count: 24 });
        emitVfx({ kind: 'HEARTS', count: 10 });

        set({
          phase: 'REVEAL',
          phaseElapsedSec: 0,
          activeSession: updatedSession,
          paintSpeedMultiplier: nextSpeed,
          cameraPreset: 'REVEAL_CLOSEUP',
          artistMood: 'REVEAL_PROUD',
          artistSpeech: doneLine,
          artistSpeechUntilMs: nowMs + TURN_TIMING_SEC.REVEAL * 1000,
          vipSpotlightLabel: nextSpotlightLabel,
        });
        return;
      }

      // Keep WIDE_STUDIO during the initial 3.5s of a session so the entire studio & queue are visible,
      // then allow OVER_SHOULDER zoom between 62% and 84% progress
      let nextCam: CameraPreset = 'WIDE_STUDIO';
      if (isVipSpotlight) {
        nextCam = 'VIP_SPOTLIGHT';
      } else if (nextElapsed > 3.5 && nextProgress >= 0.62 && nextProgress <= 0.84) {
        nextCam = 'OVER_SHOULDER';
      }

      let nextMood: ArtistMood = 'PAINTING';
      if (isVipSpotlight) {
        nextMood = 'VIP_WAVE';
      } else if (updatedSession.style === 'troll') {
        nextMood = 'TROLL_SMIRK';
      } else if (nextSpeed >= 1.8) {
        nextMood = 'FAST_SWEAT';
      }

      set({
        phaseElapsedSec: nextElapsed,
        activeSession: updatedSession,
        paintSpeedMultiplier: nextSpeed,
        cameraPreset: nextCam,
        artistMood: nextMood,
        artistSpeech: nextArtistSpeech,
        vipSpotlightLabel: nextSpotlightLabel,
      });
      return;
    }

    if (state.phase === 'REVEAL' && activeSession) {
      if (nextElapsed >= TURN_TIMING_SEC.REVEAL) {
        const newRecord: GalleryFrameRecord = {
          id: activeSession.entry.id,
          userId: activeSession.entry.user.id,
          nickname: activeSession.entry.user.nickname,
          style: activeSession.style,
          isRoyalFrame: activeSession.isRoyalFrame,
          completedAt: nowMs,
        };
        const updatedGallery = [newRecord, ...state.gallery].slice(
          0,
          STUDIO_LIMITS.MAX_GALLERY_FRAMES
        );

        set({
          phase: 'HANG_UP',
          phaseElapsedSec: 0,
          gallery: updatedGallery,
          totalPaintedCount: state.totalPaintedCount + 1,
          cameraPreset: 'WIDE_STUDIO',
          artistMood: 'REVEAL_PROUD',
          artistSpeech: nextArtistSpeech,
          vipSpotlightLabel: nextSpotlightLabel,
        });
        return;
      }

      set({
        phaseElapsedSec: nextElapsed,
        activeSession,
        paintSpeedMultiplier: nextSpeed,
        cameraPreset: 'REVEAL_CLOSEUP',
        artistMood: 'REVEAL_PROUD',
        artistSpeech: nextArtistSpeech,
        vipSpotlightLabel: nextSpotlightLabel,
      });
      return;
    }

    if (state.phase === 'HANG_UP') {
      if (nextElapsed >= TURN_TIMING_SEC.HANG_UP) {
        set({
          ...startNextQueuedPortrait(state, nowMs),
          paintSpeedMultiplier: STUDIO_LIMITS.MIN_SPEED_MULTIPLIER,
        });
        return;
      }
      set({
        phaseElapsedSec: nextElapsed,
        cameraPreset: 'WIDE_STUDIO',
        artistSpeech: nextArtistSpeech,
        vipSpotlightLabel: nextSpotlightLabel,
      });
    }
  },

  updateConfig: (partial) => {
    set((state) => ({
      config: { ...state.config, ...partial },
    }));
  },

  promoteUserToFront: (userId) => {
    const state = get();
    const fromVip = state.vipQueue.find((q) => q.user.id === userId);
    const fromNormal = state.normalQueue.find((q) => q.user.id === userId);
    const target = fromVip ?? fromNormal;
    if (!target) return;

    const promoted: QueueEntry = { ...target, isVip: true };
    set({
      vipQueue: [promoted, ...state.vipQueue.filter((q) => q.user.id !== userId)],
      normalQueue: state.normalQueue.filter((q) => q.user.id !== userId),
    });
  },

  skipCurrentTurn: () => {
    const state = get();
    set(startNextQueuedPortrait(state, Date.now()));
  },

  removeUserFromStudio: (userId) => {
    const state = get();
    const nextVip = state.vipQueue.filter((q) => q.user.id !== userId);
    const nextNormal = state.normalQueue.filter((q) => q.user.id !== userId);

    if (state.activeSession?.entry.user.id === userId) {
      set({
        ...startNextQueuedPortrait(
          { ...state, vipQueue: nextVip, normalQueue: nextNormal },
          Date.now()
        ),
      });
      return;
    }
    set({ vipQueue: nextVip, normalQueue: nextNormal });
  },

  triggerTrollOnActive: (donorName) => {
    const state = get();
    if (!state.activeSession) return;
    const nowMs = Date.now();
    const strings = STUDIO_STRINGS[state.config.locale];
    const line = strings.speechTrollActivate(
      donorName ?? state.activeSession.entry.user.nickname
    );
    studioSfx.playTrollBoing();
    studioSfx.speakLine(line, state.config.locale, state.config.micMode);
    emitVfx({ kind: 'HEARTS', count: 8 });

    set({
      activeSession: {
        ...state.activeSession,
        style: 'troll',
        trollApplied: true,
      },
      artistMood: 'TROLL_SMIRK',
      artistSpeech: line,
      artistSpeechUntilMs: nowMs + TURN_TIMING_SEC.ARTIST_SPEECH_DURATION * 1000,
    });
  },

  setActiveStyle: (style) => {
    const state = get();
    if (!state.activeSession) return;
    set({
      activeSession: {
        ...state.activeSession,
        style,
        isRoyalFrame: state.activeSession.isRoyalFrame || style === 'oil_gold',
        trollApplied: state.activeSession.trollApplied || style === 'troll',
      },
    });
  },

  setConnectedToCore: (connected) => set({ isConnectedToCore: connected }),

  setArtistMode: (mode) => set({ artistMode: mode }),

  setMissingAssets: (missingAssets) => set({ missingAssets }),

  resetSession: () => {
    emitVfx({ kind: 'CLEAR_GALLERY' });
    set({
      phase: 'IDLE_WAIT',
      phaseElapsedSec: 0,
      cameraPreset: 'WIDE_STUDIO',
      artistMood: 'IDLE',
      activeSession: null,
      vipQueue: [],
      normalQueue: [],
      gallery: [],
      totalPaintedCount: 0,
      communityLikes: 0,
      paintSpeedMultiplier: STUDIO_LIMITS.MIN_SPEED_MULTIPLIER,
      vipHatActiveUntil: 0,
      vipSpotlightUntilMs: 0,
      vipSpotlightLabel: null,
    });
  },

  getSnapshot: () => {
    const s = get();
    return {
      phase: s.phase,
      cameraPreset: s.cameraPreset,
      artistMood: s.artistMood,
      activeSession: s.activeSession,
      vipQueue: s.vipQueue,
      normalQueue: s.normalQueue,
      totalPaintedCount: s.totalPaintedCount,
      communityLikes: s.communityLikes,
      paintSpeedMultiplier: s.paintSpeedMultiplier,
      vipHatActiveUntil: s.vipHatActiveUntil,
      gallery: s.gallery,
      config: s.config,
      isConnectedToCore: s.isConnectedToCore,
      artistMode: s.artistMode,
    };
  },
}));
