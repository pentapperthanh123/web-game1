import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Trophy, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getTeamTheme } from '../../constants/teams';
import { SESSION_RANK, SESSION_RANK_STYLE, SessionRank, SessionTier } from '../../constants/sessionLeaderboard';
import { SessionTierBadge } from './session/SessionTierBadge';
import { SessionLeaderboardEntry, useSessionLeaderboardStore } from '../../store/sessionLeaderboardStore';

interface SessionBoardRowProps {
  entry: SessionLeaderboardEntry;
  rank: SessionRank;
  tier: SessionTier | undefined;
}

const SessionBoardRow = ({ entry, rank, tier }: SessionBoardRowProps) => {
  const teamTheme = getTeamTheme(entry.colorTheme);
  const rankStyle = SESSION_RANK_STYLE[rank];
  const isLeader = rank === SESSION_RANK.FIRST;

  return (
    <div
      className={`flex items-center justify-between gap-1.5 text-[10px] py-0.5 px-1.5 rounded-lg border ${
        isLeader ? 'bg-amber-500/10 border-amber-400/40' : 'bg-slate-950/15 border-white/10'
      }`}
    >
      <div className="flex items-center space-x-1.5 flex-1 min-w-0">
        <span
          className={`w-3.5 h-3.5 flex items-center justify-center rounded-full text-[8px] font-black shrink-0 ${rankStyle.badgeClass}`}
        >
          {isLeader ? <Crown className="w-2.5 h-2.5" fill="currentColor" /> : rank}
        </span>
        <SessionTierBadge tier={tier} />
        <span className={`font-bold truncate text-[10px] ${isLeader ? 'text-amber-200' : 'text-slate-200'}`}>
          {entry.userName}
        </span>
        <span className={`text-[7px] px-1 rounded font-black shrink-0 ${teamTheme.badgePillClass}`}>
          {entry.teamTag}
        </span>
      </div>
      <span className="font-mono font-bold text-emerald-400 text-[9px] shrink-0">
        {Math.round(entry.totalDamage).toLocaleString()}
      </span>
    </div>
  );
};

/**
 * Live-session damage board (whole stream, not reset between rounds): the top viewers race for the crown.
 * The store re-ranks at most every few hundred ms, so this can subscribe directly.
 */
export const DPSLeaderboard = () => {
  const { t } = useTranslation();
  // Subscribe only to primitive length to avoid re-renders on every minion positional / HP tick
  const minionCount = useGameStore((state) => state.minions.length);
  const topEntries = useSessionLeaderboardStore((state) => state.topEntries);
  const tierByName = useSessionLeaderboardStore((state) => state.tierByName);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className="relative z-[35] w-full sm:w-60 max-w-full bg-slate-950/20 border border-white/15 rounded-xl p-1.5 sm:p-2 shadow-sm pointer-events-auto select-none transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 border-b border-white/10">
        <div className="flex items-center space-x-1 min-w-0">
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <h2 className="text-[9px] sm:text-[10px] font-black tracking-normal text-slate-100 uppercase whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            {t('SessionBoard.title', 'TOP PHIÊN LIVE')}
          </h2>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] text-cyan-400 font-mono shrink-0">
          <div className="flex items-center space-x-0.5">
            <Users className="w-3 h-3" />
            <span>{minionCount}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
            aria-label={t('SessionBoard.toggle', 'Thu gọn / mở bảng xếp hạng')}
          >
            {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Players List (Collapsible) */}
      {!isCollapsed && (
        <div className="space-y-1">
          {topEntries.length === 0 ? (
            <p className="text-[9px] text-slate-400 italic py-0.5 text-center">
              {t('HUD.noPlayersYet', 'Chat tên tướng để tấn công!')}
            </p>
          ) : (
            topEntries.map((entry, index) => (
              <SessionBoardRow
                key={entry.userName}
                entry={entry}
                rank={(index + 1) as SessionRank}
                tier={tierByName[entry.userName]}
              />
            ))
          )}
        </div>
      )}
    </aside>
  );
};
