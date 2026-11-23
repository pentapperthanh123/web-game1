import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';

const STRIKE_DURATION_MS = 2200;
const LEFT_STRIKE_COLOR = '#06b6d4';
const RIGHT_STRIKE_COLOR = '#eab308';

export const VoidMeteorStrike = () => {
  const beamGroupRef = useRef<THREE.Group>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const coreBeamRef = useRef<THREE.Mesh>(null);
  const sheathRef = useRef<THREE.Mesh>(null);
  const lastBannerIdRef = useRef<string | null>(null);

  useFrame(() => {
    const beamGroup = beamGroupRef.current;
    if (!beamGroup || !shockwaveRef.current || !coreBeamRef.current) return;

    const activeGiftBanner = useGameStore.getState().activeGiftBanner;
    if (!activeGiftBanner) {
      if (beamGroup.visible) beamGroup.visible = false;
      return;
    }

    const elapsed = Date.now() - activeGiftBanner.timestamp;
    if (elapsed > STRIKE_DURATION_MS) {
      if (beamGroup.visible) beamGroup.visible = false;
      return;
    }

    if (lastBannerIdRef.current !== activeGiftBanner.id) {
      lastBannerIdRef.current = activeGiftBanner.id;
      const strikeColor = activeGiftBanner.team === TEAM_KEY.BLG ? LEFT_STRIKE_COLOR : RIGHT_STRIKE_COLOR;
      if (sheathRef.current?.material instanceof THREE.MeshBasicMaterial) {
        sheathRef.current.material.color.set(strikeColor);
      }
      if (shockwaveRef.current.material instanceof THREE.MeshBasicMaterial) {
        shockwaveRef.current.material.color.set(strikeColor);
      }
    }

    beamGroup.visible = true;
    const progress = elapsed / STRIKE_DURATION_MS;

    const waveScale = 1.0 + progress * 6.5;
    shockwaveRef.current.scale.set(waveScale, waveScale, waveScale);
    if (shockwaveRef.current.material instanceof THREE.MeshBasicMaterial) {
      shockwaveRef.current.material.opacity = Math.max(0, (1 - progress) * 0.85);
    }

    if (coreBeamRef.current.material instanceof THREE.MeshBasicMaterial) {
      coreBeamRef.current.material.opacity = Math.max(0, (1 - progress * 1.2) * 0.95);
    }
  });

  return (
    <group ref={beamGroupRef} position={[0, 0, 0]} visible={false}>
      <mesh ref={coreBeamRef} position={[0, 6, 0]}>
        <cylinderGeometry args={[0.45, 0.65, 14, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} toneMapped={false} />
      </mesh>

      <mesh ref={sheathRef} position={[0, 6, 0]}>
        <cylinderGeometry args={[0.9, 1.2, 14, 16]} />
        <meshBasicMaterial color={LEFT_STRIKE_COLOR} transparent opacity={0.5} wireframe />
      </mesh>

      <mesh ref={shockwaveRef} position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.4, 32]} />
        <meshBasicMaterial color={LEFT_STRIKE_COLOR} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
