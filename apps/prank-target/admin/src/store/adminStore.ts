import { create } from 'zustand';
import { DEFAULT_KEYWORD_MAP } from '@shared/constants/prankConfig';
import type { PrankActionType } from '@shared/types/prank';
import { emitConfigUpdate, emitLiveEvent } from '../services/adminEmitter';

interface AdminStore {
  language: 'VI' | 'EN';
  micMode: boolean;
  sfxVolume: number;
  trollIntensity: 'NORMAL' | 'EXTREME';
  keywordMap: Record<PrankActionType, string[]>;
  isAutoBotActive: boolean;
  botIntervalMs: number;
  botStats: {
    totalSent: number;
    lastAction: string;
    lastTimestamp: number;
  };

  // Actions
  setLanguage: (lang: 'VI' | 'EN') => void;
  setMicMode: (enabled: boolean) => void;
  setSfxVolume: (vol: number) => void;
  setTrollIntensity: (intensity: 'NORMAL' | 'EXTREME') => void;
  updateKeywords: (action: PrankActionType, keywords: string[]) => void;
  setAutoBotActive: (active: boolean) => void;
  setBotIntervalMs: (ms: number) => void;
  recordBotSent: (actionName: string) => void;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  language: 'EN', // Default EN as requested
  micMode: false,
  sfxVolume: 0.7,
  trollIntensity: 'NORMAL',
  keywordMap: { ...DEFAULT_KEYWORD_MAP },
  isAutoBotActive: false,
  botIntervalMs: 1800,
  botStats: {
    totalSent: 0,
    lastAction: 'Chưa chạy',
    lastTimestamp: 0,
  },

  setLanguage: (lang) => {
    set({ language: lang });
    emitConfigUpdate({ lang });
  },

  setMicMode: (enabled) => {
    set({ micMode: enabled });
    emitConfigUpdate({ micMode: enabled });
  },

  setSfxVolume: (vol) => {
    set({ sfxVolume: vol });
    emitConfigUpdate({ sfxVolume: vol });
  },

  setTrollIntensity: (intensity) => {
    set({ trollIntensity: intensity });
  },

  updateKeywords: (action, keywords) => {
    const updated = { ...get().keywordMap, [action]: keywords };
    set({ keywordMap: updated });
    emitConfigUpdate({ customKeywords: updated });
  },

  setAutoBotActive: (active) => {
    set({ isAutoBotActive: active });
  },

  setBotIntervalMs: (ms) => {
    set({ botIntervalMs: Math.max(500, Math.min(10000, ms)) });
  },

  recordBotSent: (actionName) => {
    set((state) => ({
      botStats: {
        totalSent: state.botStats.totalSent + 1,
        lastAction: actionName,
        lastTimestamp: Date.now(),
      },
    }));
  },
}));
