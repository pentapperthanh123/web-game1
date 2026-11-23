import React, { useLayoutEffect, useRef, useState } from 'react';
import { STAGE_SIZE } from '../../constants/stageLayout';

interface StageFit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const INITIAL_FIT: StageFit = { scale: 1, offsetX: 0, offsetY: 0 };

const computeStageFit = (containerWidth: number, containerHeight: number): StageFit => {
  const scale = Math.min(containerWidth / STAGE_SIZE.WIDTH, containerHeight / STAGE_SIZE.HEIGHT);
  return {
    scale,
    offsetX: (containerWidth - STAGE_SIZE.WIDTH * scale) / 2,
    offsetY: (containerHeight - STAGE_SIZE.HEIGHT * scale) / 2,
  };
};

/**
 * Khung sân khấu cố định 720x1280. Bên trong luôn dùng tọa độ px gốc;
 * chỉ lớp ngoài cùng được co giãn bằng `transform: scale()` và căn giữa.
 */
export const ScaledStage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<StageFit>(INITIAL_FIT);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applyFit = () => setFit(computeStageFit(container.clientWidth, container.clientHeight));
    applyFit();

    const observer = new ResizeObserver(applyFit);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-slate-950 select-none">
      <div
        data-stage-root
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: STAGE_SIZE.WIDTH,
          height: STAGE_SIZE.HEIGHT,
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

export default ScaledStage;
