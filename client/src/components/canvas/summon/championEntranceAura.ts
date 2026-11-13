import * as THREE from 'three';
import { TEAM_KEY, TeamType } from '../../../constants/game';
import { CachedChampionVfxRefs } from './summonShared';

/**
 * Entrance aura timeline (ms since the champion was deployed):
 *  1. Sky pillar slams down (flash-in), then thins out and fades.
 *  2. A hexagonal rune seal converges onto the portrait while the token swoops in.
 *  3. On touchdown: white landing flash + ground shockwave ring.
 *  4. A soft celestial halo blooms outward for the whole entrance.
 */
export const ENTRANCE_AURA = {
  TOTAL_MS: 1400,
  BEAM_FLASH_IN_MS: 160,
  BEAM_FADE_END_MS: 1150,
  BEAM_PEAK_OPACITY: 0.5,
  BEAM_CORE_PEAK_OPACITY: 0.8,
  BEAM_START_WIDTH: 1.7,
  BEAM_END_WIDTH: 0.2,
  SEAL_END_MS: 1000,
  SEAL_CONVERGE_MS: 700,
  SEAL_START_SCALE: 2.4,
  SEAL_END_SCALE: 1.0,
  SEAL_SPIN_SPEED: 4.2,
  SEAL_PEAK_OPACITY: 0.85,
  LANDING_START_MS: 620,
  LANDING_END_MS: 1400,
  LANDING_START_SCALE: 0.5,
  LANDING_END_SCALE: 2.3,
  LANDING_PEAK_OPACITY: 0.6,
  FLASH_START_MS: 640,
  FLASH_END_MS: 980,
  FLASH_START_SCALE: 0.9,
  FLASH_END_SCALE: 1.7,
  FLASH_PEAK_OPACITY: 0.55,
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

const getBeamOpacityFactor = (ageMs: number): number => {
  if (ageMs < ENTRANCE_AURA.BEAM_FLASH_IN_MS) return ageMs / ENTRANCE_AURA.BEAM_FLASH_IN_MS;
  const fadeProgress = getPhaseProgress(ageMs, ENTRANCE_AURA.BEAM_FLASH_IN_MS, ENTRANCE_AURA.BEAM_FADE_END_MS);
  if (fadeProgress < 0) return 0;
  return 1 - easeOutCubic(fadeProgress);
};

const updateSkyBeam = (refs: CachedChampionVfxRefs, ageMs: number): void => {
  const opacityFactor = getBeamOpacityFactor(ageMs);
  const thinProgress = easeOutCubic(Math.min(1, ageMs / ENTRANCE_AURA.BEAM_FADE_END_MS));
  const width = THREE.MathUtils.lerp(ENTRANCE_AURA.BEAM_START_WIDTH, ENTRANCE_AURA.BEAM_END_WIDTH, thinProgress);

  if (applyPhaseOpacity(refs.beamMesh, opacityFactor * ENTRANCE_AURA.BEAM_PEAK_OPACITY)) {
    refs.beamMesh?.scale.set(width, 1, width);
  }
  if (applyPhaseOpacity(refs.beamCoreMesh, opacityFactor * ENTRANCE_AURA.BEAM_CORE_PEAK_OPACITY)) {
    refs.beamCoreMesh?.scale.set(width, 1, width);
  }
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

const updateLandingImpact = (refs: CachedChampionVfxRefs, ageMs: number): void => {
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
  hideMesh(refs.beamMesh);
  hideMesh(refs.beamCoreMesh);
  hideMesh(refs.runeSealMesh);
  hideMesh(refs.landingMesh);
  hideMesh(refs.landingFlashMesh);
  hideMesh(refs.haloMesh);
};

/** Drives every entrance-aura mesh of a champion token for the current frame. */
export const updateChampionEntranceAura = (
  refs: CachedChampionVfxRefs,
  entranceAgeMs: number,
  elapsedTime: number,
  team: TeamType,
  isSquadMember = false
): void => {
  if (entranceAgeMs < 0 || entranceAgeMs >= ENTRANCE_AURA.TOTAL_MS) {
    hideAllAuraMeshes(refs);
    return;
  }

  const spinSign = team === TEAM_KEY.BLG ? 1 : -1;
  // Squad members share one big pulse (SquadEntrancePulse3D), so their own sky beams stay off
  if (isSquadMember) {
    hideMesh(refs.beamMesh);
    hideMesh(refs.beamCoreMesh);
  } else {
    updateSkyBeam(refs, entranceAgeMs);
  }
  updateRuneSeal(refs, entranceAgeMs, spinSign);
  updateLandingImpact(refs, entranceAgeMs);
  updateCelestialHalo(refs, entranceAgeMs, elapsedTime, spinSign);
};
