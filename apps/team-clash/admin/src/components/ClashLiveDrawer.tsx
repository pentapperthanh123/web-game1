import {
  Bot,
  ExternalLink,
  Maximize2,
  Minimize2,
  Radio,
  RefreshCw,
  Swords,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { CLASH_PORTS } from '../../../shared/constants/clashConfig';
import { registerClashPopup } from '../services/adminEmitter';

interface ClashLiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientUrl?: string;
  isWide?: boolean;
  onToggleWide?: (wide: boolean) => void;
  isAutoBotActive?: boolean;
  onToggleAutoBot?: () => void;
}

const DEFAULT_CLIENT_URL = `http://localhost:${CLASH_PORTS.CLIENT}`;

export const ClashLiveDrawer: React.FC<ClashLiveDrawerProps> = ({
  isOpen,
  onClose,
  clientUrl = DEFAULT_CLIENT_URL,
  isWide = false,
  onToggleWide,
  isAutoBotActive = false,
  onToggleAutoBot,
}) => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [internalWide, setInternalWide] = useState<boolean>(isWide);

  if (!isOpen) {
    return null;
  }

  const effectiveWide = onToggleWide ? isWide : internalWide;

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleToggleWide = () => {
    const next = !effectiveWide;
    if (onToggleWide) {
      onToggleWide(next);
    } else {
      setInternalWide(next);
    }
  };

  const handleOpenExternal = () => {
    const popup = window.open(clientUrl, '_blank');
    registerClashPopup(popup);
  };

  // Full-width vertical 9:16 proportions
  const drawerWidthClass = effectiveWide
    ? 'w-full md:w-[680px] lg:w-[740px]'
    : 'w-full md:w-[480px] lg:w-[520px]';

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-slate-950 border-l border-pink-500/30 shadow-[-14px_0_45px_rgba(0,0,0,0.9)] transition-all duration-300 ease-in-out ${drawerWidthClass}`}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-pink-950/30 to-cyan-950/30 border-b border-pink-500/20 select-none shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
            <Swords className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-pink-200 flex items-center gap-1.5 truncate">
              <span>LIVE CLASH STAGE (9:16)</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 font-mono border border-cyan-800">
                :{CLASH_PORTS.CLIENT}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-emerald-400 inline" />
              <span>Full Width 720×1280 · Locked 30 FPS</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Quick Auto-Bot Toggle inside Live Drawer */}
          {onToggleAutoBot && (
            <button
              type="button"
              onClick={onToggleAutoBot}
              title={isAutoBotActive ? 'Dừng Auto-Bot' : 'Bật Auto-Bot tự chạy trận đấu'}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer border ${
                isAutoBotActive
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-600/50'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAutoBotActive ? '⏹ Tắt AutoBot' : '▶️ AutoBot'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReload}
            title="Tải lại màn hình Client"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggleWide}
            title={effectiveWide ? 'Thu nhỏ Preview' : 'Mở rộng Preview'}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 hidden md:flex cursor-pointer"
          >
            {effectiveWide ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenExternal}
            title="Mở Client sang tab mới riêng biệt"
            className="p-1.5 rounded-lg bg-pink-950/80 hover:bg-pink-900 border border-pink-700/60 text-pink-300 transition active:scale-95 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Đóng Live Client View"
            className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drawer Body - Full Width Iframe without restrictive paddings */}
      <div className="flex-1 min-h-0 w-full h-full bg-black relative overflow-hidden flex items-center justify-center">
        <iframe
          key={iframeKey}
          src={`${clientUrl}?t=${iframeKey}`}
          title="Team Clash Live Stage (9:16)"
          className="w-full h-full border-0 bg-black select-none block"
          allow="autoplay; microphone"
        />
      </div>
    </div>
  );
};
