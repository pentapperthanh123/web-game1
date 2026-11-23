import { create } from 'zustand';
import { TeamType } from '../constants/game';

export type MegaWeaponCategory = 'SWORD' | 'LASER' | 'LOVE' | 'WATER';

export interface MegaWeaponEvent {
  id: string;
  category: MegaWeaponCategory;
  team: TeamType;
  targetPos: [number, number, number];
  donorName: string;
  donorAvatarUrl?: string;
  coins: number;
  timestamp: number;
}

export interface BurnDecal {
  id: string;
  pos: [number, number, number];
  color: string;
  donorName: string;
  createdAt: number;
}

export interface CameraCinematicRequest {
  camPos: [number, number, number];
  targetPos: [number, number, number];
  durationMs: number;
  timestamp: number;
}

interface GiftVfxState {
  activeMegaWeapon: MegaWeaponEvent | null;
  activeBurnDecals: BurnDecal[];
  cinematicRequest: CameraCinematicRequest | null;
  teamGiftCoins: Record<string, number>;
  lastDonationTeam: TeamType | null;
  lastDonationTimestamp: number;
  isPodiumOrbitActive: boolean;
  isContinuousFireworksActive: boolean;

  // Actions
  triggerMegaWeapon: (event: Omit<MegaWeaponEvent, 'id' | 'timestamp'>) => void;
  clearMegaWeapon: () => void;
  triggerCameraCinematic: (
    camPos: [number, number, number],
    targetPos: [number, number, number],
    durationMs?: number
  ) => void;
  clearCameraCinematic: () => void;
  addBurnDecal: (decal: Omit<BurnDecal, 'id' | 'createdAt'>) => void;
  recordGiftCoins: (team: TeamType, coins: number) => void;
  setPodiumOrbitActive: (active: boolean) => void;
  setContinuousFireworksActive: (active: boolean) => void;
  resetVfxRound: () => void;
}

const MAX_BURN_DECALS = 6;
const DEFAULT_CINEMATIC_DURATION_MS = 3200;

export const useGiftVfxStore = create<GiftVfxState>((set) => ({
  activeMegaWeapon: null,
  activeBurnDecals: [],
  cinematicRequest: null,
  teamGiftCoins: {},
  lastDonationTeam: null,
  lastDonationTimestamp: 0,
  isPodiumOrbitActive: false,
  isContinuousFireworksActive: false,

  triggerMegaWeapon: (event) =>
    set({
      activeMegaWeapon: {
        ...event,
        id: `mega-wep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      },
    }),

  clearMegaWeapon: () => set({ activeMegaWeapon: null }),

  triggerCameraCinematic: (camPos, targetPos, durationMs = DEFAULT_CINEMATIC_DURATION_MS) =>
    set({
      cinematicRequest: {
        camPos,
        targetPos,
        durationMs,
        timestamp: Date.now(),
      },
    }),

  clearCameraCinematic: () => set({ cinematicRequest: null }),

  addBurnDecal: (decal) =>
    set((state) => {
      const nextDecals = [
        ...state.activeBurnDecals,
        {
          ...decal,
          id: `decal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: Date.now(),
        },
      ];
      // Keep only recent decals to respect GPU pool budget
      if (nextDecals.length > MAX_BURN_DECALS) {
        nextDecals.shift();
      }
      return { activeBurnDecals: nextDecals };
    }),

  recordGiftCoins: (team, coins) =>
    set((state) => ({
      teamGiftCoins: {
        ...state.teamGiftCoins,
        [team]: (state.teamGiftCoins[team] || 0) + coins,
      },
      lastDonationTeam: team,
      lastDonationTimestamp: Date.now(),
    })),

  setPodiumOrbitActive: (active: boolean) => set({ isPodiumOrbitActive: active }),

  setContinuousFireworksActive: (active: boolean) => set({ isContinuousFireworksActive: active }),

  resetVfxRound: () =>
    set({
      activeMegaWeapon: null,
      activeBurnDecals: [],
      cinematicRequest: null,
      teamGiftCoins: {},
      lastDonationTeam: null,
      lastDonationTimestamp: 0,
      isPodiumOrbitActive: false,
      isContinuousFireworksActive: false,
    }),
}));

/** Selective alias hook for gift store integration */
export const useGiftStore = useGiftVfxStore;
