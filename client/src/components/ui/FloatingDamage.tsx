import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { DamageType, GAME_CONSTANTS } from '../../constants/game';
import { FloatingDamageText } from '../../types/game';
import { DamageTextSprite, getDamageTextSprite } from './damageTextSprites';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 240;
const DAMAGE_LIFETIME_MS = 1000;
/** On-screen cap: when full, new numbers are dropped (the store already merges bursts into "x N" totals). */
const MAX_ACTIVE_PARTICLES = 24;
const RISE_DISTANCE_PX = 46;
const FADE_EXPONENT = 1.6;
const POP = { GROW_END: 0.18, START_SCALE: 0.75, GROW_AMOUNT: 0.35, PEAK_SCALE: 1.1, SETTLE_AMOUNT: 0.18 } as const;

interface CanvasDamageParticle {
  id: string;
  text: string;
  damageType: DamageType;
  x: number;
  y: number;
  color: string;
  baseScale: number;
  createdAt: number;
  sprite: DamageTextSprite;
}

const getPopScale = (progress: number): number => {
  if (progress < POP.GROW_END) return POP.START_SCALE + (progress / POP.GROW_END) * POP.GROW_AMOUNT;
  return POP.PEAK_SCALE - ((progress - POP.GROW_END) / (1 - POP.GROW_END)) * POP.SETTLE_AMOUNT;
};

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const FloatingDamage = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<CanvasDamageParticle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);
  const dprRef = useRef<number>(
    typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, GAME_CONSTANTS.RENDER.DPR_MAX)
      : 1
  );

  // Resize canvas according to high-DPI device pixel ratio
  useEffect(() => {
    const updateCanvasScale = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = typeof window !== 'undefined'
        ? Math.min(window.devicePixelRatio || 1, GAME_CONSTANTS.RENDER.DPR_MAX)
        : 1;
      dprRef.current = dpr;
      canvas.width = Math.round(CANVAS_WIDTH * dpr);
      canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    };

    updateCanvasScale();
    window.addEventListener('resize', updateCanvasScale);
    return () => window.removeEventListener('resize', updateCanvasScale);
  }, []);

  // Subscribe to floatingDamages in store without triggering React DOM re-renders
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      if (state.floatingDamages === prevState.floatingDamages) return;

      const newItems = state.floatingDamages;
      if (!newItems || newItems.length === 0) return;

      const existingIds = new Set(particlesRef.current.map((p) => p.id));
      const now = Date.now();

      for (let i = 0; i < newItems.length; i++) {
        const item: FloatingDamageText = newItems[i];
        // Chỉ giữ lại số sát thương gây lên Quái vật (ẩn toàn bộ số hồi máu hoặc phụ trợ)
        if (!item.text || item.text.startsWith('+')) continue;

        if (particlesRef.current.length >= MAX_ACTIVE_PARTICLES) break;
        if (!existingIds.has(item.id) && now - item.createdAt < DAMAGE_LIFETIME_MS) {
          const sprite = getDamageTextSprite(item.text, item.damageType, item.color);
          if (!sprite) continue;
          particlesRef.current.push({
            id: item.id,
            text: item.text,
            damageType: item.damageType,
            x: CANVAS_WIDTH * 0.5 + item.x,
            y: CANVAS_HEIGHT * 0.5 + item.y,
            color: item.color,
            baseScale: item.scale || 1.0,
            createdAt: item.createdAt || now,
            sprite,
          });
        }
      }

      // Start canvas render loop if not already running
      if (!isLoopRunningRef.current && particlesRef.current.length > 0) {
        startCanvasLoop();
      }
    });

    return () => {
      unsub();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  const startCanvasLoop = () => {
    isLoopRunningRef.current = true;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        isLoopRunningRef.current = false;
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        isLoopRunningRef.current = false;
        return;
      }

      const dpr = dprRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      // Expired particles are compacted out in place (no per-frame array allocation)
      const particles = particlesRef.current;
      let activeCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const age = now - p.createdAt;
        if (age >= DAMAGE_LIFETIME_MS) continue;

        particles[activeCount++] = p;

        const progress = Math.min(1.0, age / DAMAGE_LIFETIME_MS);
        const yOffset = -easeOutCubic(progress) * RISE_DISTANCE_PX;
        const finalScale = p.baseScale * getPopScale(progress);
        const { image, width, height } = p.sprite;

        ctx.globalAlpha = Math.max(0, 1.0 - Math.pow(progress, FADE_EXPONENT));
        ctx.setTransform(finalScale * dpr, 0, 0, finalScale * dpr, p.x * dpr, (p.y + yOffset) * dpr);
        ctx.drawImage(image, -width / 2, -height / 2, width, height);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;

      particles.length = activeCount;

      if (activeCount > 0) {
        animFrameIdRef.current = requestAnimationFrame(render);
      } else {
        isLoopRunningRef.current = false;
      }
    };

    animFrameIdRef.current = requestAnimationFrame(render);
  };

  const initialDpr = dprRef.current;

  return (
    <div
      aria-hidden="true"
      className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[240px] pointer-events-none z-30 flex items-center justify-center overflow-visible"
    >
      <canvas
        ref={canvasRef}
        width={Math.round(CANVAS_WIDTH * initialDpr)}
        height={Math.round(CANVAS_HEIGHT * initialDpr)}
        style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
        className="pointer-events-none"
      />
    </div>
  );
});

FloatingDamage.displayName = 'FloatingDamage';
