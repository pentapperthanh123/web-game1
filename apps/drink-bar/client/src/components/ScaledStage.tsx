import React, { useEffect, useState } from 'react';
import { STAGE_METRICS } from '@shared/config';

interface ScaledStageProps {
  children: React.ReactNode;
}

export const ScaledStage: React.FC<ScaledStageProps> = ({ children }) => {
  const [scale, setScale] = useState<number>(1);

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
    <div className="w-screen h-screen flex items-center justify-center bg-[#F5DFE6] overflow-hidden select-none">
      <div
        style={{
          width: `${STAGE_METRICS.WIDTH}px`,
          height: `${STAGE_METRICS.HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative overflow-hidden shrink-0 bg-[#FFF5F7] rounded-[22px] border-[3px] border-[#3B2820] shadow-[0_6px_22px_rgba(59,40,32,0.14)]"
      >
        {children}
      </div>
    </div>
  );
};
