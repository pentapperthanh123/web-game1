import React from 'react';
import { Coffee, Crown, Gift, Heart, Sparkles } from 'lucide-react';
import { GAMEPLAY_LIMITS } from '@shared/config';
import { getMessages } from '@shared/i18n';
import { isRecipeLowStock } from '@shared/inventory';
import {
  formatBrewStepBadge,
  getRecipeLabel,
  RECIPE_LIST,
  RECIPE_MAP,
} from '@shared/recipes';
import type { ActiveDrink, DrinkOrder, Language, RecipeId } from '@shared/types';
import { useDrinkBarStore } from '../store/drinkBarStore';

const RecipeMiniIcon: React.FC<{ recipeId: RecipeId }> = ({ recipeId }) => {
  const recipe = RECIPE_MAP[recipeId];
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
      <path
        d="M4.5 6.5 H15.5 L14 16 Q13.8 17.5 12 17.5 H8 Q6.2 17.5 6 16 Z"
        fill={recipe.baseColor}
        stroke="#3B2820"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="6" y="6.5" width="8" height="3" fill={recipe.secondaryColor} />
      <path
        d="M5 6.5 A 5 4.2 0 0 1 15 6.5"
        fill="none"
        stroke="#3B2820"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line x1="4" y1="6.5" x2="16" y2="6.5" stroke="#3B2820" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};

interface StationRowProps {
  stationTag: string;
  drink: ActiveDrink;
  language: Language;
}

