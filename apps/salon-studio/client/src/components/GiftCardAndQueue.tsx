import React from 'react';
import { Crown, Gift, Heart, Sparkles, Users } from 'lucide-react';
import { SALON_I18N } from '@shared/constants/i18n';
import { getDeterministicAvatarColor } from '@shared/constants/presets';
import { useSalonStore } from '../store/salonStore';
import { WaitingAudience } from './WaitingAudience';

export const GiftCardAndQueue: React.FC = () => {
  const language = useSalonStore((s) => s.config.language);
  const vipQueue = useSalonStore((s) => s.vipQueue);
  const normalQueue = useSalonStore((s) => s.normalQueue);

  const t = SALON_I18N[language];
  const totalQueued = vipQueue.length + normalQueue.length;
  const visibleQueue = [...vipQueue, ...normalQueue].slice(0, 3);

  return (
    <aside className="absolute top-[236px] left-4 w-[230px] flex flex-col gap-3 pointer-events-none z-20">
      {/* Compact 4-line Gift Price Card */}
      <div className="cartoon-card bg-[#FFFDF9]/95 rounded-[22px] p-3">
        <div className="flex items-center gap-1.5 pb-1.5 mb-2 border-b-2 border-[#3A2825]/15">
          <Gift className="w-4 h-4 text-[#E85D82]" strokeWidth={2.6} />
          <span className="font-display font-bold text-[14px] text-[#3A2825] tracking-wide">
            {t.giftCardTitle}
          </span>
        </div>

        <ul className="space-y-1.5 text-[11.5px] font-extrabold text-[#3A2825] leading-snug">
          <li className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-[#FF6B8B] fill-[#FF6B8B] shrink-0" />
            <span>{t.giftLineLike}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E09A1F] shrink-0" />
            <span>{t.giftLineSmall}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-[13px] leading-none shrink-0">🌸</span>
            <span>{t.giftLineMedium}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-[#E09A1F] fill-[#FFD56B] shrink-0" />
            <span>{t.giftLineLarge}</span>
          </li>
        </ul>
      </div>

      {/* Balanced Queue Card positioned in the eye-level middle-left zone */}
      <div className="cartoon-card bg-[#FFF8F0]/95 rounded-[22px] p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#42B38B]" strokeWidth={2.6} />
            <span className="font-display font-bold text-[14px] text-[#3A2825]">
              {t.queueTitle}: {totalQueued}
            </span>
          </div>
          {vipQueue.length > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFD56B] border-2 border-[#3A2825] text-[#3A2825]">
              VIP {vipQueue.length}
            </span>
          )}
        </div>

        {visibleQueue.length === 0 ? (
          <div className="text-[11px] font-bold text-[#7D6059] leading-snug bg-[#FFEFE3] rounded-xl px-2.5 py-2 border-2 border-dashed border-[#3A2825]/30">
            {t.queueEmpty}
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleQueue.map((item, idx) => {
              const isRoyal = item.priority === 'ROYAL';
              const isVip = item.priority === 'VIP';
              const rowBg = isRoyal
                ? 'bg-[#FFF1B8]'
                : isVip
                  ? 'bg-[#FFE0EB]'
                  : 'bg-[#FFFFFF]';

              return (
                <div
                  key={item.orderId}
                  className={`flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-1 border-2 border-[#3A2825] ${rowBg}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display font-bold text-[11px] text-[#7D6059] shrink-0">
                      #{idx + 1}
                    </span>
                    <div
                      style={{ backgroundColor: getDeterministicAvatarColor(item.user.id) }}
                      className="w-4 h-4 rounded-full border border-[#3A2825] flex items-center justify-center text-[9px] font-black text-[#3A2825] shrink-0"
                    >
                      {(item.user.nickname.trim()[0] || 'U').toUpperCase()}
                    </div>
                    <span className="text-[12px] font-extrabold text-[#3A2825] whitespace-nowrap">
                      {item.user.nickname}
                    </span>
                  </div>
                  {isRoyal && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#FFD56B] border border-[#3A2825] text-[#3A2825] shrink-0">
                      👑
                    </span>
                  )}
                  {isVip && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#FF8FA8] border border-[#3A2825] text-white shrink-0">
                      {t.vipBadge}
                    </span>
                  )}
                </div>
              );
            })}
            {totalQueued > visibleQueue.length && (
              <div className="text-center text-[11px] font-extrabold text-[#7D6059]">
                +{totalQueued - visibleQueue.length} khách đang chờ
              </div>
            )}
          </div>
        )}
      </div>

      {/* Salon Waiting Sofa seated directly (24px) below the Queue Card */}
      <WaitingAudience />
    </aside>
  );
};
