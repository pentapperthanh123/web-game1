import { Bot, Smartphone } from 'lucide-react';
import React from 'react';
import { useAdminStore } from '../store/adminStore';

interface HeaderStatusProps {
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
  isAutoBotActive?: boolean;
  onToggleAutoBot?: () => void;
}

export const HeaderStatus: React.FC<HeaderStatusProps> = ({
  isDrawerOpen = false,
  onToggleDrawer,
  isAutoBotActive = false,
  onToggleAutoBot,
}) => {
  const { clientConnected, liveState } = useAdminStore();

  const clashPos = Math.round(liveState.clashPosition ?? 50);
  const timeRemaining = Math.round(liveState.roundTimeRemaining ?? 0);
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Title & Connection Status */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-cyan-500 flex items-center justify-center font-black text-xl text-white shadow-md">
            ⚔️
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
              TEAM CLASH <span className="text-xs font-bold px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">HOST ADMIN</span>
            </h1>
            <p className="text-xs text-slate-400">Điều khiển trực tiếp Sân Khấu TikTok LIVE (Port 8030)</p>
          </div>
        </div>

        {/* Live Match State Indicators & Drawer Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-3 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
            {/* Connection Pill */}
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  clientConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-semibold text-slate-300">
                {clientConnected ? 'Client Kết Nối' : 'Đang đợi Client'}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {/* Round & Timer */}
            <div className="text-xs font-bold text-slate-300">
              Hiệp: <span className="text-yellow-400">{liveState.roundNumber ?? 1}</span> ({liveState.seriesScore?.left ?? 0} - {liveState.seriesScore?.right ?? 0})
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="text-xs font-bold font-mono text-cyan-400">
              ⏳ {timeStr}
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {/* Mini Clash Bar */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-pink-400">{clashPos}%</span>
              <div className="w-20 h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-pink-500 h-full transition-all duration-200"
                  style={{ width: `${clashPos}%` }}
                />
                <div
                  className="bg-cyan-500 h-full transition-all duration-200"
                  style={{ width: `${100 - clashPos}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-cyan-400">{100 - clashPos}%</span>
            </div>
          </div>

          {/* Auto-Bot Toggle Button in Top Navbar */}
          {onToggleAutoBot && (
            <button
              type="button"
              onClick={onToggleAutoBot}
              title={isAutoBotActive ? 'Dừng Auto-Bot' : 'Bật Auto-Bot tự chạy trận đấu'}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer border ${
                isAutoBotActive
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-rose-500/20'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-600/50 hover:border-emerald-500'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAutoBotActive ? '⏹ Tắt AutoBot' : '▶️ Bật AutoBot'}</span>
            </button>
          )}

          {/* Toggle Live Client 9:16 Preview Button */}
          {onToggleDrawer && (
            <button
              type="button"
              onClick={onToggleDrawer}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer border ${
                isDrawerOpen
                  ? 'bg-pink-600 text-white border-pink-400 shadow-pink-500/20'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-pink-300 border-pink-500/40 hover:border-pink-400'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isDrawerOpen ? 'Ẩn Live 9:16' : '📱 Xem Live (9:16)'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
