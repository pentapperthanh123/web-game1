import React, { useEffect, useState } from 'react';
import { AudioHostPanel } from './components/AudioHostPanel';
import { ClashLiveDrawer } from './components/ClashLiveDrawer';
import { HeaderStatus } from './components/HeaderStatus';
import { LiveSimulator } from './components/LiveSimulator';
import { MatchControls } from './components/MatchControls';
import { PresetSelector } from './components/PresetSelector';
import { TikTokConnectPanel } from './components/TikTokConnectPanel';
import { adminEmitter } from './services/adminEmitter';
import { autoBotService } from './services/autoBotService';
import { useAdminStore } from './store/adminStore';

export const App: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [isDrawerWide, setIsDrawerWide] = useState<boolean>(false);
  const { isAutoBotActive, setAutoBotActive } = useAdminStore();

  useEffect(() => {
    const cleanupEmitter = adminEmitter.init();
    return () => {
      cleanupEmitter();
      autoBotService.stop();
    };
  }, []);

  const handleToggleAutoBot = () => {
    const nextState = !isAutoBotActive;
    setAutoBotActive(nextState);
    if (nextState) {
      autoBotService.start();
    } else {
      autoBotService.stop();
    }
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      <HeaderStatus
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isAutoBotActive={isAutoBotActive}
        onToggleAutoBot={handleToggleAutoBot}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main Admin Controls - Scrollable Viewport (Never overlapped by live preview!) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-w-0 pb-24">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* 1. Match Controls & Live Simulator Row (Prioritized at Top for quick host access!) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MatchControls />
              <LiveSimulator />
            </div>

            {/* 2. TikTok LIVE & OBS Studio Connection Panel */}
            <TikTokConnectPanel />

            {/* 3. Preset & Audio Host Panel Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PresetSelector />
              <AudioHostPanel />
            </div>

            <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
              Team Clash Live Interactive Game Engine • Port 8030 (Client) & Port 8031 (Admin)
            </footer>
          </div>
        </main>

        {/* Embedded Live Stage 9:16 - Docked Side-by-Side Column (Never covers bottom controls!) */}
        {isDrawerOpen && (
          <aside
            className={`border-l border-pink-500/30 bg-slate-950 shrink-0 h-full flex flex-col transition-all duration-300 ${
              isDrawerWide ? 'w-[520px] xl:w-[600px]' : 'w-[360px] lg:w-[400px] xl:w-[440px]'
            }`}
          >
            <ClashLiveDrawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              isWide={isDrawerWide}
              onToggleWide={(wide) => setIsDrawerWide(wide)}
              isAutoBotActive={isAutoBotActive}
              onToggleAutoBot={handleToggleAutoBot}
            />
          </aside>
        )}
      </div>
    </div>
  );
};

export default App;
