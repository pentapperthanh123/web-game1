import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, BOSS_STATUS } from '../../constants/game';

interface AatroxDarkinBossProps {
  modelPath?: string;
}

export const AatroxDarkinBoss = ({ modelPath = '/models/aatrox_boss.glb' }: AatroxDarkinBossProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreLightRef = useRef<THREE.PointLight>(null);
  const { scene } = useGLTF(modelPath);

  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossHitTimestamp = useGameStore((state) => state.bossHitTimestamp);

  // Setup materials and shadows for high visual fidelity
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          child.material.roughness = 0.45;
          child.material.metalness = 0.35;
          child.material.toneMapped = false;
        }
      }
    });
  }, [scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();
    const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;
    const isRecentlyHit = Date.now() - bossHitTimestamp < GAME_CONSTANTS.BOSS.HIT_FLASH_DURATION_MS;

    // Hovering and breathing undulation
    const hoverFreq = isEnraged ? 2.4 : 1.4;
    const hoverAmp = isEnraged ? 0.16 : 0.09;
    const baseY = -1.1;

    groupRef.current.position.y = baseY + Math.sin(time * hoverFreq) * hoverAmp;

    // Face front towards the viewer
    const baseRotY = 0; // Front-facing
    groupRef.current.rotation.y = baseRotY + Math.sin(time * 0.7) * 0.12;
    groupRef.current.rotation.x = Math.sin(time * 1.1) * 0.04;

    // Hit reaction stagger (knockback & visceral shudder)
    const hitElapsed = (Date.now() - bossHitTimestamp) / 1000;
    const isHitReactionActive = hitElapsed >= 0 && hitElapsed < 0.45;

    if (isHitReactionActive) {
      const hitProgress = hitElapsed / 0.45;
      const hitDecay = Math.exp(-hitProgress * 4.5);
      const shudder = Math.sin(hitElapsed * 36.0) * hitDecay;

      groupRef.current.position.z = -0.2 - 0.45 * hitDecay;
      groupRef.current.position.x = shudder * 0.16;
      groupRef.current.rotation.z = shudder * 0.12;
      groupRef.current.rotation.x = Math.sin(time * 1.1) * 0.04 + 0.22 * hitDecay;
    } else {
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, -0.2, delta * 12);
    }

    // Dynamic core pulse light
    if (coreLightRef.current) {
      const pulse = isEnraged
        ? 3.5 + Math.sin(time * 6) * 1.5
        : 2.0 + Math.sin(time * 2.5) * 0.8;
      coreLightRef.current.intensity = isRecentlyHit ? 6.0 : pulse;
      coreLightRef.current.color.set(isRecentlyHit ? '#ff0033' : isEnraged ? '#dc2626' : '#f97316');
    }

    // Material emissive flash on hit / enrage
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (isRecentlyHit) {
          child.material.emissive.set('#ff1133');
          child.material.emissiveIntensity = 2.2;
        } else if (isEnraged) {
          child.material.emissive.set('#b91c1c');
          child.material.emissiveIntensity = 0.9 + Math.sin(time * 4) * 0.3;
        } else {
          child.material.emissive.set('#7f1d1d');
          child.material.emissiveIntensity = 0.35;
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, -1.1, -0.2]} scale={[1.35, 1.35, 1.35]}>
      {/* Front-Facing Direct Key Light on Demon Face & Greatsword */}
      <pointLight ref={coreLightRef} position={[0, 1.8, 2.2]} intensity={4.5} color="#f97316" distance={7} />
      <directionalLight position={[0, 4, 3]} intensity={2.2} color="#ffffff" />
      {/* Cyan Rim Light (BLG team side) */}
      <pointLight position={[-3.0, 1.8, 1.0]} intensity={5.0} color="#00f2fe" distance={8} />
      {/* Gold Rim Light (GEN.G team side) */}
      <pointLight position={[3.0, 1.8, 1.0]} intensity={5.0} color="#ffa751" distance={8} />
      {/* Backlight halo */}
      <pointLight position={[0, 2.5, -2.0]} intensity={4.5} color="#dc2626" distance={8} />

      {/* Runic Pentagram Glow on Floor below feet */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.8, 32]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.75, 1.85, 32]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      <primitive object={scene} />
    </group>
  );
};
