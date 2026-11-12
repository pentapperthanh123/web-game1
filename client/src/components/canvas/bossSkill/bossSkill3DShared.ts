import * as THREE from 'three';
import { ActiveBossSkillBanner, BossSkillVfxType } from '../../../types/bossSkill';
import { BOSS_SKILL_VFX_DEFAULT_COUNT, BOSS_SKILL_VFX_DURATION_MS } from '../../../constants/bossSkillVfx';
import { TEAM_KEY } from '../../../constants/game';

export type SkillDirection3D = -1 | 0 | 1;

export interface SkillVfx3DProps {
  color: string;
  secondaryColor: string;
  scale: number;
  count: number;
  direction: SkillDirection3D;
  startedAt: number;
  durationMs: number;
}

/** World anchors shared by every archetype (match BossVoidAttack / champion wings). */
export const BOSS_3D_ANCHORS = {
  MOUTH: [0, 0.65, 0.2] as const,
  EYE: [0, 0.95, 0.35] as const,
  GROUND_Y: -1.7,
  /** Champion wings sit roughly ±1.8 on X. */
  WING_X: 1.8,
  SKY_Y: 6.5,
} as const;

const DEFAULT_SCALE = 1;

export const resolveDirection3D = (targetTeam: ActiveBossSkillBanner['targetTeam']): SkillDirection3D => {
  if (targetTeam === TEAM_KEY.BLG) return -1;
  if (targetTeam === TEAM_KEY.GENG) return 1;
  return 0;
};

export const buildSkillVfx3DProps = (banner: ActiveBossSkillBanner, vfxType: BossSkillVfxType): SkillVfx3DProps => ({
  color: banner.color,
  secondaryColor: banner.vfxParams?.secondaryColor ?? banner.color,
  scale: banner.vfxParams?.scale ?? DEFAULT_SCALE,
  count: banner.vfxParams?.count ?? BOSS_SKILL_VFX_DEFAULT_COUNT[vfxType],
  direction: resolveDirection3D(banner.targetTeam),
  startedAt: banner.timestamp,
  durationMs: BOSS_SKILL_VFX_DURATION_MS[vfxType],
});

/** 0..1 progress since the cast; > 1 once finished. */
export const computeProgress = (startedAt: number, durationMs: number): number =>
  (Date.now() - startedAt) / durationMs;

export const easeOutCubic = (value: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);

/** Pulse that rises then falls over the clip (0 → 1 → 0). */
export const bellCurve = (value: number): number => Math.sin(Math.min(1, Math.max(0, value)) * Math.PI);

/** Deterministic pseudo-random list per cast so the layout never reshuffles between frames. */
export const seededValues = (seed: number, count: number): number[] => {
  const values: number[] = [];
  let state = seed % 233280;
  for (let index = 0; index < count; index += 1) {
    state = (state * 9301 + 49297) % 233280;
    values.push(state / 233280);
  }
  return values;
};

/** Landing X for projectile-style effects given the side under attack. */
export const resolveLandingX = (direction: SkillDirection3D, random: number): number => {
  const spread = (random - 0.5) * 1.6;
  if (direction === 0) return (random - 0.5) * BOSS_3D_ANCHORS.WING_X * 2.4;
  return direction * BOSS_3D_ANCHORS.WING_X + spread;
};

export const setMaterialOpacity = (object: THREE.Object3D | null | undefined, opacity: number): void => {
  if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line)) return;
  const material = object.material;
  if (material instanceof THREE.Material) material.opacity = opacity;
};

export const createAdditiveMaterial = (color: string, opacity = 0.9): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
