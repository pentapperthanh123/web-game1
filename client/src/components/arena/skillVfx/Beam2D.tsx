import React from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, withAlpha } from './skillVfxShared';

const BASE_THICKNESS_PX = 18;
const BEAM_LENGTH_VW = 60;
const CORE_THICKNESS_RATIO = 0.18;
const CORE_BLUR_PX = 1;
const MIN_CORE_PX = 2;
const HALO_SPREAD_RATIO = 1.2;
const MUZZLE_SIZE_RATIO = 2.6;
const BEAM_ORIGIN_TOP = '38%';

interface BeamSideProps {
  sideFlip: number;
  thicknessPx: number;
  color: string;
  secondaryColor: string;
}

/** One beam: soft halo, coloured body fading out toward the tip, thin white-hot core line. */
const BeamSide = ({ sideFlip, thicknessPx, color, secondaryColor }: BeamSideProps) => {
  const coreHeightPx = Math.max(MIN_CORE_PX, Math.round(thicknessPx * CORE_THICKNESS_RATIO));
  return (
    <div
      className="absolute left-1/2 origin-left animate-skill-beam"
      style={{
        top: BEAM_ORIGIN_TOP,
        width: `${BEAM_LENGTH_VW}vw`,
        height: thicknessPx,
        marginTop: -thicknessPx / 2,
        transform: `scaleX(${sideFlip})`,
      }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `linear-gradient(to right, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)}, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} 55%, transparent)`,
          boxShadow: `0 0 ${Math.round(thicknessPx * HALO_SPREAD_RATIO)}px ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)}`,
        }}
      />
      <div
        className="absolute left-0 top-1/2 w-full -translate-y-1/2 rounded-full"
        style={{
          height: coreHeightPx,
          background: `linear-gradient(to right, ${BOSS_SKILL_VFX_STYLE.CORE_COLOR}, ${withAlpha(BOSS_SKILL_VFX_STYLE.CORE_COLOR, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} 60%, transparent)`,
          filter: `blur(${CORE_BLUR_PX}px)`,
        }}
      />
    </div>
  );
};

const BOTH_BEAM_SIDES = [-1, 1];

/** Both wings when the skill is centred, otherwise only the attacked wing. */
const resolveBeamSides = (direction: number): number[] => {
  if (direction === 0) return BOTH_BEAM_SIDES;
  return [Math.sign(direction)];
};

/** A layered energy beam fired from the boss eye that sweeps across the target side. */
export const Beam2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, direction, nonce }) => {
  const thicknessPx = Math.round(BASE_THICKNESS_PX * scale);
  const muzzlePx = Math.round(thicknessPx * MUZZLE_SIZE_RATIO);
  const sides = resolveBeamSides(direction);

  return (
    <div className="absolute inset-0 pointer-events-none z-30" style={SKILL_VFX_2D_LAYER_STYLE}>
      <div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-skill-beam-core"
        style={{
          top: BEAM_ORIGIN_TOP,
          width: muzzlePx,
          height: muzzlePx,
          background: `radial-gradient(circle, ${BOSS_SKILL_VFX_STYLE.CORE_COLOR} 0%, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)} 30%, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)} 60%, transparent 75%)`,
        }}
      />
      {sides.map((sideFlip) => (
        <BeamSide key={`${nonce}-${sideFlip}`} sideFlip={sideFlip} thicknessPx={thicknessPx} color={color} secondaryColor={secondaryColor} />
      ))}
    </div>
  );
});

Beam2D.displayName = 'Beam2D';
