import { create } from 'zustand';
import type { PreviewPresetKey } from '@shared/types/salon';
import { salonAdminEmitter } from '../services/adminEmitter';

export type PreviewMode = 'MIRROR' | 'SANDBOX';

interface PreviewStoreState {
  previewMode: PreviewMode;
  showSafeZone: boolean;
  reloadKey: number;
  pendingPreset: PreviewPresetKey | null;
  setPreviewMode: (mode: PreviewMode) => void;
  toggleSafeZone: () => void;
  reloadIframe: () => void;
  applyPreset: (preset: PreviewPresetKey) => void;
  clearPendingPreset: () => void;
}

export const usePreviewStore = create<PreviewStoreState>((set, get) => ({
  previewMode: 'MIRROR',
  showSafeZone: false,
  reloadKey: 0,
  pendingPreset: null,

  setPreviewMode: (mode) => {
    set({ previewMode: mode, pendingPreset: mode === 'MIRROR' ? null : get().pendingPreset });
  },

  toggleSafeZone: () => {
    const next = !get().showSafeZone;
    set({ showSafeZone: next });
    const target = get().previewMode === 'SANDBOX' ? 'PREVIEW' : 'LIVE';
    salonAdminEmitter.emitAdminAction('SET_SAFE_ZONE', { showSafeZone: next }, target);
  },

  reloadIframe: () => {
    set((state) => ({ reloadKey: state.reloadKey + 1 }));
  },

  applyPreset: (preset) => {
    const wasSandbox = get().previewMode === 'SANDBOX';
    set({ previewMode: 'SANDBOX', pendingPreset: preset });
    if (wasSandbox) {
      salonAdminEmitter.emitPreviewPreset(preset);
    }
  },

  clearPendingPreset: () => {
    set({ pendingPreset: null });
  },
}));
