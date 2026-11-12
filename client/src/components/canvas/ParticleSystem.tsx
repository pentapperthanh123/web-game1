import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, COMBAT_VFX_CONSTANTS } from '../../constants/game';

interface ParticlePool {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  lifetimes: Float32Array;
}

const tempBaseColor = new THREE.Color();
const tempWhiteColor = new THREE.Color('#ffffff');

const getBurstParticleCount = (intensity: number): number => {
  if (intensity >= COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE) {
    return COMBAT_VFX_CONSTANTS.PARTICLES.BURST_COUNT_ULTIMATE;
  }
  if (intensity >= COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_CRIT) {
    return COMBAT_VFX_CONSTANTS.PARTICLES.BURST_COUNT_CRIT;
  }
  return COMBAT_VFX_CONSTANTS.PARTICLES.BURST_COUNT_NORMAL;
};

export const ParticleSystem = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const processedBurstIdsRef = useRef<Set<string>>(new Set());
  const ringCursorRef = useRef(0);
  const hasAnyActiveRef = useRef(false);

  const particleCount = GAME_CONSTANTS.PARTICLES.COUNT;

  const pool: ParticlePool = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] = -100;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 0;
    }

    return { positions, velocities, colors, lifetimes };
  }, [particleCount]);

  useEffect(() => {
    const pts = pointsRef.current;
    return () => {
      pts?.geometry?.dispose();
    };
  }, []);

  useFrame((_, rawDelta) => {
    const pts = pointsRef.current;
    if (!pts) return;

    const activeBursts = useGameStore.getState().activeBursts;
    const processed = processedBurstIdsRef.current;
    let hasEmitted = false;

    for (let b = 0; b < activeBursts.length; b++) {
      const burst = activeBursts[b];
      if (processed.has(burst.id)) continue;

      processed.add(burst.id);
      hasEmitted = true;
      hasAnyActiveRef.current = true;

      const emitCount = getBurstParticleCount(burst.intensity);
      tempBaseColor.set(burst.color);

      for (let j = 0; j < emitCount; j++) {
        const slot = ringCursorRef.current;
        ringCursorRef.current = (slot + 1) % particleCount;
        const i3 = slot * 3;

        pool.positions[i3] = burst.origin[0] + (Math.random() - 0.5) * 0.25;
        pool.positions[i3 + 1] = burst.origin[1] + (Math.random() - 0.5) * 0.25;
        pool.positions[i3 + 2] = burst.origin[2] + (Math.random() - 0.5) * 0.25;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed =
          COMBAT_VFX_CONSTANTS.PARTICLES.SPEED_MIN +
          Math.random() *
            GAME_CONSTANTS.PARTICLES.EXPLOSION_FORCE *
            (0.45 + burst.intensity * 0.16);

        pool.velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
        pool.velocities[i3 + 1] = Math.cos(phi) * speed + 1.8;
        pool.velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

        const mixRatio = Math.random() * 0.45;
        pool.colors[i3] = THREE.MathUtils.lerp(tempBaseColor.r, tempWhiteColor.r, mixRatio);
        pool.colors[i3 + 1] = THREE.MathUtils.lerp(tempBaseColor.g, tempWhiteColor.g, mixRatio);
        pool.colors[i3 + 2] = THREE.MathUtils.lerp(tempBaseColor.b, tempWhiteColor.b, mixRatio);

        pool.lifetimes[slot] = 0.75 + Math.random() * 0.45;
      }
    }

    if (processed.size > 160) {
      processed.clear();
      for (let b = 0; b < activeBursts.length; b++) {
        processed.add(activeBursts[b].id);
      }
    }

    if (hasEmitted) {
      pts.geometry.attributes.color.needsUpdate = true;
    }

    if (!hasAnyActiveRef.current) return;

    const delta = Math.min(rawDelta, 0.05);
    const drag = Math.max(0.85, 1 - delta * 2.2);
    let stillActive = false;

    for (let i = 0; i < particleCount; i++) {
      if (pool.lifetimes[i] <= 0) continue;

      stillActive = true;
      const i3 = i * 3;

      pool.positions[i3] += pool.velocities[i3] * delta;
      pool.positions[i3 + 1] += pool.velocities[i3 + 1] * delta;
      pool.positions[i3 + 2] += pool.velocities[i3 + 2] * delta;

      pool.velocities[i3] *= drag;
      pool.velocities[i3 + 1] =
        pool.velocities[i3 + 1] * drag - GAME_CONSTANTS.PARTICLES.GRAVITY * 0.45 * delta;
      pool.velocities[i3 + 2] *= drag;

      pool.lifetimes[i] -= delta * 1.35;
      if (pool.lifetimes[i] <= 0) {
        pool.positions[i3 + 1] = -100;
      }
    }

    hasAnyActiveRef.current = stillActive;
    if (stillActive || hasEmitted) {
      pts.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pool.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[pool.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.19}
        vertexColors
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
