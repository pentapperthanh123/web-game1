import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { RosterPlayer } from '../../constants/roster';
import { BOSS_STATUS, GAME_CONSTANTS, TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamColorPalette } from '../../types/team';

interface TeamRosterBarProps {
  side: 'left' | 'right';
  topOffset?: number;
  isInFlow?: boolean;
}

const getAvatarBorderClass = (
  isFullFury: boolean,
  isAttacking: boolean,
  isActive: boolean,
  teamTheme: TeamColorPalette
): string => {
  if (isAttacking) {
    return 'border-white/80 shadow-[0_0_4px_rgba(255,255,255,0.5)]';
  }
  if (isFullFury) {
    return 'border-amber-300/80 shadow-[0_0_4px_rgba(245,158,11,0.45)]';
  }
  if (isActive) {
    return teamTheme.borderClass;
  }
  return `${teamTheme.borderSubtleClass} bg-slate-900`;
};

const getFuryBarFillClass = (isFullFury: boolean, fury: number): string => {
  if (isFullFury) {
    return 'bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300';
  }
  if (fury >= GAME_CONSTANTS.PRO_FURY.FURY_AUTO_CAP) {
    return 'bg-amber-400';
  }
  return 'bg-gradient-to-r from-cyan-500/80 to-amber-400/80';
};

export const TeamRosterBar = React.memo(({ side, topOffset, isInFlow }: TeamRosterBarProps) => {
  const { t } = useTranslation();
  const team = side === 'left' ? TEAM_KEY.BLG : TEAM_KEY.GENG;
  const teamProfile = useGameStore((state) => state.activeTeams[team]);
  const roster = teamProfile.roster;
  const teamTheme = getTeamTheme(teamProfile.colorTheme);
  // Primitive string key avoids re-rendering on fury-only ticks of the minions array
  const summonCountsKey = useGameStore((state) => {
    const teamRoster = state.activeTeams[team]?.roster ?? [];
    if (teamRoster.length === 0 || state.minions.length === 0) return '';
    return teamRoster
      .map((player) => {
        const playerLower = player.name.toLowerCase();
        const champLower = player.signatureChampion.toLowerCase();
        let count = 0;
        for (let i = 0; i < state.minions.length; i += 1) {
          const m = state.minions[i];
          if (m.team !== team) continue;
          const mChampLower = m.championName.toLowerCase();
          if (mChampLower.includes(playerLower) || mChampLower === champLower) count += 1;
        }
        return count;
      })
      .join(',');
  });
  const summonCounts = useMemo(
    () => (summonCountsKey ? summonCountsKey.split(',').map(Number) : []),
    [summonCountsKey]
  );
  const rosterAttackTimestamps = useGameStore((state) => state.rosterAttackTimestamps);
  const rosterPlayerFury = useGameStore((state) => state.rosterPlayerFury);
  const triggerAutoProAttack = useGameStore((state) => state.triggerAutoProAttack);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const isBossHpDepleted = useGameStore((state) => state.bossHp <= 0);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const isBattlePaused =
    bossStatus === BOSS_STATUS.DEFEATED || isBossHpDepleted || isRoundIntermission || roundWinner !== null;
  const isLeft = side === 'left';

  const handlePlayerAttack = useCallback(
    (playerIndex: number) => {
      if (isBattlePaused) return;
      triggerAutoProAttack(team, playerIndex);
    },
    [isBattlePaused, team, triggerAutoProAttack]
  );

  const isFlowLayout = Boolean(isInFlow || topOffset === undefined);

  return (
    <aside
      id={`roster-container-${team}`}
      aria-label={`${teamProfile.name} Team Roster`}
      style={!isFlowLayout && topOffset ? { top: `${topOffset}px` } : undefined}
      className={`${
        isFlowLayout
          ? 'relative'
          : `absolute ${!topOffset ? 'top-[124px] sm:top-[132px]' : ''} ${
              isLeft ? 'left-1 sm:left-1.5' : 'right-1 sm:right-1.5'
            } transition-[top] duration-200`
      } flex flex-col space-y-0.5 pointer-events-auto z-[36] select-none w-[100px] sm:w-[116px]`}
    >
      {/* Sleek Ultra-Compact Pro Player Cards */}
      {roster.map((player, playerIndex) => {
        const count = summonCounts[playerIndex] ?? 0;
        const isAttacking = Boolean(rosterAttackTimestamps[player.id]);
        const fury = rosterPlayerFury[player.id] ?? 0;
        const isFullFury = fury >= GAME_CONSTANTS.PRO_FURY.MAX_FURY;
        const isActive = count > 0 || isAttacking || isFullFury;

        return (
          <RosterItem
            key={player.id}
            player={player}
            playerIndex={playerIndex}
            count={count}
            fury={fury}
            isFullFury={isFullFury}
            isActive={isActive}
            isAttacking={isAttacking}
            isLeft={isLeft}
            teamTheme={teamTheme}
            isBattlePaused={isBattlePaused}
            furyReadyLabel={t('HUD.furyReady', 'NỘ')}
            clickToAttackLabel={t('HUD.clickToAttack', 'Nhấn để xuất chiêu!')}
            onAttack={handlePlayerAttack}
          />
        );
      })}
    </aside>
  );
});

