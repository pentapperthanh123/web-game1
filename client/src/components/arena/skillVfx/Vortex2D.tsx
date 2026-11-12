import React from 'react';
import { SkillVfx2DProps, useSeededOffsets } from './skillVfxShared';

const BASE_SIZE_PX = 240;
const RING_GAP_PX = 50;
const DEBRIS_COUNT = 8;

/** Concentric spinning rings collapsing inward with orbiting debris — pulls champions in. */
export const Vortex2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, count, nonce }) => {
    const debrisOffsets = useSeededOffsets(nonce, DEBRIS_COUNT);
    const ringCount = Math.max(2, count);

    return (
      <div className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
        {Array.from({ length: ringCount }, (_, index) => {
          const sizePx = Math.round((BASE_SIZE_PX + index * RING_GAP_PX) * scale);
          const isReverse = index % 2 === 1;
          return (
            <div
              key={`${nonce}-ring-${index}`}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-dashed ${
                isReverse ? 'animate-skill-vortex-reverse' : 'animate-skill-vortex'
              }`}
              style={{
                width: sizePx,
                height: sizePx * 0.42,
                borderWidth: Math.round(3 * scale),
                borderColor: index === 0 ? secondaryColor : color,
                boxShadow: `0 0 18px ${color}`,
                animationDelay: `${index * 70}ms`,
              }}
            />
          );
        })}
        {debrisOffsets.map((random, index) => (
          <div
            key={`${nonce}-debris-${index}`}
            className="absolute left-1/2 top-1/2 animate-skill-vortex-debris"
            style={{
              ['--orbit' as string]: `${Math.round((80 + random * 110) * scale)}px`,
              ['--angle' as string]: `${Math.round(random * 360)}deg`,
              animationDelay: `${index * 40}ms`,
            }}
          >
            <div
              className="rounded-full"
              style={{ width: 8, height: 8, background: secondaryColor, boxShadow: `0 0 10px ${color}` }}
            />
          </div>
        ))}
      </div>
    );
  }
);

Vortex2D.displayName = 'Vortex2D';
