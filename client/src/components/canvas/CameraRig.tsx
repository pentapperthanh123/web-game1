import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS } from '../../constants/game';

export const CameraRig = () => {
  const { camera } = useThree();
  const screenShakeTimestamp = useGameStore((state) => state.screenShakeTimestamp);
  const screenShakeIntensity = useGameStore((state) => state.screenShakeIntensity);

  const basePos = useRef(
    new THREE.Vector3(0, GAME_CONSTANTS.RENDER.CAMERA_POS_Y, GAME_CONSTANTS.RENDER.CAMERA_POS_Z)
  );

  useFrame(() => {
    const elapsedMs = Date.now() - screenShakeTimestamp;
    const durationMs = 500;

    if (elapsedMs < durationMs) {
      const progress = elapsedMs / durationMs;
      // Exponential decay
      const decay = Math.exp(-progress * 4.5);
      const magnitude = screenShakeIntensity * decay * 0.45;

      const shakeX = (Math.random() - 0.5) * magnitude;
      const shakeY = (Math.random() - 0.5) * magnitude;
      const shakeZ = (Math.random() - 0.5) * magnitude * 0.5;

      camera.position.x = basePos.current.x + shakeX;
      camera.position.y = basePos.current.y + shakeY;
      camera.position.z = basePos.current.z + shakeZ;
    } else {
      camera.position.lerp(basePos.current, 0.15);
    }
    camera.lookAt(0, 0.4, 0);
  });

  return null;
};

