import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Flame, Trophy, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getTeamTheme } from '../../constants/teams';
import {
  LEADERBOARD_BOARD_MODE,
  LEADERBOARD_CYCLER_CONSTANTS,
  LeaderboardBoardMode,
  SESSION_RANK,
  SESSION_RANK_STYLE,
  SessionRank,
  SessionTier,
} from '../../constants/sessionLeaderboard';
import { SessionTierBadge } from './session/SessionTierBadge';
import {
  SessionLeaderboardEntry,
  startLeaderboardCycler,
  useSessionLeaderboardStore,
} from '../../store/sessionLeaderboardStore';

interface BoardThemeStyle {
  titleKey: string;
  titleFallback: string;
  emptyKey: string;
  emptyFallback: string;
  containerBorderClass: string;
  headerGradientClass: string;
  titleTextClass: string;
  leaderRowClass: string;
  leaderNameClass: string;
  damageTextClass: string;
  activeDotClass: string;
  progressBarClass: string;
}

const BOARD_THEME_MAP: Readonly<Record<LeaderboardBoardMode, BoardThemeStyle>> = {
  [LEADERBOARD_BOARD_MODE.SESSION]: {
    titleKey: 'SessionBoard.title',
    titleFallback: 'TOP PHIÊN LIVE',
    emptyKey: 'SessionBoard.noSessionPlayersYet',
    emptyFallback: 'Chưa có sát thương phiên này, hãy chat tên tướng!',
    containerBorderClass:
      'border-amber-400/50 bg-gradient-to-b from-slate-950/94 via-slate-950/90 to-amber-950/45 shadow-[0_0_20px_rgba(245,158,11,0.22)]',
    headerGradientClass: 'border-amber-400/30',
    titleTextClass:
      'bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent',
    leaderRowClass:
      'bg-gradient-to-r from-amber-500/25 via-amber-500/10 to-slate-950/45 border-amber-400/55 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    leaderNameClass: 'text-amber-200 font-extrabold',
    damageTextClass: 'text-emerald-400',
    activeDotClass: 'bg-amber-400 shadow-[0_0_6px_#fbbf24] w-3.5',
    progressBarClass:
      'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_6px_#fbbf24]',
  },
  [LEADERBOARD_BOARD_MODE.MATCH]: {
    titleKey: 'SessionBoard.matchTitle',
    titleFallback: 'TOP VÁN HIỆN TẠI',
    emptyKey: 'SessionBoard.noMatchPlayersYet',
    emptyFallback: 'Tặng quà hoặc gọi tướng để mở bát ván này!',
    containerBorderClass:
      'border-orange-500/55 bg-gradient-to-b from-slate-950/94 via-slate-950/90 to-rose-950/45 shadow-[0_0_20px_rgba(249,115,22,0.26)]',
    headerGradientClass: 'border-orange-400/35',
    titleTextClass:
      'bg-gradient-to-r from-orange-200 via-amber-300 to-rose-400 bg-clip-text text-transparent',
    leaderRowClass:
      'bg-gradient-to-r from-orange-500/30 via-rose-500/15 to-slate-950/45 border-orange-400/60 shadow-[0_0_12px_rgba(249,115,22,0.3)]',
    leaderNameClass: 'text-orange-200 font-extrabold',
    damageTextClass: 'text-amber-300',
    activeDotClass: 'bg-orange-400 shadow-[0_0_6px_#fb923c] w-3.5',
    progressBarClass:
      'bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 shadow-[0_0_6px_#f97316]',
  },
};

const renderBoardModeIcon = (mode: LeaderboardBoardMode) => {
  if (mode === LEADERBOARD_BOARD_MODE.MATCH) {
    return (
      <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-500/40 shrink-0 animate-pulse drop-shadow-[0_0_6px_rgba(249,115,22,0.85)]" />
    );
  }
  return (
    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
  );
};

