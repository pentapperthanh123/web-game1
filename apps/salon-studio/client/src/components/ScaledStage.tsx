import React, { useEffect, useState } from 'react';
import { STAGE_METRICS } from '@shared/constants/salonConfig';

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
    <div className="w-screen h-screen flex items-center justify-center bg-[#2B211F] overflow-hidden select-none">
      <div
        style={{
          width: `${STAGE_METRICS.WIDTH}px`,
          height: `${STAGE_METRICS.HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative overflow-hidden shrink-0 bg-[#FFF7EE] shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
};
