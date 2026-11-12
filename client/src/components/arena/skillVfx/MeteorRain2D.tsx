import React from 'react';
import { SkillVfx2DProps, useSeededOffsets } from './skillVfxShared';

const STAGGER_MS = 110;
const BASE_SIZE_PX = 26;
const TRAIL_LENGTH_PX = 110;

/** Fireballs streaking diagonally down with impact rings; the 3D layer spawns matching meteors. */
export const MeteorRain2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, count, nonce }) => {
    const offsets = useSeededOffsets(nonce, count * 2);
    const sizePx = Math.round(BASE_SIZE_PX * scale);

    return (
      <div className="absolute inset-x-[-40%] top-[-30%] bottom-[18%] pointer-events-none z-30">
        {Array.from({ length: count }, (_, index) => {
          const leftPercent = 5 + offsets[index * 2] * 90;
          const sizeFactor = 0.7 + offsets[index * 2 + 1] * 0.6;
          const delayMs = index * STAGGER_MS;
          return (
            <div key={`${nonce}-${index}`} className="absolute bottom-0" style={{ left: `${leftPercent}%` }}>
              <div
                className="absolute bottom-0 animate-skill-meteor-fall"
                style={{ animationDelay: `${delayMs}ms` }}
              >
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 origin-bottom rotate-[28deg]"
                  style={{
                    width: sizePx * 0.5 * sizeFactor,
                    height: TRAIL_LENGTH_PX * sizeFactor,
                    background: `linear-gradient(to top, ${secondaryColor}, ${color}80, transparent)`,
                    filter: 'blur(2px)',
                  }}
                />
                <div
                  className="rounded-full"
                  style={{
                    width: sizePx * sizeFactor,
                    height: sizePx * sizeFactor,
                    background: `radial-gradient(circle, #ffffff 0%, ${secondaryColor} 40%, ${color} 100%)`,
                    boxShadow: `0 0 20px ${color}, 0 0 40px ${secondaryColor}`,
                  }}
                />
              </div>
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-[50%] border-2 animate-skill-splash"
                style={{
                  width: sizePx * 4 * sizeFactor,
                  height: sizePx * 1.4 * sizeFactor,
                  borderColor: secondaryColor,
                  boxShadow: `0 0 24px ${color}`,
                  animationDelay: `${delayMs + 620}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }
);

MeteorRain2D.displayName = 'MeteorRain2D';
