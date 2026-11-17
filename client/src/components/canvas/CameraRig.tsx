import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { useGiftVfxStore } from '../../store/giftVfxStore';
import { GAME_CONSTANTS } from '../../constants/game';
import { SCREEN_RUMBLE_CONSTANTS, SCREEN_SHAKE_CONSTANTS } from '../../constants/bossUltimateFeedback';
import { resolveScreenRumbleEnvelope } from '../../store/screenRumble';

const CAMERA_LOOK_AT_Y = 0.4;

/** Short kick: strong at the trigger, gone after SCREEN_SHAKE_CONSTANTS.DURATION_MS. */
const resolveShakeMagnitude = (now: number, startedAt: number, intensity: number): number => {
  const elapsedMs = now - startedAt;
  if (elapsedMs < 0 || elapsedMs >= SCREEN_SHAKE_CONSTANTS.DURATION_MS) return 0;
  const progress = elapsedMs / SCREEN_SHAKE_CONSTANTS.DURATION_MS;
  return intensity * Math.exp(-progress * SCREEN_SHAKE_CONSTANTS.DECAY_RATE) * SCREEN_SHAKE_CONSTANTS.CAMERA_GAIN;
};

export const CameraRig = () => {
  const { camera } = useThree();
  const basePos = useRef(
    new THREE.Vector3(0, GAME_CONSTANTS.RENDER.CAMERA_POS_Y, GAME_CONSTANTS.RENDER.CAMERA_POS_Z)
  );

  useFrame(() => {
    // Read inside the frame: no React re-render when a shake starts
    const state = useGameStore.getState();
    const now = Date.now();
    const shake = resolveShakeMagnitude(now, state.screenShakeTimestamp, state.screenShakeIntensity);
    const rumble =
      state.screenRumbleIntensity *
      resolveScreenRumbleEnvelope(now, state.screenRumbleStartedAt, state.screenRumbleDurationMs) *
      SCREEN_RUMBLE_CONSTANTS.CAMERA_GAIN;

    // Yield camera manipulation when Cinematic Camera Controller has an active fly-to request
    if (useGiftVfxStore.getState().cinematicRequest) {
      return;
    }

    if (shake <= 0 && rumble <= 0) {
      camera.position.lerp(basePos.current, SCREEN_SHAKE_CONSTANTS.RETURN_LERP);
      camera.lookAt(0, CAMERA_LOOK_AT_Y, 0);
      return;
    }

    // Kick = pure jitter; rumble = jitter riding on a slow roll so a long quake does not just buzz
    const jitter = shake + rumble * (1 - SCREEN_RUMBLE_CONSTANTS.SWAY_RATIO);
    const sway = rumble * SCREEN_RUMBLE_CONSTANTS.SWAY_RATIO;
    camera.position.x =
      basePos.current.x + (Math.random() - 0.5) * jitter + Math.sin(now * SCREEN_RUMBLE_CONSTANTS.SWAY_SPEED_X) * sway;
    camera.position.y =
      basePos.current.y + (Math.random() - 0.5) * jitter + Math.cos(now * SCREEN_RUMBLE_CONSTANTS.SWAY_SPEED_Y) * sway;
    camera.position.z =
      basePos.current.z + (Math.random() - 0.5) * jitter * SCREEN_SHAKE_CONSTANTS.CAMERA_DEPTH_RATIO;
    camera.lookAt(0, CAMERA_LOOK_AT_Y, 0);
  });

  return null;
};
