import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { DAMAGE_TYPE, DamageType, GAME_CONSTANTS } from '../../constants/game';
import { FloatingDamageText } from '../../types/game';
import { createAdaptiveFrameLoop } from '../../services/workerScheduler';
import { DamageTextSprite, getDamageTextSprite } from './damageTextSprites';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 240;
const DAMAGE_LIFETIME_MS = 1000;
/** On-screen cap: when full, new numbers are dropped (the store already merges bursts into "x N" totals). */
const MAX_ACTIVE_PARTICLES = 24;
const RISE_DISTANCE_PX = 46;
const FADE_EXPONENT = 1.6;
const IMPACT_SHAKE_FREQUENCY = 42;

interface PopConfig {
  growEnd: number;
  startScale: number;
  peakScale: number;
  settleScale: number;
  shakeAmpPx: number;
}

const DEFAULT_POP_CONFIG: PopConfig = {
  growEnd: 0.18,
  startScale: 0.75,
  peakScale: 1.1,
  settleScale: 0.92,
  shakeAmpPx: 0,
};

const POP_CONFIG_BY_DAMAGE_TYPE: Readonly<Partial<Record<DamageType, PopConfig>>> = {
  [DAMAGE_TYPE.NORMAL]: DEFAULT_POP_CONFIG,
  [DAMAGE_TYPE.CRIT]: {
    growEnd: 0.16,
    startScale: 0.65,
    peakScale: 1.3,
    settleScale: 1.0,
    shakeAmpPx: 1.2,
  },
  [DAMAGE_TYPE.ULTIMATE]: {
    growEnd: 0.15,
    startScale: 0.55,
    peakScale: 1.48,
    settleScale: 1.08,
    shakeAmpPx: 2.4,
  },
};

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

const getPopScale = (progress: number, pop: PopConfig): number => {
  if (progress < pop.growEnd) {
    return pop.startScale + (progress / pop.growEnd) * (pop.peakScale - pop.startScale);
  }
  return (
    pop.peakScale -
    ((progress - pop.growEnd) / (1 - pop.growEnd)) * (pop.peakScale - pop.settleScale)
  );
};

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const FloatingDamage = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<CanvasDamageParticle[]>([]);
  const dprRef = useRef<number>(GAME_CONSTANTS.RENDER.FIXED_DPR);

  // Lock canvas buffer to fixed pixel ratio (DPR = 1)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = GAME_CONSTANTS.RENDER.FIXED_DPR;
    dprRef.current = dpr;
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
  }, []);

  // Subscribe to floatingDamages in store without triggering React DOM re-renders
  useEffect(() => {
    const renderFrame = (now: number): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const dpr = dprRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Expired particles are compacted out in place (no per-frame array allocation)
      const particles = particlesRef.current;
      let activeCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const age = now - p.createdAt;
        if (age >= DAMAGE_LIFETIME_MS) continue;

        particles[activeCount++] = p;

        const progress = Math.min(1.0, age / DAMAGE_LIFETIME_MS);
        const popConfig = POP_CONFIG_BY_DAMAGE_TYPE[p.damageType] ?? DEFAULT_POP_CONFIG;
        const yOffset = -easeOutCubic(progress) * RISE_DISTANCE_PX;
        const shakeX =
          popConfig.shakeAmpPx > 0 && progress < popConfig.growEnd
            ? Math.sin(progress * IMPACT_SHAKE_FREQUENCY) *
              popConfig.shakeAmpPx *
              (1 - progress / popConfig.growEnd)
            : 0;
        const finalScale = p.baseScale * getPopScale(progress, popConfig);
        const { image, width, height } = p.sprite;

        ctx.globalAlpha = Math.max(0, 1.0 - Math.pow(progress, FADE_EXPONENT));
        ctx.setTransform(
          finalScale * dpr,
          0,
          0,
          finalScale * dpr,
          (p.x + shakeX) * dpr,
          (p.y + yOffset) * dpr
        );
        ctx.drawImage(image, -width / 2, -height / 2, width, height);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;

      particles.length = activeCount;
      return activeCount > 0;
    };

    const loop = createAdaptiveFrameLoop(renderFrame);

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

      if (particlesRef.current.length > 0) {
        loop.start();
      }
    });

    return () => {
      unsub();
      loop.stop();
    };
  }, []);

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
