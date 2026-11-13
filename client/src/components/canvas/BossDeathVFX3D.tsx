import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { getTeamTheme } from '../../constants/teams';
import {
  BOSS_DEFEAT_CONSTANTS,
  BOSS_STATUS,
  getThemeConfig,
  TEAM_KEY,
  TeamType,
} from '../../constants/game';

interface ShardKinematics {
  dirX: number;
  dirY: number;
  dirZ: number;
  speed: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  colorIndex: number;
}

interface SoulOrbKinematics {
  startAngle: number;
  arcHeight: number;
  arcDepth: number;
  delayRatio: number;
  scale: number;
}

const ORIGIN_Y = 0.35;
const ORIGIN_Z = 0.3;
const SHARD_GRAVITY = 4.8;
const PILLAR_EXTRA_HOLD_MS = 250;
const CRYSTAL_SHARD_GEO = new THREE.OctahedronGeometry(0.32, 0);
const SOUL_ORB_GEO = new THREE.IcosahedronGeometry(0.20, 1);

const createDeterministicNoise = (seed: number): number => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const buildShardData = (count: number): ShardKinematics[] => {
  const shards: ShardKinematics[] = [];
  for (let i = 0; i < count; i++) {
    const theta = createDeterministicNoise(i * 3 + 1) * Math.PI * 2;
    const phi = Math.acos(2 * createDeterministicNoise(i * 3 + 2) - 1);
    const speed = 3.6 + createDeterministicNoise(i * 3 + 3) * 5.2;

    shards.push({
      dirX: Math.sin(phi) * Math.cos(theta),
      dirY: Math.sin(phi) * Math.sin(theta) * 0.85 + 0.38,
      dirZ: Math.cos(phi) * 0.75,
      speed,
      spinX: (createDeterministicNoise(i + 40) - 0.5) * 14,
      spinY: (createDeterministicNoise(i + 80) - 0.5) * 14,
      spinZ: (createDeterministicNoise(i + 120) - 0.5) * 14,
      scaleX: 0.55 + createDeterministicNoise(i + 160) * 0.65,
      scaleY: 1.4 + createDeterministicNoise(i + 200) * 1.35,
      scaleZ: 0.35 + createDeterministicNoise(i + 240) * 0.45,
      colorIndex: i % 3,
    });
  }
  return shards;
};

const buildSoulOrbData = (count: number): SoulOrbKinematics[] => {
  const orbs: SoulOrbKinematics[] = [];
  for (let i = 0; i < count; i++) {
    orbs.push({
      startAngle: (i / count) * Math.PI * 2,
      arcHeight: 0.6 + createDeterministicNoise(i + 300) * 2.2,
      arcDepth: (createDeterministicNoise(i + 340) - 0.5) * 1.8,
      delayRatio: 0.34 + (i / count) * 0.24,
      scale: 0.7 + createDeterministicNoise(i + 380) * 0.65,
    });
  }
  return orbs;
};

