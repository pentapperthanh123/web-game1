import React, { useEffect, useRef } from 'react';
import { SUMMON_PERF_CONSTANTS } from '../../constants/game';
import { SWARM_LEGION_CONSTANTS, swarmLegionPool } from '../../services/swarmLegionPool';

const CANVAS_PERF = {
  MAX_DPR: 1.25,
  SPRITE_RESOLUTION: 36,
  BOB_SPEED: 0.004,
  BOB_AMPLITUDE_PX: 7,
  FALLBACK_CENTER_Y_RATIO: 0.44,
  TWO_PI: Math.PI * 2,
} as const;

const AVATAR_SPRITE_CACHE = new Map<string, HTMLCanvasElement>();
const AVATAR_LOADING_SET = new Set<string>();

/**
 * Loads a champion portrait once and pre-bakes a circular offscreen canvas
 * so 2,000 swarm units can be drawn at 60 FPS without per-unit ctx.clip().
 */
const getCircularAvatarSprite = (avatarUrl: string): HTMLCanvasElement | null => {
  if (!avatarUrl) return null;

  const cached = AVATAR_SPRITE_CACHE.get(avatarUrl);
  if (cached) return cached;

  if (!AVATAR_LOADING_SET.has(avatarUrl)) {
    AVATAR_LOADING_SET.add(avatarUrl);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = CANVAS_PERF.SPRITE_RESOLUTION;
      const offscreen = document.createElement('canvas');
      offscreen.width = size;
      offscreen.height = size;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        const radius = size / 2;
        offCtx.beginPath();
        offCtx.arc(radius, radius, radius - 1, 0, CANVAS_PERF.TWO_PI);
        offCtx.closePath();
        offCtx.clip();
        offCtx.drawImage(img, 0, 0, size, size);
        AVATAR_SPRITE_CACHE.set(avatarUrl, offscreen);
      }
      AVATAR_LOADING_SET.delete(avatarUrl);
    };
    img.onerror = () => {
      AVATAR_LOADING_SET.delete(avatarUrl);
    };
    img.src = avatarUrl;
  }

  return null;
};

/**
 * High-performance 2D overlay canvas rendering 200-2,000+ summoned swarm champions
 * orbiting around the Boss with zero React state updates or WebGL mesh churn.
 */
export const SwarmLegionCanvas: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, CANVAS_PERF.MAX_DPR);

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, CANVAS_PERF.MAX_DPR);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let cachedBossX = width * 0.5;
    let cachedBossY = height * CANVAS_PERF.FALLBACK_CENTER_Y_RATIO;
    let lastBossRectAt = 0;

    const resolveBossCenter = (now: number) => {
      if (now - lastBossRectAt < SUMMON_PERF_CONSTANTS.BOSS_RECT_CACHE_MS) {
        return;
      }
      lastBossRectAt = now;
      const bossEl = document.querySelector('[data-boss-hitbox="true"]');
      if (bossEl) {
        const rect = bossEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          cachedBossX = rect.left + rect.width / 2;
          cachedBossY = rect.top + rect.height / 2;
          return;
        }
      }
      cachedBossX = width * 0.5;
      cachedBossY = height * CANVAS_PERF.FALLBACK_CENTER_Y_RATIO;
    };

    let rafId = 0;
    let isRunning = false;
    let lastFrameTime = performance.now();

    const renderFrame = (frameNow: number) => {
      const dtSeconds = Math.min(0.05, Math.max(0.001, (frameNow - lastFrameTime) / 1000));
      lastFrameTime = frameNow;
      const now = Date.now();

      ctx.clearRect(0, 0, width, height);
      resolveBossCenter(now);

      const units = swarmLegionPool.getUnits();
      const baseDimension = Math.min(width, height);
      const baseSize = SWARM_LEGION_CONSTANTS.AVATAR_SIZE_PX;
      let activeCount = 0;

      for (let i = 0; i < units.length; i += 1) {
        const unit = units[i];
        if (!unit.active) continue;

        const age = now - unit.createdAt;
        if (age >= unit.lifetimeMs) {
          unit.active = false;
          continue;
        }

        activeCount += 1;
        unit.angle += unit.angularSpeed * dtSeconds;

        let alpha = 1;
        if (age < SWARM_LEGION_CONSTANTS.FADE_IN_MS) {
          alpha = age / SWARM_LEGION_CONSTANTS.FADE_IN_MS;
        } else {
          const remaining = unit.lifetimeMs - age;
          if (remaining < SWARM_LEGION_CONSTANTS.FADE_OUT_MS) {
            alpha = Math.max(0, remaining / SWARM_LEGION_CONSTANTS.FADE_OUT_MS);
          }
        }

        const orbitPx = unit.orbitRadiusRatio * baseDimension;
        const bobOffset =
          Math.sin(now * CANVAS_PERF.BOB_SPEED + unit.bobPhase) * CANVAS_PERF.BOB_AMPLITUDE_PX;
        const x = cachedBossX + Math.cos(unit.angle) * orbitPx * 1.18;
        const y = cachedBossY + Math.sin(unit.angle) * orbitPx * unit.verticalStretch + bobOffset;

        const drawSize = baseSize * unit.scale;
        const halfSize = drawSize / 2;

        ctx.globalAlpha = alpha;

        // Periodic lightweight energy bolt streak toward Boss
        const boltPhase = (now + unit.firePhase) % SWARM_LEGION_CONSTANTS.BOLT_INTERVAL_MS;
        if (boltPhase < SWARM_LEGION_CONSTANTS.BOLT_ACTIVE_WINDOW_MS) {
          const progress = boltPhase / SWARM_LEGION_CONSTANTS.BOLT_ACTIVE_WINDOW_MS;
          const bx = x + (cachedBossX - x) * progress;
          const by = y + (cachedBossY - y) * progress;
          const tailProgress = Math.max(0, progress - 0.25);
          const tx = x + (cachedBossX - x) * tailProgress;
          const ty = y + (cachedBossY - y) * tailProgress;

          ctx.strokeStyle = unit.colorHex;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Team-colored outer ring
        ctx.fillStyle = unit.colorHex;
        ctx.beginPath();
        ctx.arc(x, y, halfSize + SWARM_LEGION_CONSTANTS.RING_WIDTH_PX, 0, CANVAS_PERF.TWO_PI);
        ctx.fill();

        const sprite = getCircularAvatarSprite(unit.avatarUrl);
        if (sprite) {
          ctx.drawImage(sprite, x - halfSize, y - halfSize, drawSize, drawSize);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(x, y, halfSize, 0, CANVAS_PERF.TWO_PI);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      if (activeCount > 0) {
        rafId = requestAnimationFrame(renderFrame);
      } else {
        isRunning = false;
      }
    };

    const ensureLoopRunning = () => {
      if (isRunning) return;
      if (swarmLegionPool.getActiveCount() === 0) return;
      isRunning = true;
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(renderFrame);
    };

    const unsubscribe = swarmLegionPool.subscribe(ensureLoopRunning);
    ensureLoopRunning();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      unsubscribe();
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[15]"
    />
  );
});

SwarmLegionCanvas.displayName = 'SwarmLegionCanvas';
