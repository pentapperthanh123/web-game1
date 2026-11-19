import React from 'react';
import clsx from 'clsx';

const EQUALIZER_BARS = [
  { id: 'bar-1', animClass: 'animate-silver-scrapes-beat-1' },
  { id: 'bar-2', animClass: 'animate-silver-scrapes-beat-2' },
  { id: 'bar-3', animClass: 'animate-silver-scrapes-beat-3' },
  { id: 'bar-4', animClass: 'animate-silver-scrapes-beat-4' },
  { id: 'bar-5', animClass: 'animate-silver-scrapes-beat-2' },
] as const;

interface SilverScrapesEqualizerBarsProps {
  colorClass?: string;
  size?: 'xs' | 'sm';
}

export const SilverScrapesEqualizerBars: React.FC<SilverScrapesEqualizerBarsProps> = React.memo(
  ({ colorClass = 'bg-amber-400', size = 'sm' }) => {
    const isSmall = size === 'xs';
    const barSizeClass = isSmall ? 'w-0.5 h-2.5' : 'w-1 h-3.5';

    return (
      <div className="inline-flex items-end gap-0.5 pointer-events-none select-none" aria-hidden="true">
        {EQUALIZER_BARS.map((bar) => (
          <span
            key={bar.id}
            className={clsx('rounded-full', barSizeClass, colorClass, bar.animClass)}
          />
        ))}
      </div>
    );
  }
);

SilverScrapesEqualizerBars.displayName = 'SilverScrapesEqualizerBars';

const LASER_STYLE = {
  BEAM_TOP_ALPHA: '55',
  BEAM_MID_ALPHA: '18',
  TRUSS_SIDE_ALPHA: '66',
  FLOOR_SIDE_ALPHA: '44',
  HIGHLIGHT_HEX: '#fbbf24',
  TRUSS_CENTER_ALPHA: '99',
  FLOOR_CENTER_ALPHA: '66',
} as const;

interface SilverScrapesStadiumLasersProps {
  leftColor: string;
  rightColor: string;
}

/**
 * Esports tournament stage laser beams & top equalizer framing for the 1v1 Silver Scrapes stage.
 * Kept at subtle 22-35% opacity so 9:16 mobile viewports stay crisp and unobstructed.
 */
export const SilverScrapesStadiumLasers: React.FC<SilverScrapesStadiumLasersProps> = React.memo(
  ({ leftColor, rightColor }) => {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Left Crossing Stadium Laser */}
        <div
          style={{
            background: `linear-gradient(180deg, ${leftColor}${LASER_STYLE.BEAM_TOP_ALPHA} 0%, ${leftColor}${LASER_STYLE.BEAM_MID_ALPHA} 55%, transparent 100%)`,
          }}
          className="absolute -top-8 left-4 w-24 sm:w-32 h-[75%] blur-xl animate-stadium-laser-left"
        />

        {/* Right Crossing Stadium Laser */}
        <div
          style={{
            background: `linear-gradient(180deg, ${rightColor}${LASER_STYLE.BEAM_TOP_ALPHA} 0%, ${rightColor}${LASER_STYLE.BEAM_MID_ALPHA} 55%, transparent 100%)`,
          }}
          className="absolute -top-8 right-4 w-24 sm:w-32 h-[75%] blur-xl animate-stadium-laser-right"
        />

        {/* Top Stadium Truss Equalizer Glow Line */}
        <div
          style={{
            background: `linear-gradient(90deg, transparent 5%, ${leftColor}${LASER_STYLE.TRUSS_SIDE_ALPHA} 30%, ${LASER_STYLE.HIGHLIGHT_HEX}${LASER_STYLE.TRUSS_CENTER_ALPHA} 50%, ${rightColor}${LASER_STYLE.TRUSS_SIDE_ALPHA} 70%, transparent 95%)`,
          }}
          className="absolute top-0 inset-x-0 h-[2px] shadow-[0_0_12px_rgba(251,191,36,0.75)]"
        />

        {/* Bottom Stadium Floor Reflection Line */}
        <div
          style={{
            background: `linear-gradient(90deg, transparent 10%, ${leftColor}${LASER_STYLE.FLOOR_SIDE_ALPHA} 35%, ${LASER_STYLE.HIGHLIGHT_HEX}${LASER_STYLE.FLOOR_CENTER_ALPHA} 50%, ${rightColor}${LASER_STYLE.FLOOR_SIDE_ALPHA} 65%, transparent 90%)`,
          }}
          className="absolute bottom-0 inset-x-0 h-[2px]"
        />
      </div>
    );
  }
);

SilverScrapesStadiumLasers.displayName = 'SilverScrapesStadiumLasers';
