import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DUST_COUNT = 160;

export const AmbientDust = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(DUST_COUNT * 3);
    const col = new Float32Array(DUST_COUNT * 3);

    const palette = [
      new THREE.Color('#00f2fe'), // Cyan
      new THREE.Color('#ffa751'), // Gold
      new THREE.Color('#c084fc'), // Purple
      new THREE.Color('#ffffff'), // White
    ];

    for (let i = 0; i < DUST_COUNT; i++) {
      // Cylinder distribution
      const radius = 1.2 + Math.random() * 5.5;
      const angle = Math.random() * Math.PI * 2;
      pos[i * 3 + 0] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = -2.2 + Math.random() * 7.5;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return [pos, col];
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();
    const posArr = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < DUST_COUNT; i++) {
      // Drift upwards
      posArr[i * 3 + 1] += delta * (0.2 + (i % 5) * 0.08);

      // Sway horizontally
      posArr[i * 3 + 0] += Math.sin(time * 0.8 + i) * 0.003;
      posArr[i * 3 + 2] += Math.cos(time * 0.7 + i) * 0.003;

      // Reset to bottom if exceeding top
      if (posArr[i * 3 + 1] > 5.5) {
        posArr[i * 3 + 1] = -2.2;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

