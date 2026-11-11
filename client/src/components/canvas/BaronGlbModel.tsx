import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, BOSS_STATUS } from '../../constants/game';

interface BaronGlbModelProps {
  modelPath?: string;
}

export const BaronGlbModel = ({ modelPath = '/models/baron.glb' }: BaronGlbModelProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, groupRef);

  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossHitTimestamp = useGameStore((state) => state.bossHitTimestamp);

  // Filter out any backdrop/studio helper meshes and apply Void Dragon CKTG materials
  useEffect(() => {
    scene.traverse((child) => {
      const name = child.name.toLowerCase();
      if (
        name.includes('backdrop') ||
        name.includes('cloth') ||
        name.includes('box') ||
        name.includes('helper') ||
        child instanceof THREE.Line ||
        child instanceof THREE.LineSegments
      ) {
        child.visible = false;
        return;
      }

      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = new THREE.MeshStandardMaterial({
          color: '#581c87',
          emissive: '#3b0764',
          emissiveIntensity: 0.6,
          roughness: 0.3,
          metalness: 0.65,
        });
      }
    });
  }, [scene]);

  // Play default animation if available in glb
  useEffect(() => {
    if (!actions) return;
    const actionNames = Object.keys(actions);
    if (actionNames.length > 0) {
      actions[actionNames[0]]?.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();
    const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;
    const isRecentlyHit = Date.now() - bossHitTimestamp < GAME_CONSTANTS.BOSS.HIT_FLASH_DURATION_MS;

    const undulateFreq = isEnraged ? 2.8 : 1.6;
    const undulateAmp = isEnraged ? 0.25 : 0.14;

    groupRef.current.position.y = -0.1 + Math.sin(time * undulateFreq) * undulateAmp;

    // Rotate dragon so fierce head faces front-center camera!
    const baseRotationY = Math.PI * 0.42;
    groupRef.current.rotation.y = baseRotationY + Math.sin(time * 0.8) * 0.15;
    groupRef.current.rotation.x = Math.sin(time * 1.2) * 0.05;

    const hitElapsed = (Date.now() - bossHitTimestamp) / 1000;
    const isHitReactionActive = hitElapsed >= 0 && hitElapsed < 0.45;

    if (isHitReactionActive) {
      const hitProgress = hitElapsed / 0.45;
      const hitDecay = Math.exp(-hitProgress * 4.5);
      const shudder = Math.sin(hitElapsed * 36.0) * hitDecay;

      groupRef.current.position.z = -0.3 - 0.45 * hitDecay;
      groupRef.current.position.x = shudder * 0.16;
      groupRef.current.rotation.z = shudder * 0.12;
      groupRef.current.rotation.x = Math.sin(time * 1.2) * 0.05 + 0.22 * hitDecay;
    } else {
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, -0.3, delta * 12);
    }

    // Dynamic material hit flash / enrage glow
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (isRecentlyHit) {
          child.material.color.set('#ef4444');
          child.material.emissive.set('#ff0033');
          child.material.emissiveIntensity = 2.0;
        } else if (isEnraged) {
          child.material.color.set('#991b1b');
          child.material.emissive.set('#9333ea');
          child.material.emissiveIntensity = 1.5;
        } else {
          child.material.color.set('#2e1065');
          child.material.emissive.set('#4c1d95');
          child.material.emissiveIntensity = 0.5;
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, -0.1, -0.3]} scale={[2.0, 2.0, 2.0]}>
      {/* Front-facing Key Lights to sculpt the face & scales */}
      <pointLight position={[0, 1.4, 1.8]} intensity={4.8} color="#38bdf8" distance={6} />
      <pointLight position={[0, -0.3, 2.0]} intensity={3.8} color="#fbbf24" distance={5} />
      <pointLight position={[-1.6, 0.8, 1.0]} intensity={3.0} color="#ec4899" distance={5} />
      <primitive object={scene} />
    </group>
  );
};
