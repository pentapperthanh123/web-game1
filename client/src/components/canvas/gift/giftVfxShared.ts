import * as THREE from 'three';
import { GIFT_TIER, GiftTier, TeamType } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { useGameStore } from '../../../store/gameStore';
import { GiftAnnouncement } from '../../../types/game';

/** How long each tier's 3D layer plays (SMALL has none). */
export const GIFT_VFX_DURATION_MS: Readonly<Record<GiftTier, number>> = {
  [GIFT_TIER.SMALL]: 0,
  [GIFT_TIER.MEDIUM]: 1600,
  [GIFT_TIER.BIG]: 3200,
  [GIFT_TIER.MEGA]: 4500,
};

export const GIFT_VFX_LAYOUT = {
  FLOOR_Y: -1.68,
  BEAM_HEIGHT: 14,
  BEAM_CENTER_Y: 5.3,
  MEGA_GOLD: '#fbbf24',
  CORE_WHITE: '#ffffff',
} as const;

export interface ActiveGiftVfx {
  banner: GiftAnnouncement;
  /** 0..1 inside the tier window. */
  progress: number;
}

/** The banner currently playing in 3D for one of `tiers`, or null (read inside useFrame — no React subscription). */
export const readActiveGiftVfx = (tiers: readonly GiftTier[]): ActiveGiftVfx | null => {
  const banner = useGameStore.getState().activeGiftBanner;
  if (!banner || !tiers.includes(banner.tier)) return null;
  const durationMs = GIFT_VFX_DURATION_MS[banner.tier];
  const progress = (Date.now() - banner.timestamp) / durationMs;
  if (progress < 0 || progress >= 1) return null;
  return { banner, progress };
};

export const resolveGiftTeamColors = (team: TeamType): { primary: string; secondary: string } => {
  const theme = getTeamTheme(useGameStore.getState().activeTeams[team]?.colorTheme);
  return { primary: theme.primaryHex, secondary: theme.secondaryHex };
};

export const createGlowMaterial = (color: string): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
export const easeOutCubic = (value: number): number => 1 - Math.pow(1 - clamp01(value), 3);
/** 0 → 1 → 0 over [start, end] of the timeline. */
export const pulseWindow = (progress: number, start: number, end: number): number => {
  const local = clamp01((progress - start) / (end - start));
  return Math.sin(local * Math.PI);
};
export const phase = (progress: number, start: number, end: number): number => clamp01((progress - start) / (end - start));
