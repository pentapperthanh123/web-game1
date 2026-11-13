import React from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, useSeededOffsets, withAlpha } from './skillVfxShared';

const BASE_SIZE_PX = 240;
const RING_GAP_PX = 50;
const RING_ASPECT = 0.42;
const RING_BORDER_PX = 2;
const MIN_RING_BORDER_PX = 1;
const RING_GLOW_PX = 12;
const RING_STAGGER_MS = 70;
const DEBRIS_COUNT = 10;
const DEBRIS_MIN_ORBIT_PX = 80;
const DEBRIS_ORBIT_RANGE_PX = 110;
const DEBRIS_SIZE_PX = 6;
const DEBRIS_GLOW_PX = 8;
const DEBRIS_STAGGER_MS = 40;
const DEBRIS_WHITE_EVERY = 3;
const FULL_TURN_DEGREES = 360;
const EYE_SIZE_RATIO = 0.6;

const RING_ANIMATION_CLASS: Readonly<Record<'forward' | 'reverse', string>> = {
  forward: 'animate-skill-vortex',
  reverse: 'animate-skill-vortex-reverse',
};

/** Concentric counter-spinning rings around a soft glowing eye, with motes spiralling inward. */
export const Vortex2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, count, nonce }) => {
  const debrisOffsets = useSeededOffsets(nonce, DEBRIS_COUNT);
  const ringCount = Math.max(2, count);
  const eyePx = Math.round(BASE_SIZE_PX * EYE_SIZE_RATIO * scale);

  return (
    <div className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20" style={SKILL_VFX_2D_LAYER_STYLE}>
      <div
        className="absolute left-1/2 top-1/2 rounded-[50%] animate-skill-crack-glow"
        style={{
          width: eyePx,
          height: eyePx * RING_ASPECT,
          background: `radial-gradient(ellipse, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} 0%, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.FAINT)} 55%, transparent 75%)`,
        }}
      />
      {Array.from({ length: ringCount }, (_, index) => {
        const sizePx = Math.round((BASE_SIZE_PX + index * RING_GAP_PX) * scale);
        const ringColor = index === 0 ? secondaryColor : color;
        return (
          <div
            key={`${nonce}-ring-${index}`}
            className={`absolute left-1/2 top-1/2 rounded-full border-dashed ${RING_ANIMATION_CLASS[index % 2 === 1 ? 'reverse' : 'forward']}`}
            style={{
              width: sizePx,
              height: sizePx * RING_ASPECT,
              borderWidth: Math.max(MIN_RING_BORDER_PX, Math.round(RING_BORDER_PX * scale)),
              borderColor: withAlpha(ringColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG),
              boxShadow: `0 0 ${RING_GLOW_PX}px ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)}`,
              animationDelay: `${index * RING_STAGGER_MS}ms`,
            }}
          />
        );
      })}
      {debrisOffsets.map((random, index) => (
        <div
          key={`${nonce}-debris-${index}`}
          className="absolute left-1/2 top-1/2 animate-skill-vortex-debris"
          style={{
            ['--orbit' as string]: `${Math.round((DEBRIS_MIN_ORBIT_PX + random * DEBRIS_ORBIT_RANGE_PX) * scale)}px`,
            ['--angle' as string]: `${Math.round(random * FULL_TURN_DEGREES)}deg`,
            animationDelay: `${index * DEBRIS_STAGGER_MS}ms`,
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: DEBRIS_SIZE_PX,
              height: DEBRIS_SIZE_PX,
              background: index % DEBRIS_WHITE_EVERY === 0 ? BOSS_SKILL_VFX_STYLE.CORE_COLOR : secondaryColor,
              boxShadow: `0 0 ${DEBRIS_GLOW_PX}px ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)}`,
            }}
          />
        </div>
      ))}
    </div>
  );
});

Vortex2D.displayName = 'Vortex2D';
