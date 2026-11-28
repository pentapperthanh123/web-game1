import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { getMessages } from '@shared/i18n';
import { formatBrewStepBadge, getRecipeLabel, RECIPE_MAP } from '@shared/recipes';
import type { ActiveDrink, DrinkOrder, Language } from '@shared/types';
import { useDrinkBarStore } from '../store/drinkBarStore';

const CompactActiveBrewBar: React.FC<{
  drink: ActiveDrink;
  language: Language;
}> = ({ drink, language }) => {
  const msg = getMessages(language);
  const badge = formatBrewStepBadge(drink, language, msg.readyLabel);
  const recipeShort = getRecipeLabel(drink.recipeId, language, true);
  const barColor = RECIPE_MAP[drink.recipeId].baseColor;

  return (
    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
      <div className="flex items-center justify-between gap-2 text-[12px] font-black leading-none">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#3B2820] shrink-0"
            style={{ backgroundColor: barColor }}
          />
          <span className="text-[#2B1B15] truncate">{drink.user.nickname}</span>
          <span className="text-[#7A3548] text-[11px] font-black shrink-0">
            · {recipeShort}
          </span>
        </span>
        <span className="text-[#9E3A5A] text-[11px] font-black shrink-0">{badge.pct}%</span>
      </div>

      <div className="w-full h-[6px] rounded-full bg-[#F5DCE4] border border-[#3B2820]/25 overflow-hidden relative">
        <div
          className="h-full rounded-full transition-[width] duration-150 relative"
          style={{ width: `${badge.pct}%`, backgroundColor: barColor }}
        >
          <span className="absolute inset-x-0 top-0 h-[1.5px] bg-white/45 rounded-full" />
        </div>
      </div>
    </div>
  );
};

const NextQueueStrip: React.FC<{
  visibleQueue: readonly DrinkOrder[];
  emptyHint: string;
  nextLabel: string;
}> = ({ visibleQueue, emptyHint, nextLabel }) => {
  if (visibleQueue.length === 0) {
    return (
      <div className="flex-1 min-w-0 rounded-full border border-dashed border-[#3B2820]/20 py-1 px-2.5 text-center bg-[#FFFDF9]/70">
        <span className="text-[10.5px] font-bold text-[#855E68] truncate block">{emptyHint}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
      <span className="text-[9.5px] font-black uppercase tracking-wide text-[#8C6D60] shrink-0">
        {nextLabel}:
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
        {visibleQueue.map((order, index) => {
          const isTopOne = index === 0 && order.isSignature;
          const swatch = RECIPE_MAP[order.recipeId].baseColor;
          const chipTone = order.isVip
            ? 'bg-[#FFF5D6] border-[#3B2820]/70'
            : 'bg-[#FFFDF9] border-[#3B2820]/25';

          return (
            <div
              key={order.orderId}
              className={`flex-1 min-w-0 flex items-center justify-between gap-1 px-2 py-[3px] rounded-full border-[1.5px] ${chipTone}`}
            >
              <span className="inline-flex items-center gap-1 min-w-0">
                <span
                  className="w-2 h-2 rounded-full border border-[#3B2820] shrink-0"
                  style={{ backgroundColor: swatch }}
                />
                <span className="text-[10px] font-black text-[#3B2820] truncate">
                  {order.user.nickname}
                </span>
              </span>
              {isTopOne && (
                <Crown className="w-3 h-3 text-[#C47C0E] shrink-0" strokeWidth={2.8} />
              )}
              {!isTopOne && order.isVip && (
                <Sparkles className="w-3 h-3 text-[#C47C0E] shrink-0" strokeWidth={2.6} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const LeftGiftAndQueuePanel: React.FC = () => {
  const language = useDrinkBarStore((s) => s.config.language);
  const activeSlots = useDrinkBarStore((s) => s.activeSlots);
  const vipQueue = useDrinkBarStore((s) => s.vipQueue);
  const normalQueue = useDrinkBarStore((s) => s.normalQueue);

  const primaryDrink = activeSlots[0];
  const msg = getMessages(language);
  const visibleQueue: DrinkOrder[] = [...vipQueue, ...normalQueue].slice(0, 3);

  return (
    <section
      aria-label="Docked active brew strip"
      className="absolute top-[42px] left-0 right-0 pointer-events-none z-20 flex flex-col"
    >
      {/* Tier 2: Docked Active Brew + Next-Up Strip */}
      <div className="h-[44px] px-3 bg-[#FFF4F7]/94 border-b-[2px] border-[#3B2820] shadow-[0_2px_0_rgba(59,40,32,0.1)] flex items-center gap-2.5">
        <div className="flex-1 min-w-0 flex items-center">
          {primaryDrink ? (
            <CompactActiveBrewBar drink={primaryDrink} language={language} />
          ) : (
            <div className="w-full rounded-full bg-[#FFFDF9]/80 border border-[#3B2820]/20 px-3 py-1 text-center">
              <span className="text-[10.5px] font-extrabold text-[#855E68]">
                {msg.stationIdleLabel} · {msg.waitingIdle}
              </span>
            </div>
          )}
        </div>

        <span className="w-[1.5px] h-[24px] bg-[#3B2820]/15 shrink-0" aria-hidden="true" />

        <NextQueueStrip
          visibleQueue={visibleQueue}
          emptyHint={msg.queueEmptyHint}
          nextLabel={msg.nextUpLabel}
        />
      </div>
    </section>
  );
};
