import React from 'react';
import { SkillVfx2DProps, useSeededOffsets } from './skillVfxShared';

const RING_STAGGER_MS = 120;
const CRACK_COUNT = 6;
const CRACK_SEGMENTS = 4;

const buildCrackPath = (angleDeg: number, randoms: number[]): string => {
  const angle = (angleDeg * Math.PI) / 180;
  let x = 100;
  let y = 50;
  const parts = [`M${x} ${y}`];
  for (let segment = 1; segment <= CRACK_SEGMENTS; segment += 1) {
    const length = 18 + randoms[segment % randoms.length] * 14;
    const wobble = (randoms[(segment + 1) % randoms.length] - 0.5) * 0.6;
    x += Math.cos(angle + wobble) * length;
    y += Math.sin(angle + wobble) * length * 0.45;
    parts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(' ');
};

/** Expanding ground shockwave rings plus glowing cracks radiating from the impact point. */
export const SeismicSlam2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, count, nonce }) => {
    const randoms = useSeededOffsets(nonce, CRACK_COUNT * CRACK_SEGMENTS);
    const ringCount = Math.max(2, count);

    return (
      <div className="absolute left-1/2 top-[82%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        {Array.from({ length: ringCount }, (_, index) => (
          <div
            key={`${nonce}-ring-${index}`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] animate-skill-seismic-ring"
            style={{
              width: Math.round(200 * scale),
              height: Math.round(70 * scale),
              borderWidth: Math.max(2, Math.round(4 - index)),
              borderColor: index === 0 ? '#ffffff' : color,
              boxShadow: `0 0 28px ${index === 0 ? secondaryColor : color}`,
              animationDelay: `${index * RING_STAGGER_MS}ms`,
            }}
          />
        ))}
        <svg
          viewBox="0 0 200 100"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-skill-crack-glow"
          style={{
            width: Math.round(420 * scale),
            height: Math.round(210 * scale),
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        >
          {Array.from({ length: CRACK_COUNT }, (_, index) => (
            <path
              key={`${nonce}-crack-${index}`}
              d={buildCrackPath((index / CRACK_COUNT) * 360, randoms.slice(index * CRACK_SEGMENTS, (index + 1) * CRACK_SEGMENTS))}
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>
    );
  }
);

SeismicSlam2D.displayName = 'SeismicSlam2D';
