import React from 'react';
import { SkillVfx2DProps, resolveLandingPercent, useSeededOffsets } from './skillVfxShared';

const STAGGER_MS = 90;
const BASE_SIZE_PX = 22;

/** Glowing blobs spat from the boss mouth that arc down and splash on the ground. */
export const ProjectileArc2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, count, direction, nonce }) => {
    const offsets = useSeededOffsets(nonce, count);
    const sizePx = Math.round(BASE_SIZE_PX * scale);

    return (
      <div className="absolute inset-0 pointer-events-none z-20">
        {offsets.map((random, index) => {
          const landingPercent = resolveLandingPercent(direction, random);
          return (
            <div
              key={`${nonce}-${index}`}
              className="absolute left-1/2 top-[42%] animate-skill-projectile-arc"
              style={{
                ['--arc-x' as string]: `${(landingPercent - 50) * 4}px`,
                animationDelay: `${index * STAGGER_MS}ms`,
              }}
            >
              <div
                className="rounded-full blur-[1px]"
                style={{
                  width: sizePx,
                  height: sizePx,
                  background: `radial-gradient(circle, #ffffff 0%, ${secondaryColor} 35%, ${color} 70%, transparent 100%)`,
                  boxShadow: `0 0 18px ${color}, 0 0 36px ${secondaryColor}`,
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 animate-skill-splash"
                style={{
                  width: sizePx * 3,
                  height: sizePx * 1.2,
                  borderColor: secondaryColor,
                  boxShadow: `0 0 20px ${color}`,
                  animationDelay: `${index * STAGGER_MS + 520}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }
);

ProjectileArc2D.displayName = 'ProjectileArc2D';
