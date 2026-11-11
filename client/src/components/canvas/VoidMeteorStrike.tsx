import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';

export const VoidMeteorStrike = () => {
  const activeGiftBanner = useGameStore((state) => state.activeGiftBanner);
  const beamGroupRef = useRef<THREE.Group>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const coreBeamRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!beamGroupRef.current || !shockwaveRef.current || !coreBeamRef.current) return;

    if (!activeGiftBanner) {
      beamGroupRef.current.visible = false;
      return;
    }

    const elapsed = Date.now() - activeGiftBanner.timestamp;
    const duration = 2200;

    if (elapsed > duration) {
      beamGroupRef.current.visible = false;
      return;
    }

    beamGroupRef.current.visible = true;
    const progress = elapsed / duration;

    // Shockwave expands outwards along ground
    const waveScale = 1.0 + progress * 6.5;
    shockwaveRef.current.scale.set(waveScale, waveScale, waveScale);
    const waveMat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
    if (waveMat) {
      waveMat.opacity = Math.max(0, (1 - progress) * 0.85);
    }

    // Core beam fades out towards the end
    const beamMat = coreBeamRef.current.material as THREE.MeshBasicMaterial;
    if (beamMat) {
      beamMat.opacity = Math.max(0, (1 - progress * 1.2) * 0.95);
    }
  });

  if (!activeGiftBanner) return null;

  const isBLG = activeGiftBanner.team === TEAM_KEY.BLG;
  const strikeColor = isBLG ? '#06b6d4' : '#eab308';
  const coreColor = '#ffffff';

  return (
    <group ref={beamGroupRef} position={[0, 0, 0]}>
      {/* 1. Super Giant Core Light Beam */}
      <mesh ref={coreBeamRef} position={[0, 6, 0]}>
        <cylinderGeometry args={[0.45, 0.65, 14, 16]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* 2. Outer Energy Sheath */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.9, 1.2, 14, 16]} />
        <meshBasicMaterial
          color={strikeColor}
          transparent
          opacity={0.5}
          wireframe
        />
      </mesh>

      {/* 3. Expanding Ground Shockwave Ring */}
      <mesh
        ref={shockwaveRef}
        position={[0, -0.6, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.8, 1.4, 32]} />
        <meshBasicMaterial
          color={strikeColor}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
