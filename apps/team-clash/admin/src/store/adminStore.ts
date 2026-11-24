import { create } from 'zustand';
import {
  DEFAULT_PUSH_MULTIPLIERS,
  DEFAULT_ROUND_DURATION_SECONDS,
  DEFAULT_SOUND_CONFIG,
} from '../../../shared/constants/clashConfig';
import { DEFAULT_PRESET_ID } from '../../../shared/constants/presets';
import type {
  ClashMatchState,
  PushMultipliers,
  SoundConfig,
  TeamPresetConfig,
} from '../../../shared/types/clash';

interface AdminStoreState {
  // Live Client Status (mirrored via STATE_SYNC)
  clientConnected: boolean;
  liveState: Partial<ClashMatchState>;

  // Host Controls
  activePresetId: string;
  customPreset: TeamPresetConfig;
  language: 'EN' | 'VI';
  roundDurationSeconds: number;
  pushMultipliers: PushMultipliers;
  soundConfig: SoundConfig;

  // Simulator State
  isAutoBotActive: boolean;

  // Actions
  setClientConnected: (connected: boolean) => void;
  updateLiveState: (state: Partial<ClashMatchState>) => void;
  setActivePresetId: (id: string) => void;
  setCustomPreset: (preset: TeamPresetConfig) => void;
  setLanguage: (lang: 'EN' | 'VI') => void;
  setRoundDurationSeconds: (seconds: number) => void;
  setPushMultipliers: (multipliers: Partial<PushMultipliers>) => void;
  setSoundConfig: (config: Partial<SoundConfig>) => void;
  setAutoBotActive: (active: boolean) => void;
}

export const useAdminStore = create<AdminStoreState>((set) => ({
  clientConnected: false,
  liveState: {
    roundNumber: 1,
    seriesScore: { left: 0, right: 0 },
    roundStatus: 'PLAYING',
    roundTimeRemaining: DEFAULT_ROUND_DURATION_SECONDS,
    clashPosition: 50.0,
    leftScore: 0,
    rightScore: 0,
    activePresetId: DEFAULT_PRESET_ID,
    language: 'EN',
  },

  activePresetId: DEFAULT_PRESET_ID,
  customPreset: {
    id: 'custom',
    name: 'CUSTOM MATCH',
    leftTeam: {
      name: 'TEAM A',
      subName: 'Trái',
      primaryColor: '#e11d48',
      secondaryColor: '#fb7185',
      glowColor: 'rgba(225, 29, 72, 0.6)',
      keywords: ['a', '1'],
      characterType: 'girl',
    },
    rightTeam: {
      name: 'TEAM B',
      subName: 'Phải',
      primaryColor: '#2563eb',
      secondaryColor: '#60a5fa',
      glowColor: 'rgba(37, 99, 235, 0.6)',
      keywords: ['b', '2'],
      characterType: 'boy',
    },
  },
  language: 'EN',
  roundDurationSeconds: DEFAULT_ROUND_DURATION_SECONDS,
  pushMultipliers: { ...DEFAULT_PUSH_MULTIPLIERS },
  soundConfig: { ...DEFAULT_SOUND_CONFIG },
  isAutoBotActive: false,

  setClientConnected: (connected) => set({ clientConnected: connected }),
  updateLiveState: (state) =>
    set((prev) => ({
      liveState: { ...prev.liveState, ...state },
      clientConnected: true,
    })),
  setActivePresetId: (id) => set({ activePresetId: id }),
  setCustomPreset: (preset) => set({ customPreset: preset }),
  setLanguage: (lang) => set({ language: lang }),
  setRoundDurationSeconds: (seconds) => set({ roundDurationSeconds: seconds }),
  setPushMultipliers: (multipliers) =>
    set((state) => ({
      pushMultipliers: { ...state.pushMultipliers, ...multipliers },
    })),
  setSoundConfig: (config) =>
    set((state) => ({
      soundConfig: { ...state.soundConfig, ...config },
    })),
  setAutoBotActive: (active) => set({ isAutoBotActive: active }),
}));
