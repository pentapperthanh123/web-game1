import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GIFT_TIER } from '../../../constants/game';
import { BOSS_ANCHOR_ELEMENT_ID } from '../../../constants/bossSpriteAnchors';
import { resolveBossAnchorWorld } from '../bossSkill/bossSkill3DShared';
import {
  GIFT_VFX_LAYOUT,
  createGlowMaterial,
  easeOutCubic,
  phase,
  pulseWindow,
  readActiveGiftVfx,
  resolveGiftTeamColors,
} from './giftVfxShared';

const BEAM_TIERS = [GIFT_TIER.BIG, GIFT_TIER.MEGA] as const;
const CORE_FALLBACK: readonly [number, number, number] = [0, 0.5, 0.3];
const RING_COUNT = 3;
const RAY_COUNT = 8;
const TIMELINE = { BEAM_IN_END: 0.12, BEAM_OUT_END: 0.7, RING_START: 0.1, RING_STAGGER: 0.12, RING_SPAN: 0.55, RAYS_START: 0.08, RAYS_END: 0.9 } as const;
const SIZE = {
  BEAM_RADIUS: 0.45, MEGA_BEAM_SCALE: 1.9, CORE_RADIUS: 0.2,
  RING_MAX_BIG: 3.2, RING_MAX_MEGA: 4.6, RAY_LENGTH: 3.4, RAY_WIDTH: 0.22, RAY_SPIN: 0.6,
} as const;
const OPACITY = { BEAM_OUTER: 0.22, BEAM_CORE: 0.6, RING: 0.42, CORE: 0.75, RAY: 0.18 } as const;

const BEAM_OUTER_GEO = new THREE.CylinderGeometry(SIZE.BEAM_RADIUS, SIZE.BEAM_RADIUS * 1.6, GIFT_VFX_LAYOUT.BEAM_HEIGHT, 20, 1, true);
const BEAM_CORE_GEO = new THREE.CylinderGeometry(SIZE.BEAM_RADIUS * 0.3, SIZE.BEAM_RADIUS * 0.45, GIFT_VFX_LAYOUT.BEAM_HEIGHT, 12, 1, true);
/** Thin band: thickness stays ~4% of the radius so large rings do not become solid bars. */
const RING_GEO = new THREE.RingGeometry(0.96, 1, 96);
const CORE_GEO = new THREE.SphereGeometry(SIZE.CORE_RADIUS, 16, 16);
/** Tapered ray: wide at the boss, a point at the tip, so the rays read as light, not slabs. */
const RAY_GEO = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-SIZE.RAY_WIDTH / 2, 0, 0),
  new THREE.Vector3(SIZE.RAY_WIDTH / 2, 0, 0),
  new THREE.Vector3(0, SIZE.RAY_LENGTH, 0),
]);
const FLAT_ON_FLOOR: [number, number, number] = [-Math.PI / 2, 0, 0];

/** BIG / MEGA gifts: team-colour sky beam on the boss, staggered floor rings, orb; MEGA adds gold rays. */
export const GiftSkyBeam = () => {
  const groupRef = useRef<THREE.Group>(null);
  const raysRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lastBannerIdRef = useRef<string | null>(null);
  const materials = useMemo(
    () => ({
      beamOuter: createGlowMaterial(GIFT_VFX_LAYOUT.CORE_WHITE),
      beamCore: createGlowMaterial(GIFT_VFX_LAYOUT.CORE_WHITE),
      core: createGlowMaterial(GIFT_VFX_LAYOUT.CORE_WHITE),
      ring: createGlowMaterial(GIFT_VFX_LAYOUT.CORE_WHITE),
      ray: createGlowMaterial(GIFT_VFX_LAYOUT.MEGA_GOLD),
    }),
    []
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const active = readActiveGiftVfx(BEAM_TIERS);
    group.visible = active !== null;
    if (!active) return;

    const isMega = active.banner.tier === GIFT_TIER.MEGA;
    if (lastBannerIdRef.current !== active.banner.id) {
      lastBannerIdRef.current = active.banner.id;
      const colors = resolveGiftTeamColors(active.banner.team);
      materials.beamOuter.color.set(isMega ? GIFT_VFX_LAYOUT.MEGA_GOLD : colors.primary);
      materials.ring.color.set(colors.secondary);
      const anchor = resolveBossAnchorWorld(BOSS_ANCHOR_ELEMENT_ID.CORE, CORE_FALLBACK);
      group.position.set(anchor[0], 0, anchor[2]);
    }

    const { progress } = active;
    const beamLevel = Math.min(phase(progress, 0, TIMELINE.BEAM_IN_END), 1 - phase(progress, TIMELINE.BEAM_IN_END, TIMELINE.BEAM_OUT_END));
    const beamWidth = (isMega ? SIZE.MEGA_BEAM_SCALE : 1) * (0.6 + 0.4 * beamLevel);
    group.children[0].scale.set(beamWidth, 1, beamWidth);
    group.children[1].scale.set(beamWidth, 1, beamWidth);
    materials.beamOuter.opacity = beamLevel * OPACITY.BEAM_OUTER;
    materials.beamCore.opacity = beamLevel * OPACITY.BEAM_CORE;
    materials.core.opacity = pulseWindow(progress, 0, TIMELINE.BEAM_OUT_END) * OPACITY.CORE;

    const ringMax = isMega ? SIZE.RING_MAX_MEGA : SIZE.RING_MAX_BIG;
    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;
      const start = TIMELINE.RING_START + index * TIMELINE.RING_STAGGER;
      ring.scale.setScalar(Math.max(0.01, easeOutCubic(phase(progress, start, start + TIMELINE.RING_SPAN)) * ringMax));
    });
    materials.ring.opacity = pulseWindow(progress, TIMELINE.RING_START, 1) * OPACITY.RING;

    if (!raysRef.current) return;
    raysRef.current.visible = isMega;
    raysRef.current.rotation.y += delta * SIZE.RAY_SPIN;
    materials.ray.opacity = pulseWindow(progress, TIMELINE.RAYS_START, TIMELINE.RAYS_END) * OPACITY.RAY;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh position={[0, GIFT_VFX_LAYOUT.BEAM_CENTER_Y, 0]} geometry={BEAM_OUTER_GEO} material={materials.beamOuter} />
      <mesh position={[0, GIFT_VFX_LAYOUT.BEAM_CENTER_Y, 0]} geometry={BEAM_CORE_GEO} material={materials.beamCore} />
      <mesh position={[0, GIFT_VFX_LAYOUT.FLOOR_Y + 2, 0]} geometry={CORE_GEO} material={materials.core} />
      {Array.from({ length: RING_COUNT }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            ringRefs.current[index] = mesh;
          }}
          position={[0, GIFT_VFX_LAYOUT.FLOOR_Y + 0.02 * (index + 1), 0]}
          rotation={FLAT_ON_FLOOR}
          geometry={RING_GEO}
          material={materials.ring}
        />
      ))}
      <group ref={raysRef} position={[0, GIFT_VFX_LAYOUT.FLOOR_Y + 0.05, 0]} visible={false}>
        {Array.from({ length: RAY_COUNT }, (_, index) => (
          <mesh
            key={index}
            rotation={[-Math.PI / 2, 0, (index / RAY_COUNT) * Math.PI * 2]}
            geometry={RAY_GEO}
            material={materials.ray}
          />
        ))}
      </group>
    </group>
  );
};
