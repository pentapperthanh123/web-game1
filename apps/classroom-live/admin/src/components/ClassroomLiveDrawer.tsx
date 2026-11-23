import React, { useState } from 'react';
import { X, RefreshCw, ExternalLink, Smartphone, Maximize2, Minimize2, Radio } from 'lucide-react';
import { registerPopupTab } from '../services/adminEmitter';

interface ClassroomLiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientUrl?: string;
}

const DEFAULT_CLIENT_URL = 'http://localhost:8010';

export const ClassroomLiveDrawer: React.FC<ClassroomLiveDrawerProps> = ({
  isOpen,
  onClose,
  clientUrl = DEFAULT_CLIENT_URL,
}) => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isWide, setIsWide] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  const drawerWidthClass = isWide
    ? 'w-full md:w-[640px] lg:w-[720px]'
    : 'w-full md:w-[420px] lg:w-[480px]';

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-slate-950 border-l border-emerald-500/40 shadow-[-10px_0_35px_rgba(0,0,0,0.85)] transition-all duration-300 ease-in-out ${drawerWidthClass}`}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-b border-emerald-500/30 select-none">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
            <Smartphone className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5 truncate">
              <span>LIVE CLIENT (9:16)</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono border border-emerald-800">
                PORT 8010
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-emerald-400 inline" />
              Màn hình TikTok Live 720x1280
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={handleReload}
            title="Tải lại màn hình Client"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsWide(!isWide)}
            title={isWide ? 'Thu nhỏ Preview' : 'Mở rộng Preview'}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 hidden md:flex"
          >
            {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              const popup = window.open(clientUrl, '_blank');
              registerPopupTab(popup);
            }}
            title="Mở Client sang tab mới riêng biệt"
            className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 transition active:scale-95 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Đóng Live Client View (ESC)"
            className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drawer Body (IFrame container maintaining TikTok 9:16 vertical ratio centered) */}
      <div className="flex-1 min-h-0 bg-black flex items-center justify-center relative overflow-hidden p-2 sm:p-3">
        <div className="w-full h-full max-h-full aspect-[9/16] max-w-full rounded-2xl overflow-hidden border-2 border-emerald-800/50 shadow-2xl relative bg-slate-950 flex flex-col">
          <iframe
            key={iframeKey}
            src={`${clientUrl}?t=${iframeKey}`}
            title="Classroom Live Client 9:16"
            className="w-full h-full border-0 select-none bg-black"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  );
};