TeamRosterBar.displayName = 'TeamRosterBar';

interface RosterItemProps {
  player: RosterPlayer;
  playerIndex: number;
  count: number;
  fury: number;
  isFullFury: boolean;
  isActive: boolean;
  isAttacking: boolean;
  isLeft: boolean;
  teamTheme: TeamColorPalette;
  isBattlePaused: boolean;
  furyReadyLabel: string;
  clickToAttackLabel: string;
  onAttack: (playerIndex: number) => void;
}

const getRosterItemCardClass = (
  isActive: boolean,
  isAttacking: boolean,
  isFullFury: boolean,
  teamTheme: TeamColorPalette
): string => {
  if (isAttacking) {
    return `${teamTheme.rosterCardActiveClass} border-white/60 brightness-110`;
  }
  if (isFullFury) {
    return 'bg-gradient-to-r from-rose-950/80 via-amber-950/70 to-slate-950/75 border-amber-400/50 shadow-[0_0_5px_rgba(245,158,11,0.3)]';
  }
  if (!isActive) {
    return 'bg-slate-950/65 border-slate-800/65 opacity-85 hover:opacity-100 hover:border-slate-700';
  }
  return teamTheme.rosterCardActiveClass;
};

const RosterItem = React.memo(({
  player,
  playerIndex,
  count,
  fury,
  isFullFury,
  isActive,
  isAttacking,
  isLeft,
  teamTheme,
  isBattlePaused,
  furyReadyLabel,
  clickToAttackLabel,
  onAttack,
}: RosterItemProps) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [player.avatarUrl]);

  const handleActivate = () => {
    if (isBattlePaused) return;
    onAttack(playerIndex);
  };

  return (
    <div
      id={`roster-card-${player.id}`}
      onClick={isBattlePaused ? undefined : handleActivate}
      role="button"
      tabIndex={isBattlePaused ? -1 : 0}
      onKeyDown={(e) => {
        if (isBattlePaused) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
      title={`${player.name} (${player.role}) • Tướng tủ: ${player.signatureChampion} • ${clickToAttackLabel}`}
      className={`w-full relative flex items-center space-x-1 sm:space-x-1.5 px-1.5 py-0.5 rounded-md border transition-all duration-150 select-none ${
        isBattlePaused
          ? 'cursor-not-allowed opacity-70 brightness-75'
          : 'cursor-pointer hover:brightness-110 active:brightness-125'
      } ${
        isLeft ? 'flex-row' : 'flex-row-reverse space-x-reverse'
      } ${getRosterItemCardClass(isActive, isAttacking, isFullFury, teamTheme)}`}
    >
      {/* Micro Pro Avatar with Mini Role Tag */}
      <div id={`roster-avatar-${player.id}`} className="relative shrink-0">
        <div
          className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full overflow-hidden border ${getAvatarBorderClass(
            isFullFury,
            isAttacking,
            isActive,
            teamTheme
          )}`}
        >
          {player.avatarUrl && !imageError ? (
            <img
              src={player.avatarUrl}
              alt={player.name}
              className="w-full h-full object-cover object-top"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-[7px] font-black ${teamTheme.avatarInitialsBgClass}`}
            >
              {player.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <span
          className={`absolute -bottom-0.5 -right-0.5 text-[6px] sm:text-[6.5px] font-mono font-black px-0.5 rounded-[2px] leading-none shadow ${teamTheme.bgBadgeClass}`}
        >
          {player.role}
        </span>
      </div>

      {/* Compact Player Name & Hairline Fury Progress */}
      <div className={`text-[9px] sm:text-[9.5px] leading-none min-w-0 flex-1 ${isLeft ? 'text-left' : 'text-right'}`}>
        <div
          className={`font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.95)] flex items-center gap-1 min-w-0 ${
            isLeft ? 'justify-start' : 'justify-end'
          }`}
        >
          <span className="truncate min-w-0">{player.name}</span>
          {count > 0 && (
            <span
              className={`text-[7.5px] px-0.5 rounded font-mono font-black shrink-0 ${teamTheme.bgBadgeClass}`}
            >
              x{count}
            </span>
          )}
          {isFullFury && (
            <span className="text-[5.5px] px-0.5 rounded bg-red-600 text-white font-black uppercase shrink-0 animate-pulse">
              {furyReadyLabel}!
            </span>
          )}
        </div>

        {/* Hairline Fury Bar */}
        <div className="w-full h-[1.5px] sm:h-0.5 bg-slate-900/90 rounded-full overflow-hidden mt-0.5">
          <div
            className={`h-full transition-all duration-300 rounded-full ${getFuryBarFillClass(
              isFullFury,
              fury
            )}`}
            style={{ width: `${Math.min(GAME_CONSTANTS.PRO_FURY.MAX_FURY, Math.max(4, fury))}%` }}
          />
        </div>
      </div>
    </div>
  );
});

RosterItem.displayName = 'RosterItem';
