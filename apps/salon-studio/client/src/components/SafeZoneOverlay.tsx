import React from 'react';
import { useSalonStore } from '../store/salonStore';

export const SafeZoneOverlay: React.FC = () => {
  const showSafeZone = useSalonStore((s) => s.config.showSafeZone);

  if (!showSafeZone) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* TikTok Top Header Bar Safe-Zone */}
      <div className="absolute top-0 inset-x-0 h-[92px] bg-rose-500/20 border-b-2 border-dashed border-rose-500 flex items-end justify-end px-3 pb-1">
        <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded">
          TIKTOK TOP HUD (y: 0–92)
        </span>
      </div>

      {/* TikTok Right-Side Action Icons Safe-Zone */}
      <div className="absolute right-0 top-[540px] w-[96px] h-[420px] bg-amber-500/20 border-l-2 border-y-2 border-dashed border-amber-500 flex items-center justify-center">
        <span className="-rotate-90 whitespace-nowrap bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
          TIKTOK BUTTONS
        </span>
      </div>

      {/* TikTok Bottom Chat Safe-Zone (y: 965 -> 1280) */}
      <div className="absolute top-[965px] bottom-0 inset-x-0 bg-emerald-500/20 border-t-[3px] border-dashed border-emerald-600 flex flex-col items-center justify-center gap-1">
        <span className="bg-emerald-700 text-white text-[13px] font-black px-3 py-1 rounded-full">
          SAFE CHAT ZONE (y: 965–1280) — KHUNG CHAT TIKTOK LIVE
        </span>
        <span className="text-[11px] font-bold text-emerald-950 bg-white/80 px-2.5 py-0.5 rounded-full">
          Vùng thoáng hoàn toàn, không che thợ hay khách hàng
        </span>
      </div>
    </div>
  );
};
