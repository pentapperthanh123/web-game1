import React from 'react';
import { SkillVfx2DProps } from './skillVfxShared';

const BASE_RING_PX = 260;
const RAY_LENGTH_PX = 420;

/** Ultimate: blinding core flash, rotating rays and a huge expanding ring engulfing the arena. */
export const Nova2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, count, nonce }) => {
    const rayCount = Math.max(6, count);
    const ringPx = Math.round(BASE_RING_PX * scale);

    return (
      <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
        <div
          key={`${nonce}-flash`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-skill-nova-core"
          style={{
            width: ringPx * 0.6,
            height: ringPx * 0.6,
            background: `radial-gradient(circle, #ffffff 0%, ${secondaryColor} 40%, ${color} 70%, transparent 100%)`,
            boxShadow: `0 0 80px ${color}, 0 0 160px ${secondaryColor}`,
          }}
        />
        <div
          key={`${nonce}-rays`}
          className="absolute left-1/2 top-1/2 animate-skill-nova-rays"
          style={{ width: 0, height: 0 }}
        >
          {Array.from({ length: rayCount }, (_, index) => (
            <div
              key={index}
              className="absolute left-0 top-0 origin-left h-[3px]"
              style={{
                width: Math.round(RAY_LENGTH_PX * scale),
                transform: `rotate(${(index / rayCount) * 360}deg)`,
                background: `linear-gradient(to right, #ffffff, ${secondaryColor} 30%, transparent)`,
                boxShadow: `0 0 12px ${color}`,
              }}
            />
          ))}
        </div>
        {[0, 1].map((index) => (
          <div
            key={`${nonce}-ring-${index}`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 animate-skill-nova-ring"
            style={{
              width: ringPx,
              height: ringPx,
              borderColor: index === 0 ? '#ffffff' : color,
              boxShadow: `0 0 40px ${color}, inset 0 0 40px ${secondaryColor}`,
              animationDelay: `${index * 180}ms`,
            }}
          />
        ))}
      </div>
    );
  }
);

Nova2D.displayName = 'Nova2D';
