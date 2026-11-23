import React from 'react';
import { getEffectivePreset, useClashStore } from '../store/clashStore';

export const TopHUD: React.FC = () => {
  const leftScore = useClashStore((s) => s.leftScore);
  const rightScore = useClashStore((s) => s.rightScore);
  const roundTimeRemaining = useClashStore((s) => s.roundTimeRemaining);
  const seriesScore = useClashStore((s) => s.seriesScore);
  const roundNumber = useClashStore((s) => s.roundNumber);
  const isStrobeWarning = useClashStore((s) => s.isStrobeWarning);
  const recentLeftContributors = useClashStore((s) => s.recentLeftContributors);
  const recentRightContributors = useClashStore((s) => s.recentRightContributors);
  const preset = useClashStore((s) => getEffectivePreset(s.activePresetId, s.customPreset));

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const mm = mins.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const leftMvp = recentLeftContributors[0];
  const rightMvp = recentRightContributors[0];

  const leftAvatar =
    leftMvp?.avatarUrl || preset.leftTeam.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Girl';
  const rightAvatar =
    rightMvp?.avatarUrl || preset.rightTeam.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Boy';

  return (
    <div className="absolute top-0 left-0 right-0 h-[150px] z-30 pointer-events-none px-4 pt-3 flex flex-col justify-between">
      {/* Top Banner Row */}
      <div className="flex items-center justify-between">
        {/* Left Team Pill */}
        <div
          className="flex items-center space-x-2 px-3 py-1.5 rounded-full shadow-lg border border-white/30 backdrop-blur-md"
          style={{ backgroundColor: preset.leftTeam.primaryColor + 'D9' }}
        >
          <img
            src={leftAvatar}
            alt={preset.leftTeam.name}
            className="w-8 h-8 rounded-full border-2 border-white object-cover bg-black/20"
          />
          <span className="font-extrabold text-sm tracking-wider text-white">
            {preset.leftTeam.name}
          </span>
          <span className="bg-black/40 px-2.5 py-0.5 rounded-full font-black text-base text-yellow-300">
            {leftScore}
          </span>
        </div>

        {/* Center Live & Match Counter */}
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-1.5 bg-red-600 px-3 py-0.5 rounded-full text-white font-black text-xs tracking-wider shadow-md animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
            <span>LIVE</span>
          </div>

          <div className="mt-1 px-3 py-0.5 bg-black/60 rounded-full border border-white/20 text-center backdrop-blur-sm">
            <span className="text-xl font-black text-white tracking-widest font-mono">
              {formatTimer(roundTimeRemaining)}
            </span>
          </div>

          <div className="text-[11px] font-bold text-white/80 mt-0.5 drop-shadow">
            Hiệp {roundNumber} ({seriesScore.left} - {seriesScore.right})
          </div>
        </div>

        {/* Right Team Pill */}
        <div
          className="flex items-center space-x-2 px-3 py-1.5 rounded-full shadow-lg border border-white/30 backdrop-blur-md"
          style={{ backgroundColor: preset.rightTeam.primaryColor + 'D9' }}
        >
          <span className="bg-black/40 px-2.5 py-0.5 rounded-full font-black text-base text-yellow-300">
            {rightScore}
          </span>
          <span className="font-extrabold text-sm tracking-wider text-white">
            {preset.rightTeam.name}
          </span>
          <img
            src={rightAvatar}
            alt={preset.rightTeam.name}
            className="w-8 h-8 rounded-full border-2 border-white object-cover bg-black/20"
          />
        </div>
      </div>

      {/* Warning Strobe Banner when clash is near edge */}
      {isStrobeWarning && (
        <div className="mx-auto bg-red-600/90 text-white font-black text-xs px-4 py-1 rounded-full uppercase tracking-widest animate-bounce shadow-lg border border-yellow-300">
          ⚠️ NGUY CƠ BỊ ÉP SÂN! LẬT KÈO NGAY!
        </div>
      )}
    </div>
  );
};
