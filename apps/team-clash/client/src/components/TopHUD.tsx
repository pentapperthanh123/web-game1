import React, { useMemo } from 'react';
import { getTeamPortrait } from '../engine/characterPortrait';
import { getEffectivePreset, useClashStore } from '../store/clashStore';
import { ViewerAvatar } from './ViewerAvatar';
import { useClashText } from '../i18n/clashText';

/** Rounds won by one team; replays a bump animation whenever the count changes. */
const SeriesWins: React.FC<{ wins: number; color: string; side: 'LEFT' | 'RIGHT' }> = ({
  wins,
  color,
  side,
}) => (
  <span
    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border-2 border-white/80 shadow-md text-[15px] font-black text-white ${
      side === 'LEFT' ? 'flex-row' : 'flex-row-reverse'
    }`}
    style={{ backgroundColor: color }}
  >
    <span className="text-[13px]">🏆</span>
    <span key={wins} className="inline-block min-w-[10px] text-center animate-amount-bump">
      {wins}
    </span>
  </span>
);

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
  const text = useClashText();

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const mm = mins.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const leftPortrait = useMemo(() => getTeamPortrait(preset, 'LEFT'), [preset]);
  const rightPortrait = useMemo(() => getTeamPortrait(preset, 'RIGHT'), [preset]);

  const leftMvp = recentLeftContributors[0];
  const rightMvp = recentRightContributors[0];


  return (
    <div className="absolute top-0 left-0 right-0 h-[150px] z-30 pointer-events-none px-4 pt-3 flex flex-col justify-between">
      {/* Top Banner Row */}
      <div className="flex items-center justify-between">
        {/* Left Team Pill */}
        <div
          className="flex items-center space-x-2 px-3 py-1.5 rounded-full shadow-lg border border-white/30 backdrop-blur-md"
          style={{ backgroundColor: preset.leftTeam.primaryColor + 'D9' }}
        >
          <ViewerAvatar
            src={leftMvp ? leftMvp.avatarUrl : leftPortrait}
            name={leftMvp?.nickname ?? preset.leftTeam.name}
            seed={leftMvp?.username ?? preset.leftTeam.name}
            sizePx={32}
            ringColor={preset.leftTeam.primaryColor}
            ringWidthPx={1}
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
            <span>{text.live}</span>
          </div>

          <div className="mt-1 px-3 py-0.5 bg-black/60 rounded-full border border-white/20 text-center backdrop-blur-sm">
            <span className="text-xl font-black text-white tracking-widest font-mono">
              {formatTimer(roundTimeRemaining)}
            </span>
          </div>

          {/* Series score: rounds won by each team, in team colors */}
          <div
            className="mt-1 flex items-center gap-1.5"
            aria-label={text.seriesScore(
              preset.leftTeam.name,
              seriesScore.left,
              preset.rightTeam.name,
              seriesScore.right
            )}
          >
            <SeriesWins wins={seriesScore.left} color={preset.leftTeam.primaryColor} side="LEFT" />
            <span className="px-2 py-0.5 rounded-full bg-black/60 text-[11px] font-black tracking-widest text-white">
              {text.round(roundNumber)}
            </span>
            <SeriesWins wins={seriesScore.right} color={preset.rightTeam.primaryColor} side="RIGHT" />
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
          <ViewerAvatar
            src={rightMvp ? rightMvp.avatarUrl : rightPortrait}
            name={rightMvp?.nickname ?? preset.rightTeam.name}
            seed={rightMvp?.username ?? preset.rightTeam.name}
            sizePx={32}
            ringColor={preset.rightTeam.primaryColor}
            ringWidthPx={1}
          />
        </div>
      </div>

      {/* Warning Strobe Banner when clash is near edge */}
      {isStrobeWarning && (
        <div className="mx-auto bg-red-600/90 text-white font-black text-xs px-4 py-1 rounded-full uppercase tracking-widest animate-bounce shadow-lg border border-yellow-300">
          {text.edgeWarning}
        </div>
      )}
    </div>
  );
};
