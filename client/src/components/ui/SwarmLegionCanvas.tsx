import React, { useEffect, useRef } from 'react';
import { SUMMON_PERF_CONSTANTS } from '../../constants/game';
import { SWARM_LEGION_CONSTANTS, swarmLegionPool } from '../../services/swarmLegionPool';
import { useGameStore } from '../../store/gameStore';

const CANVAS_PERF = {
  MAX_DPR: 1,
  TARGET_FRAME_INTERVAL_MS: 33,
  SPRITE_RESOLUTION: 28,
  RING_PADDING_PX: 2,
  MAX_BOLTS_PER_FRAME: 16,
  BOB_SPEED: 0.0038,
  BOB_AMPLITUDE_PX: 5,
  FALLBACK_CENTER_Y_RATIO: 0.44,
  TWO_PI: Math.PI * 2,
} as const;

const AVATAR_SPRITE_CACHE = new Map<string, HTMLCanvasElement>();
const AVATAR_LOADING_SET = new Set<string>();
const TEAM_RING_SPRITE_CACHE = new Map<string, HTMLCanvasElement>();

/**
 * Pre-bakes a circular team-colored ring sprite once per team color
 * so zero ctx.arc()/ctx.fill() path calls happen during the frame loop.
 */
const getTeamRingSprite = (colorHex: string): HTMLCanvasElement => {
  const cached = TEAM_RING_SPRITE_CACHE.get(colorHex);
  if (cached) return cached;

  const totalSize = SWARM_LEGION_CONSTANTS.AVATAR_SIZE_PX + CANVAS_PERF.RING_PADDING_PX * 2;
  const offscreen = document.createElement('canvas');
  offscreen.width = totalSize;
  offscreen.height = totalSize;
  const offCtx = offscreen.getContext('2d');
  if (offCtx) {
    const half = totalSize / 2;
    offCtx.fillStyle = colorHex;
    offCtx.beginPath();
    offCtx.arc(half, half, half, 0, CANVAS_PERF.TWO_PI);
    offCtx.fill();

    offCtx.fillStyle = '#0f172a';
    offCtx.beginPath();
    offCtx.arc(half, half, half - CANVAS_PERF.RING_PADDING_PX, 0, CANVAS_PERF.TWO_PI);
    offCtx.fill();
  }
  TEAM_RING_SPRITE_CACHE.set(colorHex, offscreen);
  return offscreen;
};

/**
 * Loads a champion portrait once and pre-bakes a circular offscreen canvas
 * so hundreds/thousands of swarm units draw via fast integer ctx.drawImage().
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
        offCtx.arc(radius, radius, radius - 0.5, 0, CANVAS_PERF.TWO_PI);
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
 * High-performance 30fps 2D overlay canvas rendering summoned swarm champions
 * orbiting around the Boss with pre-baked sprites and capped laser bolts.
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
      const elapsedSinceLastDraw = frameNow - lastFrameTime;
      if (elapsedSinceLastDraw < CANVAS_PERF.TARGET_FRAME_INTERVAL_MS) {
        rafId = requestAnimationFrame(renderFrame);
        return;
      }

      const dtSeconds = Math.min(0.08, Math.max(0.001, elapsedSinceLastDraw / 1000));
      lastFrameTime = frameNow;
      const now = Date.now();

      ctx.clearRect(0, 0, width, height);
      resolveBossCenter(now);

      const units = swarmLegionPool.getUnits();
      const useUserAvatar = useGameStore.getState().useUserAvatar;
      const baseDimension = Math.min(width, height);
      const avatarSize = SWARM_LEGION_CONSTANTS.AVATAR_SIZE_PX;
      const ringSize = avatarSize + CANVAS_PERF.RING_PADDING_PX * 2;
      const halfRing = ringSize / 2;
      const halfAvatar = avatarSize / 2;
      let activeCount = 0;
      let boltsDrawn = 0;
      let currentAlpha = 1;

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

        if (Math.abs(alpha - currentAlpha) > 0.04) {
          currentAlpha = alpha >= 0.99 ? 1 : alpha;
          ctx.globalAlpha = currentAlpha;
        }

        const orbitPx = unit.orbitRadiusRatio * baseDimension;
        const bobOffset =
          Math.sin(now * CANVAS_PERF.BOB_SPEED + unit.bobPhase) * CANVAS_PERF.BOB_AMPLITUDE_PX;
        const x = cachedBossX + Math.cos(unit.angle) * orbitPx * 1.18;
        const y = cachedBossY + Math.sin(unit.angle) * orbitPx * unit.verticalStretch + bobOffset;

        // Capped lightweight energy bolt streaks toward Boss
        if (boltsDrawn < CANVAS_PERF.MAX_BOLTS_PER_FRAME) {
          const boltPhase = (now + unit.firePhase) % SWARM_LEGION_CONSTANTS.BOLT_INTERVAL_MS;
          if (boltPhase < SWARM_LEGION_CONSTANTS.BOLT_ACTIVE_WINDOW_MS) {
            boltsDrawn += 1;
            const progress = boltPhase / SWARM_LEGION_CONSTANTS.BOLT_ACTIVE_WINDOW_MS;
            const bx = x + (cachedBossX - x) * progress;
            const by = y + (cachedBossY - y) * progress;
            const tailProgress = Math.max(0, progress - 0.25);
            const tx = x + (cachedBossX - x) * tailProgress;
            const ty = y + (cachedBossY - y) * tailProgress;

            ctx.strokeStyle = unit.colorHex;
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(bx, by);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bx, by, 1.4, 0, CANVAS_PERF.TWO_PI);
            ctx.fill();
          }
        }

        const ringSprite = getTeamRingSprite(unit.colorHex);
        ctx.drawImage(ringSprite, (x - halfRing) | 0, (y - halfRing) | 0, ringSize, ringSize);

        const targetAvatarUrl =
          useUserAvatar && unit.userAvatarUrl ? unit.userAvatarUrl : unit.avatarUrl;
        const avatarSprite =
          getCircularAvatarSprite(targetAvatarUrl) ||
          (targetAvatarUrl !== unit.avatarUrl ? getCircularAvatarSprite(unit.avatarUrl) : null);
        if (avatarSprite) {
          ctx.drawImage(
            avatarSprite,
            (x - halfAvatar) | 0,
            (y - halfAvatar) | 0,
            avatarSize,
            avatarSize
          );
        }
      }

      if (currentAlpha !== 1) {
        ctx.globalAlpha = 1;
      }

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
