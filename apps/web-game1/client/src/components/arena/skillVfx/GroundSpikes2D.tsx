import React from 'react';
import { BOSS_SKILL_VFX_2D_ALPHA, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { SKILL_VFX_2D_LAYER_STYLE, SkillVfx2DProps, useSeededOffsets, withAlpha } from './skillVfxShared';

const STAGGER_MS = 55;
const BASE_HEIGHT_PX = 90;
const SPIKE_CLIP_PATH = 'polygon(50% 0%, 100% 100%, 0% 100%)';
const SPIKE_WIDTH_RATIO = 0.32;
const SPIKE_MIN_SIZE = 0.6;
const SPIKE_SIZE_RANGE = 0.7;
const LEFT_MIN_PERCENT = 5;
const LEFT_RANGE_PERCENT = 90;
const BASE_GLOW_WIDTH_RATIO = 2.4;
const BASE_GLOW_HEIGHT_RATIO = 0.35;
const RANDOMS_PER_SPIKE = 2;

/** Crystal spikes bursting from the floor: tinted body, white-hot tip and a soft glow pool at the base. */
export const GroundSpikes2D: React.FC<SkillVfx2DProps> = React.memo(({ color, secondaryColor, scale, count, nonce }) => {
  const offsets = useSeededOffsets(nonce, count * RANDOMS_PER_SPIKE);
  const heightPx = Math.round(BASE_HEIGHT_PX * scale);

  return (
    <div className="absolute inset-x-[-30%] top-[82%] h-0 pointer-events-none z-10" style={SKILL_VFX_2D_LAYER_STYLE}>
      {Array.from({ length: count }, (_, index) => {
        const leftPercent = LEFT_MIN_PERCENT + offsets[index * RANDOMS_PER_SPIKE] * LEFT_RANGE_PERCENT;
        const spikeHeightPx = heightPx * (SPIKE_MIN_SIZE + offsets[index * RANDOMS_PER_SPIKE + 1] * SPIKE_SIZE_RANGE);
        const spikeWidthPx = spikeHeightPx * SPIKE_WIDTH_RATIO;
        return (
          <div
            key={`${nonce}-${index}`}
            className="absolute bottom-0 origin-bottom animate-skill-spike-rise"
            style={{ left: `${leftPercent}%`, animationDelay: `${index * STAGGER_MS}ms` }}
          >
            <div
              className="absolute bottom-0 left-1/2 rounded-[50%] -translate-x-1/2 translate-y-1/2"
              style={{
                width: spikeWidthPx * BASE_GLOW_WIDTH_RATIO,
                height: spikeHeightPx * BASE_GLOW_HEIGHT_RATIO,
                background: `radial-gradient(ellipse, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)} 0%, transparent 70%)`,
              }}
            />
            <div
              style={{
                width: spikeWidthPx,
                height: spikeHeightPx,
                clipPath: SPIKE_CLIP_PATH,
                background: `linear-gradient(to top, ${withAlpha(color, BOSS_SKILL_VFX_2D_ALPHA.MEDIUM)}, ${withAlpha(secondaryColor, BOSS_SKILL_VFX_2D_ALPHA.STRONG)} 65%, ${BOSS_SKILL_VFX_STYLE.CORE_COLOR})`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
});

GroundSpikes2D.displayName = 'GroundSpikes2D';
