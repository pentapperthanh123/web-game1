import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLOR_ONLY_ADDITIVE_PROPS } from './vfxBlending';
import { getBeamFadeAlphaMap, easeOutCubic } from './gift/giftVfxShared';
import { useGameStore } from '../../store/gameStore';
import { useGiftVfxStore } from '../../store/giftVfxStore';
import { getTeamTheme } from '../../constants/teams';
import {
  BOSS_DEFEAT_CONSTANTS,
  BOSS_STATUS,
  DEFEAT_SHOWCASE_TIMELINE,
  FINISHER_BANNER_CONSTANTS,
  getThemeConfig,
  isDonorFinisherCheck,
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

const WHITE_HEX = '#ffffff';
const PILLAR_TOP_RADIUS = 0.14;
const PILLAR_BOTTOM_RADIUS = 0.32;
const PILLAR_CORE_TOP_RADIUS = 0.05;
const PILLAR_CORE_BOTTOM_RADIUS = 0.12;
const PILLAR_RADIAL_SEGMENTS = 24;
const PILLAR_CORE_SEGMENTS = 16;
const SPHERE_SEGMENTS = 20;
const HALO_SEGMENTS = 48;
const MS_PER_SECOND = 1000;
const MIN_VISIBLE_ALPHA = 0.01;
const FISSURE_Y_OFFSET = -1.15;
const FISSURE_Z_OFFSET = -0.1;
const BUFF_LIGHT_DISTANCE = 4.5;
const BUFF_LIGHT_DECAY = 2;

const CRYSTAL_SHARD_GEO = new THREE.OctahedronGeometry(BOSS_DEFEAT_CONSTANTS.SHARD_RADIUS, 0);
const SOUL_ORB_GEO = new THREE.IcosahedronGeometry(BOSS_DEFEAT_CONSTANTS.SOUL_ORB_RADIUS, 1);
const CORE_SPHERE_GEO = new THREE.SphereGeometry(
  BOSS_DEFEAT_CONSTANTS.CORE_SPHERE_RADIUS,
  SPHERE_SEGMENTS,
  SPHERE_SEGMENTS
);
const PILLAR_OUTER_GEO = new THREE.CylinderGeometry(
  PILLAR_TOP_RADIUS,
  PILLAR_BOTTOM_RADIUS,
  BOSS_DEFEAT_CONSTANTS.PILLAR_HEIGHT,
  PILLAR_RADIAL_SEGMENTS,
  1,
  true
);
const PILLAR_CORE_GEO = new THREE.CylinderGeometry(
  PILLAR_CORE_TOP_RADIUS,
  PILLAR_CORE_BOTTOM_RADIUS,
  BOSS_DEFEAT_CONSTANTS.PILLAR_HEIGHT,
  PILLAR_CORE_SEGMENTS,
  1,
  true
);
const RING_PRIMARY_GEO = new THREE.RingGeometry(
  BOSS_DEFEAT_CONSTANTS.RING_PRIMARY_INNER,
  BOSS_DEFEAT_CONSTANTS.RING_PRIMARY_OUTER,
  BOSS_DEFEAT_CONSTANTS.RING_SEGMENTS
);
const RING_SECONDARY_GEO = new THREE.RingGeometry(
  BOSS_DEFEAT_CONSTANTS.RING_SECONDARY_INNER,
  BOSS_DEFEAT_CONSTANTS.RING_SECONDARY_OUTER,
  BOSS_DEFEAT_CONSTANTS.RING_SEGMENTS
);
const RING_FISSURE_GEO = new THREE.RingGeometry(
  BOSS_DEFEAT_CONSTANTS.RING_FISSURE_INNER,
  BOSS_DEFEAT_CONSTANTS.RING_FISSURE_OUTER,
  BOSS_DEFEAT_CONSTANTS.RING_SEGMENTS
);
const BUFF_ORB_CORE_GEO = new THREE.SphereGeometry(
  BOSS_DEFEAT_CONSTANTS.BUFF_ORB_RADIUS,
  SPHERE_SEGMENTS,
  SPHERE_SEGMENTS
);
const BUFF_ORB_AURA_GEO = new THREE.SphereGeometry(
  BOSS_DEFEAT_CONSTANTS.BUFF_ORB_AURA_RADIUS,
  SPHERE_SEGMENTS,
  SPHERE_SEGMENTS
);
const BUFF_ORB_HALO_GEO = new THREE.RingGeometry(
  BOSS_DEFEAT_CONSTANTS.BUFF_ORB_HALO_INNER,
  BOSS_DEFEAT_CONSTANTS.BUFF_ORB_HALO_OUTER,
  HALO_SEGMENTS
);
const BURST_RAY_GEO = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-BOSS_DEFEAT_CONSTANTS.BURST_RAY_WIDTH / 2, 0, 0),
  new THREE.Vector3(BOSS_DEFEAT_CONSTANTS.BURST_RAY_WIDTH / 2, 0, 0),
  new THREE.Vector3(0, BOSS_DEFEAT_CONSTANTS.BURST_RAY_LENGTH, 0),
]);

