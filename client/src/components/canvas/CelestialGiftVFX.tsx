import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';

export const CelestialGiftVFX = () => {
  const activeGiftBanner = useGameStore((state) => state.activeGiftBanner);
  const containerRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const novaRingRef1 = useRef<THREE.Mesh>(null);
  const novaRingRef2 = useRef<THREE.Mesh>(null);
  const coreOrbRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!containerRef.current) return;

    if (!activeGiftBanner) {
      containerRef.current.visible = false;
      return;
    }

    const elapsed = Date.now() - activeGiftBanner.timestamp;
    const duration = 3200;

    if (elapsed > duration) {
      containerRef.current.visible = false;
      return;
    }

    containerRef.current.visible = true;
    const progress = Math.min(1.0, elapsed / duration);

    // Impact timing: 0 to 0.25 is descent, 0.25 to 1.0 is detonation
    if (progress < 0.25) {
      const dropProgress = progress / 0.25;
      const currentY = THREE.MathUtils.lerp(18, 0.4, dropProgress);
      if (coreOrbRef.current) {
        coreOrbRef.current.position.set(0, currentY, 0);
        coreOrbRef.current.scale.setScalar(1.2 + dropProgress * 0.8);
      }
      if (beamRef.current) {
        beamRef.current.visible = true;
        beamRef.current.scale.set(0.6 + dropProgress * 0.8, 1, 0.6 + dropProgress * 0.8);
      }
      if (novaRingRef1.current) novaRingRef1.current.visible = false;
      if (novaRingRef2.current) novaRingRef2.current.visible = false;
    } else {
      // Detonation phase
      const boomProgress = (progress - 0.25) / 0.75;

      if (coreOrbRef.current) {
        coreOrbRef.current.position.set(0, 0.4, 0);
        const orbScale = Math.max(0, (1 - boomProgress) * 3.5);
        coreOrbRef.current.scale.setScalar(orbScale);
      }

      if (beamRef.current) {
        const beamMat = beamRef.current.material as THREE.MeshBasicMaterial;
        if (beamMat) {
          beamMat.opacity = Math.max(0, (1 - boomProgress) * 0.85);
        }
      }

      // Expanding dual nova shockwaves
      if (novaRingRef1.current && novaRingRef2.current) {
        novaRingRef1.current.visible = true;
        novaRingRef2.current.visible = true;

        const ringScale1 = 1 + boomProgress * 8.5;
        const ringScale2 = 1 + boomProgress * 6.2;
        novaRingRef1.current.scale.set(ringScale1, ringScale1, 1);
        novaRingRef2.current.scale.set(ringScale2, ringScale2, 1);

        const mat1 = novaRingRef1.current.material as THREE.MeshBasicMaterial;
        const mat2 = novaRingRef2.current.material as THREE.MeshBasicMaterial;
        if (mat1) mat1.opacity = Math.max(0, (1 - boomProgress) * 0.9);
        if (mat2) mat2.opacity = Math.max(0, (1 - boomProgress) * 0.8);
      }
    }
  });

  if (!activeGiftBanner) return null;

  const isBLG = activeGiftBanner.team === TEAM_KEY.BLG;
  const themeColor = isBLG ? '#00f2fe' : '#ffa751';

  return (
    <group ref={containerRef} position={[0, -0.6, 0]}>
      {/* 1. Celestial Core Orb (Blazing Hot Sun / Dragon Core) */}
      <mesh ref={coreOrbRef} position={[0, 18, 0]}>
        <sphereGeometry args={[0.9, 24, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          toneMapped={false}
        />
      </mesh>

      {/* 2. Super High-Energy Pillar of Light */}
      <mesh ref={beamRef} position={[0, 9, 0]}>
        <cylinderGeometry args={[0.5, 0.85, 20, 20]} />
        <meshBasicMaterial
          color={themeColor}
          transparent
          opacity={0.8}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Expanding Ground Nova Shockwave 1 */}
      <mesh
        ref={novaRingRef1}
        position={[0, 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.6, 1.2, 36]} />
        <meshBasicMaterial
          color={themeColor}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Expanding Ground Nova Shockwave 2 */}
      <mesh
        ref={novaRingRef2}
        position={[0, 0.22, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.9, 1.5, 36]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Impact Point Dynamic Omni Light */}
      <pointLight position={[0, 1.5, 0]} intensity={8.0} color={themeColor} distance={12} />
    </group>
  );
};
