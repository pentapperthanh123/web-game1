import { create } from 'zustand';
import { DEFAULT_LIVE_CONFIG } from '../../../shared/constants/studioConfig';
import type { LiveStudioConfig, StudioStateSnapshot } from '../../../shared/types/studio';
import { emitLiveConfig } from '../services/adminEmitter';

const MAX_LOG_ENTRIES = 25;

interface AdminStoreState {
  config: LiveStudioConfig;
  snapshot: StudioStateSnapshot | null;
  lastSnapshotAt: number;
  isAutoBotRunning: boolean;
  logs: string[];

  setSnapshot: (snapshot: StudioStateSnapshot) => void;
  updateConfig: (partial: Partial<LiveStudioConfig>) => void;
  setAutoBotRunning: (running: boolean) => void;
  pushLog: (message: string) => void;
}

export const useAdminStore = create<AdminStoreState>((set) => ({
  config: { ...DEFAULT_LIVE_CONFIG },
  snapshot: null,
  lastSnapshotAt: 0,
  isAutoBotRunning: false,
  logs: [],

  setSnapshot: (snapshot) =>
    set({
      snapshot,
      lastSnapshotAt: Date.now(),
    }),

  updateConfig: (partial) =>
    set((state) => {
      const nextConfig = { ...state.config, ...partial };
      emitLiveConfig(partial);
      return { config: nextConfig };
    }),

  setAutoBotRunning: (running) => set({ isAutoBotRunning: running }),

  pushLog: (message) =>
    set((state) => {
      const stamp = new Date().toLocaleTimeString('vi-VN', { hour12: false });
      return {
        logs: [`[${stamp}] ${message}`, ...state.logs].slice(0, MAX_LOG_ENTRIES),
      };
    }),
}));
