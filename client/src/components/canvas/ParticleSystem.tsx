import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS } from '../../constants/game';

interface ParticleData {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  lifetimes: Float32Array;
}

export const ParticleSystem = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const activeBursts = useGameStore((state) => state.activeBursts);

  const particleCount = GAME_CONSTANTS.PARTICLES.COUNT;

  const data: ParticleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = -100; // start off-screen
      positions[i * 3 + 2] = 0;

      velocities[i * 3 + 0] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;

      colors[i * 3 + 0] = 1;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 0;

      lifetimes[i] = 0;
    }

    return { positions, velocities, colors, lifetimes };
  }, [particleCount]);

  // When a new burst triggers, initialize particle velocities
  useEffect(() => {
    if (activeBursts.length === 0) return;
    const latestBurst = activeBursts[activeBursts.length - 1];
    const burstColor = new THREE.Color(latestBurst.color);

    // Re-ignite a batch of particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      data.positions[i3 + 0] = latestBurst.origin[0];
      data.positions[i3 + 1] = latestBurst.origin[1];
      data.positions[i3 + 2] = latestBurst.origin[2];

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * GAME_CONSTANTS.PARTICLES.EXPLOSION_FORCE;

      data.velocities[i3 + 0] = Math.sin(phi) * Math.cos(theta) * speed;
      data.velocities[i3 + 1] = Math.cos(phi) * speed + 2.5; // upward bias
      data.velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      data.colors[i3 + 0] = burstColor.r;
      data.colors[i3 + 1] = burstColor.g;
      data.colors[i3 + 2] = burstColor.b;

      data.lifetimes[i] = 1.0;
    }

    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.color.needsUpdate = true;
    }
  }, [activeBursts, data, particleCount]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    let hasActiveParticles = false;

    for (let i = 0; i < particleCount; i++) {
      if (data.lifetimes[i] > 0) {
        hasActiveParticles = true;
        const i3 = i * 3;

        // Apply velocity & gravity
        data.positions[i3 + 0] += data.velocities[i3 + 0] * delta;
        data.positions[i3 + 1] += data.velocities[i3 + 1] * delta;
        data.positions[i3 + 2] += data.velocities[i3 + 2] * delta;

        data.velocities[i3 + 1] -= GAME_CONSTANTS.PARTICLES.GRAVITY * 0.4 * delta;

        // Fade lifetime
        data.lifetimes[i] -= delta * 0.9;
        if (data.lifetimes[i] <= 0) {
          data.positions[i3 + 1] = -100; // hide
        }
      }
    }

    if (hasActiveParticles) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[data.colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

