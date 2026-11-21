import { Radio, RotateCcw, ExternalLink, Play, Sparkles, Square, Clock, Columns2, Monitor } from 'lucide-react';
import { START_ROUND_BUTTON_HINT } from '../constants/adminPortal';
import { SUMMON_QUEUE_UI } from '../constants/summonQueue';

interface AdminHeaderProps {
  onResetBoss: () => void;
  onStartMatch?: () => void;
  isAutoSummonActive?: boolean;
  onToggleAutoSummon?: () => void;
  roundDurationMs?: number;
  onChangeRoundDuration?: (ms: number) => void;
  isLiveDrawerOpen?: boolean;
  onToggleLiveDrawer?: () => void;
}

/**
 * Top portal header with title, quick Auto-Summon toggle, Round duration config, OBS Game View link, quick match start, and quick Boss reset button.
 */
export function AdminHeader({
  onResetBoss,
  onStartMatch,
  isAutoSummonActive,
  onToggleAutoSummon,
  roundDurationMs = SUMMON_QUEUE_UI.DEFAULT_ROUND_DURATION_MS,
  onChangeRoundDuration,
  isLiveDrawerOpen,
  onToggleLiveDrawer,
}: AdminHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-end pb-3.5 sm:pb-5 border-b border-slate-800 gap-3 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full md:w-auto">
        {/* Quick Auto Summon Toggle Button */}
        {onToggleAutoSummon && (
          <button
            type="button"
            onClick={onToggleAutoSummon}
            title={
              isAutoSummonActive
                ? 'Đang Tự Động Triệu Hồi (Kích thích người xem). Nhấn để DỪNG.'
                : 'BẬT Tự Động Triệu Hồi mồi để người xem comment theo.'
            }
            className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-black flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shadow ${
              isAutoSummonActive
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                : 'bg-emerald-950/90 border-emerald-500 text-emerald-200 hover:bg-emerald-900/80 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAutoSummonActive ? 'animate-spin text-rose-400' : 'text-emerald-400'}`} />
            <span>{isAutoSummonActive ? 'DỪNG AUTO TRIỆU HỒI' : 'BẬT AUTO TRIỆU HỒI'}</span>
          </button>
        )}

        {/* Quick Round Duration Config Dropdown / Select */}
        {onChangeRoundDuration && (
          <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-400">Thời lượng:</span>
            <select
              value={roundDurationMs}
              onChange={(e) => onChangeRoundDuration(Number(e.target.value))}
              className="bg-slate-950 text-emerald-400 font-mono font-bold text-xs rounded border border-slate-700/60 px-1.5 py-0.5 outline-none cursor-pointer focus:border-cyan-500"
            >
              <option value={0}>Không giới hạn</option>
              <option value={180000}>3 phút</option>
              <option value={240000}>4 phút</option>
              <option value={300000}>5 phút</option>
              <option value={420000}>7 phút</option>
            </select>
          </div>
        )}

        {onStartMatch && (
          <button
            type="button"
            onClick={onStartMatch}
            title={START_ROUND_BUTTON_HINT}
            className="shrink-0 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>Bắt Đầu Ván Đấu</span>
          </button>
        )}

        {onToggleLiveDrawer && (
          <button
            type="button"
            onClick={onToggleLiveDrawer}
            title={isLiveDrawerOpen ? 'Đóng màn hình Game chia đôi' : 'Mở màn hình Game chia đôi (Split View)'}
            className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 sm:space-x-2 shadow-lg transition text-center cursor-pointer active:scale-95 ${
              isLiveDrawerOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] font-black'
                : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-800 text-cyan-300'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5 shrink-0" />
            <span>{isLiveDrawerOpen ? 'Đóng Live Game' : 'Chia Đôi Màn Hình (Live Game)'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onResetBoss}
          className="shrink-0 px-3 sm:px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-xs font-bold text-rose-300 flex items-center space-x-1.5 transition shadow"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Hồi Sinh Boss</span>
        </button>
      </div>
    </header>
  );
}
