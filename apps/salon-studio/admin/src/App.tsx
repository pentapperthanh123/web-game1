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
    <div className="min-h-screen bg-[#FFF7EE] text-[#3A2825] p-4 lg:p-6">
      {/* Top Admin Header Bar */}
      <header className="max-w-[1380px] mx-auto mb-5 admin-card px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-[#FFEFE3]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FFD4E2] border-[3px] border-[#3A2825] flex items-center justify-center">
            <Scissors className="w-6 h-6 text-[#3A2825]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl leading-tight">
              Salon Studio — Host Admin
            </h1>
            <p className="text-xs font-extrabold text-[#7D6059]">
              TikTok LIVE Interactive Hair & Nail Stage (720×1280 · 30 FPS)
            </p>
          </div>
        </div>

        {/* Live Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white border-2 border-[#3A2825] text-xs font-black flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E85D82]" />
            Đang làm:{' '}
            <span className="text-[#D44E74]">
              {liveSnapshot?.activeCustomer?.user.nickname || 'Trống ghế'}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#C9F2E3] border-2 border-[#3A2825] text-xs font-black flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Queue: {totalQueue} (VIP: {liveSnapshot?.vipQueue.length ?? 0})
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#FFE5B4] border-2 border-[#3A2825] text-xs font-black flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-[#B87400]" />
            Hôm nay: {liveSnapshot?.todayCount ?? 0}
          </div>
        </div>
      </header>

      {/* Main 2-Column Layout: Left Controls + Right 9:16 Live Preview */}
      <main className="max-w-[1380px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          <TikTokConnectPanel />
          <LiveControlsPanel />
          <LiveSimulatorPanel />
          <AudioHostPanel />
        </div>

        <div className="xl:sticky xl:top-5">
          <StagePreviewPanel />
        </div>
      </main>
    </div>
  );
};

export default App;