const createDeterministicNoise = (seed: number): number => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const buildShardData = (count: number): ShardKinematics[] => {
  const shards: ShardKinematics[] = [];
  for (let i = 0; i < count; i++) {
    const theta = createDeterministicNoise(i * 3 + 1) * Math.PI * 2;
    const phi = Math.acos(2 * createDeterministicNoise(i * 3 + 2) - 1);
    const speed = 3.2 + createDeterministicNoise(i * 3 + 3) * 4.4;

    shards.push({
      dirX: Math.sin(phi) * Math.cos(theta),
      dirY: Math.sin(phi) * Math.sin(theta) * 0.8 + 0.35,
      dirZ: Math.cos(phi) * 0.65,
      speed,
      spinX: (createDeterministicNoise(i + 40) - 0.5) * 14,
      spinY: (createDeterministicNoise(i + 80) - 0.5) * 14,
      spinZ: (createDeterministicNoise(i + 120) - 0.5) * 14,
      scaleX: 0.5 + createDeterministicNoise(i + 160) * 0.45,
      scaleY: 0.95 + createDeterministicNoise(i + 200) * 0.85,
      scaleZ: 0.5 + createDeterministicNoise(i + 240) * 0.45,
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
      arcHeight: 0.6 + createDeterministicNoise(i + 300) * 1.9,
      arcDepth: (createDeterministicNoise(i + 340) - 0.5) * 1.4,
      delayRatio: 0.28 + (i / count) * 0.28,
      scale: 0.65 + createDeterministicNoise(i + 380) * 0.5,
    });
  }
  return orbs;
};

