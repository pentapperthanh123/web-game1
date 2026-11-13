import React from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, withAlpha } from './skillVfxShared';

const BASE_SIZE_PX = 260;
const SECOND_SWEEP_DELAY_MS = 160;
const MAX_SWEEPS = 2;
const EDGE_THICKNESS_PX = 3;
const MIN_EDGE_PX = 1;
const BODY_THICKNESS_PX = 10;
const BODY_SIDE_THICKNESS_PX = 6;
const GLOW_PX = 14;
const BLADE_ROTATION = 'rotate(-35deg)';
/** The white cutting edge sits just inside the coloured body. */
const EDGE_INSET_PX = 1;

interface CrescentBladeProps {
  scale: number;
  color: string;
  bladeColor: string;
}

/** Coloured crescent body with a soft glow plus a thin white-hot leading edge. */
const CrescentBlade = ({ scale, color, bladeColor }: CrescentBladeProps) => (
  <>
    <div
      className="absolute inset-0 rounded-full"
      style={{
        borderTop: `${Math.round(BODY_THICKNESS_PX * scale)}px solid ${withAlpha(bladeColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)}`,
        borderRight: `${Math.round(BODY_SIDE_THICKNESS_PX * scale)}px solid ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)}`,
        borderBottom: '0 solid transparent',
        borderLeft: '0 solid transparent',
        filter: `drop-shadow(0 0 ${Math.round(GLOW_PX * scale)}px ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)})`,
        transform: BLADE_ROTATION,
      }}
    />
    <div
      className="absolute rounded-full"
      style={{
        inset: EDGE_INSET_PX,
        borderTop: `${Math.max(MIN_EDGE_PX, Math.round(EDGE_THICKNESS_PX * scale))}px solid ${BOSS_SKILL_VFX_STYLE.CORE_COLOR}`,
        borderRight: '0 solid transparent',
        borderBottom: '0 solid transparent',
        borderLeft: '0 solid transparent',
        transform: BLADE_ROTATION,
      }}
    />
  </>
);

/** A glowing crescent slash swung across the target side (one per `count`, max two). */
export const CrescentSweep2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, count, direction, nonce }) => {
  const sizePx = Math.round(BASE_SIZE_PX * scale);
  const sweepCount = Math.min(MAX_SWEEPS, Math.max(1, count));
  const flip = direction < 0 ? -1 : 1;

  return (
    <div className="absolute left-1/2 top-[60%] pointer-events-none z-20" style={{ ...SKILL_VFX_2D_LAYER_STYLE, transform: `scaleX(${flip})` }}>
      {Array.from({ length: sweepCount }, (_, index) => (
        <div
          key={`${nonce}-${index}`}
          className="absolute -translate-x-1/2 -translate-y-1/2 animate-skill-crescent"
          style={{ width: sizePx, height: sizePx, animationDelay: `${index * SECOND_SWEEP_DELAY_MS}ms` }}
        >
          <CrescentBlade scale={scale} color={color} bladeColor={index === 0 ? secondaryColor : color} />
        </div>
      ))}
    </div>
  );
});

CrescentSweep2D.displayName = 'CrescentSweep2D';
