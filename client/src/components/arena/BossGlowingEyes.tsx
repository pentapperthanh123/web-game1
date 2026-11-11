import React from 'react';

interface BossGlowingEyesProps {
  isActive: boolean;
  isElderDragon: boolean;
  isRestless: boolean;
}

export const BossGlowingEyes: React.FC<BossGlowingEyesProps> = React.memo(
  ({ isActive, isElderDragon, isRestless }) => {
    if (!isActive) return null;

    const eyeColor = isRestless
      ? '#ef4444'
      : isElderDragon
        ? '#fbbf24'
        : '#c084fc';

    const eyeClass = isElderDragon
      ? 'w-2 h-2 sm:w-2.5 sm:h-2.5'
      : 'w-2 h-2 sm:w-2.5 sm:h-2.5';

    // Positions relative to sprite head
    const leftEyePos = isElderDragon
      ? { top: '26%', left: '46%' }
      : { top: '22%', left: '46%' };

    const rightEyePos = isElderDragon
      ? { top: '26%', left: '54%' }
      : { top: '22%', left: '52%' };

    return (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
        {/* Left Eye Flare */}
        <div
          style={{
            ...leftEyePos,
            backgroundColor: eyeColor,
            boxShadow: `0 0 16px ${eyeColor}, 0 0 32px ${eyeColor}`,
          }}
          className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 animate-eye-surge ${eyeClass}`}
        />

        {/* Right Eye Flare */}
        <div
          style={{
            ...rightEyePos,
            backgroundColor: eyeColor,
            boxShadow: `0 0 16px ${eyeColor}, 0 0 32px ${eyeColor}`,
          }}
          className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 animate-eye-surge ${eyeClass}`}
        />
      </div>
    );
  }
);

BossGlowingEyes.displayName = 'BossGlowingEyes';
