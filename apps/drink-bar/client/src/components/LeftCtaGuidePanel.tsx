import React from 'react';
import { Crown, Heart, MessageCircle, Music, Sparkles } from 'lucide-react';
import { getMessages } from '@shared/i18n';
import { RECIPE_LIST } from '@shared/recipes';
import { useDrinkBarStore } from '../store/drinkBarStore';

export const LeftCtaGuidePanel: React.FC = () => {
  const language = useDrinkBarStore((s) => s.config.language);
  const msg = getMessages(language);

  return (
    <div aria-label="Order and Donate to Dance guides" className="pointer-events-none">
      {/* Left CTA Board: How to Order & Like Boost */}
      <aside className="absolute top-[166px] left-[10px] w-[160px] z-10 rounded-[15px] border-[2.2px] border-[#3B2820] bg-[#FFFDF9]/96 shadow-[0_3px_0_#3B2820] overflow-hidden">
        <div className="px-2.5 py-[5px] bg-[#FDE4EC] border-b-[1.8px] border-[#3B2820]/35 flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-[#9E3A5A] shrink-0" strokeWidth={2.8} />
          <span className="font-display font-bold text-[11.5px] tracking-wide text-[#3B2820] leading-none">
            {msg.ctaOrderTitle}
          </span>
        </div>

        <div className="p-2 space-y-1.5">
          <p className="text-[10.5px] font-black text-[#3B2820] leading-tight">
            {msg.ctaOrderChatHint}
          </p>

          <div className="flex flex-wrap gap-1">
            {RECIPE_LIST.map((recipe) => (
              <span
                key={recipe.id}
                className="inline-flex items-center gap-1 px-1.5 py-[2.5px] rounded-full bg-[#FFF5F8] border-[1.4px] border-[#3B2820]/30 text-[9.5px] font-black text-[#3B2820] leading-none"
              >
                <span
                  className="w-2 h-2 rounded-full border border-[#3B2820]"
                  style={{ backgroundColor: recipe.baseColor }}
                />
                {recipe.menuCommand}
              </span>
            ))}
          </div>

          <p className="text-[9.5px] font-extrabold text-[#7A5F52] leading-tight">
            {msg.ctaOrderCustomizeHint}
          </p>

          <div className="pt-1 border-t border-[#3B2820]/20 flex items-center gap-1 text-[10px] font-black text-[#9E3A5A] leading-tight">
            <Heart className="w-3 h-3 text-[#F0788C] fill-[#F0788C] shrink-0" />
            <span>
              {msg.giftRowLikeLabel}: {msg.giftRowLikeDesc}
            </span>
          </div>
        </div>
      </aside>

      {/* Right CTA Board: Donate Gifts -> Barista TikTok Dance */}
      <aside className="absolute top-[166px] right-[10px] w-[160px] z-10 rounded-[15px] border-[2.2px] border-[#3B2820] bg-[#FFFDF9]/96 shadow-[0_3px_0_#3B2820] overflow-hidden">
        <div className="px-2.5 py-[5px] bg-[#FFF1C2] border-b-[1.8px] border-[#3B2820]/35 flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-[#8A5200] shrink-0" strokeWidth={2.8} />
          <span className="font-display font-bold text-[11.5px] tracking-wide text-[#3B2820] leading-none">
            {msg.ctaDonateTitle}
          </span>
        </div>

        <div className="p-2 space-y-1.5 leading-tight">
          <div className="rounded-[9px] bg-[#FFF5F8] border-[1.4px] border-[#3B2820]/20 px-2 py-1">
            <span className="flex items-center gap-1 text-[10px] font-black text-[#9E3A5A]">
              <Heart className="w-3 h-3 text-[#F0788C] shrink-0" strokeWidth={2.6} />
              {msg.giftRowRoseLabel}
            </span>
            <span className="block text-[9.5px] font-black text-[#3B2820] mt-0.5">
              {msg.ctaDanceSmall}
            </span>
          </div>

          <div className="rounded-[9px] bg-[#EEF9FC] border-[1.4px] border-[#3B2820]/20 px-2 py-1">
            <span className="flex items-center gap-1 text-[10px] font-black text-[#2E7E94]">
              <Sparkles className="w-3 h-3 text-[#2E7E94] shrink-0" strokeWidth={2.6} />
              {msg.giftRowMediumLabel}
            </span>
            <span className="block text-[9.5px] font-black text-[#3B2820] mt-0.5">
              {msg.ctaDanceMedium}
            </span>
          </div>

          <div className="rounded-[9px] bg-[#FFF7DA] border-[1.4px] border-[#3B2820]/30 px-2 py-1">
            <span className="flex items-center gap-1 text-[10px] font-black text-[#8A5200]">
              <Crown className="w-3 h-3 text-[#C47C0E] shrink-0" strokeWidth={2.6} />
              {msg.giftRowBigLabel}
            </span>
            <span className="block text-[9.5px] font-black text-[#3B2820] mt-0.5">
              {msg.ctaDanceLarge}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
};
