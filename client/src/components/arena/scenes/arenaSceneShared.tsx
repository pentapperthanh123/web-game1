import React from 'react';
import './arenaScenes.css';

/** Deterministic PRNG (mulberry32) so scenes look identical on every render and every client. */
export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

const lerp = (min: number, max: number, t: number): number => min + (max - min) * t;

export interface RisingParticleSpec {
  leftPercent: number;
  bottomPercent: number;
  sizePx: number;
  durationS: number;
  delayS: number;
  swayPx: number;
  color: string;
}

export interface RisingParticleConfig {
  seed: number;
  count: number;
  colors: readonly string[];
  minSizePx: number;
  maxSizePx: number;
  minDurationS: number;
  maxDurationS: number;
  /** Horizontal band the particles start in, in % of the viewport width. */
  minLeftPercent: number;
  maxLeftPercent: number;
  maxBottomPercent: number;
  maxSwayPx: number;
}

export const buildRisingParticles = (config: RisingParticleConfig): RisingParticleSpec[] => {
  const random = createSeededRandom(config.seed);
  return Array.from({ length: config.count }, (_, index) => {
    const durationS = lerp(config.minDurationS, config.maxDurationS, random());
    return {
      leftPercent: lerp(config.minLeftPercent, config.maxLeftPercent, random()),
      bottomPercent: random() * config.maxBottomPercent,
      sizePx: lerp(config.minSizePx, config.maxSizePx, random()),
      durationS,
      // Negative delay starts each particle mid-flight, so the layer is full on first paint
      delayS: -random() * durationS,
      swayPx: (random() * 2 - 1) * config.maxSwayPx,
      color: config.colors[index % config.colors.length],
    };
  });
};

const PARTICLE_GLOW_RATIO = 3;

interface RisingParticlesProps {
  particles: readonly RisingParticleSpec[];
}

/** Glowing motes drifting upward (void spores, cosmic dust). Pure CSS animation. */
export const RisingParticles = React.memo(({ particles }: RisingParticlesProps) => (
  <div className="absolute inset-0 overflow-hidden">
    {particles.map((particle, index) => (
      <span
        key={index}
        className="absolute rounded-full arena-rise-particle"
        style={
          {
            left: `${particle.leftPercent}%`,
            bottom: `${particle.bottomPercent}%`,
            width: particle.sizePx,
            height: particle.sizePx,
            background: particle.color,
            boxShadow: `0 0 ${particle.sizePx * PARTICLE_GLOW_RATIO}px ${particle.color}`,
            animationDuration: `${particle.durationS}s`,
            animationDelay: `${particle.delayS}s`,
            '--arena-particle-sway': `${particle.swayPx}px`,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
));

RisingParticles.displayName = 'RisingParticles';
