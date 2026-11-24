import React, { useEffect, useRef } from 'react';
import { PERFORMANCE_LIMITS } from '@shared/constants/cafeConfig';
import { ParticlePool } from '../../effects/ParticlePool';
import { useCafeStore } from '../../store/cafeStore';

export const SparkCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poolRef = useRef<ParticlePool | null>(null);

  const sparkTrigger = useCafeStore((s) => s.sparkTrigger);
  const steamTrigger = useCafeStore((s) => s.steamTrigger);
  const blackout = useCafeStore((s) => s.blackout);

  // Initialize pool once
  if (!poolRef.current) {
    poolRef.current = new ParticlePool();
  }

  // Trigger keyboard spark on chat cày
  useEffect(() => {
    if (sparkTrigger && poolRef.current) {
      poolRef.current.spawnSparks(sparkTrigger.x, sparkTrigger.y, 6, '#ffea00');
    }
  }, [sparkTrigger]);

  // Trigger noodle steam
  useEffect(() => {
    if (steamTrigger && poolRef.current) {
      poolRef.current.spawnSteam(steamTrigger.x, steamTrigger.y, 3);
    }
  }, [steamTrigger]);

  // Trigger electric sparks on blackout
  useEffect(() => {
    if (blackout.isActive && poolRef.current) {
      poolRef.current.spawnElectric(360, 480, 10);
    }
  }, [blackout.isActive]);

  // Locked 30 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let lastFrameTime = performance.now();
    const frameInterval = PERFORMANCE_LIMITS.FRAME_INTERVAL_MS; // 33.33ms

    const renderLoop = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(renderLoop);

      const delta = currentTime - lastFrameTime;
      if (delta < frameInterval) {
        return; // Skip frame to enforce 30 FPS cap
      }

      lastFrameTime = currentTime - (delta % frameInterval);

      // Clear & Draw
      ctx.clearRect(0, 0, PERFORMANCE_LIMITS.STAGE_WIDTH, PERFORMANCE_LIMITS.STAGE_HEIGHT);

      if (poolRef.current) {
        poolRef.current.update(frameInterval / 1000);
        poolRef.current.render(ctx);
      }
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={PERFORMANCE_LIMITS.STAGE_WIDTH}
      height={PERFORMANCE_LIMITS.STAGE_HEIGHT}
      className="absolute inset-0 pointer-events-none z-30"
      style={{ width: `${PERFORMANCE_LIMITS.STAGE_WIDTH}px`, height: `${PERFORMANCE_LIMITS.STAGE_HEIGHT}px` }}
    />
  );
};
