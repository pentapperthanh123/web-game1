import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BACKGROUND_PERF_CONSTANTS, GIFT_TIER } from '../../../constants/game';
import { getMegaGradeConfig, resolveAnnouncementCoins } from '../../../store/giftTier';
import { BOSS_ANCHOR_ELEMENT_ID } from '../../../constants/bossSpriteAnchors';
import { resolveBossAnchorWorld } from '../bossSkill/bossSkill3DShared';
import {
  GIFT_VFX_LAYOUT,
  createGlowMaterial,
  getBeamFadeAlphaMap,
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
  BEAM_RADIUS: 0.36, MEGA_BEAM_SCALE: 1.45, CORE_RADIUS: 0.16,
  RING_MAX_BIG: 2.4, RING_MAX_MEGA: 3.2, RAY_LENGTH: 2.1, RAY_WIDTH: 0.12, RAY_SPIN: 0.55,
} as const;
/** The orb sits on the boss body: kept soft so the sprite stays readable under it. */
const OPACITY = { BEAM_OUTER: 0.16, BEAM_CORE: 0.38, RING: 0.34, CORE: 0.22, RAY: 0.14 } as const;

const BEAM_OUTER_GEO = new THREE.CylinderGeometry(SIZE.BEAM_RADIUS, SIZE.BEAM_RADIUS * 1.45, GIFT_VFX_LAYOUT.BEAM_HEIGHT, 20, 1, true);
const BEAM_CORE_GEO = new THREE.CylinderGeometry(SIZE.BEAM_RADIUS * 0.28, SIZE.BEAM_RADIUS * 0.4, GIFT_VFX_LAYOUT.BEAM_HEIGHT, 12, 1, true);
/** Thin band: thickness stays ~2.5% of the radius so large rings stay razor-sharp. */
const RING_GEO = new THREE.RingGeometry(0.975, 1, 96);
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
  /** MEGA grade multiplier on beam width and ring reach, refreshed once per banner. */
  const gradeScaleRef = useRef(1);
  const materials = useMemo(
    () => ({
      beamOuter: Object.assign(createGlowMaterial(GIFT_VFX_LAYOUT.CORE_WHITE), { alphaMap: getBeamFadeAlphaMap() }),
      beamCore: Object.assign(createGlowMaterial(GIFT_VFX_LAYOUT.CORE_WHITE), { alphaMap: getBeamFadeAlphaMap() }),
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
      gradeScaleRef.current = isMega ? getMegaGradeConfig(resolveAnnouncementCoins(active.banner)).beamScale : 1;
      const colors = resolveGiftTeamColors(active.banner.team);
      materials.beamOuter.color.set(isMega ? GIFT_VFX_LAYOUT.MEGA_GOLD : colors.primary);
      materials.ring.color.set(colors.secondary);
      const anchor = resolveBossAnchorWorld(BOSS_ANCHOR_ELEMENT_ID.CORE, CORE_FALLBACK);
      group.position.set(anchor[0], 0, anchor[2]);
    }

    const { progress } = active;
    const beamLevel = Math.min(phase(progress, 0, TIMELINE.BEAM_IN_END), 1 - phase(progress, TIMELINE.BEAM_IN_END, TIMELINE.BEAM_OUT_END));
    const beamWidth = (isMega ? SIZE.MEGA_BEAM_SCALE : 1) * gradeScaleRef.current * (0.6 + 0.4 * beamLevel);
    group.children[0].scale.set(beamWidth, 1, beamWidth);
    group.children[1].scale.set(beamWidth, 1, beamWidth);
    materials.beamOuter.opacity = beamLevel * OPACITY.BEAM_OUTER;
    materials.beamCore.opacity = beamLevel * OPACITY.BEAM_CORE;
    materials.core.opacity = pulseWindow(progress, 0, TIMELINE.BEAM_OUT_END) * OPACITY.CORE;

    const ringMax = (isMega ? SIZE.RING_MAX_MEGA : SIZE.RING_MAX_BIG) * gradeScaleRef.current;
    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;
      const start = TIMELINE.RING_START + index * TIMELINE.RING_STAGGER;
      ring.scale.setScalar(Math.max(0.01, easeOutCubic(phase(progress, start, start + TIMELINE.RING_SPAN)) * ringMax));
    });
    materials.ring.opacity = pulseWindow(progress, TIMELINE.RING_START, 1) * OPACITY.RING;

    const safeDelta = Math.min(BACKGROUND_PERF_CONSTANTS.MAX_FRAME_DELTA_S, delta);
    if (!raysRef.current) return;
    raysRef.current.visible = isMega;
    raysRef.current.rotation.y += safeDelta * SIZE.RAY_SPIN;
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
