import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Palette, RotateCcw, Smartphone, Sparkles } from 'lucide-react';
import { LiveConfigPanel } from './components/LiveConfigPanel';
import { LiveSimulatorPanel } from './components/LiveSimulatorPanel';
import { QueueManagerPanel } from './components/QueueManagerPanel';
import { StudioLiveDrawer } from './components/StudioLiveDrawer';
import {
  emitAdminAction,
  emitLiveConfig,
  subscribeClientSnapshots,
} from './services/adminEmitter';
import { useAdminStore } from './store/adminStore';

export const App: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const snapshot = useAdminStore((s) => s.snapshot);
  const setSnapshot = useAdminStore((s) => s.setSnapshot);
  const pushLog = useAdminStore((s) => s.pushLog);

  useEffect(() => {
    const unsub = subscribeClientSnapshots(
      (snap) => setSnapshot(snap),
      () => {
        emitLiveConfig(useAdminStore.getState().config);
        emitAdminAction('REQUEST_SNAPSHOT');
        pushLog('Đã đồng bộ kết nối với Client 3D (9:16)');
      }
    );

    emitAdminAction('REQUEST_SNAPSHOT');
    return unsub;
  }, [setSnapshot, pushLog]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Top Host Header */}
      <header className="sticky top-0 z-30 border-b border-stone-800 bg-stone-950/95 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">
              Họa Sĩ 3D — Host Control Panel
            </h1>
            <div className="text-xs text-stone-400 flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  snapshot ? 'bg-emerald-400' : 'bg-stone-600'
                }`}
              />
              <span>{snapshot ? 'Client 3D đang đồng bộ' : 'Mở Client :8020 để đồng bộ'}</span>
              {snapshot && (
                <>
                  <span>·</span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {snapshot.artistMode}
                  </span>
                  <span>·</span>
                  <span className="text-sky-400 font-mono">Cam: {snapshot.cameraPreset}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" />
            Đã vẽ: {snapshot?.totalPaintedCount ?? 0}
          </div>

          <button
            type="button"
            onClick={() => {
              emitAdminAction('RESET_SESSION');
              pushLog('Đã reset phiên vẽ và dọn sạch tường triển lãm');
            }}
            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-bold text-stone-300 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Phiên
          </button>

          <button
            type="button"
            onClick={() => setIsDrawerOpen((o) => !o)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            {isDrawerOpen ? 'Ẩn Live 9:16' : 'Xem Live 9:16'}
          </button>
        </div>
      </header>

      {/* Main Content Grid (shifts smoothly when split-view drawer is open) */}
      <main
        className={`p-5 transition-all duration-300 ${
          isDrawerOpen ? 'md:mr-[420px] lg:mr-[470px]' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="space-y-5">
            <LiveSimulatorPanel />
            <QueueManagerPanel />
          </div>
          <div>
            <LiveConfigPanel />
          </div>
        </div>
      </main>

      <StudioLiveDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};

export default App;
