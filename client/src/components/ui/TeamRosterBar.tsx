import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { RosterPlayer } from '../../constants/roster';
import { GAME_CONSTANTS, TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamColorPalette } from '../../types/team';
import { audioService } from '../../services/audioService';

interface TeamRosterBarProps {
  side: 'left' | 'right';
  topOffset?: number;
}

const DESKTOP_EXPAND_MIN_WIDTH = 768;

const isCompactViewport = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth < DESKTOP_EXPAND_MIN_WIDTH;
};

const getAvatarBorderClass = (
  isFullFury: boolean,
  isActive: boolean,
  teamTheme: TeamColorPalette
): string => {
  if (isFullFury) {
    return 'border-amber-300 ring-1 ring-amber-400/70 shadow-[0_0_10px_rgba(245,158,11,0.7)]';
  }
  if (isActive) {
    return teamTheme.borderClass;
  }
  return `${teamTheme.borderSubtleClass} bg-slate-900`;
};

const getFuryBarFillClass = (isFullFury: boolean, fury: number): string => {
  if (isFullFury) {
    return 'bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 shadow-[0_0_6px_#f59e0b]';
  }
  if (fury >= GAME_CONSTANTS.PRO_FURY.FURY_AUTO_CAP) {
    return 'bg-amber-400';
  }
  return 'bg-gradient-to-r from-cyan-500/80 to-amber-400/80';
};

