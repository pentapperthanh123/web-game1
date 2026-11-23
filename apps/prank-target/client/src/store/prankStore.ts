import { create } from 'zustand';
import type {
  CharacterExpression,
  PrankActionType,
  PrankTargetState,
  RageTier,
  TopPranker,
} from '@shared/types/prank';
import { RAGE_THRESHOLDS } from '@shared/constants/prankConfig';
import { audioSynthesizer } from '../engine/audioSynthesizer';

interface PrankStore extends PrankTargetState {
  // Actions
  addRage: (delta: number) => void;
  setExpression: (expr: CharacterExpression) => void;
  recordHit: (
    action: PrankActionType,
    initiatorName: string,
    avatarUrl?: string,
    coinValue?: number
  ) => void;
  triggerMeltdown: () => void;
  cleanTarget: () => void;
  resetSession: () => void;
  tickDecay: (deltaSec: number) => void;
  setScreenShake: (amount: number) => void;
  toggleLanguage: () => void;
  setLanguage: (lang: 'VI' | 'EN') => void;
  setMicMode: (enabled: boolean) => void;
  setSfxVolume: (vol: number) => void;
}

function calculateTier(rage: number, isMeltdown: boolean): RageTier {
  if (isMeltdown || rage >= RAGE_THRESHOLDS.MELTDOWN_TRIGGER) return 'MELTDOWN';
  if (rage > RAGE_THRESHOLDS.ANNOYED_MAX) return 'FURIOUS';
  if (rage > RAGE_THRESHOLDS.CHILL_MAX) return 'ANNOYED';
  return 'CHILL';
}

function deriveExpressionFromTier(tier: RageTier): CharacterExpression {
  switch (tier) {
    case 'MELTDOWN':
      return 'MELTDOWN';
    case 'FURIOUS':
      return 'FURIOUS';
    case 'ANNOYED':
      return 'ANNOYED';
    case 'CHILL':
    default:
      return 'IDLE';
  }
}

export const usePrankStore = create<PrankStore>((set, get) => ({
  rageMeter: 10,
  tier: 'CHILL',
  expression: 'IDLE',
  totalHits: 0,
  isMeltdownActive: false,
  meltdownEndsAt: null,
  activeAttachments: [],
  topPrankers: [],
  cameraShake: 0,
  screenShake: 0,
  micMode: false,
  sfxVolume: 0.7,
  language: 'EN', // Default EN as requested

  addRage: (delta: number) => {
    const state = get();
    if (state.isMeltdownActive) return; // locked during meltdown

    const nextRage = Math.max(0, Math.min(100, state.rageMeter + delta));
    if (nextRage >= RAGE_THRESHOLDS.MELTDOWN_TRIGGER) {
      get().triggerMeltdown();
      return;
    }

    const nextTier = calculateTier(nextRage, false);
    set({
      rageMeter: nextRage,
      tier: nextTier,
      expression: deriveExpressionFromTier(nextTier),
    });
  },

  setExpression: (expr: CharacterExpression) => {
    set({ expression: expr });
  },

  recordHit: (
    action: PrankActionType,
    initiatorName: string,
    avatarUrl?: string,
    coinValue = 1
  ) => {
    const state = get();
    const nextTotalHits = state.totalHits + 1;

    // Update Top Prankers
    const existingIdx = state.topPrankers.findIndex((p) => p.username === initiatorName);
    const updatedPrankers = [...state.topPrankers];
    if (existingIdx >= 0) {
      updatedPrankers[existingIdx] = {
        ...updatedPrankers[existingIdx],
        totalCoins: updatedPrankers[existingIdx].totalCoins + coinValue,
        hitCount: updatedPrankers[existingIdx].hitCount + 1,
        lastAction: action,
      };
    } else {
      updatedPrankers.push({
        id: `user-${Date.now()}`,
        username: initiatorName,
        nickname: initiatorName,
        avatarUrl,
        totalCoins: coinValue,
        hitCount: 1,
        lastAction: action,
      });
    }
    updatedPrankers.sort((a, b) => b.totalCoins - a.totalCoins);

    // Hit impact temporary expression
    set({
      totalHits: nextTotalHits,
      topPrankers: updatedPrankers.slice(0, 5),
      lastHit: {
        action,
        initiatorName,
        avatarUrl,
        timestamp: Date.now(),
      },
      expression: 'HIT_IMPACT',
      screenShake: Math.min(18, state.screenShake + 7),
    });

    // Revert from HIT_IMPACT to appropriate tier expression after 600ms
    setTimeout(() => {
      const current = get();
      if (!current.isMeltdownActive) {
        set({ expression: deriveExpressionFromTier(current.tier) });
      }
    }, 600);
  },

  triggerMeltdown: () => {
    const now = Date.now();
    const endsAt = now + RAGE_THRESHOLDS.MELTDOWN_DURATION_MS;

    audioSynthesizer.playMeltdownAlarm();

    set({
      rageMeter: 100,
      tier: 'MELTDOWN',
      expression: 'MELTDOWN',
      isMeltdownActive: true,
      meltdownEndsAt: endsAt,
      screenShake: 16,
    });

    // End meltdown after duration and reset to baseline
    setTimeout(() => {
      set({
        rageMeter: RAGE_THRESHOLDS.MELTDOWN_RESET_VALUE,
        tier: 'CHILL',
        expression: 'IDLE',
        isMeltdownActive: false,
        meltdownEndsAt: null,
        screenShake: 0,
      });
    }, RAGE_THRESHOLDS.MELTDOWN_DURATION_MS);
  },

  cleanTarget: () => {
    set({
      rageMeter: 0,
      tier: 'CHILL',
      expression: 'IDLE',
      isMeltdownActive: false,
      meltdownEndsAt: null,
      screenShake: 0,
    });
  },

  resetSession: () => {
    set({
      rageMeter: 10,
      tier: 'CHILL',
      expression: 'IDLE',
      totalHits: 0,
      isMeltdownActive: false,
      meltdownEndsAt: null,
      topPrankers: [],
      lastHit: undefined,
      screenShake: 0,
    });
  },

  tickDecay: (deltaSec: number) => {
    const state = get();
    if (state.isMeltdownActive) return;

    // Decay rage slowly if idle
    if (state.rageMeter > 5) {
      const nextRage = Math.max(5, state.rageMeter - RAGE_THRESHOLDS.DECAY_RATE_PER_SEC * deltaSec);
      const nextTier = calculateTier(nextRage, false);
      set({
        rageMeter: nextRage,
        tier: nextTier,
        expression: state.expression === 'HIT_IMPACT' ? 'HIT_IMPACT' : deriveExpressionFromTier(nextTier),
      });
    }

    // Decay screen shake
    if (state.screenShake > 0) {
      set({ screenShake: Math.max(0, state.screenShake - deltaSec * 15) });
    }
  },

  setScreenShake: (amount: number) => {
    set({ screenShake: amount });
  },

  toggleLanguage: () => {
    set((state) => ({ language: state.language === 'VI' ? 'EN' : 'VI' }));
  },

  setLanguage: (lang: 'VI' | 'EN') => {
    set({ language: lang });
  },

  setMicMode: (enabled: boolean) => {
    audioSynthesizer.setMicMode(enabled);
    set({ micMode: enabled });
  },

  setSfxVolume: (vol: number) => {
    audioSynthesizer.setVolume(vol);
    set({ sfxVolume: vol });
  },
}));
