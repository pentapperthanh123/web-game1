import React from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, resolveLandingPercent, useSeededOffsets, withAlpha } from './skillVfxShared';

const STAGGER_MS = 90;
const BASE_SIZE_PX = 22;
/** Converts the landing percent offset from centre into the keyframe's horizontal travel. */
const ARC_PX_PER_PERCENT = 4;
const CENTER_PERCENT = 50;
const GLOW_RATIO = 0.9;
const SPLASH_WIDTH_RATIO = 3;
const SPLASH_HEIGHT_RATIO = 1.2;
/** Matches the moment `skillProjectileArc` lands (≈ 55% of 0.95s). */
const SPLASH_DELAY_MS = 520;

/** Glowing orbs (white core → colour → halo) spat from the boss mouth that arc down and splash softly. */
export const ProjectileArc2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, count, direction, nonce }) => {
  const offsets = useSeededOffsets(nonce, count);
  const sizePx = Math.round(BASE_SIZE_PX * scale);

  return (
    <div className="absolute inset-0 pointer-events-none z-20" style={SKILL_VFX_2D_LAYER_STYLE}>
      {offsets.map((random, index) => {
        const landingPercent = resolveLandingPercent(direction, random);
        return (
          <div
            key={`${nonce}-${index}`}
            className="absolute left-1/2 top-[42%] animate-skill-projectile-arc"
            style={{
              ['--arc-x' as string]: `${(landingPercent - CENTER_PERCENT) * ARC_PX_PER_PERCENT}px`,
              animationDelay: `${index * STAGGER_MS}ms`,
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: sizePx,
                height: sizePx,
                background: `radial-gradient(circle, ${BOSS_SKILL_VFX_STYLE.CORE_COLOR} 0%, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)} 35%, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.SOFT)} 70%, transparent 100%)`,
                boxShadow: `0 0 ${Math.round(sizePx * GLOW_RATIO)}px ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)}`,
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 rounded-[50%] animate-skill-splash"
              style={{
                width: sizePx * SPLASH_WIDTH_RATIO,
                height: sizePx * SPLASH_HEIGHT_RATIO,
                background: `radial-gradient(ellipse, transparent 35%, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} 60%, transparent 72%)`,
                animationDelay: `${index * STAGGER_MS + SPLASH_DELAY_MS}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
});

ProjectileArc2D.displayName = 'ProjectileArc2D';
