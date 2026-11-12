import React from 'react';
import { SkillVfx2DProps } from './skillVfxShared';

/**
 * Renders the ground impact scorch zone on the targeted side when a Dragon casts Fire Breath.
 * The fire jet itself is anchored directly to the Dragon model jaw in Boss2D for pixel accuracy.
 */
export const FireBreath2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, direction }) => {
    const flipScaleX = direction === 1 ? -1 : 1;

    return (
      <div
        aria-hidden="true"
        style={{ transform: `scaleX(${flipScaleX})` }}
        className="absolute inset-0 pointer-events-none z-25 overflow-visible"
      >
        <div
          style={{
            background: `radial-gradient(ellipse at center, ${secondaryColor}99 0%, ${color}66 44%, transparent 78%)`,
          }}
          className="absolute top-[74%] -left-40 sm:-left-52 w-40 sm:w-52 h-14 sm:h-18 rounded-full blur-md mix-blend-screen animate-pulse"
        />
      </div>
    );
  }
);

FireBreath2D.displayName = 'FireBreath2D';
