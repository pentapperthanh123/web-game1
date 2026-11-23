import React from 'react';
import clsx from 'clsx';
import './gift.css';

/** Golden-ratio steps spread distance / delay / size evenly without randomness (stable between renders). */
const GOLDEN_RATIO_STEP = 0.618;
const SIZE_STEP = 0.382;
const MIN_DISTANCE_RATIO = 0.7;
const MAX_DELAY_S = 0.45;
const MIN_SIZE_PX = 7;
const SIZE_SPREAD_PX = 8;

interface Sparkle {
  offsetX: number;
  offsetY: number;
  delayS: number;
  sizePx: number;
  color: string;
}

const buildSparkles = (count: number, radiusX: number, radiusY: number, colors: readonly string[]): Sparkle[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const distanceRatio = MIN_DISTANCE_RATIO + (1 - MIN_DISTANCE_RATIO) * ((index * GOLDEN_RATIO_STEP) % 1);
    return {
      offsetX: Math.cos(angle) * radiusX * distanceRatio,
      offsetY: Math.sin(angle) * radiusY * distanceRatio,
      delayS: ((index * GOLDEN_RATIO_STEP) % 1) * MAX_DELAY_S,
      sizePx: MIN_SIZE_PX + ((index * SIZE_STEP) % 1) * SIZE_SPREAD_PX,
      color: colors[index % colors.length],
    };
  });

interface GiftSparkleBurstProps {
  count: number;
  /** Horizontal / vertical reach of the burst in px (an ellipse, so it can hug a wide banner). */
  radiusX: number;
  radiusY: number;
  colors: readonly string[];
  /** Keeps twinkling for the whole banner (BIG / MEGA) instead of one pop (MEDIUM). */
  isLooping?: boolean;
}

/** Star sparkles flying out from the centre of the parent (parent must be `relative`). */
export const GiftSparkleBurst = React.memo(({ count, radiusX, radiusY, colors, isLooping = false }: GiftSparkleBurstProps) => (
  <div className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none">
    {buildSparkles(count, radiusX, radiusY, colors).map((sparkle, index) => (
      <span
        key={index}
        className={clsx('absolute gift-sparkle', isLooping ? 'animate-gift-sparkle-loop' : 'animate-gift-sparkle')}
        style={
          {
            left: -sparkle.sizePx / 2,
            top: -sparkle.sizePx / 2,
            width: sparkle.sizePx,
            height: sparkle.sizePx,
            background: sparkle.color,
            animationDelay: `${sparkle.delayS}s`,
            '--gift-sparkle-x': `${sparkle.offsetX}px`,
            '--gift-sparkle-y': `${sparkle.offsetY}px`,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
));
GiftSparkleBurst.displayName = 'GiftSparkleBurst';
