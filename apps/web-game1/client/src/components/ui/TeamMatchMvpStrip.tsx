import React from 'react';
import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useSessionLeaderboardStore } from '../../store/sessionLeaderboardStore';
import { TEAM_KEY, TeamType } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';

const COMPACT_NUMBER = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

interface TeamMvpBadgeProps {
  team: TeamType;
  slotNumber: number;
  isRightSide?: boolean;
}

const TeamMvpBadge = React.memo(({ team, slotNumber, isRightSide = false }: TeamMvpBadgeProps) => {
  const { t } = useTranslation();
  const teamProfile = useGameStore((state) => state.activeTeams[team]);
  const teamTag = teamProfile?.shortTag || team;
  const theme = getTeamTheme(teamProfile?.colorTheme);

  const mvpEntry = useSessionLeaderboardStore(
    (state) =>
      state.matchMvpByTag[teamTag] ||
      state.matchMvpByTag[teamTag.toUpperCase()] ||
      state.matchMvpByTag[team]
  );

  const hasMvp = Boolean(mvpEntry && mvpEntry.totalDamage > 0);

  return (
    <div
      key={mvpEntry?.userName || 'empty'}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border bg-slate-950/90 text-[8px] sm:text-[8.5px] font-bold shadow-sm animate-in fade-in duration-200 min-w-0 max-w-[48%] ${
        isRightSide ? 'flex-row-reverse text-right' : 'text-left'
      }`}
      style={{
        borderColor: hasMvp ? `${theme.primaryHex}60` : '#334155',
      }}
      title={
        hasMvp
          ? t('MvpStrip.mvpTitle', 'MVP {{team}}: @{{name}} ({{damage}} ST)', {
              team: teamTag,
              name: mvpEntry?.userName,
              damage: mvpEntry?.totalDamage.toLocaleString(),
            })
          : t('MvpStrip.beMvpPrompt', 'Gõ {{number}} để làm MVP!', { number: slotNumber })
      }
    >
      <Crown
        className={`w-2.5 h-2.5 shrink-0 ${
          hasMvp ? 'text-amber-300 fill-amber-400/80 drop-shadow-[0_0_4px_#fbbf24]' : 'text-slate-500'
        }`}
      />
      {hasMvp ? (
        <div className="flex items-center gap-1 min-w-0 truncate">
          <span className={`truncate font-extrabold ${theme.textClass}`}>@{mvpEntry.userName}</span>
          <span className="text-slate-400 text-[7.5px]">•</span>
          <span className="font-mono text-amber-200 shrink-0 font-extrabold">
            {COMPACT_NUMBER.format(mvpEntry.totalDamage)}
          </span>
        </div>
      ) : (
        <span className="text-slate-400 truncate italic">
          {t('MvpStrip.beMvpPrompt', 'Gõ {{number}} để làm MVP!', { number: slotNumber })}
        </span>
      )}
    </div>
  );
});

TeamMvpBadge.displayName = 'TeamMvpBadge';

/**
 * Compact Per-Team Match MVP Strip:
 * Displays the current round's top contributor for both teams right below the tug-of-war bar.
 * Updates dynamically and encourages viewers to type 1 or 2 to claim the MVP crown.
 */
export const TeamMatchMvpStrip = React.memo(() => {
  const isLeaderboardVisible = useGameStore((state) => state.overlayVisibility.leaderboard);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const activeTeams = useGameStore((state) => state.activeTeams);

  if (!isLeaderboardVisible || isRoundIntermission || roundWinner !== null) {
    return null;
  }

  const teamKeys = Object.keys(activeTeams || {}) as TeamType[];
  const leftTeamKey = teamKeys[0] ?? TEAM_KEY.BLG;
  const rightTeamKey = teamKeys[1] ?? TEAM_KEY.GENG;

  return (
    <div className="flex items-center justify-between w-full mt-1 px-0.5 gap-2 select-none pointer-events-none">
      <TeamMvpBadge team={leftTeamKey} slotNumber={1} />
      <TeamMvpBadge team={rightTeamKey} slotNumber={2} isRightSide />
    </div>
  );
});

TeamMatchMvpStrip.displayName = 'TeamMatchMvpStrip';
