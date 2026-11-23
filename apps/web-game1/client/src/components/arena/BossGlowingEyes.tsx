import React from 'react';
import { BossThemeConfig } from '../../constants/game';

interface BossGlowingEyesProps {
  isActive: boolean;
  themeConfig: BossThemeConfig;
  isRestless: boolean;
  isEnraged?: boolean;
}

const resolveEyeColor = (
  isEnraged: boolean,
  isRestless: boolean,
  themeConfig: BossThemeConfig
): string => {
  if (isEnraged) {
    return themeConfig.colors.enragedHex || '#ef4444';
  }
  if (isRestless) {
    return '#ef4444';
  }
  return themeConfig.eyeColorHex || themeConfig.colors.primaryHex;
};

export const BossGlowingEyes: React.FC<BossGlowingEyesProps> = React.memo(
  ({ isActive, themeConfig, isRestless, isEnraged = false }) => {
    // When enraged, eyes blaze continuously
    const shouldDisplay = isActive || isEnraged;
    if (!shouldDisplay) return null;

    const eyeColor = resolveEyeColor(isEnraged, isRestless, themeConfig);
    const animClass = isEnraged ? 'animate-enraged-eye-blaze' : 'animate-eye-surge';
    const eyeClass = 'w-2 h-2 sm:w-2.5 sm:h-2.5';

    // Positions relative to sprite head
    const leftEyePos = themeConfig.eyePositions.left;
    const rightEyePos = themeConfig.eyePositions.right;

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
