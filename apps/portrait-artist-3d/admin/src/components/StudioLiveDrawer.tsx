import React, { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, Radio, RefreshCw, Smartphone, X } from 'lucide-react';
import { STUDIO_PORTS } from '../../../shared/constants/studioConfig';
import { registerPortraitPopup } from '../services/adminEmitter';

interface StudioLiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientUrl?: string;
}

const DEFAULT_CLIENT_URL = `http://localhost:${STUDIO_PORTS.CLIENT}`;

export const StudioLiveDrawer: React.FC<StudioLiveDrawerProps> = ({
  isOpen,
  onClose,
  clientUrl = DEFAULT_CLIENT_URL,
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isWide, setIsWide] = useState(false);

  if (!isOpen) return null;

  const widthClass = isWide
    ? 'w-full md:w-[580px] lg:w-[660px]'
    : 'w-full md:w-[410px] lg:w-[460px]';

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-stone-950 border-l border-amber-600/40 shadow-2xl transition-all duration-300 ${widthClass}`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 bg-stone-900 border-b border-amber-700/30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-amber-300 flex items-center gap-1.5 truncate">
              <span>LIVE 3D STAGE (9:16)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-950 text-amber-400 font-mono border border-amber-800">
                :{STUDIO_PORTS.CLIENT}
              </span>
            </div>
            <div className="text-[10px] text-stone-400 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-emerald-400" />
              720×1280 · Locked 30 FPS
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            title="Tải lại màn hình 3D"
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsWide((w) => !w)}
            title={isWide ? 'Thu nhỏ' : 'Mở rộng'}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hidden md:flex cursor-pointer"
          >
            {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              const popup = window.open(clientUrl, '_blank');
              registerPortraitPopup(popup);
            }}
            title="Mở tab riêng"
            className="p-1.5 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-300 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Đóng Preview"
            className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-black flex items-center justify-center p-2.5">
        <div className="w-full h-full max-h-full aspect-[9/16] max-w-full rounded-2xl overflow-hidden border-2 border-amber-700/50 bg-stone-950">
          <iframe
            key={iframeKey}
            src={`${clientUrl}?t=${iframeKey}`}
            title="Portrait Artist 3D Client (9:16)"
            className="w-full h-full border-0 bg-black"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  );
};
