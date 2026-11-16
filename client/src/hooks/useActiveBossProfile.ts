import { BossProfile, getBossProfile } from '../constants/bossProfiles';
import { useGameStore } from '../store/gameStore';

/** Profile of the boss on screen; re-renders only when the boss is switched. */
export const useActiveBossProfile = (): BossProfile => getBossProfile(useGameStore((state) => state.gameTheme));
