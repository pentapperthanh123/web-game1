import React from 'react';

interface WingGustVFXProps {
  isActive: boolean;
  color: string;
}

export const WingGustVFX: React.FC<WingGustVFXProps> = React.memo(({ isActive, color }) => {
  if (!isActive) return null;

  return (
    <div className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-72 sm:w-96 h-16 sm:h-20">
      <div
        style={{
          borderColor: color,
          boxShadow: `0 0 25px ${color}`,
        }}
        className="w-full h-full rounded-[50%] border-2 animate-wing-gust opacity-75"
      />
    </div>
  );
});

WingGustVFX.displayName = 'WingGustVFX';
