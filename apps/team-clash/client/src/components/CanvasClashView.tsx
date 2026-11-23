import React, { useEffect, useRef } from 'react';
import { CLASH_STAGE } from '../../../shared/constants/clashConfig';
import { ClashCanvasEngine } from '../engine/ClashCanvasEngine';
import { coreReceiver } from '../services/coreReceiver';
import { useClashStore } from '../store/clashStore';

export const CanvasClashView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ClashCanvasEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new ClashCanvasEngine();
    engineRef.current = engine;

    engine.init(
      canvasRef.current,
      (deltaSeconds) => {
        useClashStore.getState().tickGameLoop(deltaSeconds);
      },
      () => {
        const state = useClashStore.getState();
        return {
          clashPosition: state.clashPosition,
          preset: state.getActivePreset(),
          isStrobeWarning: state.isStrobeWarning,
          screenShake: state.screenShake,
        };
      }
    );

    // Register spark effect callback from core events
    coreReceiver.setSparkHandler((team, count) => {
      engine.spawnSparks(team, count);
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CLASH_STAGE.WIDTH}
      height={CLASH_STAGE.HEIGHT}
      className="absolute inset-0 block w-full h-full"
    />
  );
};
