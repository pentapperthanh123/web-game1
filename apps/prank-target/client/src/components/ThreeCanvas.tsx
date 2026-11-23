import React, { useEffect, useRef } from 'react';
import { PERFORMANCE_3D_LIMITS } from '@shared/constants/prankConfig';
import type { PrankActionType } from '@shared/types/prank';
import { SceneManager } from '../three/SceneManager';

interface ThreeCanvasProps {
  onRegisterTrigger: (
    fn: (action: PrankActionType, initiatorName: string, avatarUrl?: string, coins?: number) => void
  ) => void;
  onRegisterClean: (fn: () => void) => void;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  onRegisterTrigger,
  onRegisterClean,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sm = new SceneManager(canvas);
    sceneManagerRef.current = sm;
    sm.start();

    // Register trigger and clean callbacks
    onRegisterTrigger((action, initiatorName, avatarUrl) => {
      sm.triggerPrank(action, initiatorName, avatarUrl);
    });

    onRegisterClean(() => {
      sm.cleanTarget();
    });

    return () => {
      sm.destroy();
    };
  }, [onRegisterTrigger, onRegisterClean]);

  return (
    <canvas
      ref={canvasRef}
      width={PERFORMANCE_3D_LIMITS.STAGE_WIDTH}
      height={PERFORMANCE_3D_LIMITS.STAGE_HEIGHT}
      className="absolute inset-0 block w-full h-full cursor-pointer"
      onClick={() => {
        // Tap screen for a quick egg toss preview in 3D
        sceneManagerRef.current?.triggerPrank('EGG', 'Host Tap');
      }}
    />
  );
};
