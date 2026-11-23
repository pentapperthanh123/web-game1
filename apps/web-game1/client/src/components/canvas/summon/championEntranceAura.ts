import * as THREE from 'three';
import { COMBAT_VFX_CONSTANTS, TEAM_KEY, TeamType } from '../../../constants/game';
import { CachedChampionVfxRefs } from './summonShared';

const TOUCHDOWN_MS = COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.FLY_IN_DURATION_MS;
const SHARDS_END_MS =
  TOUCHDOWN_MS + COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.IMPACT_SHARDS_DURATION_MS;

/**
 * Entrance aura timeline (ms since the champion was deployed):
 *  1. Sky pillar slams down (flash-in) while the summoner avatar swoops from the sky.
 *  2. A hexagonal rune seal converges onto the ground target during the fly-in.
 *  3. On touchdown (TOUCHDOWN_MS): white landing flash + ground shockwave ring + radial shard burst.
 *  4. A soft celestial halo blooms outward as the champion materializes.
 */
export const ENTRANCE_AURA = {
  TOTAL_MS: 1400,
  SEAL_END_MS: 980,
  SEAL_CONVERGE_MS: TOUCHDOWN_MS,
  SEAL_START_SCALE: 2.4,
  SEAL_END_SCALE: 1.0,
  SEAL_SPIN_SPEED: 4.2,
  SEAL_PEAK_OPACITY: 0.85,
  LANDING_START_MS: TOUCHDOWN_MS,
  LANDING_END_MS: 1360,
  LANDING_START_SCALE: 0.5,
  LANDING_END_SCALE: 2.4,
  LANDING_PEAK_OPACITY: 0.68,
  FLASH_START_MS: TOUCHDOWN_MS,
  FLASH_END_MS: TOUCHDOWN_MS + 360,
  FLASH_START_SCALE: 0.85,
  FLASH_END_SCALE: 1.85,
  FLASH_PEAK_OPACITY: 0.65,
  HALO_END_MS: 1300,
  HALO_START_SCALE: 0.7,
  HALO_END_SCALE: 1.9,
  HALO_PEAK_OPACITY: 0.6,
  HALO_SPIN_SPEED: 2.6,
  HALO_FADE_POWER: 1.6,
} as const;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Normalised 0..1 progress of `ageMs` inside [startMs, endMs]; -1 when outside the window. */
const getPhaseProgress = (ageMs: number, startMs: number, endMs: number): number => {
  if (ageMs < startMs || ageMs >= endMs) return -1;
  return (ageMs - startMs) / (endMs - startMs);
};

const getMaterial = (mesh: THREE.Mesh | undefined): THREE.MeshBasicMaterial | null => {
  if (!mesh) return null;
  return mesh.material instanceof THREE.MeshBasicMaterial ? mesh.material : null;
};

const hideMesh = (mesh: THREE.Mesh | undefined): void => {
  if (mesh?.visible) mesh.visible = false;
};

/** Shows the mesh with the given opacity, or hides it when the phase is over. */
const applyPhaseOpacity = (mesh: THREE.Mesh | undefined, opacity: number): boolean => {
  const material = getMaterial(mesh);
  if (!mesh || !material) return false;
  if (opacity <= 0) {
    hideMesh(mesh);
    return false;
  }
  material.opacity = opacity;
  mesh.visible = true;
  return true;
};

const updateRuneSeal = (refs: CachedChampionVfxRefs, ageMs: number, spinSign: number): void => {
  const sealProgress = getPhaseProgress(ageMs, 0, ENTRANCE_AURA.SEAL_END_MS);
  const opacity = sealProgress < 0 ? 0 : Math.sin(sealProgress * Math.PI) * ENTRANCE_AURA.SEAL_PEAK_OPACITY;
  if (!applyPhaseOpacity(refs.runeSealMesh, opacity) || !refs.runeSealMesh) return;

  const convergeProgress = easeOutCubic(Math.min(1, ageMs / ENTRANCE_AURA.SEAL_CONVERGE_MS));
  refs.runeSealMesh.scale.setScalar(
    THREE.MathUtils.lerp(ENTRANCE_AURA.SEAL_START_SCALE, ENTRANCE_AURA.SEAL_END_SCALE, convergeProgress)
  );
  refs.runeSealMesh.rotation.z = spinSign * (1 - convergeProgress) * ENTRANCE_AURA.SEAL_SPIN_SPEED;
};