interface LeaderboardRowProps {
  entry: SessionLeaderboardEntry;
  rank: SessionRank;
  tier: SessionTier | undefined;
  boardTheme: BoardThemeStyle;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = React.memo(
  ({ entry, rank, tier, boardTheme }) => {
    const teamTheme = getTeamTheme(entry.colorTheme);
    const rankStyle = SESSION_RANK_STYLE[rank] || SESSION_RANK_STYLE[SESSION_RANK.THIRD];
    const isLeader = rank === SESSION_RANK.FIRST;
    const rowStyleClass = isLeader
      ? boardTheme.leaderRowClass
      : 'bg-slate-950/35 border-white/10';
    const nameColorClass = isLeader ? boardTheme.leaderNameClass : 'text-slate-200';

    return (
      <div
        className={`flex items-center justify-between gap-1.5 text-[10px] py-0.5 px-1.5 rounded-lg border transition-colors ${rowStyleClass}`}
      >
        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
          <span
            className={`w-3.5 h-3.5 flex items-center justify-center rounded-full text-[8px] font-black shrink-0 ${rankStyle.badgeClass}`}
          >
            {isLeader ? <Crown className="w-2.5 h-2.5" fill="currentColor" /> : rank}
          </span>
          <SessionTierBadge tier={tier} />
          <span className={`font-bold truncate text-[10px] ${nameColorClass}`}>
            {entry.userName}
          </span>
          <span
            className={`text-[7px] px-1 rounded font-black shrink-0 ${teamTheme.badgePillClass}`}
          >
            {entry.teamTag}
          </span>
        </div>
        <span className={`font-mono font-bold text-[9px] shrink-0 ${boardTheme.damageTextClass}`}>
          {Math.round(entry.totalDamage).toLocaleString()}
        </span>
      </div>
    );
  }
);

LeaderboardRow.displayName = 'LeaderboardRow';

/**
 * Rotating dual-leaderboard component ("TOP PHIÊN LIVE" ↔ "TOP VÁN HIỆN TẠI" every 10s).
 * Driven directly by `useSessionLeaderboardStore` with 3D stadium vertical flip animation.
 */
export const LeaderboardCycler: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const currentBoard = useSessionLeaderboardStore((state) => state.currentBoard);
  const toggleBoard = useSessionLeaderboardStore((state) => state.toggleBoard);
  const minionCount = useGameStore((state) => state.minions.length);
  const sessionDonators = useSessionLeaderboardStore((state) => state.sessionDonators);
  const matchDonators = useSessionLeaderboardStore((state) => state.matchDonators);
  const tierByName = useSessionLeaderboardStore((state) => state.tierByName);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Guarantee background cycler is running
  useEffect(() => {
    startLeaderboardCycler();
  }, []);

  const boardTheme = BOARD_THEME_MAP[currentBoard];
  const rawEntries =
    currentBoard === LEADERBOARD_BOARD_MODE.SESSION ? sessionDonators : matchDonators;
  const visibleEntries = rawEntries.slice(0, LEADERBOARD_CYCLER_CONSTANTS.DISPLAY_SIZE);
  const isSessionMode = currentBoard === LEADERBOARD_BOARD_MODE.SESSION;

  return (
    <aside
      style={{ perspective: '900px' }}
      className={`relative z-[35] w-full sm:w-60 max-w-full border rounded-xl p-1.5 sm:p-2 pointer-events-auto select-none transition-colors duration-500 ${boardTheme.containerBorderClass}`}
    >
      {/* Header with 3D Flip Title & Mode Indicator Dots */}
      <div
        className={`flex items-center justify-between gap-1.5 pb-1 border-b transition-colors duration-500 ${boardTheme.headerGradientClass}`}
      >
        <button
          type="button"
          onClick={toggleBoard}
          title={t(
            'SessionBoard.switchTooltip',
            'Bấm để chuyển nhanh giữa Top Phiên Live & Top Ván Hiện Tại'
          )}
          className="flex items-center space-x-1.5 min-w-0 cursor-pointer group text-left transition-transform active:scale-95"
        >
          <div
            key={`header-title-${currentBoard}`}
            className="flex items-center space-x-1 min-w-0 animate-leaderboard-flip-x"
          >
            {renderBoardModeIcon(currentBoard)}
            <h2
              className={`text-[9px] sm:text-[10px] font-black tracking-wide uppercase whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${boardTheme.titleTextClass}`}
            >
              {t(boardTheme.titleKey, boardTheme.titleFallback)}
            </h2>
          </div>

          {/* Mode Dot Indicators */}
          <div className="flex items-center gap-1 pl-0.5 shrink-0">
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isSessionMode ? boardTheme.activeDotClass : 'w-1.5 bg-slate-700/80'
              }`}
            />
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                !isSessionMode ? boardTheme.activeDotClass : 'w-1.5 bg-slate-700/80'
              }`}
            />
          </div>
        </button>

        <div className="flex items-center space-x-1.5 text-[10px] text-cyan-400 font-mono shrink-0">
          <div className="flex items-center space-x-0.5">
            <Users className="w-3 h-3" />
            <span>{minionCount}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
            aria-label={t('SessionBoard.toggle', 'Thu gọn / mở bảng xếp hạng')}
          >
            {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 10-Second Progress Bar (Visually indicates countdown to next board flip) */}
      <div className="w-full h-0.5 bg-slate-800/80 rounded-full overflow-hidden my-1">
        <div
          key={`bar-${currentBoard}`}
          className={`h-full rounded-full animate-leaderboard-cycle-bar ${boardTheme.progressBarClass}`}
        />
      </div>

      {/* 3D Flipping Players List */}
      {!isCollapsed && (
        <div
          key={`board-body-${currentBoard}`}
          className="space-y-1 animate-leaderboard-flip-x"
        >
          {visibleEntries.length === 0 ? (
            <p className="text-[9px] text-slate-400 italic py-0.5 text-center">
              {t(boardTheme.emptyKey, boardTheme.emptyFallback)}
            </p>
          ) : (
            visibleEntries.map((entry, index) => (
              <LeaderboardRow
                key={entry.userName}
                entry={entry}
                rank={(index + 1) as SessionRank}
                tier={tierByName[entry.userName]}
                boardTheme={boardTheme}
              />
            ))
          )}
        </div>
      )}
    </aside>
  );
});

LeaderboardCycler.displayName = 'LeaderboardCycler';
export default LeaderboardCycler;
