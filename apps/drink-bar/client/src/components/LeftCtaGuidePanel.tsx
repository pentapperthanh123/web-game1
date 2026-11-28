import React from 'react';
import { Crown, Heart, MessageCircle, Music, Sparkles } from 'lucide-react';
import { DrinkProductThumb } from '@shared/DrinkProductThumb';
import { getMessages } from '@shared/i18n';
import { MENU_RECIPE_LIST } from '@shared/recipes';
import { useDrinkBarStore } from '../store/drinkBarStore';

const WallSignHanger: React.FC = () => (
  <svg
    width="56"
    height="14"
    viewBox="0 0 56 14"
    fill="none"
    aria-hidden="true"
    className="mx-auto -mb-[2px] block overflow-visible"
  >
    <path
      d="M12 13 L28 3.5 L44 13"
      stroke="#3B2820"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="28" cy="4" r="3.6" fill="#F7C95B" stroke="#3B2820" strokeWidth="2.2" />
  </svg>
);

export const LeftCtaGuidePanel: React.FC = () => {
  const language = useDrinkBarStore((s) => s.config.language);
  const msg = getMessages(language);

  return (
    <div aria-label="Order and Donate to Dance guides" className="pointer-events-none">
      {/* Left Wall-Mounted Board: Symmetrical 8-drink 2x4 accented menu */}
      <aside className="absolute top-[92px] left-[8px] w-[176px] z-10">
        <WallSignHanger />
        <div className="rounded-[15px] border-[2.5px] border-[#3B2820] bg-[#FFFDF9]/98 shadow-[0_3.5px_0_#3B2820] overflow-hidden">
          <div className="px-2 py-[6px] bg-[#F8C8DC] border-b-[2px] border-[#3B2820] flex items-center justify-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#FFFDF9] border-[1.8px] border-[#3B2820] flex items-center justify-center shrink-0">
              <MessageCircle className="w-3 h-3 text-[#9E3A5A]" strokeWidth={2.8} />
            </span>
            <span className="font-display font-black text-[13px] tracking-wide text-[#3B2820] leading-none">
              {msg.ctaOrderTitle}
            </span>
          </div>

          <div className="p-1.5 space-y-1.5">
            <p className="text-[11px] font-black text-[#3B2820] leading-tight text-center">
              {msg.ctaOrderChatHint}
            </p>

            <div className="grid grid-cols-2 gap-1">
              {MENU_RECIPE_LIST.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-start gap-1 pl-1 pr-1 py-[4px] rounded-[9px] bg-[#FFF4F7] border-[1.8px] border-[#3B2820] shadow-[0_1.5px_0_rgba(59,40,32,0.16)] overflow-hidden"
                >
                  <span className="w-[14px] h-[17px] shrink-0 flex items-center justify-center">
                    <DrinkProductThumb recipeId={recipe.id} alt={recipe.menuCommand} />
                  </span>
                  <span className="font-display font-black text-[9.8px] tracking-tight text-[#3B2820] leading-none whitespace-nowrap truncate">
                    {recipe.menuCommand}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-[8px] bg-[#F9EFE2] border-[1.6px] border-[#3B2820]/45 px-1.5 py-1 text-center">
              <p className="text-[10px] font-black text-[#5C4033] leading-tight">
                {msg.ctaOrderCustomizeHint}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Wall-Mounted Board: Balanced symmetrical width matching left board */}
      <aside className="absolute top-[92px] right-[8px] w-[176px] z-10">
        <WallSignHanger />
        <div className="rounded-[15px] border-[2.5px] border-[#3B2820] bg-[#FFFDF9]/98 shadow-[0_3.5px_0_#3B2820] overflow-hidden">
          <div className="px-2 py-[6px] bg-[#FCE397] border-b-[2px] border-[#3B2820] flex items-center justify-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#FFFDF9] border-[1.8px] border-[#3B2820] flex items-center justify-center shrink-0">
              <Music className="w-3 h-3 text-[#8A5200]" strokeWidth={2.8} />
            </span>
            <span className="font-display font-black text-[12px] tracking-wide text-[#3B2820] leading-none">
              {msg.ctaDonateTitle}
            </span>
          </div>

          <div className="p-2 space-y-1.5 leading-tight">
            <div className="rounded-[9px] bg-[#FFF2F6] border-[1.8px] border-[#3B2820] px-2 py-1.5 shadow-[0_1.5px_0_rgba(59,40,32,0.14)]">
              <span className="flex items-center gap-1 text-[11px] font-black text-[#9E3A5A]">
                <Heart className="w-3 h-3 text-[#E84A6F] fill-[#F4A6BE] shrink-0" strokeWidth={2.6} />
                {msg.giftRowRoseLabel}
              </span>
              <span className="block text-[10.5px] font-black text-[#3B2820] mt-0.5">
                {msg.ctaDanceSmall}
              </span>
            </div>

            <div className="rounded-[9px] bg-[#E8F6FA] border-[1.8px] border-[#3B2820] px-2 py-1.5 shadow-[0_1.5px_0_rgba(59,40,32,0.14)]">
              <span className="flex items-center gap-1 text-[11px] font-black text-[#1E6A7E]">
                <Sparkles className="w-3 h-3 text-[#2E7E94] shrink-0" strokeWidth={2.6} />
                {msg.giftRowMediumLabel}
              </span>
              <span className="block text-[10.5px] font-black text-[#3B2820] mt-0.5">
                {msg.ctaDanceMedium}
              </span>
            </div>

            <div className="rounded-[9px] bg-[#FFF4C8] border-[1.8px] border-[#3B2820] px-2 py-1.5 shadow-[0_1.5px_0_rgba(59,40,32,0.14)]">
              <span className="flex items-center gap-1 text-[11px] font-black text-[#8A5200]">
                <Crown className="w-3 h-3 text-[#C47C0E] shrink-0" strokeWidth={2.6} />
                {msg.giftRowBigLabel}
              </span>
              <span className="block text-[10.5px] font-black text-[#3B2820] mt-0.5">
                {msg.ctaDanceLarge}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