const updateLandingImpact = (refs: CachedChampionVfxRefs, ageMs: number, spinSign: number): void => {
  const ringProgress = getPhaseProgress(ageMs, ENTRANCE_AURA.LANDING_START_MS, ENTRANCE_AURA.LANDING_END_MS);
  const ringOpacity = ringProgress < 0 ? 0 : (1 - ringProgress) * ENTRANCE_AURA.LANDING_PEAK_OPACITY;
  if (applyPhaseOpacity(refs.landingMesh, ringOpacity)) {
    refs.landingMesh?.scale.setScalar(
      THREE.MathUtils.lerp(ENTRANCE_AURA.LANDING_START_SCALE, ENTRANCE_AURA.LANDING_END_SCALE, easeOutCubic(ringProgress))
    );
  }

  const flashProgress = getPhaseProgress(ageMs, ENTRANCE_AURA.FLASH_START_MS, ENTRANCE_AURA.FLASH_END_MS);
  const flashOpacity = flashProgress < 0 ? 0 : Math.pow(1 - flashProgress, 2) * ENTRANCE_AURA.FLASH_PEAK_OPACITY;
  if (applyPhaseOpacity(refs.landingFlashMesh, flashOpacity)) {
    refs.landingFlashMesh?.scale.setScalar(
      THREE.MathUtils.lerp(ENTRANCE_AURA.FLASH_START_SCALE, ENTRANCE_AURA.FLASH_END_SCALE, easeOutCubic(flashProgress))
    );
  }

  const shardCfg = COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON;
  const shardsProgress = getPhaseProgress(ageMs, TOUCHDOWN_MS, SHARDS_END_MS);
  const shardsOpacity =
    shardsProgress < 0 ? 0 : Math.pow(1 - shardsProgress, 1.5) * shardCfg.IMPACT_SHARDS_PEAK_OPACITY;
  if (applyPhaseOpacity(refs.impactShardsMesh, shardsOpacity) && refs.impactShardsMesh) {
    refs.impactShardsMesh.scale.setScalar(
      THREE.MathUtils.lerp(
        shardCfg.IMPACT_SHARDS_START_SCALE,
        shardCfg.IMPACT_SHARDS_END_SCALE,
        easeOutCubic(shardsProgress)
      )
    );
    refs.impactShardsMesh.rotation.z = spinSign * shardsProgress * shardCfg.IMPACT_SHARDS_SPIN_SPEED;
  }
};

const updateCelestialHalo = (
  refs: CachedChampionVfxRefs,
  ageMs: number,
  elapsedTime: number,
  spinSign: number
): void => {
  const haloProgress = getPhaseProgress(ageMs, 0, ENTRANCE_AURA.HALO_END_MS);
  const bloom = haloProgress < 0 ? 0 : Math.sin(Math.min(1, haloProgress * 2) * Math.PI * 0.5);
  const fade = haloProgress < 0 ? 0 : Math.pow(1 - haloProgress, ENTRANCE_AURA.HALO_FADE_POWER);
  if (!applyPhaseOpacity(refs.haloMesh, bloom * fade * ENTRANCE_AURA.HALO_PEAK_OPACITY) || !refs.haloMesh) return;

  refs.haloMesh.scale.setScalar(
    THREE.MathUtils.lerp(ENTRANCE_AURA.HALO_START_SCALE, ENTRANCE_AURA.HALO_END_SCALE, easeOutCubic(haloProgress))
  );
  refs.haloMesh.rotation.z = elapsedTime * ENTRANCE_AURA.HALO_SPIN_SPEED * spinSign;
};

const hideAllAuraMeshes = (refs: CachedChampionVfxRefs): void => {
  hideMesh(refs.runeSealMesh);
  hideMesh(refs.landingMesh);
  hideMesh(refs.landingFlashMesh);
  hideMesh(refs.impactShardsMesh);
  hideMesh(refs.haloMesh);
  hideMesh(refs.sigHaloMesh);
  refs.runeSealMesh = undefined;
  refs.landingMesh = undefined;
  refs.landingFlashMesh = undefined;
  refs.impactShardsMesh = undefined;
  refs.haloMesh = undefined;
  refs.sigHaloMesh = undefined;
};

/** Drives every entrance-aura mesh of a champion token for the current frame. */
export const updateChampionEntranceAura = (
  refs: CachedChampionVfxRefs,
  entranceAgeMs: number,
  elapsedTime: number,
  team: TeamType
): void => {
  if (entranceAgeMs < 0 || entranceAgeMs >= ENTRANCE_AURA.TOTAL_MS) {
    hideAllAuraMeshes(refs);
    return;
  }

  const spinSign = team === TEAM_KEY.BLG ? 1 : -1;
  updateRuneSeal(refs, entranceAgeMs, spinSign);
  updateLandingImpact(refs, entranceAgeMs, spinSign);
  updateCelestialHalo(refs, entranceAgeMs, elapsedTime, spinSign);
};
