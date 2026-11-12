import React from 'react';
import { SkillVfx2DProps } from './skillVfxShared';

const BASE_SIZE_PX = 260;
const SECOND_SWEEP_DELAY_MS = 160;

/** A glowing crescent slash swung across the target side (one per `count`, max two). */
export const CrescentSweep2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, count, direction, nonce }) => {
    const sizePx = Math.round(BASE_SIZE_PX * scale);
    const sweepCount = Math.min(2, Math.max(1, count));
    const flip = direction < 0 ? -1 : 1;

    return (
      <div className="absolute left-1/2 top-[60%] pointer-events-none z-20" style={{ transform: `scaleX(${flip})` }}>
        {Array.from({ length: sweepCount }, (_, index) => (
          <div
            key={`${nonce}-${index}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 animate-skill-crescent"
            style={{
              width: sizePx,
              height: sizePx,
              animationDelay: `${index * SECOND_SWEEP_DELAY_MS}ms`,
            }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                borderTop: `${Math.round(10 * scale)}px solid ${secondaryColor}`,
                borderRight: `${Math.round(6 * scale)}px solid ${color}`,
                borderBottom: `${Math.round(10 * scale)}px solid transparent`,
                borderLeft: `${Math.round(6 * scale)}px solid transparent`,
                filter: `drop-shadow(0 0 16px ${color}) drop-shadow(0 0 32px ${secondaryColor})`,
                transform: 'rotate(-35deg)',
              }}
            />
          </div>
        ))}
      </div>
    );
  }
);

CrescentSweep2D.displayName = 'CrescentSweep2D';
