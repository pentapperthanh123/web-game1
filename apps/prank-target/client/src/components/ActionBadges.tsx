import React from 'react';
import { BADGE_ITEMS_LEFT, BADGE_ITEMS_RIGHT } from '@shared/constants/prankConfig';
import type { ActionBadgeConfig, PrankActionType } from '@shared/types/prank';
import { usePrankStore } from '../store/prankStore';

interface ActionBadgesProps {
  onBadgeClick?: (action: PrankActionType) => void;
}

export const ActionBadges: React.FC<ActionBadgesProps> = ({ onBadgeClick }) => {
  const { language } = usePrankStore();

  const renderBadge = (badge: ActionBadgeConfig, alignRight: boolean) => (
    <button
      key={badge.id}
      onClick={() => onBadgeClick?.(badge.action)}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-neutral-900/80 backdrop-blur-md border border-white/20 shadow-xl transition-all duration-150 active:scale-90 hover:bg-neutral-800/90 hover:border-amber-400/50 cursor-pointer text-left ${
        alignRight ? 'flex-row-reverse text-right' : 'flex-row'
      }`}
    >
      {/* 3D Icon Container */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-950 border border-white/15 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
        {badge.icon}
      </div>

      {/* Text Info */}
      <div className="flex flex-col">
        <span className="text-sm font-black tracking-wider text-white drop-shadow group-hover:text-amber-300 transition-colors uppercase">
          {language === 'VI' ? badge.labelVi : badge.labelEn}
        </span>
        <span className="text-[10px] font-semibold text-neutral-300 tracking-tight">
          {language === 'VI' ? badge.subTextVi : badge.subTextEn}
        </span>
      </div>
    </button>
  );

  return (
    <>
      {/* Left Column (y: 200 -> 720) */}
      <div className="absolute left-3 top-[175px] z-20 flex flex-col gap-3 pointer-events-auto">
        {BADGE_ITEMS_LEFT.map((badge) => renderBadge(badge, false))}
      </div>

      {/* Right Column (y: 200 -> 720) */}
      <div className="absolute right-3 top-[175px] z-20 flex flex-col gap-3 pointer-events-auto items-end">
        {BADGE_ITEMS_RIGHT.map((badge) => renderBadge(badge, true))}
      </div>
    </>
  );
};
