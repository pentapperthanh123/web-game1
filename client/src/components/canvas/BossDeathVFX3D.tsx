import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_DEFEAT_CONSTANTS,
  BOSS_STATUS,
  COMBAT_VFX_CONSTANTS,
  GAME_THEME,
  TEAM_KEY,
} from '../../constants/game';

export const BossDeathVFX3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  const coreSphereRef = useRef<THREE.Mesh>(null);
  const ringPrimaryRef = useRef<THREE.Mesh>(null);
  const ringSecondaryRef = useRef<THREE.Mesh>(null);
  const soulPillarRef = useRef<THREE.Mesh>(null);

  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const gameTheme = useGameStore((state) => state.gameTheme);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED && bossDefeatedTimestamp > 0;

  useFrame(() => {
    if (!groupRef.current) return;

    if (!isDefeated) {
      groupRef.current.visible = false;
      return;
    }

    const elapsedMs = Date.now() - bossDefeatedTimestamp;
    const totalMs = BOSS_DEFEAT_CONSTANTS.VICTORY_DELAY_MS + 350;

    if (elapsedMs < 0 || elapsedMs > totalMs) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    const progress = Math.min(1, elapsedMs / totalMs);

    if (coreSphereRef.current) {
      const implosionScale =
        progress < 0.22
          ? THREE.MathUtils.lerp(2.2, 0.45, progress / 0.22)
          : THREE.MathUtils.lerp(0.45, 4.4, (progress - 0.22) / 0.78);
      coreSphereRef.current.scale.setScalar(implosionScale);
      const mat = coreSphereRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = progress < 0.22 ? 0.9 : Math.max(0, 1 - (progress - 0.22) / 0.65);
    }

    if (ringPrimaryRef.current) {
      const ease = 1 - Math.pow(1 - progress, 3);
      ringPrimaryRef.current.scale.setScalar(0.5 + ease * 7.5);
      ringPrimaryRef.current.rotation.z += 0.04;
      const mat = ringPrimaryRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - progress);
    }

    if (ringSecondaryRef.current) {
      const delayed = Math.max(0, progress - 0.12) / 0.88;
      const ease = 1 - Math.pow(1 - delayed, 3);
      ringSecondaryRef.current.scale.setScalar(0.4 + ease * 6.5);
      ringSecondaryRef.current.rotation.z -= 0.05;
      const mat = ringSecondaryRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - delayed);
    }

    if (soulPillarRef.current) {
      const pillarFade = progress < 0.25 ? progress / 0.25 : Math.max(0, 1 - (progress - 0.25) / 0.75);
      soulPillarRef.current.scale.set(1.2 - progress * 0.6, 1 + progress * 1.4, 1.2 - progress * 0.6);
      const mat = soulPillarRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = pillarFade * 0.75;
    }
  });

  if (!isDefeated) return null;

  const isElder = gameTheme === GAME_THEME.ELDER_DRAGON;
  const bossColor = isElder
    ? BOSS_DEFEAT_CONSTANTS.ELDER_DRAGON_DEFEAT_COLOR
    : BOSS_DEFEAT_CONSTANTS.BARON_DEFEAT_COLOR;
  const teamColor = finisherTeam
    ? COMBAT_VFX_CONSTANTS.TEAM_COLORS[finisherTeam].primary
    : COMBAT_VFX_CONSTANTS.TEAM_COLORS[TEAM_KEY.BLG].primary;

  return (
    <group ref={groupRef} position={[0, 0.35, 0.3]}>
      <mesh ref={coreSphereRef}>
        <sphereGeometry args={[0.7, 20, 20]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={ringPrimaryRef} rotation={[-Math.PI / 2.6, 0.2, 0]}>
        <ringGeometry args={[0.65, 1.15, 36]} />
        <meshBasicMaterial
          color={bossColor}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={ringSecondaryRef} rotation={[-Math.PI / 2.1, -0.25, 0]}>
        <ringGeometry args={[0.75, 1.2, 36]} />
        <meshBasicMaterial
          color={teamColor}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={soulPillarRef} position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.35, 1.05, 8.5, 18, 1, true]} />
        <meshBasicMaterial
          color={teamColor}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