const ActiveStationRow: React.FC<StationRowProps> = ({ stationTag, drink, language }) => {
  const msg = getMessages(language);
  const badge = formatBrewStepBadge(drink, language, msg.readyLabel);
  const recipeShort = getRecipeLabel(drink.recipeId, language, true);
  const barColor = RECIPE_MAP[drink.recipeId].baseColor;

  return (
    <div className="rounded-[10px] bg-[#FDEBF1] border-[1.8px] border-[#3B2820] px-1.5 py-1">
      <div className="flex items-center justify-between gap-1 text-[10.5px] font-black text-[#3B2820]">
        <span className="truncate">
          <b className="text-[#8A5200]">{stationTag}:</b> {drink.user.nickname}
        </span>
        <span className="shrink-0 font-display">{badge.pct}%</span>
      </div>
      <div className="mt-0.5 h-[5px] w-full rounded-full bg-[#FFF9FA] border border-[#3B2820] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${badge.pct}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex items-center justify-between gap-1 mt-0.5 text-[9.5px] font-black">
        <span className="text-[#5C4033] truncate">
          {drink.phase === 'SHOWCASE'
            ? badge.pillText
            : `[P${badge.step}] ${badge.stepShort}`}
        </span>
        <span className="text-[#855E68] shrink-0 font-extrabold">{recipeShort}</span>
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
  const secondaryDrink = activeSlots[1];
  const msg = getMessages(language);
  const maxQueueToShow = secondaryDrink ? 2 : GAMEPLAY_LIMITS.MAX_VISIBLE_QUEUE;
  const combinedQueue: DrinkOrder[] = [...vipQueue, ...normalQueue].slice(0, maxQueueToShow);

  return (
    <aside className="absolute left-[24px] top-[244px] w-[224px] pointer-events-none z-20 flex flex-col gap-[8px]">
      {/* 1. Drink Menu Card (5 recipes + keyword + ml / Sold Out, zero ellipsis) */}
      <section className="bar-card px-2 py-1.5 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 pb-1 border-b-2 border-[#3B2820]/12">
          <Coffee className="w-3.5 h-3.5 text-[#D47896] shrink-0" strokeWidth={2.7} />
          <h2 className="font-display font-bold text-[11.5px] tracking-wide text-[#3B2820] uppercase leading-none">
            {msg.menuCardTitle}
          </h2>
        </div>

        <ul className="space-y-[3px] text-[10.5px] leading-tight">
          {RECIPE_LIST.map((recipe) => {
            const label = language === 'EN' ? recipe.shortNameEn : recipe.nameVi;
            const slot = inventory[recipe.id];
            const isSoldOut = slot.currentMl < GAMEPLAY_LIMITS.COST_PER_DRINK_ML;
            const isLow = isRecipeLowStock(slot);

            let stockBadgeClass = 'bg-[#FDEBF1] text-[#9E3A5A] border-[#D47896]/35';
            if (isSoldOut) {
              stockBadgeClass = 'bg-[#FAD7DC] text-[#8E2536] border-[#8E2536]/40';
            } else if (isLow) {
              stockBadgeClass = 'bg-[#FFF1C2] text-[#9A4E1A] border-[#9A4E1A]/40';
            }

            return (
              <li
                key={recipe.id}
                className={`flex items-center justify-between gap-1 rounded-[8px] border-[1.5px] border-[#3B2820]/20 px-1.5 py-[2.5px] ${
                  isSoldOut ? 'bg-[#F2E4EA]/85 opacity-70' : 'bg-[#FDEBF1]'
                }`}
              >
                <span className="inline-flex items-center gap-1 font-black text-[#3B2820] whitespace-nowrap">
                  <RecipeMiniIcon recipeId={recipe.id} />
                  <span>{label}</span>
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-1 py-[0.5px] rounded-[5px] bg-[#FFFDF9] border border-[#3B2820]/30 text-[9.5px] font-black text-[#3B2820] whitespace-nowrap">
                    {recipe.menuCommand}
                  </span>
                  <span
                    className={`px-1 py-[0.5px] rounded-[5px] border text-[9px] font-black whitespace-nowrap ${stockBadgeClass}`}
                  >
                    {isSoldOut ? msg.soldOutBadge : `${slot.currentMl}ml`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 2. Compact Gift Perks Card (zero ellipsis) */}
      <section className="bar-card px-2 py-1.5 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 pb-0.5 border-b-2 border-[#3B2820]/12">
          <Gift className="w-3.5 h-3.5 text-[#D9536F] shrink-0" strokeWidth={2.7} />
          <h2 className="font-display font-bold text-[11.5px] tracking-wide text-[#3B2820] uppercase leading-none">
            {msg.giftCardTitle}
          </h2>
        </div>

        <ul className="space-y-[3px] text-[10.5px] leading-tight">
          <li className="flex items-center justify-between gap-1 bg-[#FFF3F5] border-[1.5px] border-[#3B2820]/20 rounded-[8px] px-1.5 py-[2.5px]">
            <span className="font-black text-[#3B2820] whitespace-nowrap">
              ♥ {msg.giftRowLikeLabel}
            </span>
            <span className="font-extrabold text-[#8A4050] whitespace-nowrap">
              {msg.giftRowLikeDesc}
            </span>
          </li>
          <li className="flex items-center justify-between gap-1 bg-[#FFF7EC] border-[1.5px] border-[#3B2820]/20 rounded-[8px] px-1.5 py-[2.5px]">
            <span className="font-black text-[#3B2820] whitespace-nowrap">
              ✿ {msg.giftRowRoseLabel}
            </span>
            <span className="font-extrabold text-[#9A4E1A] whitespace-nowrap">
              {msg.giftRowRoseDesc}
            </span>
          </li>
          <li className="flex items-center justify-between gap-1 bg-[#F2FBF4] border-[1.5px] border-[#3B2820]/20 rounded-[8px] px-1.5 py-[2.5px]">
            <span className="font-black text-[#3B2820] whitespace-nowrap">
              ★ {msg.giftRowMediumLabel}
            </span>
            <span className="font-extrabold text-[#25613B] whitespace-nowrap">
              {msg.giftRowMediumDesc}
            </span>
          </li>
          <li className="flex items-center justify-between gap-1 bg-[#FFF4CC] border-[1.5px] border-[#3B2820]/35 rounded-[8px] px-1.5 py-[2.5px]">
            <span className="font-black text-[#3B2820] whitespace-nowrap">
              ♛ {msg.giftRowBigLabel}
            </span>
            <span className="font-extrabold text-[#8A5200] whitespace-nowrap">
              {msg.giftRowBigDesc}
            </span>
          </li>
        </ul>
      </section>

      {/* 3. Order Queue Card (Station 1 + Station 2 + Next Queued Customers) */}
      <section className="bar-card px-2 py-1.5 flex flex-col gap-1">
        <div className="flex items-center justify-between pb-0.5 border-b-2 border-[#3B2820]/12">
          <span className="font-display font-bold text-[11.5px] tracking-wide text-[#3B2820] uppercase leading-none">
            {msg.queueCardTitle}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-[#7A5F52]">
            <Heart className="w-3 h-3 text-[#F0788C] fill-[#F0788C]" />
            {vipQueue.length + normalQueue.length}
          </span>
        </div>

        {/* Active Bartender Stations */}
        <div className="flex flex-col gap-1">
          {primaryDrink ? (
            <ActiveStationRow
              stationTag={msg.station1Label}
              drink={primaryDrink}
              language={language}
            />
          ) : (
            <div className="rounded-[10px] bg-[#FDEBF1] border-[1.8px] border-[#3B2820] px-2 py-1 text-center">
              <span className="text-[10.5px] font-extrabold text-[#855E68]">
                {msg.waitingIdle}
              </span>
            </div>
          )}

          {secondaryDrink && (
            <ActiveStationRow
              stationTag={msg.station2Label}
              drink={secondaryDrink}
              language={language}
            />
          )}
        </div>

        {/* Next Customers List */}
        <div className="flex flex-col gap-[3px]">
          {combinedQueue.length === 0 ? (
            (primaryDrink || secondaryDrink) ? (
              <div className="rounded-[9px] border-[1.5px] border-dashed border-[#3B2820]/20 py-1 px-2 text-center bg-[#FFF9FA]/60">
                <span className="text-[10px] font-bold text-[#855E68]">
                  {msg.queueEmptyHint}
                </span>
              </div>
            ) : null
          ) : (
            combinedQueue.map((order, index) => {
              const isTopOne = index === 0 && order.isSignature;
              const recipeShort = getRecipeLabel(order.recipeId, language, true);
              const swatch = RECIPE_MAP[order.recipeId].baseColor;

              return (
                <div
                  key={order.orderId}
                  className={`flex items-center justify-between gap-1 px-1.5 py-[2.5px] rounded-[9px] border-[1.6px] ${
                    order.isVip
                      ? 'bg-[#FFF5D6] border-[#3B2820]'
                      : 'bg-[#FFFDF9] border-[#3B2820]/25'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#3B2820] shrink-0"
                      style={{ backgroundColor: swatch }}
                    />
                    <span className="text-[10.5px] font-black text-[#3B2820] truncate">
                      {order.user.nickname}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9.5px] font-extrabold text-[#7A5F52]">
                      {recipeShort}
                    </span>
                    {isTopOne && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-[#F7C95B] border border-[#3B2820] text-[8.5px] font-black text-[#3B2820]">
                        <Crown className="w-2.5 h-2.5" />
                        {msg.topOneBadge}
                      </span>
                    )}
                    {!isTopOne && order.isVip && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-[#FFE6A3] border border-[#3B2820] text-[8.5px] font-black text-[#8A5200]">
                        <Sparkles className="w-2.5 h-2.5" />
                        {msg.vipBadge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </aside>
  );
};
