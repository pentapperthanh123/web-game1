import React from 'react';
import { SkillVfx2DProps, useSeededOffsets } from './skillVfxShared';

const STAGGER_MS = 55;
const BASE_HEIGHT_PX = 90;
const SPIKE_CLIP_PATH = 'polygon(50% 0%, 100% 100%, 0% 100%)';

/** Jagged spikes bursting up from the ground across the arena floor. */
export const GroundSpikes2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, count, nonce }) => {
    const offsets = useSeededOffsets(nonce, count * 2);
    const heightPx = Math.round(BASE_HEIGHT_PX * scale);

    return (
      <div className="absolute inset-x-[-30%] top-[82%] h-0 pointer-events-none z-10">
        {Array.from({ length: count }, (_, index) => {
          const leftPercent = 5 + offsets[index * 2] * 90;
          const sizeFactor = 0.6 + offsets[index * 2 + 1] * 0.7;
          return (
            <div
              key={`${nonce}-${index}`}
              className="absolute bottom-0 origin-bottom animate-skill-spike-rise"
              style={{
                left: `${leftPercent}%`,
                width: heightPx * 0.32 * sizeFactor,
                height: heightPx * sizeFactor,
                clipPath: SPIKE_CLIP_PATH,
                background: `linear-gradient(to top, ${color}, ${secondaryColor} 70%, #ffffff)`,
                filter: `drop-shadow(0 0 12px ${color})`,
                animationDelay: `${index * STAGGER_MS}ms`,
              }}
            />
          );
        })}
      </div>
    );
  }
);

GroundSpikes2D.displayName = 'GroundSpikes2D';
