import { useEffect, useState } from 'react';
import { Crown, RotateCcw } from 'lucide-react';
import { SESSION_LEADERBOARD_CONFIRM_WINDOW_MS } from '../constants/sessionLeaderboard';
import { adminSocket } from '../services/socket';

/**
 * "New live session": empties the overlay's session damage board (TOP PHIÊN LIVE) and its crowns.
 * The board also resets by itself after ~4 h without damage; this is for starting a stream early.
 */
export function SessionLeaderboardControl() {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isConfirming) return undefined;
    const timer = setTimeout(() => setIsConfirming(false), SESSION_LEADERBOARD_CONFIRM_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  const handleResetClick = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    setIsConfirming(false);
    adminSocket.emitResetSessionLeaderboard();
  };

  return (
    <div className="pt-2 border-t border-slate-800 space-y-2">
      <span className="text-xs font-bold text-white flex items-center gap-1">
        <Crown className="w-3.5 h-3.5 text-amber-400" />
        <span>Bảng Xếp Hạng Phiên Live</span>
      </span>
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
        <span>{isConfirming ? 'Bấm lần nữa để bắt đầu phiên mới' : 'Bắt đầu phiên mới (xoá TOP phiên & vương miện)'}</span>
      </button>
    </div>
  );
}
