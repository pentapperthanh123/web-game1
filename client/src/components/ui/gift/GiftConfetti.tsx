import React from 'react';

/** Seeded so every gift shows the same balanced burst (no layout jitter between renders). */
const DEFAULT_CONFETTI_COUNT = 24;
const CONFETTI_SEED = 4271;
const MAX_DRIFT_PX = 90;
const MAX_SPIN_DEG = 720;
const MAX_DELAY_S = 0.5;
const PIECE_WIDTH_PX = 6;
const PIECE_HEIGHT_PX = 10;

interface ConfettiPiece {
  leftPercent: number;
  driftPx: number;
  spinDeg: number;
  delayS: number;
  color: string;
}

const createRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
};

const buildPieces = (colors: readonly string[], count: number): ConfettiPiece[] => {
  const random = createRandom(CONFETTI_SEED);
  return Array.from({ length: count }, (_, index) => ({
    leftPercent: random() * 100,
    driftPx: (random() * 2 - 1) * MAX_DRIFT_PX,
    spinDeg: (random() * 2 - 1) * MAX_SPIN_DEG,
    delayS: random() * MAX_DELAY_S,
    color: colors[index % colors.length],
  }));
};

interface GiftConfettiProps {
  colors: readonly string[];
  /** More pieces for bigger gifts. */
  count?: number;
}

export const GiftConfetti = React.memo(({ colors, count = DEFAULT_CONFETTI_COUNT }: GiftConfettiProps) => (
  <div className="absolute inset-x-0 top-0 h-0 overflow-visible pointer-events-none">
    {buildPieces(colors, count).map((piece, index) => (
      <span
        key={index}
        className="absolute top-0 rounded-[1px] animate-gift-confetti"
        style={
          {
            left: `${piece.leftPercent}%`,
            width: PIECE_WIDTH_PX,
            height: PIECE_HEIGHT_PX,
            background: piece.color,
            animationDelay: `${piece.delayS}s`,
            '--gift-confetti-drift': `${piece.driftPx}px`,
            '--gift-confetti-spin': `${piece.spinDeg}deg`,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
));
GiftConfetti.displayName = 'GiftConfetti';
