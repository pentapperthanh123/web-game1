import React from 'react';
import { SkillVfx2DProps, useSeededOffsets } from './skillVfxShared';

const STAGGER_MS = 60;
const BASE_PUFF_PX = 70;

/** Dust puffs and speed lines trailing behind the boss as it charges toward the target side. */
export const ChargeDash2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, count, direction, nonce }) => {
    const offsets = useSeededOffsets(nonce, count);
    const trailSide = direction >= 0 ? -1 : 1;

    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        {offsets.map((random, index) => (
          <div
            key={`${nonce}-${index}`}
            className="absolute left-1/2 top-[78%] animate-skill-dash-puff"
            style={{
              ['--puff-x' as string]: `${trailSide * (40 + index * 42) * scale}px`,
              animationDelay: `${index * STAGGER_MS}ms`,
            }}
          >
            <div
              className="rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{
                width: Math.round(BASE_PUFF_PX * (0.6 + random * 0.6) * scale),
                height: Math.round(BASE_PUFF_PX * 0.5 * (0.6 + random * 0.6) * scale),
                background: `radial-gradient(circle, ${secondaryColor}aa 0%, ${color}55 50%, transparent 75%)`,
                filter: 'blur(3px)',
              }}
            />
          </div>
        ))}
        <div
          className="absolute left-1/2 top-[55%] h-[2px] animate-skill-speed-lines"
          style={{
            width: `${Math.round(220 * scale)}px`,
            transform: `translateX(${trailSide > 0 ? '0' : '-100%'})`,
            background: `repeating-linear-gradient(to right, ${secondaryColor} 0 18px, transparent 18px 30px)`,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    );
  }
);

ChargeDash2D.displayName = 'ChargeDash2D';
