import React from 'react';

interface GroundShockwaveRingProps {
  isActive: boolean;
  color: string;
  isUltimate: boolean;
}

export const GroundShockwaveRing: React.FC<GroundShockwaveRingProps> = React.memo(
  ({ isActive, color, isUltimate }) => {
    if (!isActive) return null;

    const ringScale = isUltimate ? 'w-80 h-28 sm:w-96 sm:h-32' : 'w-64 h-20 sm:w-72 sm:h-24';
    const borderWeight = isUltimate ? 'border-[3px]' : 'border-2';

    return (
      <div className="absolute top-[82%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        {/* Primary Ground Shockwave Ripple */}
        <div
          style={{
            borderColor: color,
            boxShadow: `0 0 35px ${color}`,
          }}
          className={`absolute rounded-[50%] animate-ground-ring ${ringScale} ${borderWeight}`}
        />
        {/* Secondary Delayed Reflection Ripple */}
        <div
          style={{
            borderColor: color,
            boxShadow: `0 0 20px ${color}`,
            animationDelay: '0.14s',
          }}
          className={`absolute rounded-[50%] animate-ground-ring ${ringScale} border`}
        />
      </div>
    );
  }
);

GroundShockwaveRing.displayName = 'GroundShockwaveRing';
