import React, { useEffect, useState } from 'react';
import { ClashLiveDrawer } from './components/ClashLiveDrawer';
import { HeaderStatus } from './components/HeaderStatus';
import { LiveSimulator } from './components/LiveSimulator';
import { MatchControls } from './components/MatchControls';
import { SetupConsole } from './components/SetupConsole';
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
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden select-none">
      <HeaderStatus
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isAutoBotActive={isAutoBotActive}
        onToggleAutoBot={handleToggleAutoBot}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main Bento Grid: 2 Columns for 1-screen compact view without scrolling */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 min-w-0">
          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-3.5 items-start">
            {/* Column 1: Core Match Controls & Live Interaction Simulator */}
            <div className="space-y-3.5">
              <MatchControls />
              <LiveSimulator />
            </div>

            {/* Column 2: TikTok LIVE / OBS Pipeline & Setup Console (Theme + Audio Tabs) */}
            <div className="space-y-3.5">
              <TikTokConnectPanel />
              <SetupConsole />
            </div>
          </div>
        </main>

        {/* Embedded Live Stage 9:16 - Docked Side-by-Side Column */}
        {isDrawerOpen && (
          <aside
            className={`border-l border-pink-500/30 bg-slate-950 shrink-0 h-full flex flex-col transition-all duration-300 ${
              isDrawerWide ? 'w-[480px] xl:w-[560px]' : 'w-[340px] lg:w-[380px] xl:w-[410px]'
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
