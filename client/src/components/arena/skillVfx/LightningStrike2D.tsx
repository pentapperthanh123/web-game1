import React from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, resolveLandingPercent, useSeededOffsets, withAlpha } from './skillVfxShared';

const STAGGER_MS = 120;
const BOLT_SEGMENTS = 7;
const RANDOMS_PER_BOLT = BOLT_SEGMENTS + 2;
const BOLT_HEIGHT = 100;
const BOLT_VIEWBOX = `0 0 100 ${BOLT_HEIGHT}`;
const BOLT_CENTER_X = 50;
const JITTER = 14;
const BOLT_WIDTH_PX = 60;
const GLOW_STROKE = 6;
const BODY_STROKE = 3;
const CORE_STROKE = 1.2;
const GLOW_BLUR_PX = 6;
const IMPACT_SIZE_PX = 70;
const IMPACT_ASPECT = 0.35;

const buildBoltPoints = (randoms: number[]): string => {
  const points: string[] = [`${BOLT_CENTER_X},0`];
  for (let segment = 1; segment <= BOLT_SEGMENTS; segment += 1) {
    const y = (segment / BOLT_SEGMENTS) * BOLT_HEIGHT;
    const x = BOLT_CENTER_X + (randoms[segment % randoms.length] - 0.5) * JITTER * 2;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
};

interface BoltProps {
  points: string;
  color: string;
  secondaryColor: string;
}

/** Soft blurred glow, coloured body and a thin white-hot core, all following the same path. */
const BoltStrokes = ({ points, color, secondaryColor }: BoltProps) => (
  <>
    <polyline points={points} fill="none" stroke={withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)} strokeWidth={GLOW_STROKE} strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: `blur(${GLOW_BLUR_PX}px)` }} />
    <polyline points={points} fill="none" stroke={withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)} strokeWidth={BODY_STROKE} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <polyline points={points} fill="none" stroke={BOSS_SKILL_VFX_STYLE.CORE_COLOR} strokeWidth={CORE_STROKE} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </>
);

/** Layered lightning bolts with a soft sky flash and a ground impact glow per strike. */
export const LightningStrike2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, count, direction, nonce }) => {
  const offsets = useSeededOffsets(nonce, count * RANDOMS_PER_BOLT);
  const boltWidthPx = Math.round(BOLT_WIDTH_PX * scale);
  const impactPx = Math.round(IMPACT_SIZE_PX * scale);
  const impactHeightPx = impactPx * IMPACT_ASPECT;

  return (
    <div className="absolute inset-x-[-40%] top-[-20%] bottom-[18%] pointer-events-none z-30" style={SKILL_VFX_2D_LAYER_STYLE}>
      <div
        className="absolute inset-0 animate-skill-flash"
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.FAINT)} 0%, transparent 60%)` }}
      />
      {Array.from({ length: count }, (_, index) => {
        const randoms = offsets.slice(index * RANDOMS_PER_BOLT, (index + 1) * RANDOMS_PER_BOLT);
        const animationDelay = `${index * STAGGER_MS}ms`;
        const left = `${resolveLandingPercent(direction, randoms[0])}%`;
        return (
          <React.Fragment key={`${nonce}-${index}`}>
            <svg
              viewBox={BOLT_VIEWBOX}
              preserveAspectRatio="none"
              className="absolute top-0 h-full animate-skill-lightning"
              style={{ left, width: boltWidthPx, marginLeft: -boltWidthPx / 2, animationDelay }}
            >
              <BoltStrokes points={buildBoltPoints(randoms)} color={color} secondaryColor={secondaryColor} />
            </svg>
            <div
              className="absolute bottom-0 rounded-[50%] animate-skill-flash"
              style={{
                left,
                width: impactPx,
                height: impactHeightPx,
                marginLeft: -impactPx / 2,
                marginBottom: -impactHeightPx / 2,
                background: `radial-gradient(ellipse, ${withAlpha(BOSS_SKILL_VFX_STYLE.CORE_COLOR, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} 0%, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)} 40%, transparent 70%)`,
                animationDelay,
              }}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
});

LightningStrike2D.displayName = 'LightningStrike2D';
