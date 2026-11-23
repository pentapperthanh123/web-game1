import React, { useLayoutEffect, useRef, useState } from 'react';
import { STAGE_LAYOUT } from '../../constants/stageLayout';

interface StageFit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const INITIAL_FIT: StageFit = { scale: 1, offsetX: 0, offsetY: 0 };

function computeStageFit(containerWidth: number, containerHeight: number): StageFit {
  const scale = Math.min(
    containerWidth / STAGE_LAYOUT.WIDTH,
    containerHeight / STAGE_LAYOUT.HEIGHT
  );
  return {
    scale,
    offsetX: (containerWidth - STAGE_LAYOUT.WIDTH * scale) / 2,
    offsetY: (containerHeight - STAGE_LAYOUT.HEIGHT * scale) / 2,
  };
}

/**
 * Fixed internal 720x1280 vertical 9:16 stage container.
 * Scales uniformly and centers inside any viewport via ResizeObserver to prevent UI breakage.
 */
export const ScaledStage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<StageFit>(INITIAL_FIT);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applyFit = () => {
      setFit(computeStageFit(container.clientWidth, container.clientHeight));
    };
    applyFit();

    const observer = new ResizeObserver(applyFit);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-stone-950 select-none">
      <div
        data-stage-root
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: STAGE_LAYOUT.WIDTH,
          height: STAGE_LAYOUT.HEIGHT,
          overflow: 'hidden',
          transformOrigin: '0 0',
          transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
