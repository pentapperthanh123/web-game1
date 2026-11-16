import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../../constants/bossSkillVfx';
import {
  ADDITIVE_DOUBLE_SIDED_PROPS,
  ADDITIVE_MATERIAL_PROPS,
  BOSS_3D_ANCHORS,
  computeProgress,
  easeOutBack,
  easeOutExpo,
  envelope,
  fadeOut,
  getSoftGlowTexture,
  getSoftRingTexture,
  opacityLayer,
  phaseProgress,
  setMaterialOpacity,
} from '../bossSkill3DShared';
import { GlowSprite } from '../VfxPrimitives3D';
import { MAELSTROM_BURST, MAELSTROM_CORE, MAELSTROM_CORE_POSITION, MAELSTROM_JETS, MAELSTROM_TIMELINE } from './maelstromConstants';

/** Normal blending: the event horizon really darkens the arena behind it. */
const DARK_MATERIAL_PROPS = { transparent: true, opacity: 0, depthWrite: false, toneMapped: false } as const;
const DARK_COLOR = '#000000';
/** Halo first, then the dark core over it, then the disk and photon ring adding light on top. */
const HALO_RENDER_ORDER = -2;
const DARK_RENDER_ORDER = -1;

const JET_RADIAL_SEGMENTS = 12;
const JET_TOP_RADIUS_RATIO = 0.35;
/** Unit-height tapered tube growing along +Y from its base. */
const SHARED_JET_GEO = new THREE.CylinderGeometry(JET_TOP_RADIUS_RATIO, 1, 1, JET_RADIAL_SEGMENTS, 1, true).translate(0, 0.5, 0);
const JET_DOWN_ROTATION: readonly [number, number, number] = [Math.PI, 0, 0];
const JET_DOWN_LENGTH = MAELSTROM_CORE_POSITION[1] - BOSS_3D_ANCHORS.GROUND_Y;
const JET_GLOW_SCALE: readonly [number, number, number] = [
  MAELSTROM_JETS.GLOW_WIDTH / MAELSTROM_JETS.CORE_WIDTH,
  1,
  MAELSTROM_JETS.GLOW_WIDTH / MAELSTROM_JETS.CORE_WIDTH,
];
const JET_HALO_SCALE: readonly [number, number, number] = [MAELSTROM_JETS.HALO_WIDTH_RATIO, 1, MAELSTROM_JETS.HALO_WIDTH_RATIO];

/** Core size: pops in, breathes, shrinks while the disk falls in, gone at the detonation. */
const resolveCoreSize = (progress: number, elapsedMs: number): number => {
  if (progress >= MAELSTROM_TIMELINE.EXPLODE_AT) return 0;
  const formed = easeOutBack(phaseProgress(progress, 0, MAELSTROM_TIMELINE.FORM_END));
  const collapse = phaseProgress(progress, MAELSTROM_TIMELINE.COLLAPSE_START, MAELSTROM_TIMELINE.EXPLODE_AT);
  const collapsedRatio = 1 - (1 - MAELSTROM_CORE.COLLAPSED_SIZE) * collapse;
  const pulse = 1 + Math.sin(elapsedMs * MAELSTROM_CORE.PULSE_RATE) * MAELSTROM_CORE.PULSE_AMPLITUDE;
  return MAELSTROM_CORE.SIZE * formed * collapsedRatio * pulse;
};

interface JetProps {
  color: string;
  secondaryColor: string;
}

const JetTube = ({ color, secondaryColor }: JetProps) => (
  <>
    <mesh geometry={SHARED_JET_GEO} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.CORE)}>
      <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
    </mesh>
    <mesh geometry={SHARED_JET_GEO} scale={JET_GLOW_SCALE} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW)}>
      <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={secondaryColor} />
    </mesh>
    <mesh geometry={SHARED_JET_GEO} scale={JET_HALO_SCALE} userData={opacityLayer(BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.HALO)}>
      <meshBasicMaterial {...ADDITIVE_DOUBLE_SIDED_PROPS} color={color} />
    </mesh>
  </>
);

interface MaelstromCoreProps {
  color: string;
  secondaryColor: string;
  size: number;
  startedAt: number;
  durationMs: number;
}

