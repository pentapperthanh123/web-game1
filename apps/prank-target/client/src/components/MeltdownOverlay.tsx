import React from 'react';
import { usePrankStore } from '../store/prankStore';
import { Flame, AlertTriangle } from 'lucide-react';

export const MeltdownOverlay: React.FC = () => {
  const { isMeltdownActive, language } = usePrankStore();

  if (!isMeltdownActive) return null;

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
      {/* Red flashing screen strobe vignette */}
      <div className="absolute inset-0 bg-red-600/25 animate-pulse mix-blend-overlay" />
      <div className="absolute inset-0 border-[12px] border-red-600/70 animate-pulse pointer-events-none" />

      {/* Meltdown Big Banner */}
      <div className="relative z-50 bg-neutral-950/90 border-4 border-red-500 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.8)] text-center max-w-[580px] animate-bounce">
        <div className="flex items-center justify-center gap-3 text-red-500 mb-2">
          <AlertTriangle className="w-8 h-8 animate-spin" />
          <Flame className="w-10 h-10 text-yellow-400" />
          <AlertTriangle className="w-8 h-8 animate-spin" />
        </div>

        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 tracking-wider uppercase drop-shadow">
          {language === 'VI' ? '💥 100% MELTDOWN! 💥' : '💥 100% MELTDOWN! 💥'}
        </h1>

        <p className="text-base font-bold text-neutral-200 mt-2">
          {language === 'VI'
            ? 'NHÂN VẬT ĐÃ CÁU TỘT ĐỘ! BÙNG NỔ NỘ KHÍ TRONG 3 GIÂY!'
            : 'TARGET HAS LOST ALL PATIENCE! 3 SECONDS OF TOTAL CHAOS!'}
        </p>
      </div>
    </div>
  );
};
