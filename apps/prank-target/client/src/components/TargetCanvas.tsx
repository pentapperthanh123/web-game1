import React, { useEffect, useRef, useCallback } from 'react';
import { PERFORMANCE_LIMITS } from '@shared/constants/prankConfig';
import type { ActivePrankAnimation, PrankActionType } from '@shared/types/prank';
import { CharacterRenderer } from '../engine/characterRenderer';
import { DecalManager } from '../engine/decalManager';
import { ParticleSystem } from '../engine/particleSystem';
import { ProjectileManager } from '../engine/projectileManager';
import { audioSynthesizer } from '../engine/audioSynthesizer';
import { usePrankStore } from '../store/prankStore';

interface TargetCanvasProps {
  onRegisterTrigger: (
    fn: (action: PrankActionType, initiatorName: string, avatarUrl?: string, coins?: number) => void
  ) => void;
  onRegisterClean: (fn: () => void) => void;
}

export const TargetCanvas: React.FC<TargetCanvasProps> = ({
  onRegisterTrigger,
  onRegisterClean,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Engine sub-systems
  const characterRendererRef = useRef(new CharacterRenderer());
  const decalManagerRef = useRef(new DecalManager());
  const particleSystemRef = useRef(new ParticleSystem());
  const projectileManagerRef = useRef(new ProjectileManager());

  // FPS Control refs
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameIntervalMs = PERFORMANCE_LIMITS.FRAME_INTERVAL_MS; // ~33.33ms (30 FPS)
  const animFrameIdRef = useRef<number | null>(null);

  // Handle Projectile Impact on Target
  const handleImpact = useCallback((anim: ActivePrankAnimation) => {
    const { action, initiatorName, avatarUrl, targetX, targetY } = anim;
    const decalManager = decalManagerRef.current;
    const particles = particleSystemRef.current;
    const store = usePrankStore.getState();

    // 1. Play procedural sound effect
    switch (action) {
      case 'EGG':
        audioSynthesizer.playEggSplat();
        // Spawn yolk + shell particles
        particles.spawn('EGG_YOLK', targetX, targetY, 14);
        particles.spawn('EGG_SHELL', targetX, targetY, 8);
        // Add egg splat decal (dripping down face/vest)
        decalManager.addDecal('EGG_SPLAT', targetX, targetY, 52);
        break;

      case 'CAKE':
        audioSynthesizer.playCakeSploosh();
        particles.spawn('CAKE_CREAM', targetX, targetY, 16);
        decalManager.addDecal('CAKE_SMEAR', targetX, targetY, 64);
        break;

      case 'BALL':
        audioSynthesizer.playBallBonk();
        particles.spawn('BALL_DEBRIS', targetX, targetY, 10);
        decalManager.addDecal('BUMP_MARK', targetX, targetY - 20, 42);
        break;

      case 'MILK':
        audioSynthesizer.playMilkSplash();
        particles.spawn('MILK_DROP', targetX, targetY, 20);
        decalManager.addDecal('MILK_DRIP', targetX, targetY, 55);
        break;

      case 'WIND':
        audioSynthesizer.playWindWhoosh();
        particles.spawn('WIND_LINE', targetX - 60, targetY, 18);
        break;

      case 'TAUNT':
        audioSynthesizer.playTaunt();
        particles.spawn('SMOKE_PUFF', targetX, targetY - 40, 10);
        decalManager.addDecal('STICKER_FUNNY', targetX + 20, targetY, 36);
        break;

      case 'SURPRISE':
        audioSynthesizer.playMeltdownAlarm();
        particles.spawn('EGG_YOLK', targetX, targetY, 12);
        particles.spawn('CAKE_CREAM', targetX, targetY, 12);
        decalManager.addDecal('STICKER_FUNNY', targetX, targetY, 44);
        break;
    }

    // 2. Record hit in Store
    store.recordHit(action, initiatorName, avatarUrl, 1);
  }, []);

  // Trigger prank method exposed to CoreReceiver and ActionBadges
  const triggerPrank = useCallback(
    (
      action: PrankActionType,
      initiatorName: string,
      avatarUrl?: string,
      _coins = 1
    ) => {
      projectileManagerRef.current.spawn(action, initiatorName, avatarUrl);
    },
    []
  );

  // Clean method exposed to Host Admin
  const cleanTarget = useCallback(() => {
    decalManagerRef.current.clearAll();
    particleSystemRef.current.clear();
    projectileManagerRef.current.clear();
  }, []);

  // Register methods
  useEffect(() => {
    onRegisterTrigger(triggerPrank);
    onRegisterClean(cleanTarget);
  }, [onRegisterTrigger, onRegisterClean, triggerPrank, cleanTarget]);

  // Main 30 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isRunning = true;

    const loop = (currentTime: number) => {
      if (!isRunning) return;

      const elapsed = currentTime - lastFrameTimeRef.current;

      // Strict 30 FPS Throttle: delta >= 33.33ms
      if (elapsed >= frameIntervalMs) {
        lastFrameTimeRef.current = currentTime - (elapsed % frameIntervalMs);

        // Update physics & stores
        const deltaSec = elapsed / 1000;
        characterRendererRef.current.update(elapsed);
        projectileManagerRef.current.update(handleImpact);
        particleSystemRef.current.update();
        decalManagerRef.current.update(currentTime);
        usePrankStore.getState().tickDecay(deltaSec);

        // Render pass
        const { expression, screenShake } = usePrankStore.getState();

        // 1. Character & Background
        characterRendererRef.current.render(ctx, expression, screenShake);

        // 2. Active Decals on Character
        decalManagerRef.current.render(ctx);

        // 3. Flying Projectiles
        projectileManagerRef.current.render(ctx);

        // 4. Particles (bursts, splatters)
        particleSystemRef.current.render(ctx);
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [frameIntervalMs, handleImpact]);

  return (
    <canvas
      ref={canvasRef}
      width={PERFORMANCE_LIMITS.STAGE_WIDTH}
      height={PERFORMANCE_LIMITS.STAGE_HEIGHT}
      className="absolute inset-0 block w-full h-full cursor-pointer"
      onClick={() => {
        // Tap screen for a quick egg toss preview
        triggerPrank('EGG', 'Host Tap');
      }}
    />
  );
};
