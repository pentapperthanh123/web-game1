import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGiftVfxStore } from '../../../store/giftVfxStore';
import { useGameStore } from '../../../store/gameStore';
import { getTeamTheme } from '../../../constants/teams';
import { TeamType } from '../../../constants/game';

// ==========================================
// CONSTANTS & POOL TUNING
// ==========================================
const MAX_ACTIVE_SHELLS = 3;
const SPARKS_PER_SHELL = 36;
const TOTAL_SPARKS = MAX_ACTIVE_SHELLS * SPARKS_PER_SHELL;
const SPARK_GEO = new THREE.OctahedronGeometry(0.045, 0);

const SHELL_LIFE_MS = 1350;
const BURST_INTERVAL_MS = 1500;
const GRAVITY = 1.8;
const BURST_RADIUS = 1.35;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const CELEBRATION_PALETTE = [
  '#fbbf24', // Gold
  '#22d3ee', // Cyan
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#34d399', // Emerald
  '#ffffff', // White
] as const;

interface ShellPoolSlot {
  center: THREE.Vector3;
  color: THREE.Color;
  burstAtMs: number;
  isActive: boolean;
}

/** Precomputes unit sphere directions for 36 sparks */
const buildSparkDirections = (): THREE.Vector3[] =>
  Array.from({ length: SPARKS_PER_SHELL }, (_, index) => {
    const height = 1 - (2 * (index + 0.5)) / SPARKS_PER_SHELL;
    const ringRadius = Math.sqrt(Math.max(0, 1 - height * height));
    const angle = index * GOLDEN_ANGLE;
    return new THREE.Vector3(Math.cos(angle) * ringRadius, height, Math.sin(angle) * ringRadius);
  });

const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempScale = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();

export const ContinuousVictoryFireworks = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const isContinuousFireworksActive = useGiftVfxStore((s) => s.isContinuousFireworksActive);

  const directions = useMemo(buildSparkDirections, []);

  const shellPool = useRef<ShellPoolSlot[]>(
    Array.from({ length: MAX_ACTIVE_SHELLS }, () => ({
      center: new THREE.Vector3(),
      color: new THREE.Color(),
      burstAtMs: 0,
      isActive: false,
    }))
  );

  const lastSpawnMsRef = useRef<number>(0);
  const currentSlotIndexRef = useRef<number>(0);
  const colorIndexRef = useRef<number>(0);

  const winningTeamTheme = useMemo(() => {
    const winningTeam = useGameStore.getState().roundWinner as TeamType | null;
    if (!winningTeam) return null;
    const activeTeams = useGameStore.getState().activeTeams;
    return getTeamTheme(activeTeams[winningTeam]?.colorTheme);
  }, [isContinuousFireworksActive]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (!isContinuousFireworksActive) {
      if (mesh.visible) {
        mesh.visible = false;
        // Reset pool
        shellPool.current.forEach((slot) => {
          slot.isActive = false;
        });
      }
      return;
    }

    mesh.visible = true;
    const now = Date.now();

    // 1. Spawning a new shell every 1.5s
    if (now - lastSpawnMsRef.current >= BURST_INTERVAL_MS) {
      lastSpawnMsRef.current = now;
      const slot = shellPool.current[currentSlotIndexRef.current];

      // Random sky position around upper arena
      const randX = (Math.random() - 0.5) * 6.8;
      const randY = 6.2 + Math.random() * 3.8;
      const randZ = -2.5 + Math.random() * 3.2;

      slot.center.set(randX, randY, randZ);
      slot.burstAtMs = now;
      slot.isActive = true;

      // Cycle colors: alternate between winning team color & celebration palette
      if (winningTeamTheme && colorIndexRef.current % 2 === 0) {
        slot.color.set(winningTeamTheme.primaryHex);
      } else {
        const hex = CELEBRATION_PALETTE[colorIndexRef.current % CELEBRATION_PALETTE.length];
        slot.color.set(hex);
      }
      colorIndexRef.current += 1;

      // Advance slot index
      currentSlotIndexRef.current = (currentSlotIndexRef.current + 1) % MAX_ACTIVE_SHELLS;

      // Update instance colors for this shell
      const startInstanceIdx = currentSlotIndexRef.current * SPARKS_PER_SHELL;
      for (let i = 0; i < SPARKS_PER_SHELL; i += 1) {
        mesh.setColorAt(startInstanceIdx + i, slot.color);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // 2. Animate all active shells in the pool
    let hasUpdatedInstances = false;

    shellPool.current.forEach((slot, slotIdx) => {
      const startInstanceIdx = slotIdx * SPARKS_PER_SHELL;
      const life = (now - slot.burstAtMs) / SHELL_LIFE_MS;

      if (!slot.isActive || life < 0 || life >= 1.0) {
        slot.isActive = false;
        // Hide instances for dead shell
        for (let i = 0; i < SPARKS_PER_SHELL; i += 1) {
          tempMatrix.compose(tempPosition.set(0, -100, 0), tempQuat, tempScale.setScalar(0));
          mesh.setMatrixAt(startInstanceIdx + i, tempMatrix);
        }
        return;
      }

      hasUpdatedInstances = true;
      const ease = 1 - Math.pow(1 - life, 3);
      const radius = ease * BURST_RADIUS;
      const sag = 0.5 * GRAVITY * life * life;
      const scale = life > 0.6 ? (1 - life) / 0.4 : 1.0;

      for (let i = 0; i < SPARKS_PER_SHELL; i += 1) {
        const dir = directions[i];
        const px = slot.center.x + dir.x * radius;
        const py = slot.center.y + dir.y * radius - sag;
        const pz = slot.center.z + dir.z * radius;

        tempPosition.set(px, py, pz);
        tempScale.setScalar(Math.max(0.001, scale));
        tempMatrix.compose(tempPosition, tempQuat, tempScale);
        mesh.setMatrixAt(startInstanceIdx + i, tempMatrix);
      }
    });

    if (hasUpdatedInstances) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[SPARK_GEO, undefined, TOTAL_SPARKS]}
      frustumCulled={false}
      visible={false}
    >
      <meshBasicMaterial
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
};

ContinuousVictoryFireworks.displayName = 'ContinuousVictoryFireworks';
export default ContinuousVictoryFireworks;