const hideInstancedMesh = (
  mesh: THREE.InstancedMesh | null,
  count: number,
  dummyObj: THREE.Object3D
): void => {
  if (!mesh) return;
  dummyObj.scale.setScalar(0);
  dummyObj.updateMatrix();
  for (let i = 0; i < count; i++) {
    mesh.setMatrixAt(i, dummyObj.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
};

const updateShardInstances = (
  mesh: THREE.InstancedMesh | null,
  shardKinematics: readonly ShardKinematics[],
  shatterProgress: number,
  shatterDurationMs: number,
  crackEnd: number,
  dummyObj: THREE.Object3D
): void => {
  if (!mesh) return;

  const startRatio = crackEnd * 0.85;
  const burstElapsedS = Math.max(
    0,
    (shatterProgress - startRatio) * (shatterDurationMs / MS_PER_SECOND)
  );
  let shardFade = 0;
  if (shatterProgress >= startRatio) {
    shardFade = Math.max(0, 1 - (shatterProgress - startRatio) / 0.72);
  }

  for (let i = 0; i < shardKinematics.length; i++) {
    const shard = shardKinematics[i];
    if (shardFade <= MIN_VISIBLE_ALPHA) {
      dummyObj.scale.setScalar(0);
      dummyObj.updateMatrix();
      mesh.setMatrixAt(i, dummyObj.matrix);
      continue;
    }

    const drag = 1 - Math.min(0.45, burstElapsedS * 0.28);
    const px = shard.dirX * shard.speed * burstElapsedS * drag;
    const py =
      shard.dirY * shard.speed * burstElapsedS * drag -
      0.5 * BOSS_DEFEAT_CONSTANTS.SHARD_GRAVITY * burstElapsedS * burstElapsedS;
    const pz = shard.dirZ * shard.speed * burstElapsedS * drag;

    dummyObj.position.set(px, py, pz);
    dummyObj.rotation.set(
      shard.spinX * burstElapsedS,
      shard.spinY * burstElapsedS,
      shard.spinZ * burstElapsedS
    );
    const scaleFactor = Math.max(MIN_VISIBLE_ALPHA, shardFade);
    dummyObj.scale.set(
      shard.scaleX * scaleFactor,
      shard.scaleY * scaleFactor,
      shard.scaleZ * scaleFactor
    );
    dummyObj.updateMatrix();
    mesh.setMatrixAt(i, dummyObj.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
};

const updateSoulStreamInstances = (
  mesh: THREE.InstancedMesh | null,
  soulOrbKinematics: readonly SoulOrbKinematics[],
  shatterProgress: number,
  winningTeam: TeamType,
  dummyObj: THREE.Object3D
): void => {
  if (!mesh) return;

  const targetX =
    winningTeam === TEAM_KEY.BLG
      ? BOSS_DEFEAT_CONSTANTS.BLG_STREAM_TARGET_X
      : BOSS_DEFEAT_CONSTANTS.GENG_STREAM_TARGET_X;

  for (let i = 0; i < soulOrbKinematics.length; i++) {
    const orb = soulOrbKinematics[i];
    const t = Math.min(1, Math.max(0, (shatterProgress - orb.delayRatio) / 0.45));

    if (t <= 0 || t >= 1) {
      dummyObj.scale.setScalar(0);
      dummyObj.updateMatrix();
      mesh.setMatrixAt(i, dummyObj.matrix);
      continue;
    }

    const inv = 1 - t;
    const startX = Math.cos(orb.startAngle) * 0.45;
    const startY = Math.sin(orb.startAngle) * 0.35;
    const ctrlX = targetX * 0.45 + Math.cos(orb.startAngle) * 0.75;
    const ctrlY = orb.arcHeight;
    const endY = 1.0 + (i % 3) * 0.35;

    const bx = inv * inv * startX + 2 * inv * t * ctrlX + t * t * targetX;
    const by = inv * inv * startY + 2 * inv * t * ctrlY + t * t * endY;
    const bz = 2 * inv * t * orb.arcDepth;

    const orbPulse = Math.sin(t * Math.PI) * orb.scale;
    dummyObj.position.set(bx, by, bz);
    dummyObj.rotation.set(t * 6, t * 8, 0);
    dummyObj.scale.setScalar(Math.max(MIN_VISIBLE_ALPHA, orbPulse));
    dummyObj.updateMatrix();
    mesh.setMatrixAt(i, dummyObj.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
};

export const BossDeathVFX3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  const coreSphereRef = useRef<THREE.Mesh>(null);
  const exhaustionRingRef = useRef<THREE.Mesh>(null);
  const ringPrimaryRef = useRef<THREE.Mesh>(null);
  const ringSecondaryRef = useRef<THREE.Mesh>(null);
  const groundFissureRef = useRef<THREE.Mesh>(null);
  const skyPillarRef = useRef<THREE.Mesh>(null);
  const skyBeamCoreRef = useRef<THREE.Mesh>(null);
  const burstRaysGroupRef = useRef<THREE.Group>(null);
  const shardsMeshRef = useRef<THREE.InstancedMesh>(null);
  const soulOrbsMeshRef = useRef<THREE.InstancedMesh>(null);

  const buffOrbGroupRef = useRef<THREE.Group>(null);
  const buffOrbCoreRef = useRef<THREE.Mesh>(null);
  const buffOrbAuraRef = useRef<THREE.Mesh>(null);
  const buffOrbHaloRef = useRef<THREE.Mesh>(null);
  const buffLightRef = useRef<THREE.PointLight>(null);

  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  const beamAlphaMap = useMemo(() => getBeamFadeAlphaMap(), []);
  const shardKinematics = useMemo(
    () => buildShardData(BOSS_DEFEAT_CONSTANTS.SHARD_COUNT),
    []
  );
  const soulOrbKinematics = useMemo(
    () => buildSoulOrbData(BOSS_DEFEAT_CONSTANTS.SOUL_STREAM_COUNT),
    []
  );
  const burstRayMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: WHITE_HEX,
        transparent: true,
        opacity: 0,
        ...COLOR_ONLY_ADDITIVE_PROPS,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
        forceSinglePass: true,
      }),
    []
  );

  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossHp = useGameStore((state) => state.bossHp);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const finisherGiftName = useGameStore((state) => state.finisherGiftName);
  const finisherCoins = useGameStore((state) => state.finisherCoins);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const isPodiumOrbitActive = useGiftVfxStore((state) => state.isPodiumOrbitActive);

  const isDonorFinisher = isDonorFinisherCheck(finisherGiftName, finisherCoins);
  const rawIsDefeated =
    bossStatus === BOSS_STATUS.DEFEATED ||
    bossHp <= 0 ||
    isRoundIntermission ||
    roundWinner !== null;

  const localDefeatTimestampRef = useRef<number>(0);

  useEffect(() => {
    if (rawIsDefeated && localDefeatTimestampRef.current === 0) {
      localDefeatTimestampRef.current =
        bossDefeatedTimestamp > 0 ? bossDefeatedTimestamp : Date.now();
    } else if (!rawIsDefeated) {
      localDefeatTimestampRef.current = 0;
    }
  }, [rawIsDefeated, bossDefeatedTimestamp]);

  const activeTimestamp =
    bossDefeatedTimestamp > 0 ? bossDefeatedTimestamp : localDefeatTimestampRef.current;
  const isDefeated = rawIsDefeated && activeTimestamp > 0 && !isPodiumOrbitActive;
  const themeConfig = getThemeConfig(gameTheme);
  const winningTeam: TeamType = (finisherTeam || roundWinner || TEAM_KEY.BLG) as TeamType;
  const bossColor = themeConfig.colors.primaryHex;
  const secondaryColor = themeConfig.colors.secondaryHex;
  const winningProfile = useGameStore((state) => state.activeTeams[winningTeam]);
  const teamColor = getTeamTheme(winningProfile?.colorTheme).primaryHex;

  useEffect(() => {
    burstRayMaterial.color.set(teamColor);
    const shardsMesh = shardsMeshRef.current;
    if (!shardsMesh || !isDefeated) return;

    const palette = [
      new THREE.Color(bossColor),
      new THREE.Color(teamColor),
      new THREE.Color(WHITE_HEX),
    ];
    for (let i = 0; i < shardKinematics.length; i++) {
      shardsMesh.setColorAt(i, palette[shardKinematics[i].colorIndex]);
    }
    if (shardsMesh.instanceColor) {
      shardsMesh.instanceColor.needsUpdate = true;
    }
  }, [isDefeated, bossColor, teamColor, shardKinematics, burstRayMaterial]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (!isDefeated || activeTimestamp <= 0) {
      groupRef.current.visible = false;
      return;
    }

    const strikeOffsetMs = isDonorFinisher ? FINISHER_BANNER_CONSTANTS.AVATAR_STRIKE_DURATION_MS : 0;
    const elapsedMs = Date.now() - (activeTimestamp + strikeOffsetMs);
    const totalMs = DEFEAT_SHOWCASE_TIMELINE.DEATH_VFX_3D_MS;
    const exhaustionMs = BOSS_DEFEAT_CONSTANTS.EXHAUSTION_DELAY_MS;

    if (elapsedMs < 0 || elapsedMs > totalMs) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // PHASE 1: Boss Exhaustion & Core Instability (0ms -> 1500ms)
    if (elapsedMs < exhaustionMs) {
      const exhaustProgress = elapsedMs / exhaustionMs;
      const pulseFreq = 12 + exhaustProgress * 28;
      const pulseWave = 0.5 + 0.5 * Math.sin((elapsedMs / MS_PER_SECOND) * pulseFreq);

      if (coreSphereRef.current) {
        const coreScale = THREE.MathUtils.lerp(0.22, 0.58, exhaustProgress) * (0.85 + pulseWave * 0.3);
        coreSphereRef.current.scale.setScalar(coreScale);
        (coreSphereRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.25 + exhaustProgress * 0.55;
      }

      if (exhaustionRingRef.current) {
        exhaustionRingRef.current.visible = true;
        const implodeCycle = 1 - ((exhaustProgress * 3) % 1);
        exhaustionRingRef.current.scale.setScalar(0.35 + implodeCycle * 1.65);
        exhaustionRingRef.current.rotation.z += delta * 2.4;
        (exhaustionRingRef.current.material as THREE.MeshBasicMaterial).opacity =
          (1 - implodeCycle) * (0.35 + exhaustProgress * 0.45);
      }

      if (skyPillarRef.current) skyPillarRef.current.visible = false;
      if (skyBeamCoreRef.current) skyBeamCoreRef.current.visible = false;
      if (ringPrimaryRef.current) ringPrimaryRef.current.visible = false;
      if (ringSecondaryRef.current) ringSecondaryRef.current.visible = false;
      if (groundFissureRef.current) groundFissureRef.current.visible = false;
      if (burstRaysGroupRef.current) burstRaysGroupRef.current.visible = false;
      if (buffOrbGroupRef.current) buffOrbGroupRef.current.visible = false;

      hideInstancedMesh(shardsMeshRef.current, shardKinematics.length, dummyObj);
      hideInstancedMesh(soulOrbsMeshRef.current, soulOrbKinematics.length, dummyObj);
      return;
    }

    if (exhaustionRingRef.current) {
      exhaustionRingRef.current.visible = false;
    }

    // PHASE 2: Supernova Shatter, Thin Shockwave Rings, Shards & Soul Stream (1500ms -> 4500ms)
    const shatterDurationMs = Math.max(1, totalMs - exhaustionMs);
    const shatterElapsedMs = elapsedMs - exhaustionMs;
    const shatterProgress = Math.min(1, shatterElapsedMs / shatterDurationMs);
    const crackEnd = BOSS_DEFEAT_CONSTANTS.CRACK_PHASE_END_RATIO;

    if (coreSphereRef.current) {
      let coreScale = 0.2;
      let coreOpacity = 0;
      if (shatterProgress < crackEnd) {
        coreScale = THREE.MathUtils.lerp(0.65, 0.22, shatterProgress / crackEnd);
        coreOpacity = 0.75;
      } else {
        const expandRatio = Math.min(1, (shatterProgress - crackEnd) / 0.28);
        coreScale = THREE.MathUtils.lerp(0.22, 1.35, easeOutCubic(expandRatio));
        coreOpacity = Math.max(0, 0.85 * (1 - expandRatio));
      }
      coreSphereRef.current.scale.setScalar(coreScale);
      (coreSphereRef.current.material as THREE.MeshBasicMaterial).opacity = coreOpacity;
    }

    let pillarProgress = 0;
    if (shatterProgress >= crackEnd) {
      pillarProgress = Math.min(1, (shatterProgress - crackEnd) / 0.48);
    }
    let pillarFade = 0;
    if (pillarProgress > 0 && pillarProgress < 1) {
      pillarFade = Math.sin(pillarProgress * Math.PI);
    }

    if (skyPillarRef.current) {
      skyPillarRef.current.visible = pillarFade > MIN_VISIBLE_ALPHA;
      const widthScale = 1.0 - pillarProgress * 0.35;
      skyPillarRef.current.scale.set(widthScale, 1, widthScale);
      (skyPillarRef.current.material as THREE.MeshBasicMaterial).opacity = pillarFade * 0.38;
    }

    if (skyBeamCoreRef.current) {
      skyBeamCoreRef.current.visible = pillarFade > MIN_VISIBLE_ALPHA;
      const coreWidthScale = 1.0 - pillarProgress * 0.45;
      skyBeamCoreRef.current.scale.set(coreWidthScale, 1, coreWidthScale);
      (skyBeamCoreRef.current.material as THREE.MeshBasicMaterial).opacity = pillarFade * 0.58;
    }

    const blastProgress = Math.max(0, (shatterProgress - crackEnd * 0.7) / (1 - crackEnd * 0.7));
    if (ringPrimaryRef.current) {
      ringPrimaryRef.current.visible = blastProgress > 0 && blastProgress < 0.92;
      const ease = easeOutCubic(Math.min(1, blastProgress * 1.25));
      ringPrimaryRef.current.scale.setScalar(
        0.45 + ease * BOSS_DEFEAT_CONSTANTS.RING_PRIMARY_MAX_SCALE
      );
      ringPrimaryRef.current.rotation.z += delta * 1.8;
      (ringPrimaryRef.current.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0, 1 - blastProgress * 1.15) * 0.78;
    }

    if (ringSecondaryRef.current) {
      const delayed = Math.max(0, blastProgress - 0.08) / 0.92;
      ringSecondaryRef.current.visible = delayed > 0 && delayed < 0.92;
      const ease = easeOutCubic(Math.min(1, delayed * 1.2));
      ringSecondaryRef.current.scale.setScalar(
        0.4 + ease * BOSS_DEFEAT_CONSTANTS.RING_SECONDARY_MAX_SCALE
      );
      ringSecondaryRef.current.rotation.z -= delta * 2.1;
      (ringSecondaryRef.current.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0, 1 - delayed * 1.12) * 0.85;
    }

    if (groundFissureRef.current) {
      groundFissureRef.current.visible = blastProgress > 0 && blastProgress < 0.95;
      const ease = easeOutCubic(Math.min(1, blastProgress));
      groundFissureRef.current.scale.setScalar(
        0.5 + ease * BOSS_DEFEAT_CONSTANTS.RING_FISSURE_MAX_SCALE
      );
      (groundFissureRef.current.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0, 1 - blastProgress) * 0.65;
    }

    if (burstRaysGroupRef.current) {
      const rayProgress = Math.min(1, blastProgress * 1.45);
      const isRayVisible = rayProgress > 0 && rayProgress < 1;
      burstRaysGroupRef.current.visible = isRayVisible;
      if (isRayVisible) {
        const rayScale = 0.35 + easeOutCubic(rayProgress) * 1.15;
        burstRaysGroupRef.current.scale.setScalar(rayScale);
        burstRaysGroupRef.current.rotation.z += delta * BOSS_DEFEAT_CONSTANTS.BURST_RAY_SPIN_SPEED;
        burstRayMaterial.opacity = Math.sin(rayProgress * Math.PI) * 0.52;
      }
    }

    updateShardInstances(
      shardsMeshRef.current,
      shardKinematics,
      shatterProgress,
      shatterDurationMs,
      crackEnd,
      dummyObj
    );

    updateSoulStreamInstances(
      soulOrbsMeshRef.current,
      soulOrbKinematics,
      shatterProgress,
      winningTeam,
      dummyObj
    );

    // PHASE 3: Glowing 3D Baron/Dragon Buff Orb Drop on the Arena Floor
    if (buffOrbGroupRef.current) {
      const isOrbActive = shatterProgress >= crackEnd;
      buffOrbGroupRef.current.visible = isOrbActive;

      if (isOrbActive) {
        const orbElapsedS = (shatterElapsedMs - crackEnd * shatterDurationMs) / MS_PER_SECOND;
        const remainingMs = totalMs - elapsedMs;
        const fadeOutFactor = Math.min(
          1,
          Math.max(0, remainingMs / BOSS_DEFEAT_CONSTANTS.BUFF_ORB_FADE_DURATION_MS)
        );
        const fadeInFactor = Math.min(1, orbElapsedS * 3.5);
        const envelope = fadeInFactor * fadeOutFactor;
        const pulse =
          0.85 + 0.15 * Math.sin(orbElapsedS * BOSS_DEFEAT_CONSTANTS.BUFF_ORB_PULSE_SPEED * Math.PI);

        const hoverY =
          BOSS_DEFEAT_CONSTANTS.BUFF_ORB_BASE_Y +
          Math.sin(orbElapsedS * BOSS_DEFEAT_CONSTANTS.BUFF_ORB_PULSE_SPEED) *
            BOSS_DEFEAT_CONSTANTS.BUFF_ORB_HOVER_HEIGHT;
        buffOrbGroupRef.current.position.set(0, hoverY, 0);

        if (buffOrbCoreRef.current) {
          buffOrbCoreRef.current.scale.setScalar(envelope * pulse);
          (buffOrbCoreRef.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * envelope;
        }
        if (buffOrbAuraRef.current) {
          buffOrbAuraRef.current.scale.setScalar(envelope * (1.05 + (1 - pulse) * 0.45));
          (buffOrbAuraRef.current.material as THREE.MeshBasicMaterial).opacity =
            0.38 * envelope * pulse;
        }
        if (buffOrbHaloRef.current) {
          buffOrbHaloRef.current.rotation.z += delta * 1.6;
          buffOrbHaloRef.current.scale.setScalar(envelope * (0.95 + pulse * 0.12));
          (buffOrbHaloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.72 * envelope;
        }
        if (buffLightRef.current) {
          buffLightRef.current.intensity =
            BOSS_DEFEAT_CONSTANTS.BUFF_ORB_GLOW_INTENSITY * envelope * pulse;
        }
      }
    }
  });

  if (!isDefeated) return null;

  return (
    <group
      ref={groupRef}
      position={[0, BOSS_DEFEAT_CONSTANTS.ORIGIN_Y, BOSS_DEFEAT_CONSTANTS.ORIGIN_Z]}
    >
      {/* Core Supernova Flash Sphere */}
      <mesh ref={coreSphereRef} geometry={CORE_SPHERE_GEO}>
        <meshBasicMaterial
          color={WHITE_HEX}
          transparent
          opacity={0.85}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Exhaustion Imploding Containment Ring (0ms -> 1500ms) */}
      <mesh ref={exhaustionRingRef} geometry={RING_PRIMARY_GEO} visible={false}>
        <meshBasicMaterial
          color={bossColor}
          transparent
          opacity={0.6}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          forceSinglePass
        />
      </mesh>

      {/* Execution Sky Pillar (Softened with vertical alpha fade map) */}
      <mesh
        ref={skyPillarRef}
        position={[0, BOSS_DEFEAT_CONSTANTS.PILLAR_Y_OFFSET, 0]}
        geometry={PILLAR_OUTER_GEO}
      >
        <meshBasicMaterial
          color={teamColor}
          alphaMap={beamAlphaMap}
          transparent
          opacity={0.4}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          forceSinglePass
        />
      </mesh>

      <mesh
        ref={skyBeamCoreRef}
        position={[0, BOSS_DEFEAT_CONSTANTS.PILLAR_Y_OFFSET, 0]}
        geometry={PILLAR_CORE_GEO}
      >
        <meshBasicMaterial
          color={WHITE_HEX}
          alphaMap={beamAlphaMap}
          transparent
          opacity={0.6}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          forceSinglePass
        />
      </mesh>

      {/* Razor-Sharp Angled 3D Shockwave Rings */}
      <mesh
        ref={ringPrimaryRef}
        rotation={[-Math.PI / 2.6, 0.22, 0]}
        geometry={RING_PRIMARY_GEO}
      >
        <meshBasicMaterial
          color={bossColor}
          transparent
          opacity={0.75}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          forceSinglePass
        />
      </mesh>

      <mesh
        ref={ringSecondaryRef}
        rotation={[-Math.PI / 2.1, -0.28, 0]}
        geometry={RING_SECONDARY_GEO}
      >
        <meshBasicMaterial
          color={teamColor}
          transparent
          opacity={0.85}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          forceSinglePass
        />
      </mesh>

      <mesh
        ref={groundFissureRef}
        position={[0, FISSURE_Y_OFFSET, FISSURE_Z_OFFSET]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={RING_FISSURE_GEO}
      >
        <meshBasicMaterial
          color={secondaryColor}
          transparent
          opacity={0.65}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          forceSinglePass
        />
      </mesh>

      {/* Radial Hextech/Void Burst Rays */}
      <group ref={burstRaysGroupRef} visible={false}>
        {Array.from({ length: BOSS_DEFEAT_CONSTANTS.BURST_RAY_COUNT }, (_, index) => (
          <mesh
            key={`burst-ray-${index}`}
            rotation={[
              0,
              0,
              (index / BOSS_DEFEAT_CONSTANTS.BURST_RAY_COUNT) * Math.PI * 2,
            ]}
            geometry={BURST_RAY_GEO}
            material={burstRayMaterial}
          />
        ))}
      </group>

      {/* 38 Micro-Crystal Energy Shards (Instanced) */}
      <instancedMesh
        ref={shardsMeshRef}
        args={[CRYSTAL_SHARD_GEO, undefined, BOSS_DEFEAT_CONSTANTS.SHARD_COUNT]}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color={WHITE_HEX}
          transparent
          opacity={0.85}
          {...COLOR_ONLY_ADDITIVE_PROPS}
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
          opacity={0.8}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* 3D Baron/Dragon Buff Relic Orb Drop */}
      <group ref={buffOrbGroupRef} visible={false}>
        <pointLight
          ref={buffLightRef}
          color={teamColor}
          intensity={BOSS_DEFEAT_CONSTANTS.BUFF_ORB_GLOW_INTENSITY}
          distance={BUFF_LIGHT_DISTANCE}
          decay={BUFF_LIGHT_DECAY}
        />
        <mesh ref={buffOrbCoreRef} geometry={BUFF_ORB_CORE_GEO}>
          <meshBasicMaterial
            color={WHITE_HEX}
            transparent
            opacity={0.85}
            {...COLOR_ONLY_ADDITIVE_PROPS}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={buffOrbAuraRef} geometry={BUFF_ORB_AURA_GEO}>
          <meshBasicMaterial
            color={teamColor}
            transparent
            opacity={0.38}
            {...COLOR_ONLY_ADDITIVE_PROPS}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh
          ref={buffOrbHaloRef}
          rotation={[-Math.PI / 2.4, 0, 0]}
          geometry={BUFF_ORB_HALO_GEO}
        >
          <meshBasicMaterial
            color={bossColor}
            transparent
            opacity={0.72}
            {...COLOR_ONLY_ADDITIVE_PROPS}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
            forceSinglePass
          />
        </mesh>
      </group>
    </group>
  );
};
