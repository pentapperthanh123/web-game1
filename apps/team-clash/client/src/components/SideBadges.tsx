import React from 'react';
import type { ViewerSummary } from '../../../shared/types/clash';
import { useClashStore } from '../store/clashStore';

export const SideBadges: React.FC = () => {
  const { recentLeftContributors, recentRightContributors, getActivePreset } = useClashStore();
  const preset = getActivePreset();

  return (
    <div className="absolute inset-x-0 top-[280px] pointer-events-none z-20 flex justify-between px-3">
      {/* Left Badges (TEAM G / SUPER G) */}
      <div className="flex flex-col space-y-4">
        {recentLeftContributors.slice(0, 2).map((user: ViewerSummary, idx: number) => (
          <div
            key={user.id}
            className="flex items-center space-x-1.5 bg-pink-900/80 border border-pink-400/60 rounded-full pl-1 pr-3 py-1 shadow-lg backdrop-blur-sm animate-badge-float"
            style={{ animationDelay: `${idx * 0.3}s` }}
          >
            <img
              src={
                user.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
              }
              alt={user.nickname}
              className="w-7 h-7 rounded-full border border-pink-300 object-cover"
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-pink-200 tracking-wider">
                {idx === 0 ? `SUPER ${preset.leftTeam.name[0]}` : `TEAM ${preset.leftTeam.name[0]}`}
              </span>
              <span className="text-[11px] font-bold text-white max-w-[65px] truncate leading-none">
                {user.nickname}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Right Badges (TEAM B / SUPER B) */}
      <div className="flex flex-col space-y-4 items-end">
        {recentRightContributors.slice(0, 2).map((user: ViewerSummary, idx: number) => (
          <div
            key={user.id}
            className="flex items-center space-x-1.5 bg-blue-900/80 border border-cyan-400/60 rounded-full pr-1 pl-3 py-1 shadow-lg backdrop-blur-sm animate-badge-float"
            style={{ animationDelay: `${idx * 0.3}s` }}
          >
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-black text-cyan-200 tracking-wider">
                {idx === 0 ? `SUPER ${preset.rightTeam.name[0]}` : `TEAM ${preset.rightTeam.name[0]}`}
              </span>
              <span className="text-[11px] font-bold text-white max-w-[65px] truncate leading-none">
                {user.nickname}
              </span>
            </div>
            <img
              src={
                user.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
              }
              alt={user.nickname}
              className="w-7 h-7 rounded-full border border-cyan-300 object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
