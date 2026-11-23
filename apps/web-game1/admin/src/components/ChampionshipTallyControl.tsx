import { useEffect, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import {
  CHAMPIONSHIP_TALLY_CONFIRM_WINDOW_MS,
  ChampionshipTallyReport,
} from '../constants/championshipTally';
import { TeamProfile } from '../constants/teams';
import { adminSocket } from '../services/socket';

interface ChampionshipTallyControlProps {
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
}

/** The overlay's report counts only if it is about the matchup the admin is looking at. */
const isReportForMatchup = (report: ChampionshipTallyReport | null, leftTeam: TeamProfile, rightTeam: TeamProfile): boolean =>
  report !== null && report.leftTeamId === leftTeam.id && report.rightTeamId === rightTeam.id;

/**
 * Series titles of the current matchup ("3 🏆 3", stored in the overlay's browser) with a remote reset.
 * The reset clears only this matchup and needs a second click to confirm.
 */
export function ChampionshipTallyControl({ leftTeam, rightTeam }: ChampionshipTallyControlProps) {
  const [report, setReport] = useState<ChampionshipTallyReport | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => adminSocket.onChampionshipTally(setReport), []);

  useEffect(() => {
    if (!isConfirming) return undefined;
    const timer = setTimeout(() => setIsConfirming(false), CHAMPIONSHIP_TALLY_CONFIRM_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  const handleResetClick = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    setIsConfirming(false);
    adminSocket.emitResetChampionshipTally();
  };

  const hasReport = isReportForMatchup(report, leftTeam, rightTeam);

  return (
    <div className="pt-2 border-t border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Số Lần Vô Địch</span>
        </span>
        <span className="font-mono text-xs font-black text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          {hasReport && report
            ? `${leftTeam.shortTag} ${report.leftTitles} 🏆 ${report.rightTitles} ${rightTeam.shortTag}`
            : 'Chưa có dữ liệu từ overlay'}
        </span>
      </div>
      <button
        type="button"
        onClick={handleResetClick}
        className={`w-full py-1.5 px-2 rounded-lg border text-[10.5px] font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
          isConfirming
            ? 'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
        }`}
      >
        <RotateCcw className="w-3 h-3 shrink-0" />
        <span>
          {isConfirming
            ? `Bấm lần nữa để xoá (${leftTeam.shortTag} vs ${rightTeam.shortTag})`
            : 'Reset số lần vô địch cặp đấu này'}
        </span>
      </button>
    </div>
  );
}
