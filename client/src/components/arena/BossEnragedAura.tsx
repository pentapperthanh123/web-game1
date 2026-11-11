import React from 'react';

interface BossEnragedAuraProps {
  isElderDragon: boolean;
}

export const BossEnragedAura: React.FC<BossEnragedAuraProps> = React.memo(
  ({ isElderDragon }) => {
    const primaryGlow = isElderDragon ? 'rgba(245, 158, 11, 0.45)' : 'rgba(239, 68, 68, 0.5)';
    const secondaryGlow = isElderDragon ? 'rgba(234, 88, 12, 0.4)' : 'rgba(147, 51, 234, 0.45)';

    return (
      <div className="absolute inset-0 pointer-events-none z-0 overflow-visible flex items-center justify-center">
        {/* Layer 1: Core Intense Molten Flame Ring */}
        <div
          style={{
            background: isElderDragon
              ? 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(234,88,12,0.4) 45%, transparent 72%)'
              : 'radial-gradient(circle, rgba(239,68,68,0.55) 0%, rgba(147,51,234,0.4) 48%, transparent 74%)',
            boxShadow: `0 0 80px ${primaryGlow}, inset 0 0 60px ${secondaryGlow}`,
          }}
          className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full animate-enraged-flames-pulse blur-xl"
        />

        {/* Layer 2: Wild Fiery Energy Arcs SVG */}
        <div className="absolute w-72 h-72 sm:w-88 sm:h-88 animate-spin-slow opacity-80 pointer-events-none">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="enragedAuraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isElderDragon ? '#f59e0b' : '#ef4444'} stopOpacity="0.8" />
                <stop offset="50%" stopColor={isElderDragon ? '#ea580c' : '#c084fc'} stopOpacity="0.4" />
                <stop offset="100%" stopColor={isElderDragon ? '#fbbf24' : '#f43f5e'} stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="url(#enragedAuraGrad)"
              strokeWidth="2.5"
              strokeDasharray="14 10 24 8 18 12"
              className="opacity-75"
            />
            <circle
              cx="100"
              cy="100"
              r="76"
              fill="none"
              stroke={isElderDragon ? '#fbbf24' : '#ef4444'}
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
              background: isElderDragon
                ? 'linear-gradient(to top, rgba(234,88,12,0.6), rgba(245,158,11,0.3), transparent)'
                : 'linear-gradient(to top, rgba(239,68,68,0.7), rgba(168,85,247,0.35), transparent)',
            }}
            className="w-full h-full rounded-t-full blur-md animate-pulse"
          />
        </div>
      </div>
    );
  }
);

BossEnragedAura.displayName = 'BossEnragedAura';
