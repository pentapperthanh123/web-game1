import { Radio, RotateCcw, ExternalLink } from 'lucide-react';

interface AdminHeaderProps {
  onResetBoss: () => void;
}

/**
 * Top portal header with title, OBS Game View link, and quick Boss reset button.
 */
export function AdminHeader({ onResetBoss }: AdminHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 sm:pb-5 border-b border-slate-800 gap-3 sm:gap-4">
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        <div className="p-2 sm:p-2.5 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/80 shadow-[0_0_15px_rgba(168,85,247,0.3)] shrink-0">
          <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-2xl font-black tracking-wide text-white flex items-center flex-wrap gap-2">
            <span>TIKTOK LIVE ADMIN PORTAL</span>
            <span className="shrink-0 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-semibold">
              PORT 8001
            </span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 leading-snug mt-0.5 truncate">
            Bảng điều khiển độc lập kết nối WebSocket tới Server (Port 4000) & Game View (Port 8000)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full md:w-auto">
        <a
          href="http://localhost:8000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-xs font-bold text-cyan-300 flex items-center space-x-1.5 sm:space-x-2 shadow-lg transition text-center"
        >
          <span>Mở Màn Hình Game OBS (Port 8000)</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>

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
