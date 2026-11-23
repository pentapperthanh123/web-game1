import React from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, withAlpha } from './skillVfxShared';

const BASE_RING_PX = 260;
const RAY_LENGTH_PX = 420;
const RAY_THICKNESS_PX = 2;
const MIN_RAYS = 6;
const CORE_SIZE_RATIO = 0.6;
const RING_STAGGER_MS = 180;
const RING_BAND_START = 58;
const RING_BAND_PEAK = 66;
const RING_BAND_END = 71;
const RING_ALPHAS: readonly string[] = [BOSS_SKILL_VFX_2D_ALPHA.STRONG, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM];

/** Soft ring band (transparent centre → bright rim → transparent) instead of a hard solid border. */
const buildRingBackground = (color: string, alphaHex: string): string =>
  `radial-gradient(circle, transparent ${RING_BAND_START}%, ${withAlpha(color, alphaHex)} ${RING_BAND_PEAK}%, transparent ${RING_BAND_END}%)`;

/** Ultimate: white-hot core flash, rotating soft rays and two expanding shockwave bands. */
export const Nova2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, count, nonce }) => {
  const rayCount = Math.max(MIN_RAYS, count);
  const ringPx = Math.round(BASE_RING_PX * scale);
  const corePx = ringPx * CORE_SIZE_RATIO;
  const ringColors = [secondaryColor, color];

  return (
    <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30" style={SKILL_VFX_2D_LAYER_STYLE}>
      <div
        key={`${nonce}-flash`}
        className="absolute left-1/2 top-1/2 rounded-full animate-skill-nova-core"
        style={{
          width: corePx,
          height: corePx,
          background: `radial-gradient(circle, ${BOSS_SKILL_VFX_STYLE.CORE_COLOR} 0%, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)} 25%, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)} 55%, transparent 75%)`,
        }}
      />
      <div key={`${nonce}-rays`} className="absolute left-1/2 top-1/2 w-0 h-0 animate-skill-nova-rays">
        {Array.from({ length: rayCount }, (_, index) => (
          <div
            key={index}
            className="absolute left-0 top-0 origin-left rounded-full"
            style={{
              width: Math.round(RAY_LENGTH_PX * scale),
              height: RAY_THICKNESS_PX,
              transform: `rotate(${(index / rayCount) * 360}deg)`,
              background: `linear-gradient(to right, ${withAlpha(BOSS_SKILL_VFX_STYLE.CORE_COLOR, BOSS_SKILL_VFX_2D_ALPHA.STRONG)}, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} 30%, transparent)`,
            }}
          />
        ))}
      </div>
      {ringColors.map((ringColor, index) => (
        <div
          key={`${nonce}-ring-${index}`}
          className="absolute left-1/2 top-1/2 rounded-full animate-skill-nova-ring"
          style={{
            width: ringPx,
            height: ringPx,
            background: buildRingBackground(ringColor, RING_ALPHAS[index]),
            animationDelay: `${index * RING_STAGGER_MS}ms`,
          }}
        />
      ))}
    </div>
  );
});

Nova2D.displayName = 'Nova2D';
