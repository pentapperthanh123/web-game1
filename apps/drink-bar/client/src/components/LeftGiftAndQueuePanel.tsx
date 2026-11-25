import React from 'react';
import { Crown, Heart, Sparkles } from 'lucide-react';
import { GAMEPLAY_LIMITS } from '@shared/config';
import { getMessages } from '@shared/i18n';
import { isRecipeLowStock } from '@shared/inventory';
import { formatBrewStepBadge, getRecipeLabel, RECIPE_LIST, RECIPE_MAP } from '@shared/recipes';
import type { ActiveDrink, DrinkOrder, Language } from '@shared/types';
import { useDrinkBarStore } from '../store/drinkBarStore';

const CompactActiveStationBar: React.FC<{
  stationTag: string;
  drink: ActiveDrink;
  language: Language;
}> = ({ stationTag, drink, language }) => {
  const msg = getMessages(language);
  const badge = formatBrewStepBadge(drink, language, msg.readyLabel);
  const recipeShort = getRecipeLabel(drink.recipeId, language, true);
  const barColor = RECIPE_MAP[drink.recipeId].baseColor;

  return (
    <div className="flex-1 min-w-0 rounded-[11px] border-[2px] border-[#3B2820] bg-[#FFFDF9] px-2.5 py-1 flex flex-col justify-center">
      <div className="flex items-center justify-between gap-1.5 text-[10.5px] font-black leading-none">
        <span className="text-[#3B2820] truncate">
          {stationTag}: {drink.user.nickname}
        </span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <span
            className="w-2 h-2 rounded-full border border-[#3B2820]"
            style={{ backgroundColor: barColor }}
          />
          <span className="text-[#7A5F52] text-[9.5px] font-extrabold">{recipeShort}</span>
          <span className="text-[#9E3A5A]">{badge.pct}%</span>
        </span>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-[6px] rounded-full bg-[#F5DCE4] border border-[#3B2820]/30 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-150"
            style={{ width: `${badge.pct}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="text-[9.5px] font-black text-[#5C4033] whitespace-nowrap leading-none">
          {drink.phase === 'SHOWCASE' ? badge.pillText : `[P${badge.step}] ${badge.stepShort}`}
        </span>
      </div>
    </div>
  );
};

export const LeftGiftAndQueuePanel: React.FC = () => {
  const language = useDrinkBarStore((s) => s.config.language);
  const activeSlots = useDrinkBarStore((s) => s.activeSlots);
  const vipQueue = useDrinkBarStore((s) => s.vipQueue);
  const normalQueue = useDrinkBarStore((s) => s.normalQueue);
  const inventory = useDrinkBarStore((s) => s.inventory);

  const primaryDrink = activeSlots[0];
  const msg = getMessages(language);
  const totalWaiting = vipQueue.length + normalQueue.length;
  const visibleQueue: DrinkOrder[] = [...vipQueue, ...normalQueue].slice(0, 3);

  return (
    <section
      aria-label="Compact horizontal menu, active brew, and queue bar"
      className="absolute top-[78px] left-[24px] right-[24px] pointer-events-none z-20 flex flex-col gap-[6px]"
    >
      {/* Row 1: Compact Horizontal Menu Keywords + Gift Perks Strip */}
      <div className="bar-card px-2 py-1 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          {RECIPE_LIST.map((recipe) => {
            const slot = inventory[recipe.id];
            const isSoldOut = slot.currentMl < GAMEPLAY_LIMITS.COST_PER_DRINK_ML;
            const isLow = isRecipeLowStock(slot);

            let stockTextClass = 'text-[#9E3A5A]';
            if (isSoldOut) {
              stockTextClass = 'text-[#8E2536]';
            } else if (isLow) {
              stockTextClass = 'text-[#9A4E1A]';
            }

            return (
              <span
                key={recipe.id}
                className={`inline-flex items-center gap-1 rounded-[7px] border-[1.5px] border-[#3B2820]/25 px-1.5 py-[2px] text-[9.5px] leading-none ${
                  isSoldOut ? 'bg-[#F2E4EA]/85 opacity-65' : 'bg-[#FDEBF1]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#3B2820] shrink-0"
                  style={{ backgroundColor: recipe.baseColor }}
                />
                <span className="font-black text-[#3B2820]">{recipe.menuCommand}</span>
                <span className={`font-extrabold text-[8.5px] ${stockTextClass}`}>
                  {isSoldOut ? msg.soldOutBadge : `${slot.currentMl}ml`}
                </span>
              </span>
            );
          })}
        </div>

        {/* Ultra-compact Gift Perks Hint */}
        <div className="flex items-center gap-1 shrink-0 text-[9px] font-black">
          <span className="px-1.5 py-[2px] rounded-[7px] bg-[#FFF3F5] border border-[#3B2820]/25 text-[#8A4050]">
            ♥ {msg.giftRowLikeDesc}
          </span>
          <span className="px-1.5 py-[2px] rounded-[7px] bg-[#FFF4CC] border border-[#3B2820]/35 text-[#8A5200]">
            ♛ {msg.topOneBadge}
          </span>
        </div>
      </div>

      {/* Row 2: Active NV1 Brew Progress (Left) + Horizontal Next-Up Queue Chips (Right) */}
      <div className="bar-card px-2 py-1.5 flex items-center gap-2">
        <div className="w-[268px] shrink-0 flex">
          {primaryDrink ? (
            <CompactActiveStationBar
              stationTag={msg.station1Label}
              drink={primaryDrink}
              language={language}
            />
          ) : (
            <div className="flex-1 rounded-[11px] bg-[#FDEBF1] border-[1.8px] border-[#3B2820] px-2.5 py-1.5 text-center">
              <span className="text-[10.5px] font-extrabold text-[#855E68]">{msg.waitingIdle}</span>
            </div>
          )}
        </div>

        {/* Horizontal Queue Strip */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-[8px] bg-[#FDEBF1] border-[1.5px] border-[#3B2820]/25 text-[9.5px] font-black text-[#3B2820] shrink-0">
            <Heart className="w-2.5 h-2.5 text-[#F0788C] fill-[#F0788C]" />
            {totalWaiting}
          </span>

          {visibleQueue.length === 0 ? (
            <div className="flex-1 rounded-[9px] border-[1.5px] border-dashed border-[#3B2820]/20 py-1 px-2 text-center bg-[#FFF9FA]/60">
              <span className="text-[10px] font-bold text-[#855E68]">{msg.queueEmptyHint}</span>
            </div>
          ) : (
            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
              {visibleQueue.map((order, index) => {
                const isTopOne = index === 0 && order.isSignature;
                const swatch = RECIPE_MAP[order.recipeId].baseColor;
                return (
                  <div
                    key={order.orderId}
                    className={`flex-1 min-w-0 flex items-center justify-between gap-1 px-1.5 py-1 rounded-[9px] border-[1.6px] ${
                      order.isVip
                        ? 'bg-[#FFF5D6] border-[#3B2820]'
                        : 'bg-[#FFFDF9] border-[#3B2820]/25'
                    }`}
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
          )}
        </div>
      </div>
    </section>
  );
};
