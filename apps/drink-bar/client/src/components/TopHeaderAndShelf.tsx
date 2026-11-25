import React from 'react';
import { Coffee, Crown, Sparkles, Users } from 'lucide-react';
import { getMessages } from '@shared/i18n';
import { useDrinkBarStore } from '../store/drinkBarStore';

export const TopHeaderAndShelf: React.FC = () => {
  const language = useDrinkBarStore((s) => s.config.language);
  const todayDoneCount = useDrinkBarStore((s) => s.todayDoneCount);
  const vipCount = useDrinkBarStore((s) => s.vipQueue.length);
  const normalCount = useDrinkBarStore((s) => s.normalQueue.length);

  const msg = getMessages(language);
  const totalQueue = vipCount + normalCount;

  return (
    <header className="absolute top-[16px] left-[24px] right-[24px] h-[54px] pointer-events-none z-20 flex items-center justify-between gap-2">
      {/* Left Title & Done Count */}
      <div className="flex items-center gap-2">
        <div className="bar-pill bg-[#FFF9FA] px-3.5 py-1.5 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#F4A6BE] border-[2.5px] border-[#3B2820] flex items-center justify-center shrink-0">
            <Coffee className="w-4 h-4 text-[#3B2820]" strokeWidth={2.6} />
          </span>
          <span className="font-display font-bold text-[19px] tracking-wide leading-none text-[#3B2820]">
            {msg.brandTitle}
          </span>
        </div>

        <div className="bar-pill bg-[#FDE4EC] px-3 py-1.5 flex items-center gap-1.5 border-[2.5px] border-[#3B2820]">
          <Sparkles className="w-3.5 h-3.5 text-[#9E3A5A]" strokeWidth={2.8} />
          <span className="font-display font-bold text-[14px] leading-none text-[#9E3A5A]">
            {msg.doneBadge}: {todayDoneCount}
          </span>
        </div>
      </div>

      {/* Right Queue & VIP Status Pill */}
      <div className="bar-pill bg-[#FFF9FA] px-3.5 py-1.5 flex items-center gap-2 min-w-[205px] justify-end">
        <Users className="w-4 h-4 text-[#3B2820] shrink-0" strokeWidth={2.6} />
        <span className="font-display font-bold text-[15px] leading-none text-[#3B2820]">
          {msg.queueBadge}: {totalQueue}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF1C2] border-2 border-[#3B2820] text-[12px] font-black text-[#8A5200]">
          <Crown className="w-3 h-3 text-[#C47C0E]" strokeWidth={2.8} />
          {msg.vipBadge} {vipCount}
        </span>
      </div>
    </header>
  );
};
