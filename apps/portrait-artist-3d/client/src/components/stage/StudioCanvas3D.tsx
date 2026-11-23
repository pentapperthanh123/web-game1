import React, { useEffect, useRef } from 'react';
import { StudioSceneManager } from '../../engine/scene/studioSceneManager';
import { subscribeStudioVfx, useStudioStore } from '../../store/studioStore';

/**
 * Hosts the locked 30 FPS Three.js WebGL stage inside ScaledStage (720x1280).
 */
export const StudioCanvas3D: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const manager = new StudioSceneManager(host, {
      getFrameState: () => {
        const s = useStudioStore.getState();
        return {
          phase: s.phase,
          cameraPreset: s.cameraPreset,
          artistMood: s.artistMood,
          activeSession: s.activeSession,
          vipQueue: s.vipQueue,
          normalQueue: s.normalQueue,
          paintSpeedMultiplier: s.paintSpeedMultiplier,
          dynamicCameraEnabled: s.config.dynamicCameraEnabled,
          hasRoyalHat: Date.now() < s.vipHatActiveUntil,
          locale: s.config.locale,
          autoChibiFallback: s.config.autoChibiFallback,
          avatarProxyUrl: s.config.avatarProxyUrl,
        };
      },
      onTick: (deltaSec) => {
        useStudioStore.getState().tick(deltaSec);
      },
      onArtistModeResolved: (mode) => {
        useStudioStore.getState().setArtistMode(mode);
      },
      onMissingAssetsUpdated: (missingAssets) => {
        useStudioStore.getState().setMissingAssets(missingAssets);
      },
    });

    const unsubVfx = subscribeStudioVfx((signal) => {
      switch (signal.kind) {
        case 'HEARTS':
          manager.triggerHearts(signal.count);
          break;
        case 'CONFETTI':
          manager.triggerConfetti(signal.count);
          break;
        case 'PASSERBY':
          manager.triggerPasserby();
          break;
        case 'CLEAR_GALLERY':
          manager.clearGallery();
          break;
      }
    });

    manager.start();

    return () => {
      unsubVfx();
      manager.dispose();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 w-full h-full" />;
};
