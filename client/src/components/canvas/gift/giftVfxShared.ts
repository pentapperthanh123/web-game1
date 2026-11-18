import * as THREE from 'three';
import { COLOR_ONLY_ADDITIVE_PROPS } from '../vfxBlending';
import { GIFT_TIER, GiftTier, TeamType } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { useGameStore } from '../../../store/gameStore';
import { GiftAnnouncement } from '../../../types/game';

/** How long each tier's 3D layer plays (SMALL has none). */
export const GIFT_VFX_DURATION_MS: Readonly<Record<GiftTier, number>> = {
  [GIFT_TIER.SMALL]: 0,
  [GIFT_TIER.MEDIUM]: 2400,
  [GIFT_TIER.BIG]: 4200,
  [GIFT_TIER.MEGA]: 6000,
};

export const GIFT_VFX_LAYOUT = {
  FLOOR_Y: -1.68,
  BEAM_HEIGHT: 10,
  BEAM_CENTER_Y: 3.6,
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
    ...COLOR_ONLY_ADDITIVE_PROPS,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });

/** Height share over which a sky beam fades in at the floor and fades out before the top scoreboard. */
const BEAM_FADE = {
  TEXTURE_HEIGHT: 64,
  /** Softly faded at the floor where the boss stands, and tapered to 0 at the top. */
  CLEAR_UNTIL: 0.08,
  SOLID_FROM: 0.32,
  SOLID_UNTIL: 0.66,
  FLOOR_ALPHA: 0.08,
} as const;

let beamFadeTexture: THREE.Texture | null = null;

/**
 * Vertical alpha ramp for beam cylinders (uv.y 0 = floor, uv.y 1 = top):
 * thins out around the boss at the bottom and fades out smoothly before the top scoreboard.
 */
export const getBeamFadeAlphaMap = (): THREE.Texture => {
  if (beamFadeTexture) return beamFadeTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = BEAM_FADE.TEXTURE_HEIGHT;
  const context = canvas.getContext('2d');
  if (context) {
    // Canvas y grows downward while uv.y grows upward (flipY), so the floor is the bottom row
    const gradient = context.createLinearGradient(0, BEAM_FADE.TEXTURE_HEIGHT, 0, 0);
    const floorGray = Math.round(BEAM_FADE.FLOOR_ALPHA * 255);
    gradient.addColorStop(0, `rgb(${floorGray},${floorGray},${floorGray})`);
    gradient.addColorStop(BEAM_FADE.CLEAR_UNTIL, `rgb(${floorGray},${floorGray},${floorGray})`);
    gradient.addColorStop(BEAM_FADE.SOLID_FROM, 'rgb(255,255,255)');
    gradient.addColorStop(BEAM_FADE.SOLID_UNTIL, 'rgb(255,255,255)');
    gradient.addColorStop(1, 'rgb(0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1, BEAM_FADE.TEXTURE_HEIGHT);
  }
  beamFadeTexture = new THREE.CanvasTexture(canvas);
  return beamFadeTexture;
};

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
export const easeOutCubic = (value: number): number => 1 - Math.pow(1 - clamp01(value), 3);
/** 0 → 1 → 0 over [start, end] of the timeline. */
export const pulseWindow = (progress: number, start: number, end: number): number => {
  const local = clamp01((progress - start) / (end - start));
  return Math.sin(local * Math.PI);
};
export const phase = (progress: number, start: number, end: number): number => clamp01((progress - start) / (end - start));
