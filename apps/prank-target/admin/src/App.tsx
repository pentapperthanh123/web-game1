import React, { useState } from 'react';
import { DirectControls } from './components/DirectControls';
import { AudioSettings } from './components/AudioSettings';
import { KeywordConfig } from './components/KeywordConfig';
import { LiveSimulator } from './components/LiveSimulator';
import { PrankLiveDrawer } from './components/PrankLiveDrawer';
import { Target, ExternalLink, Tv, Radio, Sparkles } from 'lucide-react';
import { PRANK_PORTS } from '@shared/constants/prankConfig';

export const App: React.FC = () => {
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState<boolean>(true);

  const openClientWindow = () => {
    window.open(`http://localhost:${PRANK_PORTS.CLIENT}`, '_blank', 'width=440,height=800');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Studio Header (Full width, sleek glassmorphism) */}
      <header className="w-full bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 px-4 md:px-6 py-3 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/20 shrink-0">
              <Target className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">PRANK TARGET 3D</h1>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                  STUDIO CONTROL
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                TikTok LIVE Interactive Engine • Three.js 30 FPS • Core Connect Port {PRANK_PORTS.GATEWAY}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-semibold text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gateway :5000</span>
            </div>

            {/* Toggle Live Preview */}
            <button
              onClick={() => setIsLivePreviewOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-xs shadow-lg transition active:scale-95 cursor-pointer ${
                isLivePreviewOpen
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-amber-500/25'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>{isLivePreviewOpen ? 'ĐÓNG PREVIEW' : '📱 MỞ LIVE PREVIEW (9:16)'}</span>
            </button>

            {/* Open Client Standalone Window */}
            <button
              onClick={openClientWindow}
              title="Mở tab riêng Client Port 8040"
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace (Split-screen: Left Controls, Right Preview) */}
      <div className="flex-1 max-w-[1920px] w-full mx-auto px-4 md:px-6 py-5 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side: Host Control Dashboard */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Direct Controls & Simulator Column */}
            <div className="xl:col-span-7 space-y-6">
              <DirectControls />
              <LiveSimulator />
            </div>

            {/* Audio Settings & Keywords Column */}
            <div className="xl:col-span-5 space-y-6">
              <AudioSettings />
              <KeywordConfig />
            </div>
          </div>
        </div>

        {/* Right Side: Embedded Live Preview (Desktop split column) */}
        {isLivePreviewOpen && (
          <PrankLiveDrawer
            isOpen={isLivePreviewOpen}
            onClose={() => setIsLivePreviewOpen(false)}
            isEmbedded={true}
          />
        )}
      </div>

      {/* Floating Bottom-Right Button when Preview is closed */}
      {!isLivePreviewOpen && (
        <button
          onClick={() => setIsLivePreviewOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs shadow-[0_10px_25px_rgba(245,158,11,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/20"
        >
          <Tv className="w-4 h-4" />
          <span>MỞ LIVE PREVIEW (9:16)</span>
        </button>
      )}

      {/* Slide-over Mobile/Tablet Drawer when viewport is < lg */}
      <div className="lg:hidden">
        <PrankLiveDrawer
          isOpen={isLivePreviewOpen}
          onClose={() => setIsLivePreviewOpen(false)}
          isEmbedded={false}
        />
      </div>
    </div>
  );
};

export default App;