/** Event horizon, photon ring, polar jets, then the detonation flash and shock ring. */
export const MaelstromCore = ({ color, secondaryColor, size, startedAt, durationMs }: MaelstromCoreProps) => {
  const darkRef = useRef<THREE.Sprite>(null);
  const ringRef = useRef<THREE.Sprite>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const jetsRef = useRef<THREE.Group>(null);
  const upJetRef = useRef<THREE.Group>(null);
  const downJetRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Sprite>(null);
  const skyRingRef = useRef<THREE.Sprite>(null);

  useFrame(() => {
    const progress = computeProgress(startedAt, durationMs);
    const elapsedMs = progress * durationMs;
    const isAlive = progress > 0 && progress < 1;
    const coreSize = resolveCoreSize(progress, elapsedMs) * size;
    const collapse = phaseProgress(progress, MAELSTROM_TIMELINE.COLLAPSE_START, MAELSTROM_TIMELINE.EXPLODE_AT);
    const flicker = 1 + Math.sin(elapsedMs * MAELSTROM_CORE.PHOTON_FLICKER_RATE) * MAELSTROM_CORE.PHOTON_FLICKER_AMPLITUDE;
    const coreLevel = coreSize > 0 ? 1 : 0;

    if (darkRef.current) {
      darkRef.current.visible = isAlive;
      darkRef.current.scale.setScalar(coreSize);
      setMaterialOpacity(darkRef.current, coreLevel * MAELSTROM_CORE.MAX_DARKNESS);
    }
    if (ringRef.current) {
      ringRef.current.visible = isAlive;
      ringRef.current.scale.setScalar(coreSize * MAELSTROM_CORE.PHOTON_RING_RATIO * flicker);
      const ringGlow = BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY * (1 + collapse * MAELSTROM_CORE.COLLAPSE_GLOW_GAIN);
      setMaterialOpacity(ringRef.current, coreLevel * Math.min(1, ringGlow));
    }
    if (haloRef.current) {
      haloRef.current.visible = isAlive;
      haloRef.current.scale.setScalar(coreSize * MAELSTROM_CORE.HALO_RATIO);
      setMaterialOpacity(haloRef.current, coreLevel * MAELSTROM_CORE.HALO_OPACITY);
    }
    if (jetsRef.current && upJetRef.current && downJetRef.current) {
      const jetLevel = envelope(phaseProgress(progress, MAELSTROM_TIMELINE.FORM_END, MAELSTROM_TIMELINE.COLLAPSE_START), MAELSTROM_JETS.ATTACK_END, MAELSTROM_JETS.RELEASE_START);
      const width = MAELSTROM_JETS.CORE_WIDTH * size * jetLevel * (1 + Math.sin(elapsedMs * MAELSTROM_JETS.FLICKER_RATE) * MAELSTROM_JETS.FLICKER_AMPLITUDE);
      jetsRef.current.visible = jetLevel > 0;
      upJetRef.current.scale.set(width, MAELSTROM_JETS.UP_LENGTH * size * jetLevel, width);
      downJetRef.current.scale.set(width, JET_DOWN_LENGTH * jetLevel, width);
      setMaterialOpacity(jetsRef.current, jetLevel * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }
    const blast = phaseProgress(progress, MAELSTROM_TIMELINE.EXPLODE_AT, 1);
    const isBlasting = blast > 0 && blast < 1;
    if (flashRef.current) {
      const flash = phaseProgress(blast, 0, MAELSTROM_BURST.FLASH_SPAN);
      flashRef.current.visible = isBlasting && flash < 1;
      flashRef.current.scale.setScalar(MAELSTROM_BURST.FLASH_SIZE * size * easeOutExpo(flash));
      setMaterialOpacity(flashRef.current, fadeOut(flash) * BOSS_SKILL_VFX_STYLE.MAX_FLASH_OPACITY);
    }
    if (skyRingRef.current) {
      skyRingRef.current.visible = isBlasting;
      const ringSize = MAELSTROM_BURST.RING_MIN + (MAELSTROM_BURST.SKY_RING_MAX - MAELSTROM_BURST.RING_MIN) * easeOutExpo(blast);
      skyRingRef.current.scale.setScalar(ringSize * size);
      setMaterialOpacity(skyRingRef.current, fadeOut(blast) * BOSS_SKILL_VFX_STYLE.MAX_GLOW_OPACITY);
    }
  });

  return (
    <group position={MAELSTROM_CORE_POSITION}>
      <sprite ref={haloRef} renderOrder={HALO_RENDER_ORDER} visible={false}>
        <spriteMaterial {...ADDITIVE_MATERIAL_PROPS} map={getSoftGlowTexture()} color={color} />
      </sprite>
      <sprite ref={darkRef} renderOrder={DARK_RENDER_ORDER} visible={false}>
        <spriteMaterial {...DARK_MATERIAL_PROPS} map={getSoftGlowTexture()} color={DARK_COLOR} />
      </sprite>
      <sprite ref={ringRef} visible={false}>
        <spriteMaterial {...ADDITIVE_MATERIAL_PROPS} map={getSoftRingTexture()} color={secondaryColor} />
      </sprite>
      <group ref={jetsRef} visible={false}>
        <group ref={upJetRef}>
          <JetTube color={color} secondaryColor={secondaryColor} />
        </group>
        <group rotation={JET_DOWN_ROTATION}>
          <group ref={downJetRef}>
            <JetTube color={color} secondaryColor={secondaryColor} />
          </group>
        </group>
      </group>
      <GlowSprite ref={flashRef} color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
      <sprite ref={skyRingRef} visible={false}>
        <spriteMaterial {...ADDITIVE_MATERIAL_PROPS} map={getSoftRingTexture()} color={secondaryColor} />
      </sprite>
    </group>
  );
};
