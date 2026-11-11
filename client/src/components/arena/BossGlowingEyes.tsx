import React from 'react';
import { BOSS_ENRAGED_CONSTANTS } from '../../constants/game';

interface BossGlowingEyesProps {
  isActive: boolean;
  isElderDragon: boolean;
  isRestless: boolean;
  isEnraged?: boolean;
}

const getEyeColor = (
  isEnraged: boolean,
  isRestless: boolean,
  isElderDragon: boolean
): string => {
  if (isEnraged) {
    return isElderDragon
      ? BOSS_ENRAGED_CONSTANTS.EYE_COLOR_ELDER
      : BOSS_ENRAGED_CONSTANTS.EYE_COLOR_BARON;
  }
  if (isRestless) {
    return '#ef4444';
  }
  if (isElderDragon) {
    return '#fbbf24';
  }
  return '#c084fc';
};

export const BossGlowingEyes: React.FC<BossGlowingEyesProps> = React.memo(
  ({ isActive, isElderDragon, isRestless, isEnraged = false }) => {
    // When enraged, eyes blaze continuously
    const shouldDisplay = isActive || isEnraged;
    if (!shouldDisplay) return null;

    const eyeColor = getEyeColor(isEnraged, isRestless, isElderDragon);
    const animClass = isEnraged ? 'animate-enraged-eye-blaze' : 'animate-eye-surge';

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

    const shadowGlow = isEnraged
      ? `0 0 20px ${eyeColor}, 0 0 40px ${eyeColor}, 0 0 60px #ff0055`
      : `0 0 16px ${eyeColor}, 0 0 32px ${eyeColor}`;

    return (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
        {/* Left Eye Flare */}
        <div
          style={{
            ...leftEyePos,
            backgroundColor: eyeColor,
            boxShadow: shadowGlow,
          }}
          className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${animClass} ${eyeClass}`}
        >
          {isEnraged && (
            <div
              style={{ backgroundColor: eyeColor }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 sm:w-8 h-0.5 rounded-full blur-[0.5px] rotate-[-12deg] opacity-90"
            />
          )}
        </div>

        {/* Right Eye Flare */}
        <div
          style={{
            ...rightEyePos,
            backgroundColor: eyeColor,
            boxShadow: shadowGlow,
          }}
          className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${animClass} ${eyeClass}`}
        >
          {isEnraged && (
            <div
              style={{ backgroundColor: eyeColor }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 sm:w-8 h-0.5 rounded-full blur-[0.5px] rotate-[12deg] opacity-90"
            />
          )}
        </div>
      </div>
    );
  }
);

BossGlowingEyes.displayName = 'BossGlowingEyes';
