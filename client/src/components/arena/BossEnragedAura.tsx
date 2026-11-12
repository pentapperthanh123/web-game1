import React from 'react';
import { BossThemeConfig } from '../../constants/game';

interface BossEnragedAuraProps {
  themeConfig: BossThemeConfig;
}

export const BossEnragedAura: React.FC<BossEnragedAuraProps> = React.memo(
  ({ themeConfig }) => {
    const enragedHex = themeConfig.colors.enragedHex;
    const primaryHex = themeConfig.colors.primaryHex;
    const secondaryHex = themeConfig.colors.secondaryHex;

    const primaryGlow = `${enragedHex}80`;
    const secondaryGlow = `${primaryHex}70`;

    return (
      <div className="absolute inset-0 pointer-events-none z-0 overflow-visible flex items-center justify-center">
        {/* Layer 1: Core Intense Molten Flame Ring */}
        <div
          style={{
            background: `radial-gradient(circle, ${enragedHex}88 0%, ${primaryHex}66 46%, transparent 74%)`,
            boxShadow: `0 0 80px ${primaryGlow}, inset 0 0 60px ${secondaryGlow}`,
          }}
          className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full animate-enraged-flames-pulse blur-xl"
        />

        {/* Layer 2: Wild Fiery Energy Arcs SVG */}
        <div className="absolute w-72 h-72 sm:w-88 sm:h-88 animate-spin-slow opacity-80 pointer-events-none">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id={`enragedAuraGrad_${themeConfig.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={enragedHex} stopOpacity="0.85" />
                <stop offset="50%" stopColor={secondaryHex} stopOpacity="0.45" />
                <stop offset="100%" stopColor={primaryHex} stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke={`url(#enragedAuraGrad_${themeConfig.id})`}
              strokeWidth="2.5"
              strokeDasharray="14 10 24 8 18 12"
              className="opacity-75"
            />
            <circle
              cx="100"
              cy="100"
              r="76"
              fill="none"
              stroke={primaryHex}
              strokeWidth="1.5"
              strokeDasharray="8 14 30 10"
              className="opacity-60"
            />
          </svg>
        </div>

        {/* Layer 3: Rising Molten Flame Sparks at Boss Base */}
        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-48 sm:w-64 h-16 pointer-events-none">
          <div
            style={{
              background: `linear-gradient(to top, ${enragedHex}aa, ${primaryHex}55, transparent)`,
            }}
            className="w-full h-full rounded-t-full blur-md animate-pulse"
          />
        </div>
      </div>
    );
  }
);

BossEnragedAura.displayName = 'BossEnragedAura';
