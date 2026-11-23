import React from 'react';
import { BADGE_ITEMS_LEFT, BADGE_ITEMS_RIGHT } from '@shared/constants/prankConfig';
import type { ActionBadgeConfig, PrankActionType } from '@shared/types/prank';
import { usePrankStore } from '../store/prankStore';

interface ActionBadgesProps {
  onBadgeClick?: (action: PrankActionType) => void;
}

export const ActionBadges: React.FC<ActionBadgesProps> = ({ onBadgeClick }) => {
  const { language, lastHit } = usePrankStore();
  const [activeAction, setActiveAction] = React.useState<PrankActionType | null>(null);
  const [activeInitiator, setActiveInitiator] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!lastHit) return;
    setActiveAction(lastHit.action);
    setActiveInitiator(lastHit.initiatorName);

    const timer = setTimeout(() => {
      setActiveAction(null);
      setActiveInitiator(null);
    }, 450);

    return () => clearTimeout(timer);
  }, [lastHit]);

  const renderBadge = (badge: ActionBadgeConfig, alignRight: boolean) => {
    const isTriggered = activeAction === badge.action;

    return (
      <button
        key={badge.id}
        onClick={() => onBadgeClick?.(badge.action)}
        className={`group flex items-center gap-2.5 px-3 py-2 rounded-2xl backdrop-blur-md shadow-xl transition-all duration-200 active:scale-90 cursor-pointer text-left ${
          isTriggered
            ? 'bg-amber-950/90 border-2 border-amber-300 ring-4 ring-amber-400/50 shadow-amber-500/50 scale-105'
            : 'bg-neutral-900/80 border border-white/20 hover:bg-neutral-800/95 hover:border-amber-400/60'
        } ${alignRight ? 'flex-row-reverse text-right' : 'flex-row'}`}
      >
        {/* 3D Icon Container */}
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xl shadow-inner transition-transform shrink-0 ${
            isTriggered
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-200 text-black scale-110 animate-bounce'
              : 'bg-gradient-to-br from-neutral-800 to-neutral-950 border-white/15 group-hover:scale-110'
          }`}
        >
          {badge.icon}
        </div>

        {/* Text Info */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span
              className={`text-xs font-black tracking-wider drop-shadow uppercase leading-tight ${
                isTriggered ? 'text-amber-300' : 'text-white group-hover:text-amber-300'
              }`}
            >
              {language === 'VI' ? badge.labelVi : badge.labelEn}
            </span>
          </div>

          <span className="text-[10px] font-semibold text-neutral-300 tracking-tight leading-tight">
            {isTriggered && activeInitiator ? (
              <span className="text-amber-300 font-extrabold truncate max-w-[85px] block animate-pulse">
                {activeInitiator}
              </span>
            ) : language === 'VI' ? (
              badge.subTextVi
            ) : (
              badge.subTextEn
            )}
          </span>
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Left Column (y: 190 -> 520) - EGG, CAKE, MILK */}
      <div className="absolute left-3 top-[190px] z-20 flex flex-col gap-3 pointer-events-auto">
        {BADGE_ITEMS_LEFT.map((badge) => renderBadge(badge, false))}
      </div>

      {/* Right Column (y: 190 -> 520) - WIND, BALL, SURPRISE */}
      <div className="absolute right-3 top-[190px] z-20 flex flex-col gap-3 pointer-events-auto items-end">
        {BADGE_ITEMS_RIGHT.map((badge) => renderBadge(badge, true))}
      </div>
    </>
  );
};
