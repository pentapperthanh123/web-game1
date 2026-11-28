import React, { useEffect, useRef, useState } from 'react';
import { STAGE_METRICS } from '@shared/config';

interface ScaledStageProps {
  children: React.ReactNode;
}

export const ScaledStage: React.FC<ScaledStageProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<{ sx: number; sy: number }>(() => {
    if (typeof window === 'undefined') return { sx: 1, sy: 1 };
    const w = document.documentElement.clientWidth || window.innerWidth || STAGE_METRICS.WIDTH;
    const h = document.documentElement.clientHeight || window.innerHeight || STAGE_METRICS.HEIGHT;
    return {
      sx: w / STAGE_METRICS.WIDTH,
      sy: h / STAGE_METRICS.HEIGHT,
    };
  });

  useEffect(() => {
    const updateScale = () => {
      const el = containerRef.current;
      const w =
        el?.clientWidth ||
        document.documentElement.clientWidth ||
        window.innerWidth ||
        STAGE_METRICS.WIDTH;
      const h =
        el?.clientHeight ||
        document.documentElement.clientHeight ||
        window.innerHeight ||
        STAGE_METRICS.HEIGHT;
      setScale({
        sx: w / STAGE_METRICS.WIDTH,
        sy: h / STAGE_METRICS.HEIGHT,
      });
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(updateScale);
      observer.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateScale);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full bg-[#FFF5F7] overflow-hidden select-none"
    >
      <div
        style={{
          width: `${STAGE_METRICS.WIDTH}px`,
          height: `${STAGE_METRICS.HEIGHT}px`,
          transform: `scale(${scale.sx}, ${scale.sy})`,
          transformOrigin: 'top left',
        }}
        className="relative overflow-hidden shrink-0 bg-[#FFF5F7]"
      >
        {children}
      </div>
    </div>
  );
};
