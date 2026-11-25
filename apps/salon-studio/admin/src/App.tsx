import React, { useEffect, useState } from 'react';
import { Crown, Scissors, Sparkles, Users } from 'lucide-react';
import type { SalonLiveState } from '@shared/types/salon';
import { AdminLeftTabs } from './components/AdminLeftTabs';
import { StagePreviewPanel } from './components/StagePreviewPanel';
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
    <div className="h-screen w-screen overflow-hidden bg-[#FFF7EE] text-[#3A2825] p-2.5 flex flex-col lg:flex-row gap-2.5">
      {/* CỘT TRÁI: Chứa toàn bộ Header Tiệm + Telemetries + Các Tab Điều Khiển & Cấu Hình */}
      <div className="w-full lg:w-[440px] xl:w-[470px] shrink-0 h-auto lg:h-full flex flex-col gap-2 min-h-0 overflow-hidden">
        {/* Header Tiệm Nằm Gọn Trong Cột Trái (Không đè lên cột Preview) */}
        <header className="shrink-0 admin-card p-2.5 bg-[#FFEFE3] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFD4E2] border-2 border-[#3A2825] flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4 text-[#3A2825]" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-base leading-tight truncate">
                Salon Studio — Host Admin
              </h1>
              <p className="text-[10px] font-extrabold text-[#7D6059] truncate">
                TikTok LIVE Interactive (720×1280 · 30 FPS)
              </p>
            </div>
          </div>

          {/* Telemetry Pills nằm gọn bên trái */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#3A2825]/15">
            <div className="px-2 py-0.5 rounded-lg bg-white border-2 border-[#3A2825] text-[10px] font-black flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#E85D82]" />
              <span>Đang làm:</span>
              <span className="text-[#D44E74] max-w-[90px] truncate">
                {liveSnapshot?.activeCustomer?.user.nickname || 'Trống ghế'}
              </span>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-[#C9F2E3] border-2 border-[#3A2825] text-[10px] font-black flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Queue: {totalQueue}</span>
              {Boolean(liveSnapshot?.vipQueue.length) && (
                <span className="text-[#B86E00] font-black">
                  (VIP {liveSnapshot?.vipQueue.length})
                </span>
              )}
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-[#FFE5B4] border-2 border-[#3A2825] text-[10px] font-black flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#B87400]" />
              <span>Hôm nay: {liveSnapshot?.todayCount ?? 0}</span>
            </div>
          </div>
        </header>

        {/* Các Tab Điều Khiển & Cấu Hình Nằm Ngay Dưới Header Trái */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <AdminLeftTabs />
        </div>
      </div>

      {/* CỘT PHẢI: CHIẾM TOÀN BỘ DIỆN TÍCH CÒN LẠI (flex-1 h-full), RỘNG HƠN VÀ CAO TỐI ĐA TỪ ĐỈNH ĐẾN ĐÁY */}
      <div className="flex-1 min-w-0 h-full flex flex-col min-h-0 overflow-hidden">
        <StagePreviewPanel />
      </div>
    </div>
  );
};

export default App;
