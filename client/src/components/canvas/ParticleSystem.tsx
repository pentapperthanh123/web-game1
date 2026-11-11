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
  const activeBursts = useGameStore((state) => state.activeBursts);

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
    if (activeBursts.length === 0) return;

    let hasEmitted = false;
    const processed = processedBurstIdsRef.current;

    for (const burst of activeBursts) {
      if (processed.has(burst.id)) continue;
      processed.add(burst.id);
      hasEmitted = true;

      const emitCount = getBurstParticleCount(burst.intensity);
      const baseColor = new THREE.Color(burst.color);
      const whiteTint = new THREE.Color('#ffffff');

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
        pool.colors[i3] = THREE.MathUtils.lerp(baseColor.r, whiteTint.r, mixRatio);
        pool.colors[i3 + 1] = THREE.MathUtils.lerp(baseColor.g, whiteTint.g, mixRatio);
        pool.colors[i3 + 2] = THREE.MathUtils.lerp(baseColor.b, whiteTint.b, mixRatio);

        pool.lifetimes[slot] = 0.75 + Math.random() * 0.45;
      }
    }

    if (processed.size > 120) {
      const activeIds = new Set(activeBursts.map((b) => b.id));
      for (const id of processed) {
        if (!activeIds.has(id)) {
          processed.delete(id);
        }
      }
    }

    if (hasEmitted && pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.color.needsUpdate = true;
    }
  }, [activeBursts, pool, particleCount]);

  useFrame((_, rawDelta) => {
    if (!pointsRef.current) return;

    const delta = Math.min(rawDelta, 0.05);
    const drag = Math.max(0.85, 1 - delta * 2.2);
    let hasActiveParticles = false;

    for (let i = 0; i < particleCount; i++) {
      if (pool.lifetimes[i] <= 0) continue;

      hasActiveParticles = true;
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

    if (hasActiveParticles) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
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
