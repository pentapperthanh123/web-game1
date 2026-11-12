import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getTeamTheme } from '../../constants/teams';

export const DPSLeaderboard = () => {
  const { t } = useTranslation();
  const leaderboard = useGameStore((state) => state.leaderboard);
  const minions = useGameStore((state) => state.minions);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className="relative z-[35] w-full sm:w-60 max-w-full bg-slate-950/20 backdrop-blur-[1px] border border-white/15 rounded-xl p-1.5 sm:p-2 shadow-sm pointer-events-auto select-none transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 border-b border-white/10">
        <div className="flex items-center space-x-1 min-w-0">
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <h2 className="text-[9px] sm:text-[10px] font-black tracking-normal text-slate-100 uppercase whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            {t('HUD.leaderboardTitle', 'TOP 5 SÁT THƯƠNG')}
          </h2>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] text-cyan-400 font-mono shrink-0">
          <div className="flex items-center space-x-0.5">
            <Users className="w-3 h-3" />
            <span>{minions.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
            aria-label="Toggle Leaderboard"
          >
            {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Players List (Collapsible) */}
      {!isCollapsed && (
        <div className="space-y-1">
          {leaderboard.length === 0 ? (
            <p className="text-[9px] text-slate-400 italic py-0.5 text-center">
              {t('HUD.noPlayersYet', 'Chat tên tướng để tấn công!')}
            </p>
          ) : (
            leaderboard.slice(0, 3).map((player, index) => {
              const teamProfile = activeTeams[player.team];
              const teamTheme = getTeamTheme(teamProfile?.colorTheme);
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-1.5 text-[10px] py-0.5 px-1.5 rounded-lg bg-slate-950/15 border border-white/10"
                >
                  <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                    <span
                      className={`w-3.5 h-3.5 flex items-center justify-center rounded-full text-[8px] font-black shrink-0 ${
                        index === 0
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_6px_#f59e0b]'
                          : index === 1
                          ? 'bg-slate-300 text-slate-950'
                          : 'bg-amber-700 text-white'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-bold truncate text-slate-200 text-[10px]">
                      {player.userName}
                    </span>
                    <span className={`text-[7px] px-1 rounded font-black shrink-0 ${teamTheme.badgePillClass}`}>
                      {teamProfile?.shortTag || player.team}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-[9px] shrink-0">
                    {player.totalDamage.toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
};
