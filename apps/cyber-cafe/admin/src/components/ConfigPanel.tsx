import React, { useState } from 'react';
import { Sliders, Gift } from 'lucide-react';
import { GAMEPLAY_CONSTANTS } from '@shared/constants/cafeConfig';
import { emitAdminAction } from '../services/adminEmitter';

export const ConfigPanel: React.FC = () => {
  const [sessionTime, setSessionTime] = useState<number>(GAMEPLAY_CONSTANTS.DEFAULT_SESSION_TIME_SEC);
  const [momCycle, setMomCycle] = useState<number>(GAMEPLAY_CONSTANTS.DEFAULT_MOM_CYCLE_SEC);
  const [autoMomEnabled, setAutoMomEnabled] = useState<boolean>(true);

  const handleSessionTimeChange = (val: number) => {
    setSessionTime(val);
    emitAdminAction('UPDATE_CONFIG', { defaultSessionTimeSec: val });
  };

  const handleMomCycleChange = (val: number) => {
    setMomCycle(val);
    emitAdminAction('UPDATE_CONFIG', { momCycleSec: val });
  };

  const handleAutoMomToggle = (enabled: boolean) => {
    setAutoMomEnabled(enabled);
    emitAdminAction('UPDATE_CONFIG', { autoMomEnabled: enabled });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-lg flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <Sliders className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-black text-cyan-400 tracking-wider">CẤU HÌNH THỜI GIAN & QUY TẮC</h2>
      </div>

      {/* 1. Default Session Playtime Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-neutral-300 font-medium">Giờ Chơi Mặc Định Mỗi Khách:</span>
          <span className="text-amber-400 font-bold">{sessionTime}s</span>
        </div>
        <input
          type="range"
          min={GAMEPLAY_CONSTANTS.MIN_SESSION_TIME_SEC}
          max={GAMEPLAY_CONSTANTS.MAX_SESSION_TIME_SEC}
          value={sessionTime}
          onChange={(e) => handleSessionTimeChange(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
          <span>{GAMEPLAY_CONSTANTS.MIN_SESSION_TIME_SEC}s</span>
          <span>{GAMEPLAY_CONSTANTS.MAX_SESSION_TIME_SEC}s</span>
        </div>
      </div>

      {/* 2. Mom Event Auto Cycle Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoMomEnabled}
              onChange={(e) => handleAutoMomToggle(e.target.checked)}
              className="accent-red-500 rounded cursor-pointer"
            />
            <span>Tự Động Xuất Hiện Phụ Huynh</span>
          </label>
          <span className="text-xs font-mono font-bold text-red-400">{autoMomEnabled ? `${momCycle}s` : 'TẮT'}</span>
        </div>

        {autoMomEnabled && (
          <input
            type="range"
            min={GAMEPLAY_CONSTANTS.MIN_MOM_CYCLE_SEC}
            max={GAMEPLAY_CONSTANTS.MAX_MOM_CYCLE_SEC}
            value={momCycle}
            onChange={(e) => handleMomCycleChange(Number(e.target.value))}
            className="w-full accent-red-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
          />
        )}
      </div>

      {/* 3. TikTok Gift Conversion Quick Reference Card */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3 text-xs flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-0.5">
          <Gift className="w-3.5 h-3.5" />
          <span>BẢNG QUY ĐỔI QUÀ TIKTOK:</span>
        </div>
        <div className="text-[11px] text-neutral-300 flex items-start gap-1.5">
          <span className="text-amber-400 font-bold">1–4 Xu:</span>
          <span>Chiếm máy trống / VIP hàng chờ / Mì Tôm (+45s, x2 điểm) HOẶC Reset rút mạng (-25s)</span>
        </div>
        <div className="text-[11px] text-neutral-300 flex items-start gap-1.5">
          <span className="text-red-400 font-bold">5–29 Xu:</span>
          <span>Gọi Phụ Huynh Cầm Chổi chạy vào túm tai lôi cổ người đang chơi ra khỏi ghế</span>
        </div>
        <div className="text-[11px] text-neutral-300 flex items-start gap-1.5">
          <span className="text-cyan-400 font-bold">30+ Xu:</span>
          <span>Cúp Cầu Dao Cả Quán (tối 3.5s, chỉ máy UPS người tặng sáng chói + thưởng điểm khủng)</span>
        </div>
      </div>
    </div>
  );
};
