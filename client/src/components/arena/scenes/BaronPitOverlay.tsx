import React from 'react';
import { RisingParticles, buildRisingParticles } from './arenaSceneShared';

/**
 * Baron Nashor's pit, layered over the painted rune cave:
 * golden god rays through the ceiling crack, a pulsing void-acid pool under the boss,
 * spores rising out of it and a slow sheen on the underground river.
 */
const BARON_PALETTE = {
  ACID_CORE: 'rgba(192, 132, 252, 0.55)',
  ACID_MID: 'rgba(126, 34, 206, 0.35)',
  ACID_TOXIC: 'rgba(45, 212, 191, 0.18)',
  RIM: 'rgba(216, 180, 254, 0.55)',
  RAY: 'rgba(253, 224, 171, 0.5)',
  RIVER: 'rgba(216, 180, 254, 0.28)',
  CEILING_SHADE: 'rgba(2, 6, 23, 0.5)',
  /** Soft-light grade that pushes the shared cave painting toward Baron's toxic violet. */
  GRADE_TOP: 'rgba(30, 27, 75, 0.55)',
  GRADE_BOTTOM: 'rgba(147, 51, 234, 0.6)',
  PIT_HAZE: 'rgba(88, 28, 135, 0.45)',
} as const;

const SPORE_PARTICLES = buildRisingParticles({
  seed: 7331,
  count: 32,
  colors: ['#c084fc', '#a78bfa', '#5eead4', '#e9d5ff', '#f0abfc'],
  minSizePx: 2.5,
  maxSizePx: 5.5,
  minDurationS: 9,
  maxDurationS: 16,
  minLeftPercent: 22,
  maxLeftPercent: 78,
  maxBottomPercent: 28,
  maxSwayPx: 26,
});

interface GodRaySpec {
  leftPercent: number;
  widthPercent: number;
  angleDeg: number;
  delayS: number;
}

const GOD_RAYS: readonly GodRaySpec[] = [
  { leftPercent: 68, widthPercent: 12, angleDeg: 16, delayS: 0 },
  { leftPercent: 78, widthPercent: 8, angleDeg: 22, delayS: -3.5 },
  { leftPercent: 60, widthPercent: 6, angleDeg: 11, delayS: -7 },
];

const GodRays = () => (
  <>
    {GOD_RAYS.map((ray) => (
      <div
        key={ray.leftPercent}
        className="absolute top-[6%] h-[80%] arena-god-ray mix-blend-screen blur-[8px]"
        style={
          {
            left: `${ray.leftPercent}%`,
            width: `${ray.widthPercent}%`,
            background: `linear-gradient(to bottom, ${BARON_PALETTE.RAY}, transparent 85%)`,
            animationDelay: `${ray.delayS}s`,
            '--arena-ray-angle': `${ray.angleDeg}deg`,
          } as React.CSSProperties
        }
      />
    ))}
  </>
);

const AcidPool = () => (
  <>
    <div
      className="absolute left-1/2 top-[79%] w-[115vmin] h-[34vmin] rounded-[50%] arena-acid-pulse mix-blend-screen"
      style={{
        background: `radial-gradient(ellipse at center, ${BARON_PALETTE.ACID_CORE} 0%, ${BARON_PALETTE.ACID_MID} 38%, ${BARON_PALETTE.ACID_TOXIC} 60%, transparent 74%)`,
      }}
    />
    <div
      className="absolute left-1/2 top-[79%] w-[78vmin] h-[17vmin] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border opacity-60"
      style={{ borderColor: BARON_PALETTE.RIM, boxShadow: `0 0 18px ${BARON_PALETTE.RIM}` }}
    />
  </>
);

const RiverSheen = () => (
  <div className="absolute inset-x-0 bottom-0 h-[20%] overflow-hidden mix-blend-screen [mask-image:linear-gradient(to_top,black_40%,transparent)]">
    <div
      className="absolute inset-y-0 -left-1/4 w-[150%] arena-river-sheen"
      style={{
        background: `repeating-linear-gradient(174deg, transparent 0 14px, ${BARON_PALETTE.RIVER} 14px 16px, transparent 16px 30px)`,
        filter: 'blur(1.5px)',
      }}
    />
  </div>
);

export const BaronPitOverlay = () => (
  <div className="absolute inset-0 pointer-events-none">
    {/* Colour grade: same painting as the Herald cave, but sunk into Baron's violet acid gloom */}
    <div
      className="absolute inset-0 mix-blend-soft-light"
      style={{ background: `linear-gradient(to bottom, ${BARON_PALETTE.GRADE_TOP}, ${BARON_PALETTE.GRADE_BOTTOM})` }}
    />
    <div
      className="absolute inset-x-0 bottom-0 h-[45%]"
      style={{ background: `linear-gradient(to top, ${BARON_PALETTE.PIT_HAZE}, transparent)` }}
    />
    {/* Shade only the HUD strip so the light rays below it still read */}
    <div
      className="absolute inset-x-0 top-0 h-[20%]"
      style={{ background: `linear-gradient(to bottom, ${BARON_PALETTE.CEILING_SHADE}, transparent)` }}
    />
    <GodRays />
    <RiverSheen />
    <AcidPool />
    <RisingParticles particles={SPORE_PARTICLES} />
  </div>
);
