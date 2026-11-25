import React, { useEffect, useState } from 'react';
import { Crown, Scissors, Sparkles, Users } from 'lucide-react';
import type { SalonLiveState } from '@shared/types/salon';
import { AudioHostPanel } from './components/AudioHostPanel';
import { LiveControlsPanel } from './components/LiveControlsPanel';
import { LiveSimulatorPanel } from './components/LiveSimulatorPanel';
import { StagePreviewPanel } from './components/StagePreviewPanel';
import { TikTokConnectPanel } from './components/TikTokConnectPanel';
import { salonAdminEmitter } from './services/adminEmitter';
import { tiktokServerBridge } from './services/tiktokApi';

export const App: React.FC = () => {
  const [liveSnapshot, setLiveSnapshot] = useState<SalonLiveState | null>(null);

  useEffect(() => {
    tiktokServerBridge.start();
    const unsub = salonAdminEmitter.subscribeSnapshot(setLiveSnapshot);
    return () => {
      unsub();
      tiktokServerBridge.stop();
    };
  }, []);

  const totalQueue =
    (liveSnapshot?.vipQueue.length ?? 0) + (liveSnapshot?.normalQueue.length ?? 0);

  return (
    <div className="min-h-screen lg:h-screen w-screen lg:overflow-hidden flex flex-col bg-[#FFF7EE] text-[#3A2825] p-3 lg:p-3.5">
      {/* Top Admin Header Bar - Compact & Clean */}
      <header className="shrink-0 admin-card px-4 py-2 mb-2 flex flex-wrap items-center justify-between gap-2.5 bg-[#FFEFE3]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFD4E2] border-2 border-[#3A2825] flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-[#3A2825]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base leading-tight">
              Salon Studio — Host Admin
            </h1>
            <p className="text-[11px] font-extrabold text-[#7D6059]">
              TikTok LIVE Interactive Hair & Nail Stage (720×1280 · 30 FPS)
            </p>
          </div>
        </div>

        {/* Live Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-white border-2 border-[#3A2825] text-xs font-black flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E85D82]" />
            Đang làm:{' '}
            <span className="text-[#D44E74]">
              {liveSnapshot?.activeCustomer?.user.nickname || 'Trống ghế'}
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-[#C9F2E3] border-2 border-[#3A2825] text-xs font-black flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Queue: {totalQueue} (VIP: {liveSnapshot?.vipQueue.length ?? 0})
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-[#FFE5B4] border-2 border-[#3A2825] text-xs font-black flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-[#B87400]" />
            Hôm nay: {liveSnapshot?.todayCount ?? 0}
          </div>
        </div>
      </header>

      {/* Main 2-Column Layout: Left Controls (Scrollable) + Right Full-Height Preview */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_450px] xl:grid-cols-[1fr_510px] 2xl:grid-cols-[1fr_570px] gap-3.5 lg:overflow-hidden overflow-y-auto">
        {/* Left Settings & Controls: Scrollable */}
        <div className="lg:h-full lg:overflow-y-auto space-y-3 pr-1.5 custom-scrollbar pb-2">
          <TikTokConnectPanel />
          <LiveControlsPanel />
          <LiveSimulatorPanel />
          <AudioHostPanel />
        </div>

        {/* Right Preview Column: Full Height on Desktop */}
        <div className="h-[640px] sm:h-[720px] lg:h-full min-h-0 flex flex-col overflow-hidden">
          <StagePreviewPanel />
        </div>
      </main>
    </div>
  );
};

export default App;
