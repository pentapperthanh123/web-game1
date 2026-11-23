import React, { useMemo } from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, useSeededOffsets, withAlpha } from './skillVfxShared';

const RING_STAGGER_MS = 120;
const RING_WIDTH_PX = 200;
const RING_HEIGHT_PX = 70;
const RING_BAND_START = 52;
const RING_BAND_PEAK = 64;
const RING_BAND_END = 71;
const CRACK_COUNT = 6;
const CRACK_SEGMENTS = 4;
const CRACK_VIEW_WIDTH = 200;
const CRACK_VIEW_HEIGHT = 100;
const CRACK_ORIGIN = [CRACK_VIEW_WIDTH / 2, CRACK_VIEW_HEIGHT / 2] as const;
const CRACK_MIN_LENGTH = 18;
const CRACK_LENGTH_RANGE = 14;
const CRACK_WOBBLE = 0.6;
const CRACK_DEPTH_RATIO = 0.45;
const CRACK_SVG_WIDTH_PX = 420;
const CRACK_SVG_HEIGHT_PX = 210;
const CRACK_GLOW_STROKE = 5;
const CRACK_CORE_STROKE = 1.4;
const CRACK_GLOW_BLUR_PX = 3;
const DEGREES_TO_RADIANS = Math.PI / 180;
const FULL_TURN_DEGREES = 360;

/** Soft shockwave band: transparent centre → bright rim → transparent. */
const buildRingBackground = (color: string): string =>
  `radial-gradient(ellipse, transparent ${RING_BAND_START}%, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.STRONG)} ${RING_BAND_PEAK}%, transparent ${RING_BAND_END}%)`;

const buildCrackPath = (angleDeg: number, randoms: number[]): string => {
  const angle = angleDeg * DEGREES_TO_RADIANS;
  let [x, y] = CRACK_ORIGIN;
  const parts = [`M${x} ${y}`];
  for (let segment = 1; segment <= CRACK_SEGMENTS; segment += 1) {
    const length = CRACK_MIN_LENGTH + randoms[segment % randoms.length] * CRACK_LENGTH_RANGE;
    const wobble = (randoms[(segment + 1) % randoms.length] - 0.5) * CRACK_WOBBLE;
    x += Math.cos(angle + wobble) * length;
    y += Math.sin(angle + wobble) * length * CRACK_DEPTH_RATIO;
    parts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(' ');
};

/** Soft-banded ground shockwaves plus glowing (colour glow + white core) cracks radiating from the impact. */
export const SeismicSlam2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, count, nonce }) => {
  const randoms = useSeededOffsets(nonce, CRACK_COUNT * CRACK_SEGMENTS);
  const ringCount = Math.max(2, count);
  const crackPaths = useMemo(
    () =>
      Array.from({ length: CRACK_COUNT }, (_, index) =>
        buildCrackPath((index / CRACK_COUNT) * FULL_TURN_DEGREES, randoms.slice(index * CRACK_SEGMENTS, (index + 1) * CRACK_SEGMENTS))
      ),
    [randoms]
  );

  return (
    <div className="absolute left-1/2 top-[82%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10" style={SKILL_VFX_2D_LAYER_STYLE}>
      {Array.from({ length: ringCount }, (_, index) => {
        const ringColor = index === 0 ? BOSS_SKILL_VFX_STYLE.CORE_COLOR : color;
        return (
          <div
            key={`${nonce}-ring-${index}`}
            className="absolute left-1/2 top-1/2 rounded-[50%] animate-skill-seismic-ring"
            style={{
              width: Math.round(RING_WIDTH_PX * scale),
              height: Math.round(RING_HEIGHT_PX * scale),
              borderWidth: 0,
              background: buildRingBackground(ringColor),
              animationDelay: `${index * RING_STAGGER_MS}ms`,
            }}
          />
        );
      })}
      <svg
        viewBox={`0 0 ${CRACK_VIEW_WIDTH} ${CRACK_VIEW_HEIGHT}`}
        className="absolute left-1/2 top-1/2 animate-skill-crack-glow"
        style={{ width: Math.round(CRACK_SVG_WIDTH_PX * scale), height: Math.round(CRACK_SVG_HEIGHT_PX * scale) }}
      >
        <g style={{ filter: `blur(${CRACK_GLOW_BLUR_PX}px)` }}>
          {crackPaths.map((path, index) => (
            <path key={`${nonce}-glow-${index}`} d={path} fill="none" stroke={withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} strokeWidth={CRACK_GLOW_STROKE} strokeLinecap="round" />
          ))}
        </g>
        {crackPaths.map((path, index) => (
          <path key={`${nonce}-core-${index}`} d={path} fill="none" stroke={BOSS_SKILL_VFX_STYLE.CORE_COLOR} strokeWidth={CRACK_CORE_STROKE} strokeLinecap="round" />
        ))}
      </svg>
    </div>
  );
});

SeismicSlam2D.displayName = 'SeismicSlam2D';
