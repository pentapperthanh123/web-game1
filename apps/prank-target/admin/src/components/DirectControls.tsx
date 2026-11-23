import React from 'react';
import {
  emitCleanTarget,
  emitForceMeltdown,
  emitPrankAction,
  emitResetState,
} from '../services/adminEmitter';
import type { PrankActionType } from '@shared/types/prank';
import { useAdminStore } from '../store/adminStore';
import {
  Sparkles,
  Flame,
  Eraser,
  RotateCcw,
  Egg,
  Wind,
  Cake,
  CircleDot,
  Milk,
  Smile,
} from 'lucide-react';

export const DirectControls: React.FC = () => {
  const { language } = useAdminStore();

  const handlePrank = (action: PrankActionType) => {
    emitPrankAction(action);
  };

  const isVi = language === 'VI';

  const prankButtons: Array<{
    action: PrankActionType;
    label: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      action: 'EGG',
      label: isVi ? 'Ném Trứng' : 'Throw Egg',
      icon: <Egg className="w-5 h-5 text-amber-300" />,
      color: 'hover:border-amber-400 hover:bg-amber-950/40',
    },
    {
      action: 'WIND',
      label: isVi ? 'Thổi Gió' : 'Wind Gust',
      icon: <Wind className="w-5 h-5 text-cyan-300" />,
      color: 'hover:border-cyan-400 hover:bg-cyan-950/40',
    },
    {
      action: 'CAKE',
      label: isVi ? 'Úp Bánh Kem' : 'Smash Cake',
      icon: <Cake className="w-5 h-5 text-pink-300" />,
      color: 'hover:border-pink-400 hover:bg-pink-950/40',
    },
    {
      action: 'BALL',
      label: isVi ? 'Ném Bóng Nảy' : 'Throw Ball',
      icon: <CircleDot className="w-5 h-5 text-orange-400" />,
      color: 'hover:border-orange-400 hover:bg-orange-950/40',
    },
    {
      action: 'MILK',
      label: isVi ? 'Tạt Sữa Tươi' : 'Splash Milk',
      icon: <Milk className="w-5 h-5 text-blue-200" />,
      color: 'hover:border-blue-300 hover:bg-blue-950/40',
    },
    {
      action: 'TAUNT',
      label: isVi ? 'Chọc Cáu' : 'Taunt / LOL',
      icon: <Smile className="w-5 h-5 text-yellow-300" />,
      color: 'hover:border-yellow-400 hover:bg-yellow-950/40',
    },
  ];

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-amber-400" />
          {isVi ? 'ĐIỀU KHIỂN TRỰC TIẾP (HOST ACTIONS)' : 'DIRECT HOST CONTROLS'}
        </h2>
        <span className="text-xs text-neutral-400">Tác động tức thì vào sân khấu</span>
      </div>

      {/* Grid of Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {prankButtons.map((btn) => (
          <button
            key={btn.action}
            onClick={() => handlePrank(btn.action)}
            className={`flex items-center gap-3 p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-left transition-all active:scale-95 cursor-pointer font-bold text-sm text-neutral-200 ${btn.color}`}
          >
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-700/60">
              {btn.icon}
            </div>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Critical Overrides: Meltdown & Clean */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-neutral-800/80">
        <button
          onClick={() => emitForceMeltdown()}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)] transition active:scale-95 cursor-pointer"
        >
          <Flame className="w-5 h-5" />
          {isVi ? 'ÉP MELTDOWN 100%' : 'FORCE 100% MELTDOWN'}
        </button>

        <button
          onClick={() => emitCleanTarget()}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow transition active:scale-95 cursor-pointer"
        >
          <Eraser className="w-5 h-5" />
          {isVi ? 'LAU SẠCH NGƯỜI' : 'WIPE TARGET CLEAN'}
        </button>

        <button
          onClick={() => emitResetState()}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-bold text-sm transition active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          {isVi ? 'RESET PHIÊN' : 'RESET SESSION'}
        </button>
      </div>
    </div>
  );
};
