import React from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, useSeededOffsets, withAlpha } from './skillVfxShared';

const STAGGER_MS = 60;
const BASE_PUFF_PX = 70;
const PUFF_START_PX = 40;
const PUFF_SPACING_PX = 42;
const PUFF_MIN_SIZE = 0.6;
const PUFF_SIZE_RANGE = 0.6;
const PUFF_ASPECT = 0.5;
const PUFF_BLUR_PX = 4;
const STREAK_LENGTH_PX = 220;
const STREAK_TOPS: readonly string[] = ['48%', '56%', '64%'];
const STREAK_LENGTH_FACTORS: readonly number[] = [0.7, 1, 0.8];
const STREAK_STAGGER_MS = 50;
const STREAK_HEIGHT_PX = 2;
const STREAK_GLOW_PX = 8;

/** Soft dust puffs and tapered speed streaks trailing behind the boss as it charges the target side. */
export const ChargeDash2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, count, direction, nonce }) => {
  const offsets = useSeededOffsets(nonce, count);
  const trailSide = direction >= 0 ? -1 : 1;
  const streakTranslate = trailSide > 0 ? '0' : '-100%';
  const streakGradientDirection = trailSide > 0 ? 'to right' : 'to left';

  return (
    <div className="absolute inset-0 pointer-events-none z-10" style={SKILL_VFX_2D_LAYER_STYLE}>
      {offsets.map((random, index) => {
        const sizeFactor = PUFF_MIN_SIZE + random * PUFF_SIZE_RANGE;
        return (
          <div
            key={`${nonce}-${index}`}
            className="absolute left-1/2 top-[78%] animate-skill-dash-puff"
            style={{
              ['--puff-x' as string]: `${trailSide * (PUFF_START_PX + index * PUFF_SPACING_PX) * scale}px`,
              animationDelay: `${index * STAGGER_MS}ms`,
            }}
          >
            <div
              className="rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{
                width: Math.round(BASE_PUFF_PX * sizeFactor * scale),
                height: Math.round(BASE_PUFF_PX * PUFF_ASPECT * sizeFactor * scale),
                background: `radial-gradient(circle, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} 0%, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)} 50%, transparent 75%)`,
                filter: `blur(${PUFF_BLUR_PX}px)`,
              }}
            />
          </div>
        );
      })}
      {STREAK_TOPS.map((top, index) => (
        <div
          key={`${nonce}-streak-${index}`}
          className="absolute left-1/2 animate-skill-speed-lines"
          style={{ top, animationDelay: `${index * STREAK_STAGGER_MS}ms` }}
        >
          <div
            className="rounded-full"
            style={{
              width: Math.round(STREAK_LENGTH_PX * STREAK_LENGTH_FACTORS[index] * scale),
              height: STREAK_HEIGHT_PX,
              transform: `translateX(${streakTranslate})`,
              background: `linear-gradient(${streakGradientDirection}, ${BOSS_SKILL_VFX_STYLE.CORE_COLOR}, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)} 35%, transparent)`,
              boxShadow: `0 0 ${STREAK_GLOW_PX}px ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)}`,
            }}
          />
        </div>
      ))}
    </div>
  );
});

ChargeDash2D.displayName = 'ChargeDash2D';
