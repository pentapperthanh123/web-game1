import React from 'react';
import { createSeededRandom } from './arenaSceneShared';

interface StarSpec {
  x: number;
  y: number;
  radius: number;
  delayS: number;
  durationS: number;
  color: string;
}

interface StarLayerConfig {
  seed: number;
  count: number;
  minRadius: number;
  maxRadius: number;
  colors: readonly string[];
}

/** Viewbox units: stars are scattered over a 100 x 178 (9:16) canvas stretched to the viewport. */
const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 178;
const MIN_TWINKLE_S = 2.4;
const TWINKLE_SPREAD_S = 3.2;
const HALO_RADIUS_MULTIPLIER = 2.2;
const HALO_OPACITY = 0.28;

const DUST_LAYER: StarLayerConfig = {
  seed: 1907,
  count: 140,
  minRadius: 0.12,
  maxRadius: 0.3,
  colors: ['#e0f2fe', '#bae6fd', '#f5d0fe', '#ffffff'],
};

const BRIGHT_LAYER: StarLayerConfig = {
  seed: 4421,
  count: 24,
  minRadius: 0.35,
  maxRadius: 0.65,
  colors: ['#ffffff', '#c084fc', '#a5f3fc', '#f0abfc'],
};

const buildStars = (config: StarLayerConfig): StarSpec[] => {
  const random = createSeededRandom(config.seed);
  return Array.from({ length: config.count }, (_, index) => ({
    x: random() * VIEWBOX_WIDTH,
    y: random() * VIEWBOX_HEIGHT,
    radius: config.minRadius + random() * (config.maxRadius - config.minRadius),
    delayS: -random() * TWINKLE_SPREAD_S * 2,
    durationS: MIN_TWINKLE_S + random() * TWINKLE_SPREAD_S,
    color: config.colors[index % config.colors.length],
  }));
};

const DUST_STARS = buildStars(DUST_LAYER);
const BRIGHT_STARS = buildStars(BRIGHT_LAYER);

/** Fine dust layer is static so the browser rasterizes it once. */
const DustStarLayer = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
    preserveAspectRatio="xMidYMid slice"
  >
    {DUST_STARS.map((star, index) => (
      <circle key={index} cx={star.x} cy={star.y} r={star.radius} fill={star.color} opacity={0.75} />
    ))}
  </svg>
);

/** Bright stars emulate soft bloom with an additive concentric circle instead of SVG filter drop-shadow. */
const BrightStarLayer = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
    preserveAspectRatio="xMidYMid slice"
  >
    {BRIGHT_STARS.map((star, index) => (
      <g
        key={index}
        className="arena-star-twinkle"
        style={{ animationDelay: `${star.delayS}s`, animationDuration: `${star.durationS}s` }}
      >
        <circle
          cx={star.x}
          cy={star.y}
          r={star.radius * HALO_RADIUS_MULTIPLIER}
          fill={star.color}
          opacity={HALO_OPACITY}
        />
        <circle cx={star.x} cy={star.y} r={star.radius} fill={star.color} />
      </g>
    ))}
  </svg>
);

/** Two star layers: cached static dust plus gently twinkling haloed bright stars. */
export const VoidStarfield = React.memo(() => (
  <div className="absolute inset-0">
    <DustStarLayer />
    <BrightStarLayer />
  </div>
));

VoidStarfield.displayName = 'VoidStarfield';
