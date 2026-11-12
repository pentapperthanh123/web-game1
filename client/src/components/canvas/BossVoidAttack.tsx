import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, getThemeConfig } from '../../constants/game';

const LIGHTNING_SEGMENTS = 8;
const BOLT_COUNT = 8;
const ACID_PROJECTILE_COUNT = 6;
const VOID_SPIKE_COUNT = 6;

interface LightningBolt {
  targetAngle: number;
  length: number;
}

interface AcidBlob {
  targetX: number;
  targetY: number;
  targetZ: number;
  speed: number;
  offsetPhase: number;
}

interface VoidSpike {
  x: number;
  z: number;
  maxHeight: number;
  rotationY: number;
}

const resolveShockwaveColor = (
  isCataclysm: boolean,
  isAcidSpit: boolean,
  isTailSweep: boolean,
  defaultColor: string
): string => {
  if (isCataclysm) return '#ef4444';
  if (isAcidSpit) return '#22c55e';
  if (isTailSweep) return '#d946ef';
  return defaultColor;
};

// Singletons for Shared Geometries & Materials
const SHARED_ACID_GEO = new THREE.SphereGeometry(0.09, 12, 12);
const SHARED_ACID_RING_GEO = new THREE.RingGeometry(0.12, 0.42, 24);
const SHARED_SPIKE_GEO = new THREE.ConeGeometry(0.16, 1.1, 6);
const SHARED_SWEEP_GEO = new THREE.TorusGeometry(2.5, 0.09, 8, 36, Math.PI * 0.75);
const SHARED_CATACLYSM_RING_GEO = new THREE.RingGeometry(0.8, 1.25, 48);

