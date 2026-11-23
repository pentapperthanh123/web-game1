import React, { useState } from 'react';
import { X, RefreshCw, ExternalLink, Monitor, Maximize2, Minimize2 } from 'lucide-react';

interface GameLiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  gameUrl?: string;
}

export const GameLiveDrawer: React.FC<GameLiveDrawerProps> = ({
  isOpen,
  onClose,
  gameUrl = 'http://localhost:8000',
}) => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isWide, setIsWide] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-slate-950 border-l border-cyan-500/40 shadow-[-10px_0_35px_rgba(0,0,0,0.85)] transition-all duration-300 ease-in-out ${
        isWide ? 'w-full md:w-[720px] lg:w-[820px]' : 'w-full md:w-[480px] lg:w-[540px]'
      }`}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border-b border-cyan-500/30 select-none">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shrink-0">
            <Monitor className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-cyan-300 flex items-center gap-1.5 truncate">
              <span>LIVE GAME VIEW</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 font-mono border border-cyan-800">
                PORT 8000
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Render trực tiếp Client OBS
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={handleReload}
            title="Tải lại màn hình Game"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsWide(!isWide)}
            title={isWide ? 'Thu nhỏ Drawer' : 'Mở rộng Drawer'}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 hidden md:flex"
          >
            {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <a
            href={gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở sang tab mới riêng biệt"
            className="p-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 transition active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            title="Đóng Live Game View (ESC)"
            className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white transition active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drawer Body (IFrame container maintaining TikTok 9:16 vertical ratio centered) */}
      <div className="flex-1 min-h-0 bg-black flex items-center justify-center relative overflow-hidden p-1 sm:p-2">
        <div className="w-full h-full max-h-full aspect-[9/16] max-w-full rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl relative bg-slate-950">
          <iframe
            key={iframeKey}
            src={gameUrl}
            title="Live Game View OBS"
            className="w-full h-full border-0 select-none"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  );
};
