import React, { useEffect, useState } from 'react';
import { STAGE_METRICS } from '@shared/config';

interface ScaledStageProps {
  children: React.ReactNode;
}

export const ScaledStage: React.FC<ScaledStageProps> = ({ children }) => {
  const [scale, setScale] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const sx = window.innerWidth / STAGE_METRICS.WIDTH;
    const sy = window.innerHeight / STAGE_METRICS.HEIGHT;
    return Math.min(sx, sy);
  });

  useEffect(() => {
    const updateScale = () => {
      const sx = window.innerWidth / STAGE_METRICS.WIDTH;
      const sy = window.innerHeight / STAGE_METRICS.HEIGHT;
      setScale(Math.min(sx, sy));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#FFF5F7] overflow-hidden select-none">
      <div
        style={{
          width: `${STAGE_METRICS.WIDTH}px`,
          height: `${STAGE_METRICS.HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative overflow-hidden shrink-0 bg-[#FFF5F7]"
      >
        {children}
      </div>
    </div>
  );
};