export const TeamRosterBar = ({ side, topOffset }: TeamRosterBarProps) => {
  const { t } = useTranslation();
  const team = side === 'left' ? TEAM_KEY.BLG : TEAM_KEY.GENG;
  const teamProfile = useGameStore((state) => state.activeTeams[team]);
  const roster = teamProfile.roster;
  const teamTheme = getTeamTheme(teamProfile.colorTheme);
  const minions = useGameStore((state) => state.minions);
  const rosterAttackTimestamps = useGameStore((state) => state.rosterAttackTimestamps);
  const rosterPlayerFury = useGameStore((state) => state.rosterPlayerFury);
  const isLeft = side === 'left';

  const [isCollapsed, setIsCollapsed] = useState<boolean>(isCompactViewport);
  // User manual toggle is sovereign - no auto-collapse overrides

  const getSummonCount = (player: RosterPlayer) => {
    const playerNameLower = player.name.toLowerCase();
    const champLower = player.signatureChampion.toLowerCase();
    return minions.filter((m) => {
      if (m.team !== team) return false;
      const mChampLower = m.championName.toLowerCase();
      return mChampLower.includes(playerNameLower) || mChampLower === champLower;
    }).length;
  };

  const totalTeamSummons = minions.filter((m) => m.team === team).length;
  const shortTeamLabel = teamProfile.shortTag;

  if (isCollapsed) {
    const collapsedLabel =
      totalTeamSummons > 0 ? `${shortTeamLabel} (${totalTeamSummons})` : shortTeamLabel;
    return (
      <div
        id={`roster-container-${team}`}
        style={topOffset ? { top: `${topOffset}px` } : undefined}
        className={`absolute ${!topOffset ? 'top-[128px] sm:top-[136px]' : ''} ${
          isLeft ? 'left-1' : 'right-1'
        } z-[36] pointer-events-auto select-none transition-[top] duration-200`}
      >
        <button
          id={`roster-collapsed-${team}`}
          type="button"
          onClick={() => {
            audioService.playUiToggleSound(true);
            setIsCollapsed(false);
          }}
          className={`cursor-pointer flex items-center space-x-1 px-2.5 py-1 rounded-full border backdrop-blur-md shadow-lg transition active:scale-95 hover:scale-105 opacity-90 hover:opacity-100 ${teamTheme.pillButtonClass}`}
          title={t('HUD.lineupExpand', 'Mở đội hình {{team}}', { team: shortTeamLabel })}
        >
          {isLeft ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          <Users className="w-3 h-3" />
          <span className="text-[10px] font-black">{collapsedLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      id={`roster-container-${team}`}
      aria-label={`${teamProfile.name} Team Roster`}
      style={topOffset ? { top: `${topOffset}px` } : undefined}
      className={`absolute ${!topOffset ? 'top-[128px] sm:top-[136px]' : ''} ${
        isLeft ? 'left-1' : 'right-1'
      } flex flex-col space-y-1 pointer-events-auto z-[36] select-none max-w-[96px] sm:max-w-[108px] transition-[top] duration-200`}
    >
      {/* Clickable Header Pill to collapse */}
      <button
        type="button"
        onClick={() => {
          audioService.playUiToggleSound(false);
          setIsCollapsed(true);
        }}
        className={`cursor-pointer text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border backdrop-blur-md flex items-center justify-between shadow-md transition active:scale-95 hover:brightness-110 ${teamTheme.pillButtonClass}`}
        title={t('HUD.lineupCollapse', 'Thu gọn đội hình {{team}}', { team: shortTeamLabel })}
      >
        <span className="truncate">{shortTeamLabel}</span>
        <span className="p-0.5 hover:bg-white/20 rounded transition flex items-center justify-center">
          {isLeft ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Compact Pro Player Strip (Supporting Role, Viewer Remains Spotlight) */}
      {roster.map((player) => {
        const count = getSummonCount(player);
        const isAttacking = Boolean(rosterAttackTimestamps[player.id]);
        const fury = rosterPlayerFury[player.id] ?? 0;
        const isFullFury = fury >= GAME_CONSTANTS.PRO_FURY.MAX_FURY;
        const isActive = count > 0 || isAttacking || isFullFury;

        return (
          <RosterItem
            key={player.id}
            player={player}
            count={count}
            fury={fury}
            isFullFury={isFullFury}
            isActive={isActive}
            isAttacking={isAttacking}
            isLeft={isLeft}
            teamTheme={teamTheme}
            furyReadyLabel={t('HUD.furyReady', 'NỘ')}
          />
        );
      })}
    </aside>
  );
};

interface RosterItemProps {
  player: RosterPlayer;
  count: number;
  fury: number;
  isFullFury: boolean;
  isActive: boolean;
  isAttacking: boolean;
  isLeft: boolean;
  teamTheme: TeamColorPalette;
  furyReadyLabel: string;
}

const getRosterItemCardClass = (
  isActive: boolean,
  isAttacking: boolean,
  isFullFury: boolean,
  teamTheme: TeamColorPalette
): string => {
  if (isFullFury) {
    return 'bg-gradient-to-r from-rose-950/85 via-amber-950/80 to-slate-950/80 border-amber-300/90 shadow-[0_0_12px_rgba(245,158,11,0.65)] scale-105';
  }
  if (!isActive) {
    return 'bg-slate-950/50 border-slate-800/55 opacity-80 hover:opacity-100';
  }
  const scaleClass = isAttacking ? 'scale-105 ring-1 ring-white/40' : '';
  return `${teamTheme.rosterCardActiveClass} ${scaleClass}`;
};

const RosterItem = ({
  player,
  count,
  fury,
  isFullFury,
  isActive,
  isAttacking,
  isLeft,
  teamTheme,
  furyReadyLabel,
}: RosterItemProps) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [player.avatarUrl]);

  return (
    <div
      id={`roster-card-${player.id}`}
      title={`${player.name} (${player.role}) • Tướng tủ: ${player.signatureChampion}`}
      className={`relative flex items-center space-x-1.5 px-1.5 py-0.5 rounded-lg border backdrop-blur-sm transition-all duration-200 ${
        isLeft ? 'flex-row' : 'flex-row-reverse space-x-reverse'
      } ${getRosterItemCardClass(isActive, isAttacking, isFullFury, teamTheme)}`}
    >
      {/* Compact Pro Avatar with Mini Role Tag */}
      <div id={`roster-avatar-${player.id}`} className="relative shrink-0 transition-transform duration-200">
        <div
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border ${getAvatarBorderClass(
            isFullFury,
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
              className={`w-full h-full flex items-center justify-center text-[8px] font-black ${teamTheme.avatarInitialsBgClass}`}
            >
              {player.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <span
          className={`absolute -bottom-0.5 -right-0.5 text-[6px] font-mono font-black px-0.5 rounded leading-none shadow ${teamTheme.bgBadgeClass}`}
        >
          {player.role}
        </span>
      </div>

      {/* Compact Player Name & Hairline Fury Progress */}
      <div className={`text-[9px] leading-tight min-w-0 flex-1 ${isLeft ? 'text-left' : 'text-right'}`}>
        <div
          className={`font-bold text-slate-100 flex items-center space-x-0.5 truncate ${
            isLeft ? 'justify-start' : 'justify-end'
          }`}
        >
          <span className="truncate">{player.name}</span>
          {count > 0 && (
            <span
              className={`text-[7px] px-1 rounded-full font-mono font-black shrink-0 ${teamTheme.bgBadgeClass}`}
            >
              x{count}
            </span>
          )}
          {isFullFury && (
            <span className="text-[6px] px-1 rounded bg-red-600 text-white font-black uppercase shrink-0">
              {furyReadyLabel}!
            </span>
          )}
        </div>

        {/* Hairline Fury Bar */}
        <div className="w-full h-0.5 bg-slate-900/90 rounded-full overflow-hidden mt-1">
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
};
