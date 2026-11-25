import React from 'react';
import { Coffee, Crown, Sparkles, Users } from 'lucide-react';
import { GAMEPLAY_LIMITS } from '@shared/config';
import { getMessages } from '@shared/i18n';
import { useDrinkBarStore } from '../store/drinkBarStore';
import { MiniDrinkSvg } from './MiniDrinkSvg';

const SHELF_SLOT_INDICES = [0, 1, 2, 3] as const;

export const TopHeaderAndShelf: React.FC = () => {
  const language = useDrinkBarStore((s) => s.config.language);
  const todayDoneCount = useDrinkBarStore((s) => s.todayDoneCount);
  const vipCount = useDrinkBarStore((s) => s.vipQueue.length);
  const normalCount = useDrinkBarStore((s) => s.normalQueue.length);
  const finishedShelf = useDrinkBarStore((s) => s.finishedShelf);

  const msg = getMessages(language);
  const totalQueue = vipCount + normalCount;

  return (
    <header className="absolute top-[16px] left-[24px] right-[24px] h-[219px] pointer-events-none z-20 flex flex-col justify-between">
      {/* Row 1 (y: 16 -> 74): Title + DONE Badge | Queue + VIP Pill */}
      <div className="h-[58px] flex items-center justify-between gap-2">
        {/* Left Title & Done Count */}
        <div className="flex items-center gap-2">
          <div className="bar-pill bg-[#FFF9FA] px-3.5 py-1.5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#F4A6BE] border-[2.5px] border-[#3B2820] flex items-center justify-center shrink-0">
              <Coffee className="w-4 h-4 text-[#3B2820]" strokeWidth={2.6} />
            </span>
            <span className="font-display font-bold text-[20px] tracking-wide leading-none text-[#3B2820]">
              {msg.brandTitle}
            </span>
          </div>

          <div className="bar-pill bg-[#FDE4EC] px-3 py-1.5 flex items-center gap-1.5 border-[3px] border-[#3B2820]">
            <Sparkles className="w-3.5 h-3.5 text-[#9E3A5A]" strokeWidth={2.8} />
            <span className="font-display font-bold text-[14px] leading-none text-[#9E3A5A]">
              {msg.doneBadge}: {todayDoneCount}
            </span>
          </div>
        </div>

        {/* Right Queue & VIP Status Pill (x: 470 -> 696) */}
        <div className="bar-pill bg-[#FFF9FA] px-3.5 py-1.5 flex items-center gap-2 min-w-[210px] justify-end">
          <Users className="w-4 h-4 text-[#3B2820] shrink-0" strokeWidth={2.6} />
          <span className="font-display font-bold text-[15px] leading-none text-[#3B2820]">
            {msg.queueBadge}: {totalQueue}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF1C2] border-2 border-[#3B2820] text-[12px] font-black text-[#8A5200]">
            <Crown className="w-3 h-3 text-[#C47C0E]" strokeWidth={2.8} />
            {msg.vipBadge} {vipCount}
          </span>
        </div>
      </div>

      {/* Row 2 (y: 84 -> 235): Wooden Display Shelf (max 4 recent completed drinks) */}
      <div className="relative h-[151px] flex flex-col justify-end">
        {/* Hanging wooden rail behind cups */}
        <div className="absolute left-2 right-2 bottom-[6px] h-[16px] rounded-full bg-[#D4929D] border-[3px] border-[#3B2820] shadow-[0_3px_0_#3B2820]">
          <div className="h-[4px] mx-2 mt-[1px] rounded-full bg-[#EBB6C0]" />
        </div>

        {/* 4 Mini Display Slots (~148px x ~136px each) */}
        <div className="relative z-10 grid grid-cols-4 gap-3 px-2 pb-[12px]">
          {SHELF_SLOT_INDICES.slice(0, GAMEPLAY_LIMITS.MAX_SHELF_ITEMS).map((idx) => {
            const item = finishedShelf[idx];
            if (!item) {
              return (
                <div
                  key={`empty-slot-${idx}`}
                  className="h-[132px] rounded-[18px] border-[2px] border-[#E8BFCD] bg-[#FDEBF1] shadow-[inset_0_2px_5px_rgba(59,40,32,0.08)] flex flex-col items-center justify-center px-2 text-center"
                >
                  <div className="w-9 h-9 rounded-full bg-[#F7D8E2] border-[1.5px] border-[#E8BFCD] mb-1.5 shadow-[inset_0_1px_2px_rgba(59,40,32,0.06)]" />
                  <span className="text-[11px] font-extrabold text-[#855E68] leading-tight">
                    #{idx + 1}
                  </span>
                </div>
              );
            }

            const slotClass = item.isSignature
              ? 'bar-slot-gold bg-[#FFF6EB]'
              : 'border-[3px] border-[#3B2820] bg-[#FFF9FA] shadow-[0_3px_0_#3B2820]';

            return (
              <div
                key={item.orderId}
                className={`h-[132px] rounded-[18px] ${slotClass} flex flex-col items-center justify-between py-1.5 px-2 relative animate-bubble-pop`}
              >
                {item.isSignature && (
                  <>
                    <div className="absolute inset-0 rounded-[15px] overflow-hidden pointer-events-none">
                      <div className="w-[46%] h-full bg-gradient-to-r from-transparent via-[#FFFDF9]/75 to-transparent animate-signature-sheen" />
                    </div>
                    <span className="absolute -top-2.5 right-2 px-1.5 py-0.5 rounded-full bg-[#F7C95B] border-2 border-[#3B2820] text-[9px] font-black text-[#3B2820] leading-none z-10">
                      ★ {msg.signatureTag}
                    </span>
                  </>
                )}

                <MiniDrinkSvg drink={item} />

                <span className="w-full text-center text-[12px] font-black text-[#3B2820] truncate leading-tight">
                  {item.user.nickname}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};
