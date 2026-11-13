import * as THREE from 'three';
import {
  SHARED_CELESTIAL_AURA_GEO,
  SHARED_LANDING_FLASH_GEO,
  SHARED_LANDING_RING_GEO,
  SHARED_LIGHT_BEAM_CORE_GEO,
  SHARED_LIGHT_BEAM_GEO,
  SHARED_RUNE_SEAL_GEO,
} from './summonShared';

const AURA_CORE_COLOR = '#ffffff';
const SKY_BEAM_POSITION: [number, number, number] = [0, 0.75, 0];
const HALO_POSITION: [number, number, number] = [0, 0, -0.015];
const RUNE_SEAL_POSITION: [number, number, number] = [0, 0, 0.025];
const LANDING_FLASH_POSITION: [number, number, number] = [0, 0, -0.01];
const LANDING_RING_POSITION: [number, number, number] = [0, -0.25, 0];
const LANDING_RING_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

interface AuraMaterialProps {
  color: string;
}

/** Additive, depth-less glow material shared by every entrance-aura layer (opacity driven per frame). */
const AuraMaterial = ({ color }: AuraMaterialProps) => (
  <meshBasicMaterial
    color={color}
    transparent
    opacity={0}
    blending={THREE.AdditiveBlending}
    depthWrite={false}
    toneMapped={false}
    side={THREE.DoubleSide}
  />
);

interface ChampionEntranceAuraMeshesProps {
  auraColor: string;
  accentColor: string;
}

/**
 * Meshes animated by `updateChampionEntranceAura`. They start hidden and are only
 * shown during the entrance window, so idle champions cost no extra draw calls.
 */
export const ChampionEntranceAuraMeshes = ({ auraColor, accentColor }: ChampionEntranceAuraMeshesProps) => (
  <>
    <mesh name="celestial-halo" visible={false} position={HALO_POSITION} geometry={SHARED_CELESTIAL_AURA_GEO}>
      <AuraMaterial color={accentColor} />
    </mesh>
    <mesh name="sky-beam" visible={false} position={SKY_BEAM_POSITION} geometry={SHARED_LIGHT_BEAM_GEO}>
      <AuraMaterial color={auraColor} />
    </mesh>
    <mesh name="sky-beam-core" visible={false} position={SKY_BEAM_POSITION} geometry={SHARED_LIGHT_BEAM_CORE_GEO}>
      <AuraMaterial color={AURA_CORE_COLOR} />
    </mesh>
    <mesh name="rune-seal" visible={false} position={RUNE_SEAL_POSITION} geometry={SHARED_RUNE_SEAL_GEO}>
      <AuraMaterial color={accentColor} />
    </mesh>
    <mesh name="landing-flash" visible={false} position={LANDING_FLASH_POSITION} geometry={SHARED_LANDING_FLASH_GEO}>
      <AuraMaterial color={AURA_CORE_COLOR} />
    </mesh>
    <mesh
      name="landing-ring"
      visible={false}
      position={LANDING_RING_POSITION}
      rotation={LANDING_RING_ROTATION}
      geometry={SHARED_LANDING_RING_GEO}
    >
      <AuraMaterial color={auraColor} />
    </mesh>
  </>
);
