import React, { useLayoutEffect, useRef, useState } from 'react';
import { computeStageSize, DESIGN_STAGE_SIZE, type StageSize } from '../engine/stageViewport';

interface ScaledStageProps {
  children: React.ReactNode;
}

/**
 * Full-screen stage, no letterboxing: scales the 720×1280 design to fit one axis and stretches
 * the logical stage along the other, so the arena always fills the whole window / OBS source.
 */
export const ScaledStage: React.FC<ScaledStageProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<StageSize>(DESIGN_STAGE_SIZE);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applyFit = () => {
      setSize(computeStageSize(container.clientWidth, container.clientHeight));
    };

    applyFit();

    const observer = new ResizeObserver(applyFit);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-black select-none">
      <div
        data-stage-root
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${size.width}px`,
          height: `${size.height}px`,
          overflow: 'hidden',
          transformOrigin: '0 0',
          transform: `scale(${size.scale})`,
        }}
        className="relative overflow-hidden select-none"
      >
        {children}
      </div>
    </div>
  );
};

export default ScaledStage;
