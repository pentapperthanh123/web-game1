import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../../store/gameStore';
import { SQUAD_ENTRANCE_CONSTANTS } from '../../../constants/game';
import { SummonPortalEntity } from '../../../types/game';

const RING_GEO = new THREE.RingGeometry(0.94, 1, 96);
const BEAM_HEIGHT = 9;
const BEAM_GEO = new THREE.CylinderGeometry(1, 1.4, BEAM_HEIGHT, 24, 1, true);
const FLAT_ON_FLOOR: [number, number, number] = [-Math.PI / 2, 0, 0];
const BEAM_FADE_SHARE = 0.6;

interface SquadGroup {
  key: string;
  createdAt: number;
  size: number;
  centerX: number;
  centerZ: number;
  color: string;
}

/** Portals opened in the same turn by the same team, big enough to count as a squad. */
const collectSquads = (portals: readonly SummonPortalEntity[], now: number): SquadGroup[] => {
  const groups = new Map<string, SquadGroup>();
  portals.forEach((portal) => {
    if (now - portal.createdAt >= SQUAD_ENTRANCE_CONSTANTS.DURATION_MS) return;
    const key = `${portal.team}:${portal.createdAt}`;
    const group = groups.get(key) ?? { key, createdAt: portal.createdAt, size: 0, centerX: 0, centerZ: 0, color: portal.color };
    group.size += 1;
    group.centerX += portal.position[0];
    group.centerZ += portal.position[2];
    groups.set(key, group);
  });
  return [...groups.values()]
    .filter((group) => group.size >= SQUAD_ENTRANCE_CONSTANTS.MIN_SIZE)
    .slice(-SQUAD_ENTRANCE_CONSTANTS.MAX_ACTIVE)
    .map((group) => ({ ...group, centerX: group.centerX / group.size, centerZ: group.centerZ / group.size }));
};

const createGlow = (): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

/**
 * One wide team-colour pulse for a multi-champion turn: a ring expanding over the whole group plus a
 * soft beam whose width grows with the squad size. Replaces N overlapping per-champion sky beams.
 */
export const SquadEntrancePulse3D = () => {
  const slotRefs = useRef<(THREE.Group | null)[]>([]);
  const materials = useMemo(
    () => Array.from({ length: SQUAD_ENTRANCE_CONSTANTS.MAX_ACTIVE }, () => ({ ring: createGlow(), beam: createGlow() })),
    []
  );

  useFrame(() => {
    const now = Date.now();
    const squads = collectSquads(useGameStore.getState().activeSummonPortals, now);
    slotRefs.current.forEach((slot, index) => {
      if (!slot) return;
      const squad = squads[index];
      slot.visible = Boolean(squad);
      if (!squad) return;

      const progress = Math.min(1, (now - squad.createdAt) / SQUAD_ENTRANCE_CONSTANTS.DURATION_MS);
      const fade = 1 - progress;
      const beamWidth = Math.min(SQUAD_ENTRANCE_CONSTANTS.MAX_BEAM_WIDTH, squad.size * SQUAD_ENTRANCE_CONSTANTS.BEAM_WIDTH_PER_CHAMPION);
      slot.position.set(squad.centerX, SQUAD_ENTRANCE_CONSTANTS.FLOOR_Y, squad.centerZ);
      slot.children[0].scale.setScalar(Math.max(0.01, (1 - fade * fade) * SQUAD_ENTRANCE_CONSTANTS.MAX_RING_SCALE));
      slot.children[1].scale.set(beamWidth, 1, beamWidth);
      materials[index].ring.color.set(squad.color);
      materials[index].beam.color.set(squad.color);
      materials[index].ring.opacity = fade * SQUAD_ENTRANCE_CONSTANTS.PEAK_OPACITY;
      materials[index].beam.opacity = Math.max(0, 1 - progress / BEAM_FADE_SHARE) * SQUAD_ENTRANCE_CONSTANTS.BEAM_PEAK_OPACITY;
    });
  });

  return (
    <>
      {materials.map((material, index) => (
        <group
          key={index}
          ref={(group) => {
            slotRefs.current[index] = group;
          }}
          visible={false}
        >
          <mesh rotation={FLAT_ON_FLOOR} geometry={RING_GEO} material={material.ring} />
          <mesh position={[0, BEAM_HEIGHT / 2, 0]} geometry={BEAM_GEO} material={material.beam} />
        </group>
      ))}
    </>
  );
};
