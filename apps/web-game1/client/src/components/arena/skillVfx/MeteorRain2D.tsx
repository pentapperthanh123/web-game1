import React from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, useSeededOffsets, withAlpha } from './skillVfxShared';

const STAGGER_MS = 110;
const BASE_SIZE_PX = 26;
const TRAIL_LENGTH_PX = 110;
const TRAIL_WIDTH_RATIO = 0.5;
const TRAIL_BLUR_PX = 3;
const TRAIL_ANGLE = 'rotate(28deg)';
const SIZE_MIN = 0.7;
const SIZE_RANGE = 0.6;
const LEFT_MIN_PERCENT = 5;
const LEFT_RANGE_PERCENT = 90;
const GLOW_RATIO = 0.8;
const SPLASH_WIDTH_RATIO = 4;
const SPLASH_HEIGHT_RATIO = 1.4;
/** Matches the moment `skillMeteorFall` reaches the ground (75% of 0.85s). */
const SPLASH_DELAY_MS = 620;
const RANDOMS_PER_METEOR = 2;

/** Fireballs streaking diagonally down with soft trails and ground splashes; the 3D layer spawns matching meteors. */
export const MeteorRain2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, count, nonce }) => {
  const offsets = useSeededOffsets(nonce, count * RANDOMS_PER_METEOR);
  const sizePx = Math.round(BASE_SIZE_PX * scale);

  return (
    <div className="absolute inset-x-[-40%] top-[-30%] bottom-[18%] pointer-events-none z-30" style={SKILL_VFX_2D_LAYER_STYLE}>
      {Array.from({ length: count }, (_, index) => {
        const leftPercent = LEFT_MIN_PERCENT + offsets[index * RANDOMS_PER_METEOR] * LEFT_RANGE_PERCENT;
        const meteorPx = sizePx * (SIZE_MIN + offsets[index * RANDOMS_PER_METEOR + 1] * SIZE_RANGE);
        const delayMs = index * STAGGER_MS;
        return (
          <div key={`${nonce}-${index}`} className="absolute bottom-0" style={{ left: `${leftPercent}%` }}>
            <div className="absolute bottom-0 animate-skill-meteor-fall" style={{ animationDelay: `${delayMs}ms` }}>
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 origin-bottom rounded-full"
                style={{
                  width: meteorPx * TRAIL_WIDTH_RATIO,
                  height: (TRAIL_LENGTH_PX * meteorPx) / sizePx,
                  transform: TRAIL_ANGLE,
                  background: `linear-gradient(to top, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)}, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)}, transparent)`,
                  filter: `blur(${TRAIL_BLUR_PX}px)`,
                }}
              />
              <div
                className="rounded-full"
                style={{
                  width: meteorPx,
                  height: meteorPx,
                  background: `radial-gradient(circle, ${BOSS_SKILL_VFX_STYLE.CORE_COLOR} 0%, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)} 35%, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)} 70%, transparent 100%)`,
                  boxShadow: `0 0 ${Math.round(meteorPx * GLOW_RATIO)}px ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)}`,
                }}
              />
            </div>
            <div
              className="absolute bottom-0 left-1/2 rounded-[50%] animate-skill-splash"
              style={{
                width: meteorPx * SPLASH_WIDTH_RATIO,
                height: meteorPx * SPLASH_HEIGHT_RATIO,
                background: `radial-gradient(ellipse, transparent 35%, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} 60%, transparent 72%)`,
                animationDelay: `${delayMs + SPLASH_DELAY_MS}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
});

MeteorRain2D.displayName = 'MeteorRain2D';
