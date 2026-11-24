import React from 'react';
import type { TeamId, ViewerSummary } from '../../../shared/types/clash';
import { getEffectivePreset, useClashStore } from '../store/clashStore';
import { ViewerAvatar } from './ViewerAvatar';
import { useClashText } from '../i18n/clashText';

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

const TeamTopList: React.FC<{
  side: TeamId;
  teamName: string;
  color: string;
  contributors: ViewerSummary[];
}> = ({ side, teamName, color, contributors }) => {
  const text = useClashText();
  const isLeft = side === 'LEFT';
  if (contributors.length === 0) return <div />;

  return (
    <div className={`flex flex-col gap-2 ${isLeft ? 'items-start' : 'items-end'}`}>
      <span
        className="px-3 py-0.5 rounded-full text-[12px] font-black tracking-widest text-white shadow-md"
        style={{ backgroundColor: color }}
      >
        {text.topTeam(teamName)}
      </span>
      {contributors.map((user, index) => (
        <div
          key={user.id}
          className={`flex items-center gap-2 rounded-full border-2 shadow-lg py-1 ${
            isLeft ? 'flex-row pl-1 pr-3' : 'flex-row-reverse pr-1 pl-3'
          }`}
          style={{ borderColor: color, backgroundColor: 'rgba(6, 8, 20, 0.82)' }}
        >
          <ViewerAvatar
            src={user.avatarUrl}
            name={user.nickname}
            seed={user.username}
            sizePx={index === 0 ? 44 : 38}
            ringColor={color}
            ringWidthPx={2}
          />
          <div className={`flex flex-col min-w-0 leading-tight ${isLeft ? 'items-start' : 'items-end'}`}>
            <span className="max-w-[128px] truncate text-[15px] leading-[1.3] font-black text-white">
              {RANK_MEDALS[index]} {user.nickname}
            </span>
            <span className="text-[12px] font-extrabold text-yellow-300">{text.points(user.totalPoints)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

/** Round leaderboard per team (top 3 by points), pinned under the HUD on each side. */
export const SideBadges: React.FC = () => {
  const topLeft = useClashStore((s) => s.topLeftContributors);
  const topRight = useClashStore((s) => s.topRightContributors);
  const preset = useClashStore((s) => getEffectivePreset(s.activePresetId, s.customPreset));

  return (
    <div className="absolute inset-x-0 top-[168px] pointer-events-none z-20 flex justify-between items-start px-3">
      <TeamTopList
        side="LEFT"
        teamName={preset.leftTeam.name}
        color={preset.leftTeam.primaryColor}
        contributors={topLeft}
      />
      <TeamTopList
        side="RIGHT"
        teamName={preset.rightTeam.name}
        color={preset.rightTeam.primaryColor}
        contributors={topRight}
      />
    </div>
  );
};
