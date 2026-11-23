import { Smartphone } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AudioHostPanel } from './components/AudioHostPanel';
import { ClashLiveDrawer } from './components/ClashLiveDrawer';
import { HeaderStatus } from './components/HeaderStatus';
import { LiveSimulator } from './components/LiveSimulator';
import { MatchControls } from './components/MatchControls';
import { PresetSelector } from './components/PresetSelector';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <HeaderStatus
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isAutoBotActive={isAutoBotActive}
        onToggleAutoBot={handleToggleAutoBot}
      />

      <main
        className={`max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1 transition-all duration-300 ${
          isDrawerOpen
            ? isDrawerWide
              ? 'xl:mr-[750px] lg:mr-[690px]'
              : 'lg:mr-[530px]'
            : ''
        }`}
      >
        {/* Preset & Audio Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PresetSelector />
          <AudioHostPanel />
        </div>

        {/* Match Controls & Live Simulator Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MatchControls />
          <LiveSimulator />
        </div>
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Team Clash Live Interactive Game Engine • Port 8030 (Client) & Port 8031 (Admin)
      </footer>

      {/* Floating Action Button when drawer is closed */}
      {!isDrawerOpen && (
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          title="Mở màn hình Live Client (9:16)"
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white font-extrabold text-xs px-4 py-3 rounded-full shadow-2xl flex items-center space-x-2 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer animate-bounce"
        >
          <Smartphone className="w-4 h-4" />
          <span>📱 Xem Live Client (9:16)</span>
        </button>
      )}

      {/* Embedded Live Stage Drawer with Quick AutoBot Button */}
      <ClashLiveDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        isWide={isDrawerWide}
        onToggleWide={(wide) => setIsDrawerWide(wide)}
        isAutoBotActive={isAutoBotActive}
        onToggleAutoBot={handleToggleAutoBot}
      />
    </div>
  );
};

export default App;
