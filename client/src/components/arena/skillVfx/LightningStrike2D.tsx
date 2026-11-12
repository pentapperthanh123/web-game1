import React from 'react';
import { SkillVfx2DProps, resolveLandingPercent, useSeededOffsets } from './skillVfxShared';

const STAGGER_MS = 120;
const BOLT_SEGMENTS = 7;
const BOLT_HEIGHT = 100;
const JITTER = 14;

const buildBoltPoints = (randoms: number[]): string => {
  const points: string[] = ['50,0'];
  for (let segment = 1; segment <= BOLT_SEGMENTS; segment += 1) {
    const y = (segment / BOLT_SEGMENTS) * BOLT_HEIGHT;
    const x = 50 + (randoms[segment % randoms.length] - 0.5) * JITTER * 2;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
};

/** Vertical lightning bolts striking random spots on the target side with a white flash. */
export const LightningStrike2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, count, direction, nonce }) => {
    const offsets = useSeededOffsets(nonce, count * (BOLT_SEGMENTS + 2));

    return (
      <div className="absolute inset-x-[-40%] top-[-20%] bottom-[18%] pointer-events-none z-30">
        <div
          className="absolute inset-0 animate-skill-flash"
          style={{ background: `radial-gradient(ellipse at 50% 100%, ${secondaryColor}55 0%, transparent 60%)` }}
        />
        {Array.from({ length: count }, (_, index) => {
          const randoms = offsets.slice(index * (BOLT_SEGMENTS + 2), (index + 1) * (BOLT_SEGMENTS + 2));
          const leftPercent = resolveLandingPercent(direction, randoms[0]);
          return (
            <svg
              key={`${nonce}-${index}`}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute top-0 h-full animate-skill-lightning"
              style={{
                left: `${leftPercent}%`,
                width: `${Math.round(60 * scale)}px`,
                marginLeft: `-${Math.round(30 * scale)}px`,
                animationDelay: `${index * STAGGER_MS}ms`,
                filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 18px ${secondaryColor})`,
              }}
            >
              <polyline points={buildBoltPoints(randoms)} fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <polyline points={buildBoltPoints(randoms)} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          );
        })}
      </div>
    );
  }
);

LightningStrike2D.displayName = 'LightningStrike2D';
