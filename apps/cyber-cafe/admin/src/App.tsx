import React, { useEffect, useState } from 'react';
import { Bot, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import type { LanguageMode } from '@shared/types/cafe';
import { CAFE_PORTS, type AutobotModeType } from '@shared/constants/cafeConfig';
import { emitSetAutoBot } from './services/adminEmitter';
import { LiveControls } from './components/LiveControls';
import { ConfigPanel } from './components/ConfigPanel';
import { SoundConsole } from './components/SoundConsole';
import { LiveSimulator } from './components/LiveSimulator';

export const App: React.FC = () => {
  const [language, setLanguage] = useState<LanguageMode>('VI');
  const [previewKey, setPreviewKey] = useState(0);

  // Global Auto-Bot Mode state
  const [isAutoBotRunning, setIsAutoBotRunning] = useState(false);
  const [botMode, setBotMode] = useState<AutobotModeType>('CHILL');

  const toggleAutoBot = (nextRunning?: boolean) => {
    const running = typeof nextRunning === 'boolean' ? nextRunning : !isAutoBotRunning;
    setIsAutoBotRunning(running);
    emitSetAutoBot(running, botMode);
  };

  const handleModeSelect = (mode: AutobotModeType) => {
    setBotMode(mode);
    if (isAutoBotRunning) {
      emitSetAutoBot(true, mode);
    }
  };

  // Preview Dimensions: Full 100vh Height from absolute top to bottom, Width is strictly 9:16 proportional
  const [previewDimensions, setPreviewDimensions] = useState({
    width: typeof window !== 'undefined' ? Math.round(window.innerHeight * (9 / 16)) : 540,
    height: typeof window !== 'undefined' ? window.innerHeight : 960,
    scale: typeof window !== 'undefined' ? window.innerHeight / 1280 : 0.75,
  });

  const clientUrl = `http://localhost:${CAFE_PORTS.CLIENT}`;

  useEffect(() => {
    const updateSize = () => {
      const h = window.innerHeight;
      const s = h / 1280;
      const w = Math.round(720 * s); // Strict 9:16 aspect ratio

      setPreviewDimensions({
        width: w,
        height: h,
        scale: s,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-row select-none m-0 p-0">
      {/* 1. Left Column: Control Modules (Takes all remaining width, independent smooth vertical scroll) */}
      <div className="flex-1 h-screen overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 bg-neutral-950">
        {/* Header Bar inside Left Column (Doesn't push the preview down!) */}
        <header className="flex flex-col gap-3 pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-xs font-black tracking-wide">
                  NET 2008
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">PORT 8051</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white mt-0.5">
                BẢNG ĐIỀU KHIỂN HOST
              </h1>
            </div>

            {/* Action Buttons: Open Tab & Reload Preview */}
            <div className="flex items-center gap-2">
              <a
                href={clientUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Sân Khấu (Port 8050)</span>
              </a>
              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer transition-colors"
                title="Reload Preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Auto Bot Mode Bar - Prominent & One-Click in Header */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 shadow-inner">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => toggleAutoBot()}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                  isAutoBotRunning
                    ? 'bg-purple-600 text-white border-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.7)] animate-pulse'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <Bot className={`w-4 h-4 ${isAutoBotRunning ? 'text-white' : 'text-purple-400'}`} />
                <span>{isAutoBotRunning ? 'CHẾ ĐỘ AUTO BOT: ĐANG CHẠY' : 'BẬT CHẾ ĐỘ AUTO BOT'}</span>
              </button>

              <span className="text-[11px] text-neutral-400 hidden md:inline">
                {isAutoBotRunning
                  ? '⚡ Bot đang tự cày, tranh ghế và né mẹ trên sân khấu'
                  : 'Tự động chạy game khi phòng live chưa có người chat'}
              </span>
            </div>

            {/* Bot Mode Pills */}
            <div className="flex items-center gap-1.5">
              {(['CHILL', 'CHAOS', 'RANK_RUSH'] as AutobotModeType[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeSelect(mode)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    botMode === mode
                      ? 'bg-purple-600 border-purple-300 text-white shadow-sm'
                      : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {mode === 'CHILL' && <span>☕ Chill Net</span>}
                  {mode === 'CHAOS' && <span>💥 Hỗn Loạn</span>}
                  {mode === 'RANK_RUSH' && <span>⚡ Rank Rush</span>}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* 1. Host Instant Actions */}
        <LiveControls language={language} onLanguageChange={setLanguage} />

        {/* 2. Live Simulator & Auto-Bot Net */}
        <LiveSimulator
          isAutoBotRunning={isAutoBotRunning}
          onToggleAutoBot={toggleAutoBot}
          botMode={botMode}
          onBotModeChange={handleModeSelect}
        />

        {/* 3. Audio & Mic Mode */}
        <SoundConsole />

        {/* 4. Configuration & Rules */}
        <ConfigPanel />
      </div>

      {/* 2. Right Column: TRUE 100VH FULL HEIGHT 9:16 LIVE PREVIEW (0 gap, 0 header above it, touching top and bottom edges) */}
      <div
        className="h-screen shrink-0 bg-black flex items-center justify-center overflow-hidden border-l border-neutral-800 relative"
        style={{
          width: `${previewDimensions.width}px`,
        }}
      >
        <div
          style={{
            width: `${previewDimensions.width}px`,
            height: `${previewDimensions.height}px`,
          }}
          className="bg-black overflow-hidden relative"
        >
          <iframe
            key={previewKey}
            src={clientUrl}
            title="Client Live Preview"
            className="border-0 select-none origin-top-left absolute top-0 left-0"
            style={{
              width: '720px',
              height: '1280px',
              transform: `scale(${previewDimensions.scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
