import * as THREE from 'three';
import { MeteorEntity } from '../../../types/game';
import { METEOR_VFX } from './meteorVfxConstants';
import { resolveCachedColor } from './meteorLayers';

const MS_PER_SECOND = 1000;
const NO_METEOR_ID = '';

/** One landed meteor; slots are preallocated and recycled oldest-first, so landing never allocates. */
export interface MeteorImpactSlot {
  meteorId: string;
  landedAt: number;
  isActive: boolean;
  position: THREE.Vector3;
  baseColor: THREE.Color;
  /** Glow colour pushed toward white — used by the flash and the sparks. */
  hotColor: THREE.Color;
}

export interface MeteorImpactPool {
  slots: MeteorImpactSlot[];
  nextSlot: number;
}

const createSlot = (): MeteorImpactSlot => ({
  meteorId: NO_METEOR_ID,
  landedAt: 0,
  isActive: false,
  position: new THREE.Vector3(),
  baseColor: new THREE.Color(),
  hotColor: new THREE.Color(),
});

export const createMeteorImpactPool = (capacity: number): MeteorImpactPool => ({
  slots: Array.from({ length: capacity }, createSlot),
  nextSlot: 0,
});

export const getMeteorLandingTime = (meteor: MeteorEntity): number =>
  meteor.createdAt + meteor.duration * MS_PER_SECOND;

const hasImpactFor = (pool: MeteorImpactPool, meteorId: string): boolean => {
  for (let index = 0; index < pool.slots.length; index += 1) {
    if (pool.slots[index].meteorId === meteorId) return true;
  }
  return false;
};

const shouldRegisterLanding = (pool: MeteorImpactPool, meteor: MeteorEntity, now: number): boolean => {
  const sinceLanding = now - getMeteorLandingTime(meteor);
  if (sinceLanding < 0 || sinceLanding > METEOR_VFX.LANDING_REGISTER_WINDOW_MS) return false;
  return !hasImpactFor(pool, meteor.id);
};

const registerImpact = (pool: MeteorImpactPool, meteor: MeteorEntity): void => {
  const slot = pool.slots[pool.nextSlot];
  pool.nextSlot = (pool.nextSlot + 1) % pool.slots.length;

  const glowColor = resolveCachedColor(meteor.glowColor ?? meteor.color);
  const coreColor = resolveCachedColor(meteor.coreColor ?? METEOR_VFX.DEFAULT_CORE_COLOR);
  slot.meteorId = meteor.id;
  slot.landedAt = getMeteorLandingTime(meteor);
  slot.isActive = true;
  slot.position.fromArray(meteor.target);
  slot.baseColor.copy(resolveCachedColor(meteor.color));
  slot.hotColor.copy(glowColor).lerp(coreColor, METEOR_VFX.SPARK_WHITE_MIX);
};

/** Turns every meteor that has just touched down into a locally owned impact (the store prunes it soon after). */
export const registerMeteorLandings = (pool: MeteorImpactPool, meteors: readonly MeteorEntity[], now: number): void => {
  for (let index = 0; index < meteors.length; index += 1) {
    const meteor = meteors[index];
    if (shouldRegisterLanding(pool, meteor, now)) registerImpact(pool, meteor);
  }
};
