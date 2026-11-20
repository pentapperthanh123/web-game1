import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { useGiftVfxStore } from '../../../store/giftVfxStore';
import { useGameStore } from '../../../store/gameStore';
import { BACKGROUND_PERF_CONSTANTS, BOSS_STATUS } from '../../../constants/game';

// ==========================================
// CAMERA PERSPECTIVE PRESETS
// ==========================================
const DEFAULT_CAM = {
  POS: [0, 6.8, 10.8] as const,
  TARGET: [0, 0.4, 0] as const,
};

/** Broadcast camera remains stable so foreground champions don't get zoomed into gigantic blobs */
const CLOSEUP_CINEMATIC_CAM = {
  POS: [0, 6.8, 10.8] as const,
  TARGET: [0, 0.4, 0] as const,
};

const FINISHER_CINEMATIC_CAM = {
  POS: [0, 6.8, 10.8] as const,
  TARGET: [0, 0.4, 0] as const,
};

const PODIUM_ORBIT_CAM = {
  POS: [0, 5.8, 9.8] as const,
  TARGET: [0, 0.6, 0] as const,
  AUTO_ROTATE_SPEED: 0.12,
};

export const CinematicCameraController: React.FC = React.memo(() => {
  const cameraControlsRef = useRef<CameraControls>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCinematicRunning = useRef<boolean>(false);
  const isPodiumOrbitRef = useRef<boolean>(false);

  // Smooth continuous 360-degree orbit around Victory Podium
  useFrame((_, delta) => {
    const safeDelta = Math.min(BACKGROUND_PERF_CONSTANTS.MAX_FRAME_DELTA_S, delta);
    if (cameraControlsRef.current && isPodiumOrbitRef.current) {
      cameraControlsRef.current.azimuthAngle += safeDelta * PODIUM_ORBIT_CAM.AUTO_ROTATE_SPEED;
    }
  });

  // 1. Listen for Zustand Cinematic Requests (MEGA Gifts)
  useEffect(() => {
    const unsub = useGiftVfxStore.subscribe((state, prevState) => {
      const req = state.cinematicRequest;
      if (req && req !== prevState.cinematicRequest) {
        if (!cameraControlsRef.current) return;

        // Clear existing reset timer
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
          resetTimeoutRef.current = null;
        }

        isCinematicRunning.current = true;

        // Fly to cinematic close-up
        cameraControlsRef.current.setLookAt(
          req.camPos[0],
          req.camPos[1],
          req.camPos[2],
          req.targetPos[0],
          req.targetPos[1],
          req.targetPos[2],
          true // Smooth transition animation
        );

        // Schedule auto-return to default overview
        resetTimeoutRef.current = setTimeout(() => {
          if (cameraControlsRef.current) {
            cameraControlsRef.current.setLookAt(
              DEFAULT_CAM.POS[0],
              DEFAULT_CAM.POS[1],
              DEFAULT_CAM.POS[2],
              DEFAULT_CAM.TARGET[0],
              DEFAULT_CAM.TARGET[1],
              DEFAULT_CAM.TARGET[2],
              true
            );
          }
          isCinematicRunning.current = false;
          useGiftVfxStore.getState().clearCameraCinematic();
        }, req.durationMs);
      }
    });

    return () => {
      unsub();
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  // 2. Listen for Finisher Killing Blow Event
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      if (
        state.bossStatus === BOSS_STATUS.DEFEATED &&
        prevState.bossStatus !== BOSS_STATUS.DEFEATED &&
        state.finisherGiftName
      ) {
        // High-drama slow zoom on Boss heart
        if (cameraControlsRef.current) {
          cameraControlsRef.current.setLookAt(
            FINISHER_CINEMATIC_CAM.POS[0],
            FINISHER_CINEMATIC_CAM.POS[1],
            FINISHER_CINEMATIC_CAM.POS[2],
            FINISHER_CINEMATIC_CAM.TARGET[0],
            FINISHER_CINEMATIC_CAM.TARGET[1],
            FINISHER_CINEMATIC_CAM.TARGET[2],
            true
          );

          if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
          resetTimeoutRef.current = setTimeout(() => {
            if (cameraControlsRef.current) {
              cameraControlsRef.current.setLookAt(
                DEFAULT_CAM.POS[0],
                DEFAULT_CAM.POS[1],
                DEFAULT_CAM.POS[2],
                DEFAULT_CAM.TARGET[0],
                DEFAULT_CAM.TARGET[1],
                DEFAULT_CAM.TARGET[2],
                true
              );
            }
          }, 5800);
        }
      }
    });

    return () => unsub();
  }, []);

  // Mega weapon dispatch auto triggers camera zoom
  useEffect(() => {
    const unsub = useGiftVfxStore.subscribe((state, prevState) => {
      if (state.activeMegaWeapon && state.activeMegaWeapon !== prevState.activeMegaWeapon) {
        useGiftVfxStore.getState().triggerCameraCinematic(
          [CLOSEUP_CINEMATIC_CAM.POS[0], CLOSEUP_CINEMATIC_CAM.POS[1], CLOSEUP_CINEMATIC_CAM.POS[2]],
          [CLOSEUP_CINEMATIC_CAM.TARGET[0], CLOSEUP_CINEMATIC_CAM.TARGET[1], CLOSEUP_CINEMATIC_CAM.TARGET[2]],
          3500
        );
      }
    });
    return () => unsub();
  }, []);

  // 4. Listen for 360-degree slow-motion orbit around 3D Victory Podium
  useEffect(() => {
    const unsub = useGiftVfxStore.subscribe((state, prevState) => {
      if (state.isPodiumOrbitActive !== prevState.isPodiumOrbitActive) {
        if (!cameraControlsRef.current) return;
        if (state.isPodiumOrbitActive) {
          isPodiumOrbitRef.current = true;
          if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
          }
          cameraControlsRef.current.setLookAt(
            PODIUM_ORBIT_CAM.POS[0],
            PODIUM_ORBIT_CAM.POS[1],
            PODIUM_ORBIT_CAM.POS[2],
            PODIUM_ORBIT_CAM.TARGET[0],
            PODIUM_ORBIT_CAM.TARGET[1],
            PODIUM_ORBIT_CAM.TARGET[2],
            true
          );
        } else {
          isPodiumOrbitRef.current = false;
          cameraControlsRef.current.setLookAt(
            DEFAULT_CAM.POS[0],
            DEFAULT_CAM.POS[1],
            DEFAULT_CAM.POS[2],
            DEFAULT_CAM.TARGET[0],
            DEFAULT_CAM.TARGET[1],
            DEFAULT_CAM.TARGET[2],
            true
          );
        }
      }
    });

    return () => unsub();
  }, []);

  return (
    <CameraControls
      ref={cameraControlsRef}
      makeDefault
      smoothTime={0.45}
      draggingSmoothTime={0}
      enabled={false} // Locked for broadcast: OBS automation only
    />
  );
});

CinematicCameraController.displayName = 'CinematicCameraController';
export default CinematicCameraController;
