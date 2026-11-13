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
const BRIGHT_STAR_GLOW = 'drop-shadow(0 0 1.2px rgba(224, 242, 254, 0.95))';

const DUST_LAYER: StarLayerConfig = {
  seed: 1907,
  count: 190,
  minRadius: 0.12,
  maxRadius: 0.3,
  colors: ['#e0f2fe', '#bae6fd', '#fef3c7', '#ffffff'],
};

const BRIGHT_LAYER: StarLayerConfig = {
  seed: 4421,
  count: 38,
  minRadius: 0.35,
  maxRadius: 0.65,
  colors: ['#ffffff', '#fde68a', '#a5f3fc'],
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

interface StarLayerProps {
  stars: readonly StarSpec[];
  isGlowing: boolean;
}

const StarLayer = ({ stars, isGlowing }: StarLayerProps) => (
  <svg
    className="absolute inset-0 w-full h-full arena-star-drift"
    viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
    preserveAspectRatio="xMidYMid slice"
    style={isGlowing ? { filter: BRIGHT_STAR_GLOW } : undefined}
  >
    {stars.map((star, index) => (
      <circle
        key={index}
        className="arena-star-twinkle"
        cx={star.x}
        cy={star.y}
        r={star.radius}
        fill={star.color}
        style={{ animationDelay: `${star.delayS}s`, animationDuration: `${star.durationS}s` }}
      />
    ))}
  </svg>
);

/** Two parallax star layers: fine dust plus a few bright glinting stars. */
export const VoidStarfield = React.memo(() => (
  <div className="absolute inset-0">
    <StarLayer stars={DUST_STARS} isGlowing={false} />
    <StarLayer stars={BRIGHT_STARS} isGlowing />
  </div>
));

VoidStarfield.displayName = 'VoidStarfield';
