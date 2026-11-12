import React from 'react';
import { SkillVfx2DProps } from './skillVfxShared';

const BASE_THICKNESS_PX = 26;
const BEAM_LENGTH_VW = 60;

/** A searing energy beam fired from the boss eye that sweeps across the target side. */
export const Beam2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, scale, direction, nonce }) => {
    const thicknessPx = Math.round(BASE_THICKNESS_PX * scale);
    const flip = direction < 0 ? -1 : 1;
    const isBothSides = direction === 0;

    const renderBeam = (sideFlip: number, key: string) => (
      <div
        key={key}
        className="absolute left-1/2 top-[38%] origin-left animate-skill-beam"
        style={{
          width: `${BEAM_LENGTH_VW}vw`,
          height: thicknessPx,
          marginTop: -thicknessPx / 2,
          transform: `scaleX(${sideFlip})`,
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `linear-gradient(to right, #ffffff, ${secondaryColor} 20%, ${color} 70%, transparent)`,
            boxShadow: `0 0 ${thicknessPx}px ${color}, 0 0 ${thicknessPx * 2}px ${secondaryColor}`,
          }}
        />
        <div
          className="absolute inset-y-[30%] left-0 w-full rounded-full bg-white/90"
          style={{ filter: 'blur(1px)' }}
        />
      </div>
    );

    return (
      <div className="absolute inset-0 pointer-events-none z-30">
        <div
          className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full animate-skill-beam-core"
          style={{
            width: thicknessPx * 2.4,
            height: thicknessPx * 2.4,
            background: `radial-gradient(circle, #ffffff 0%, ${secondaryColor} 45%, transparent 75%)`,
            boxShadow: `0 0 40px ${color}`,
          }}
        />
        {isBothSides ? [renderBeam(-1, `${nonce}-l`), renderBeam(1, `${nonce}-r`)] : renderBeam(flip, `${nonce}-beam`)}
      </div>
    );
  }
);

Beam2D.displayName = 'Beam2D';
