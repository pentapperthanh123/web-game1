import React, { useEffect, useState } from 'react';
import { PERFORMANCE_3D_LIMITS } from '@shared/constants/prankConfig';

interface ScaledStageProps {
  children: React.ReactNode;
}

export const ScaledStage: React.FC<ScaledStageProps> = ({ children }) => {
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      const scaleX = windowWidth / PERFORMANCE_3D_LIMITS.STAGE_WIDTH;
      const scaleY = windowHeight / PERFORMANCE_3D_LIMITS.STAGE_HEIGHT;
      // Contain mode (fit entire 720x1280 in viewport)
      const nextScale = Math.min(scaleX, scaleY);
      setScale(nextScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black overflow-hidden select-none">
      <div
        style={{
          width: `${PERFORMANCE_3D_LIMITS.STAGE_WIDTH}px`,
          height: `${PERFORMANCE_3D_LIMITS.STAGE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative bg-neutral-900 shadow-2xl overflow-hidden shrink-0"
      >
        {children}
      </div>
    </div>
  );
};