export const BossDeathVFX3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  const coreSphereRef = useRef<THREE.Mesh>(null);
  const ringPrimaryRef = useRef<THREE.Mesh>(null);
  const ringSecondaryRef = useRef<THREE.Mesh>(null);
  const groundFissureRef = useRef<THREE.Mesh>(null);
  const skyPillarRef = useRef<THREE.Mesh>(null);
  const skyBeamCoreRef = useRef<THREE.Mesh>(null);
  const shardsMeshRef = useRef<THREE.InstancedMesh>(null);
  const soulOrbsMeshRef = useRef<THREE.InstancedMesh>(null);

  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  const shardKinematics = useMemo(
    () => buildShardData(BOSS_DEFEAT_CONSTANTS.SHARD_COUNT),
    []
  );
  const soulOrbKinematics = useMemo(
    () => buildSoulOrbData(BOSS_DEFEAT_CONSTANTS.SOUL_STREAM_COUNT),
    []
  );

  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossHp = useGameStore((state) => state.bossHp);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const gameTheme = useGameStore((state) => state.gameTheme);

  const rawIsDefeated =
    bossStatus === BOSS_STATUS.DEFEATED || bossHp <= 0 || isRoundIntermission || roundWinner !== null;

  const localDefeatTimestampRef = useRef<number>(0);

  useEffect(() => {
    if (rawIsDefeated && localDefeatTimestampRef.current === 0) {
      localDefeatTimestampRef.current = bossDefeatedTimestamp > 0 ? bossDefeatedTimestamp : Date.now();
    } else if (!rawIsDefeated) {
      localDefeatTimestampRef.current = 0;
    }
  }, [rawIsDefeated, bossDefeatedTimestamp]);

  const activeTimestamp = bossDefeatedTimestamp > 0 ? bossDefeatedTimestamp : localDefeatTimestampRef.current;
  const isDefeated = rawIsDefeated && activeTimestamp > 0;
  const themeConfig = getThemeConfig(gameTheme);
  const winningTeam: TeamType = (finisherTeam || roundWinner || TEAM_KEY.BLG) as TeamType;
  const bossColor = themeConfig.colors.primaryHex;
  const secondaryColor = themeConfig.colors.secondaryHex;
  const winningProfile = useGameStore((state) => state.activeTeams[winningTeam]);
  const teamColor = getTeamTheme(winningProfile?.colorTheme).primaryHex;

  useEffect(() => {
    const shardsMesh = shardsMeshRef.current;
    if (!shardsMesh || !isDefeated) return;

    const palette = [
      new THREE.Color(bossColor),
      new THREE.Color(teamColor),
      new THREE.Color('#ffffff'),
    ];
    for (let i = 0; i < shardKinematics.length; i++) {
      shardsMesh.setColorAt(i, palette[shardKinematics[i].colorIndex]);
    }
    if (shardsMesh.instanceColor) {
      shardsMesh.instanceColor.needsUpdate = true;
    }
  }, [isDefeated, bossColor, teamColor, shardKinematics]);

  useFrame(() => {
    if (!groupRef.current) return;

    if (!isDefeated || activeTimestamp <= 0) {
      groupRef.current.visible = false;
      return;
    }

    const elapsedMs = Date.now() - activeTimestamp;
    const totalMs = BOSS_DEFEAT_CONSTANTS.VICTORY_DELAY_MS + PILLAR_EXTRA_HOLD_MS;

    if (elapsedMs < 0 || elapsedMs > totalMs) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    const progress = Math.min(1, elapsedMs / totalMs);
    const crackEnd = BOSS_DEFEAT_CONSTANTS.CRACK_PHASE_END_RATIO;

    // Beat 1 & 2: Imploding Core -> Supernova Expansion
    if (coreSphereRef.current) {
      const coreScale =
        progress < crackEnd
          ? THREE.MathUtils.lerp(0.6, 0.2, progress / crackEnd)
          : THREE.MathUtils.lerp(0.2, 1.2, Math.min(1, (progress - crackEnd) / 0.25));
      coreSphereRef.current.scale.setScalar(coreScale);
      const mat = coreSphereRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity =
        progress < crackEnd
          ? 0.7
          : Math.max(0, 0.75 * (1 - (progress - crackEnd) / 0.25));
    }

    // Beat 2: Sky Execution Lightning Pillar & Core Beam
    const pillarProgress =
      progress < crackEnd
        ? 0
        : Math.min(1, (progress - crackEnd) / 0.52);
    const pillarFade =
      pillarProgress > 0 && pillarProgress < 1
        ? Math.sin(pillarProgress * Math.PI)
        : 0;

    if (skyPillarRef.current) {
      skyPillarRef.current.visible = pillarFade > 0.01;
      skyPillarRef.current.scale.set(
        1.0 - pillarProgress * 0.35,
        1,
        1.0 - pillarProgress * 0.35
      );
      (skyPillarRef.current.material as THREE.MeshBasicMaterial).opacity = pillarFade * 0.42;
    }

    if (skyBeamCoreRef.current) {
      skyBeamCoreRef.current.visible = pillarFade > 0.01;
      skyBeamCoreRef.current.scale.set(
        1.0 - pillarProgress * 0.4,
        1,
        1.0 - pillarProgress * 0.4
      );
      (skyBeamCoreRef.current.material as THREE.MeshBasicMaterial).opacity = pillarFade * 0.65;
    }

    // Multi-angle 3D Shockwave Rings
    const blastProgress = Math.max(0, (progress - crackEnd * 0.7) / (1 - crackEnd * 0.7));
    if (ringPrimaryRef.current) {
      const ease = 1 - Math.pow(1 - Math.min(1, blastProgress * 1.25), 3);
      ringPrimaryRef.current.scale.setScalar(0.45 + ease * 8.2);
      ringPrimaryRef.current.rotation.z += 0.05;
      (ringPrimaryRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        1 - blastProgress * 1.2
      );
    }

    if (ringSecondaryRef.current) {
      const delayed = Math.max(0, blastProgress - 0.1) / 0.9;
      const ease = 1 - Math.pow(1 - Math.min(1, delayed * 1.2), 3);
      ringSecondaryRef.current.scale.setScalar(0.4 + ease * 7.2);
      ringSecondaryRef.current.rotation.z -= 0.06;
      (ringSecondaryRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        1 - delayed * 1.15
      );
    }

    if (groundFissureRef.current) {
      const ease = 1 - Math.pow(1 - Math.min(1, blastProgress), 2);
      groundFissureRef.current.scale.setScalar(0.6 + ease * 6.5);
      (groundFissureRef.current.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0, (1 - blastProgress) * 0.85);
    }

    // 38 Shattered Crystal Shards exploding radially in 3D space
    if (shardsMeshRef.current) {
      const burstElapsedS = Math.max(0, (progress - crackEnd * 0.85) * (totalMs / 1000));
      const shardFade =
        progress < crackEnd * 0.85
          ? 0
          : Math.max(0, 1 - (progress - crackEnd * 0.85) / 0.72);

      for (let i = 0; i < shardKinematics.length; i++) {
        const shard = shardKinematics[i];
        if (shardFade <= 0.01) {
          dummyObj.scale.setScalar(0);
          dummyObj.updateMatrix();
          shardsMeshRef.current.setMatrixAt(i, dummyObj.matrix);
          continue;
        }

        const drag = 1 - Math.min(0.45, burstElapsedS * 0.28);
        const px = shard.dirX * shard.speed * burstElapsedS * drag;
        const py =
          shard.dirY * shard.speed * burstElapsedS * drag -
          0.5 * SHARD_GRAVITY * burstElapsedS * burstElapsedS;
        const pz = shard.dirZ * shard.speed * burstElapsedS * drag;

        dummyObj.position.set(px, py, pz);
        dummyObj.rotation.set(
          shard.spinX * burstElapsedS,
          shard.spinY * burstElapsedS,
          shard.spinZ * burstElapsedS
        );
        const s = Math.max(0.01, shardFade);
        dummyObj.scale.set(shard.scaleX * s, shard.scaleY * s, shard.scaleZ * s);
        dummyObj.updateMatrix();
        shardsMeshRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      shardsMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Beat 3: Buff Soul Stream curving toward Winning Team's side
    if (soulOrbsMeshRef.current) {
      const targetX =
        winningTeam === TEAM_KEY.BLG
          ? BOSS_DEFEAT_CONSTANTS.BLG_STREAM_TARGET_X
          : BOSS_DEFEAT_CONSTANTS.GENG_STREAM_TARGET_X;

      for (let i = 0; i < soulOrbKinematics.length; i++) {
        const orb = soulOrbKinematics[i];
        const t = Math.min(1, Math.max(0, (progress - orb.delayRatio) / 0.42));

        if (t <= 0 || t >= 1) {
          dummyObj.scale.setScalar(0);
          dummyObj.updateMatrix();
          soulOrbsMeshRef.current.setMatrixAt(i, dummyObj.matrix);
          continue;
        }

        const inv = 1 - t;
        const startX = Math.cos(orb.startAngle) * 0.55;
        const startY = Math.sin(orb.startAngle) * 0.4;
        const ctrlX = targetX * 0.45 + Math.cos(orb.startAngle) * 0.9;
        const ctrlY = orb.arcHeight;
        const endY = 1.1 + (i % 3) * 0.4;

        const bx = inv * inv * startX + 2 * inv * t * ctrlX + t * t * targetX;
        const by = inv * inv * startY + 2 * inv * t * ctrlY + t * t * endY;
        const bz = 2 * inv * t * orb.arcDepth;

        const orbPulse = Math.sin(t * Math.PI) * orb.scale * 1.25;
        dummyObj.position.set(bx, by, bz);
        dummyObj.rotation.set(t * 6, t * 8, 0);
        dummyObj.scale.setScalar(Math.max(0.01, orbPulse));
        dummyObj.updateMatrix();
        soulOrbsMeshRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      soulOrbsMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  if (!isDefeated) return null;

  return (
    <group ref={groupRef} position={[0, ORIGIN_Y, ORIGIN_Z]}>
      {/* Core Supernova Flash Sphere */}
      <mesh ref={coreSphereRef}>
        <sphereGeometry args={[0.35, 20, 20]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.98}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Execution Sky Pillar (Outer Team Color + Inner White Beam) */}
      <mesh ref={skyPillarRef} position={[0, 4.2, 0]}>
        <cylinderGeometry args={[0.12, 0.28, 11.2, 24, 1, true]} />
        <meshBasicMaterial
          color={teamColor}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={skyBeamCoreRef} position={[0, 4.2, 0]}>
        <cylinderGeometry args={[0.05, 0.12, 11.2, 16, 1, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.98}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Angled 3D Shockwave Rings */}
      <mesh ref={ringPrimaryRef} rotation={[-Math.PI / 2.6, 0.22, 0]}>
        <ringGeometry args={[0.62, 1.18, 40]} />
        <meshBasicMaterial
          color={bossColor}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={ringSecondaryRef} rotation={[-Math.PI / 2.1, -0.28, 0]}>
        <ringGeometry args={[0.72, 1.24, 40]} />
        <meshBasicMaterial
          color={teamColor}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={groundFissureRef} position={[0, -1.25, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 1.3, 32]} />
        <meshBasicMaterial
          color={secondaryColor}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 38 Shattered Crystal Shards (Instanced) */}
      <instancedMesh
        ref={shardsMeshRef}
        args={[CRYSTAL_SHARD_GEO, undefined, BOSS_DEFEAT_CONSTANTS.SHARD_COUNT]}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* 14 Buff Soul Orbs Streaming to Winning Team (Instanced) */}
      <instancedMesh
        ref={soulOrbsMeshRef}
        args={[SOUL_ORB_GEO, undefined, BOSS_DEFEAT_CONSTANTS.SOUL_STREAM_COUNT]}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color={teamColor}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
};