export const BossVoidAttack = () => {
  const shockRingRef = useRef<THREE.Mesh>(null);
  const lightningGroupRef = useRef<THREE.Group>(null);
  const acidGroupRef = useRef<THREE.Group>(null);
  const spikesGroupRef = useRef<THREE.Group>(null);
  const tailSweepRef = useRef<THREE.Mesh>(null);

  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossAttackTimestamp = useGameStore((state) => state.bossAttackTimestamp);
  const activeBossSkillBanner = useGameStore((state) => state.activeBossSkillBanner);
  const gameTheme = useGameStore((state) => state.gameTheme);

  const themeConfig = getThemeConfig(gameTheme);

  // 1. Pre-generated Lightning Bolts
  const bolts = useMemo<LightningBolt[]>(() => {
    return Array.from({ length: BOLT_COUNT }, (_, i) => ({
      targetAngle: (i / BOLT_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      length: 3.5 + Math.random() * 2.5,
    }));
  }, []);

  const lineObjects = useMemo(() => {
    return bolts.map(() => {
      const points = new Float32Array((LIGHTNING_SEGMENTS + 1) * 3);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(points, 3));
      const mat = new THREE.LineBasicMaterial({
        color: '#c084fc',
        transparent: true,
        opacity: 0.9,
        linewidth: 3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return new THREE.Line(geom, mat);
    });
  }, [bolts]);

  // 2. Pre-generated Acid Blobs for Skill 1
  const acidBlobs = useMemo<AcidBlob[]>(() => {
    return Array.from({ length: ACID_PROJECTILE_COUNT }, (_, i) => ({
      targetX: (i % 2 === 0 ? -1.8 : 1.8) + (Math.random() - 0.5) * 1.2,
      targetY: -1.6 + (Math.random() - 0.5) * 0.4,
      targetZ: (Math.random() - 0.5) * 1.5,
      speed: 1.2 + Math.random() * 0.6,
      offsetPhase: i * 0.12,
    }));
  }, []);

  // 3. Pre-generated Void Spikes for Skill 2
  const voidSpikes = useMemo<VoidSpike[]>(() => {
    return Array.from({ length: VOID_SPIKE_COUNT }, (_, i) => ({
      x: (i < 3 ? -1.6 : 1.6) + (Math.random() - 0.5) * 1.2,
      z: (Math.random() - 0.5) * 1.8,
      maxHeight: 0.9 + Math.random() * 0.4,
      rotationY: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame(() => {
    if (bossStatus === BOSS_STATUS.DEFEATED) return;

    const timeSinceAttack = (Date.now() - bossAttackTimestamp) / 1000;
    const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;
    const activeSkillId = activeBossSkillBanner?.skillId || '';
    const isCataclysm = activeSkillId === 'baron_void_cataclysm';
    const isAcidSpit = activeSkillId === 'baron_acid_spit';
    const isVoidSpikes = activeSkillId === 'baron_void_spikes';
    const isTailSweep = activeSkillId === 'baron_tail_sweep';

    // 1. Shockwave Ring (Used for Cataclysm & General Roar)
    if (shockRingRef.current) {
      const ringDuration = isCataclysm ? 1.2 : isEnraged ? 0.9 : 0.7;
      if (timeSinceAttack < ringDuration) {
        const progress = timeSinceAttack / ringDuration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const maxRad = isCataclysm ? 10.5 : isEnraged ? 8.5 : 6.5;
        const currentRadius = 0.5 + easeOut * maxRad;

        shockRingRef.current.visible = true;
        shockRingRef.current.scale.set(currentRadius, currentRadius, 1);

        const mat = shockRingRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - progress) * 0.95;
        mat.color.set(
          resolveShockwaveColor(isCataclysm, isAcidSpit, isTailSweep, themeConfig.colors.primaryHex)
        );
      } else {
        shockRingRef.current.visible = false;
      }
    }

    // 2. Void Lightning Arcs (Cataclysm & General Strike)
    if (lightningGroupRef.current) {
      const lightningDuration = isCataclysm ? 0.75 : 0.45;
      if (timeSinceAttack < lightningDuration && (isCataclysm || (!isAcidSpit && !isVoidSpikes && !isTailSweep))) {
        lightningGroupRef.current.visible = true;

        lineObjects.forEach((line, idx) => {
          const bolt = bolts[idx];
          if (!bolt) return;

          const geom = line.geometry;
          const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
          if (!posAttr) return;

          const startX = 0;
          const startY = 0.6;
          const startZ = 0.2;

          const endX = Math.cos(bolt.targetAngle) * bolt.length;
          const endY = -1.2 + (Math.random() - 0.5) * 0.6;
          const endZ = Math.sin(bolt.targetAngle) * (bolt.length * 0.6) + 0.8;

          const positions = posAttr.array as Float32Array;
          for (let s = 0; s <= LIGHTNING_SEGMENTS; s++) {
            const frac = s / LIGHTNING_SEGMENTS;
            const jitterX = frac > 0 && frac < 1 ? (Math.random() - 0.5) * (isCataclysm ? 0.7 : 0.45) : 0;
            const jitterY = frac > 0 && frac < 1 ? (Math.random() - 0.5) * (isCataclysm ? 0.7 : 0.45) : 0;
            const jitterZ = frac > 0 && frac < 1 ? (Math.random() - 0.5) * (isCataclysm ? 0.7 : 0.45) : 0;

            positions[s * 3] = THREE.MathUtils.lerp(startX, endX, frac) + jitterX;
            positions[s * 3 + 1] = THREE.MathUtils.lerp(startY, endY, frac) + jitterY;
            positions[s * 3 + 2] = THREE.MathUtils.lerp(startZ, endZ, frac) + jitterZ;
          }
          posAttr.needsUpdate = true;

          const mat = line.material as THREE.LineBasicMaterial;
          mat.opacity = Math.random() > 0.2 ? 0.95 : 0.35;
          mat.color.set(isCataclysm ? '#f43f5e' : themeConfig.colors.secondaryHex);
        });
      } else {
        lightningGroupRef.current.visible = false;
      }
    }

    // 3. Acid Spit Projectiles (Baron Skill 1)
    if (acidGroupRef.current) {
      const acidDuration = 0.85;
      if (isAcidSpit && timeSinceAttack < acidDuration) {
        acidGroupRef.current.visible = true;
        const progress = timeSinceAttack / acidDuration;

        const children = acidGroupRef.current.children;
        for (let i = 0; i < acidBlobs.length; i++) {
          const blobGroup = children[i] as THREE.Group | undefined;
          const blob = acidBlobs[i];
          if (!blobGroup || !blob) continue;

          const localProgress = Math.min(1.0, Math.max(0, (progress - blob.offsetPhase) / (1 - blob.offsetPhase)));
          if (localProgress <= 0) {
            blobGroup.visible = false;
            continue;
          }
          blobGroup.visible = true;

          // Arc from Baron mouth to ground target
          const startX = 0;
          const startY = 0.65;
          const startZ = 0.2;

          const currX = THREE.MathUtils.lerp(startX, blob.targetX, localProgress);
          const currZ = THREE.MathUtils.lerp(startZ, blob.targetZ, localProgress);
          const arcHeight = Math.sin(localProgress * Math.PI) * 0.8;
          const currY = THREE.MathUtils.lerp(startY, blob.targetY, localProgress) + arcHeight;

          blobGroup.position.set(currX, currY, currZ);
          const scale = (1 - localProgress * 0.4) * 1.2;
          blobGroup.scale.setScalar(scale);

          // Impact Splash Ring at the target
          const splashRing = blobGroup.children[1] as THREE.Mesh | undefined;
          if (splashRing) {
            if (localProgress > 0.6) {
              splashRing.visible = true;
              const splashProg = (localProgress - 0.6) / 0.4;
              splashRing.scale.setScalar(1 + splashProg * 2.5);
              (splashRing.material as THREE.MeshBasicMaterial).opacity = (1 - splashProg) * 0.85;
            } else {
              splashRing.visible = false;
            }
          }
        }
      } else {
        acidGroupRef.current.visible = false;
      }
    }

    // 4. Void Spikes Eruption (Baron Skill 2)
    if (spikesGroupRef.current) {
      const spikeDuration = 0.95;
      if (isVoidSpikes && timeSinceAttack < spikeDuration) {
        spikesGroupRef.current.visible = true;
        const progress = timeSinceAttack / spikeDuration;

        // Spikes shoot up quickly (0 -> 0.35), hold briefly (0.35 -> 0.65), then retreat down (0.65 -> 1.0)
        let heightFactor = 0;
        if (progress < 0.35) {
          heightFactor = Math.pow(progress / 0.35, 2);
        } else if (progress < 0.65) {
          heightFactor = 1.0;
        } else {
          heightFactor = Math.max(0, 1 - (progress - 0.65) / 0.35);
        }

        const children = spikesGroupRef.current.children;
        for (let i = 0; i < voidSpikes.length; i++) {
          const spikeMesh = children[i] as THREE.Mesh | undefined;
          const spike = voidSpikes[i];
          if (!spikeMesh || !spike) continue;

          spikeMesh.position.set(spike.x, -2.1 + heightFactor * spike.maxHeight, spike.z);
          spikeMesh.scale.set(1.0, heightFactor, 1.0);
          (spikeMesh.material as THREE.MeshBasicMaterial).opacity = heightFactor * 0.92;
        }
      } else {
        spikesGroupRef.current.visible = false;
      }
    }

    // 5. Tail Sweep Crescent Slash (Baron Skill 3)
    if (tailSweepRef.current) {
      const sweepDuration = 0.7;
      if (isTailSweep && timeSinceAttack < sweepDuration) {
        tailSweepRef.current.visible = true;
        const progress = timeSinceAttack / sweepDuration;

        // Sweep rotating around Y axis from -Math.PI / 2 to Math.PI / 2
        const sweepAngle = -Math.PI * 0.6 + progress * Math.PI * 1.2;
        tailSweepRef.current.rotation.set(-Math.PI / 2, 0, sweepAngle);

        const scale = 1.0 + Math.sin(progress * Math.PI) * 0.35;
        tailSweepRef.current.scale.set(scale, scale, 1);

        const mat = tailSweepRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.sin(progress * Math.PI) * 0.95;
      } else {
        tailSweepRef.current.visible = false;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Dynamic Shockwave Ring */}
      <mesh
        ref={shockRingRef}
        position={[0, 0.45, 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        geometry={SHARED_CATACLYSM_RING_GEO}
      >
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Void Lightning Discharge Lines */}
      <group ref={lightningGroupRef} visible={false}>
        {lineObjects.map((lineObj, i) => (
          <primitive key={`bolt-${i}`} object={lineObj} />
        ))}
      </group>

      {/* 3. Acid Spit Projectiles Group (Baron Skill 1) */}
      <group ref={acidGroupRef} visible={false}>
        {acidBlobs.map((_, i) => (
          <group key={`acid-blob-${i}`}>
            {/* Flying Acid Sphere */}
            <mesh geometry={SHARED_ACID_GEO}>
              <meshBasicMaterial
                color="#22c55e"
                transparent
                opacity={0.95}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            {/* Ground Acid Splash Ring */}
            <mesh
              position={[0, -0.1, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              geometry={SHARED_ACID_RING_GEO}
              visible={false}
            >
              <meshBasicMaterial
                color="#4ade80"
                transparent
                opacity={0.8}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4. Void Spikes Eruption Group (Baron Skill 2) */}
      <group ref={spikesGroupRef} visible={false}>
        {voidSpikes.map((spike, i) => (
          <mesh
            key={`void-spike-${i}`}
            geometry={SHARED_SPIKE_GEO}
            rotation={[0, spike.rotationY, 0]}
          >
            <meshBasicMaterial
              color="#a855f7"
              transparent
              opacity={0.9}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      {/* 5. Tail Sweep Crescent Slash (Baron Skill 3) */}
      <mesh
        ref={tailSweepRef}
        position={[0, -1.2, 0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={SHARED_SWEEP_GEO}
        visible={false}
      >
        <meshBasicMaterial
          color="#d946ef"
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
