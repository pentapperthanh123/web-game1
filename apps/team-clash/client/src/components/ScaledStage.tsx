import React, { useLayoutEffect, useRef, useState } from 'react';
import { CLASH_STAGE } from '../../../shared/constants/clashConfig';

interface StageFit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const INITIAL_FIT: StageFit = { scale: 1, offsetX: 0, offsetY: 0 };

function computeStageFit(containerWidth: number, containerHeight: number): StageFit {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return INITIAL_FIT;
  }

  const stageAspect = CLASH_STAGE.WIDTH / CLASH_STAGE.HEIGHT; // 720 / 1280 = 0.5625
  const containerAspect = containerWidth / containerHeight;

  // When container is vertical or narrower than 9:16 (such as inside the live preview drawer),
  // fit full width 100% without horizontal black bars!
  if (containerAspect <= stageAspect) {
    const scale = containerWidth / CLASH_STAGE.WIDTH;
    const scaledHeight = CLASH_STAGE.HEIGHT * scale;
    const offsetY = (containerHeight - scaledHeight) / 2;
    return {
      scale,
      offsetX: 0,
      offsetY,
    };
  }

  // When container is wider than 9:16 (e.g. desktop full screen), fit height and center horizontally
  const scale = containerHeight / CLASH_STAGE.HEIGHT;
  const scaledWidth = CLASH_STAGE.WIDTH * scale;
  const offsetX = (containerWidth - scaledWidth) / 2;
  return {
    scale,
    offsetX,
    offsetY: 0,
  };
}

interface ScaledStageProps {
  children: React.ReactNode;
}

/**
 * Fixed 720x1280 stage container that automatically adapts to viewport or drawer size
 * using ResizeObserver for responsive full width rendering.
 */
export const ScaledStage: React.FC<ScaledStageProps> = ({ children }) => {
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
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden bg-black select-none flex items-center justify-center"
    >
      <div
        data-stage-root
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${CLASH_STAGE.WIDTH}px`,
          height: `${CLASH_STAGE.HEIGHT}px`,
          overflow: 'hidden',
          transformOrigin: '0 0',
          transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})`,
        }}
        className="relative overflow-hidden select-none"
      >
        {children}
      </div>
    </div>
  );
};

export default ScaledStage;
