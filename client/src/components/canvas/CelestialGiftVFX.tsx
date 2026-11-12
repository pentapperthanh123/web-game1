import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';

const GIFT_VFX_DURATION_MS = 3200;
const LEFT_THEME_COLOR = '#00f2fe';
const RIGHT_THEME_COLOR = '#ffa751';
const GIFT_LIGHT_INTENSITY = 8.0;

export const CelestialGiftVFX = () => {
  const containerRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const novaRingRef1 = useRef<THREE.Mesh>(null);
  const novaRingRef2 = useRef<THREE.Mesh>(null);
  const coreOrbRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const lastBannerIdRef = useRef<string | null>(null);

  useFrame(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeGiftBanner = useGameStore.getState().activeGiftBanner;
    if (!activeGiftBanner) {
      if (container.visible) {
        container.visible = false;
        if (lightRef.current) lightRef.current.intensity = 0;
      }
      return;
    }

    const elapsed = Date.now() - activeGiftBanner.timestamp;
    if (elapsed > GIFT_VFX_DURATION_MS) {
      if (container.visible) {
        container.visible = false;
        if (lightRef.current) lightRef.current.intensity = 0;
      }
      return;
    }

    if (lastBannerIdRef.current !== activeGiftBanner.id) {
      lastBannerIdRef.current = activeGiftBanner.id;
      const themeColor = activeGiftBanner.team === TEAM_KEY.BLG ? LEFT_THEME_COLOR : RIGHT_THEME_COLOR;
      if (beamRef.current?.material instanceof THREE.MeshBasicMaterial) {
        beamRef.current.material.color.set(themeColor);
      }
      if (novaRingRef1.current?.material instanceof THREE.MeshBasicMaterial) {
        novaRingRef1.current.material.color.set(themeColor);
      }
      if (lightRef.current) {
        lightRef.current.color.set(themeColor);
      }
    }

    container.visible = true;
    const progress = Math.min(1.0, elapsed / GIFT_VFX_DURATION_MS);

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
        if (beamRef.current.material instanceof THREE.MeshBasicMaterial) {
          beamRef.current.material.opacity = 0.8;
        }
      }
      if (novaRingRef1.current) novaRingRef1.current.visible = false;
      if (novaRingRef2.current) novaRingRef2.current.visible = false;
      if (lightRef.current) lightRef.current.intensity = GIFT_LIGHT_INTENSITY * dropProgress;
      return;
    }

    const boomProgress = (progress - 0.25) / 0.75;
    if (coreOrbRef.current) {
      coreOrbRef.current.position.set(0, 0.4, 0);
      coreOrbRef.current.scale.setScalar(Math.max(0, (1 - boomProgress) * 3.5));
    }

    if (beamRef.current?.material instanceof THREE.MeshBasicMaterial) {
      beamRef.current.material.opacity = Math.max(0, (1 - boomProgress) * 0.85);
    }

    if (novaRingRef1.current && novaRingRef2.current) {
      novaRingRef1.current.visible = true;
      novaRingRef2.current.visible = true;
      novaRingRef1.current.scale.set(1 + boomProgress * 8.5, 1 + boomProgress * 8.5, 1);
      novaRingRef2.current.scale.set(1 + boomProgress * 6.2, 1 + boomProgress * 6.2, 1);

      if (novaRingRef1.current.material instanceof THREE.MeshBasicMaterial) {
        novaRingRef1.current.material.opacity = Math.max(0, (1 - boomProgress) * 0.9);
      }
      if (novaRingRef2.current.material instanceof THREE.MeshBasicMaterial) {
        novaRingRef2.current.material.opacity = Math.max(0, (1 - boomProgress) * 0.8);
      }
    }

    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, (1 - boomProgress) * GIFT_LIGHT_INTENSITY);
    }
  });

  // Always kept mounted (toggled via visible / intensity=0) so WebGL never recompiles shaders on gift burst
  return (
    <group ref={containerRef} position={[0, -0.6, 0]} visible={false}>
      <mesh ref={coreOrbRef} position={[0, 18, 0]}>
        <sphereGeometry args={[0.9, 20, 20]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      <mesh ref={beamRef} position={[0, 9, 0]}>
        <cylinderGeometry args={[0.5, 0.85, 20, 16]} />
        <meshBasicMaterial color={LEFT_THEME_COLOR} transparent opacity={0.8} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={novaRingRef1} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 1.2, 32]} />
        <meshBasicMaterial color={LEFT_THEME_COLOR} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={novaRingRef2} position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.5, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      <pointLight ref={lightRef} position={[0, 1.5, 0]} intensity={0} color={LEFT_THEME_COLOR} distance={12} />
    </group>
  );
};
