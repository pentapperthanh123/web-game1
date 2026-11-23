import React, { useState } from 'react';
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  Radio,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import { PRANK_PORTS } from '@shared/constants/prankConfig';
import { registerPrankPopup } from '../services/adminEmitter';

interface PrankLiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientUrl?: string;
  isEmbedded?: boolean;
}

const DEFAULT_CLIENT_URL = `http://localhost:${PRANK_PORTS.CLIENT}`;

export const PrankLiveDrawer: React.FC<PrankLiveDrawerProps> = ({
  isOpen,
  onClose,
  clientUrl = DEFAULT_CLIENT_URL,
  isEmbedded = false,
}) => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isWide, setIsWide] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenPopup = () => {
    const popup = window.open(
      clientUrl,
      'PrankTargetClient',
      'width=440,height=820,resizable=yes,scrollbars=no,status=no'
    );
    registerPrankPopup(popup);
  };

  const containerClasses = isEmbedded
    ? `hidden lg:flex flex-col bg-neutral-950 border border-amber-500/40 rounded-2xl shadow-2xl h-[calc(100vh-110px)] sticky top-4 shrink-0 transition-all duration-300 overflow-hidden ${
        isWide ? 'w-[560px] xl:w-[620px]' : 'w-[420px] xl:w-[460px]'
      }`
    : `fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-neutral-950 border-l border-amber-500/40 shadow-[-12px_0_40px_rgba(0,0,0,0.9)] transition-all duration-300 ease-in-out ${
        isWide ? 'w-full md:w-[620px]' : 'w-full md:w-[440px]'
      }`;

  return (
    <div className={containerClasses}>
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-3.5 py-3 bg-gradient-to-r from-neutral-900 via-amber-950/40 to-neutral-900 border-b border-amber-500/30 select-none shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-amber-300 flex items-center gap-1.5 truncate">
              <span>LIVE CLIENT PREVIEW (9:16)</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 font-mono border border-amber-700">
                :{PRANK_PORTS.CLIENT}
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 truncate flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
              <span>720×1280 • 30 FPS • ScaledStage</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleReload}
            title="Tải lại IFrame Client"
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsWide(!isWide)}
            title={isWide ? 'Thu nhỏ Preview' : 'Mở rộng Preview'}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition active:scale-95 hidden md:flex cursor-pointer"
          >
            {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleOpenPopup}
            title="Mở cửa sổ rời (Popup tab)"
            className="p-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-600/50 text-amber-300 transition active:scale-95 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Đóng Preview"
            className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 transition active:scale-95 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 9:16 Stage Container with IFrame */}
      <div className="flex-1 min-h-0 bg-neutral-950 flex items-center justify-center p-2.5 relative overflow-hidden">
        <div className="w-full h-full max-h-full aspect-[9/16] max-w-full rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-black shadow-[0_0_25px_rgba(245,158,11,0.2)] flex flex-col">
          <iframe
            key={iframeKey}
            src={`${clientUrl}?t=${iframeKey}`}
            title="Prank Target Live Client (9:16)"
            className="w-full h-full border-0 bg-neutral-900"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  );
};
