import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';

export const DPSLeaderboard = () => {
  const { t } = useTranslation();
  const leaderboard = useGameStore((state) => state.leaderboard);
  const minions = useGameStore((state) => state.minions);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className="w-52 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-2 shadow-2xl pointer-events-auto select-none transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800/60">
        <div className="flex items-center space-x-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <h2 className="text-[10px] font-black tracking-wider text-slate-100 uppercase">
            {t('HUD.leaderboardTitle', 'TOP DPS')}
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-cyan-400 font-mono">
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
              const isBLG = player.team === TEAM_KEY.BLG;
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between text-[10px] py-0.5 px-1.5 rounded-lg bg-slate-900/60 border border-slate-800/50"
                >
                  <div className="flex items-center space-x-1.5 overflow-hidden">
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
                    <span className="font-bold truncate max-w-[70px] text-slate-200 text-[10px]">
                      {player.userName}
                    </span>
                    <span
                      className={`text-[7px] px-1 rounded font-black shrink-0 ${
                        isBLG
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      }`}
                    >
                      {isBLG ? 'BLG' : 'GEN'}
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
