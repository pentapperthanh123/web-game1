import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { DAMAGE_TYPE, DamageType } from '../../constants/game';
import { FloatingDamageText } from '../../types/game';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 240;
const DAMAGE_LIFETIME_MS = 1000;

interface CanvasDamageParticle {
  id: string;
  text: string;
  damageType: DamageType;
  x: number;
  y: number;
  color: string;
  baseScale: number;
  createdAt: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const FloatingDamage = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<CanvasDamageParticle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);

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

        if (!existingIds.has(item.id) && now - item.createdAt < DAMAGE_LIFETIME_MS) {
          particlesRef.current.push({
            id: item.id,
            text: item.text,
            damageType: item.damageType,
            x: CANVAS_WIDTH * 0.5 + item.x,
            y: CANVAS_HEIGHT * 0.5 + item.y,
            color: item.color,
            baseScale: item.scale || 1.0,
            createdAt: item.createdAt || now,
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

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const now = Date.now();
      const activeList: CanvasDamageParticle[] = [];

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        const age = now - p.createdAt;
        if (age >= DAMAGE_LIFETIME_MS) continue;

        activeList.push(p);

        const progress = Math.min(1.0, age / DAMAGE_LIFETIME_MS);
        const yOffset = -easeOutCubic(progress) * 46;
        const opacity = Math.max(0, 1.0 - Math.pow(progress, 1.6));

        // Scale pop effect: expand slightly at birth, then settle
        const scalePop =
          progress < 0.18
            ? 0.75 + (progress / 0.18) * 0.35
            : 1.10 - ((progress - 0.18) / 0.82) * 0.18;
        const finalScale = p.baseScale * scalePop;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(p.x, p.y + yOffset);
        ctx.scale(finalScale, finalScale);

        // Typography styling per damage tier
        let fontSize = 12;
        let prefixTag = '';

        if (p.damageType === DAMAGE_TYPE.ULTIMATE) {
          fontSize = 15;
          prefixTag = '🔥 ';
        } else if (p.damageType === DAMAGE_TYPE.CRIT) {
          fontSize = 13.5;
          prefixTag = '⚡ ';
        }

        ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // High contrast black stroke for crystal-clear readability over vibrant arena
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.95)';
        ctx.lineJoin = 'round';
        ctx.strokeText(`${prefixTag}${p.text}`, 0, 0);

        // Vibrant inner text fill
        ctx.fillStyle = p.color;
        ctx.fillText(`${prefixTag}${p.text}`, 0, 0);

        ctx.restore();
      }

      particlesRef.current = activeList;

      if (activeList.length > 0) {
        animFrameIdRef.current = requestAnimationFrame(render);
      } else {
        isLoopRunningRef.current = false;
      }
    };

    animFrameIdRef.current = requestAnimationFrame(render);
  };

  return (
    <div
      aria-hidden="true"
      className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[240px] pointer-events-none z-30 flex items-center justify-center overflow-visible"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full pointer-events-none"
      />
    </div>
  );
});

FloatingDamage.displayName = 'FloatingDamage';
