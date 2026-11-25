import React from 'react';
import { SALON_I18N } from '@shared/constants/i18n';
import {
  getDeterministicAvatarColor,
  HAIR_STYLE_LABELS,
  NAIL_SHAPE_LABELS,
} from '@shared/constants/presets';
import { useSalonStore } from '../store/salonStore';

export const ActiveCustomerCard: React.FC = () => {
  const language = useSalonStore((s) => s.config.language);
  const activeService = useSalonStore((s) => s.activeService);
  const customer = useSalonStore((s) => s.activeCustomer);

  const t = SALON_I18N[language];

  if (!customer) {
    return (
      <section className="absolute top-[850px] left-[256px] w-[444px] pointer-events-none z-20">
        <div className="relative cartoon-card bg-[#FFFDF9] rounded-[24px] px-4 py-3.5 flex items-center justify-center">
          <div className="absolute -top-3 left-5 bg-[#C9F2E3] border-[2.5px] border-[#3A2825] rounded-full px-3 py-0.5 text-[11px] font-display font-extrabold text-[#175B43] uppercase shadow-sm">
            {activeService === 'NAIL' ? t.activeCustomerNailTitle : t.activeCustomerTitle}
          </div>
          <span className="font-display font-bold text-[15px] text-[#7D6059]">
            {t.readyStatus}
          </span>
        </div>
      </section>
    );
  }

  const isVipOrRoyal =
    customer.isRoyal || customer.priority === 'VIP' || customer.priority === 'ROYAL';
  const tagBg = customer.isRoyal
    ? 'bg-[#FFD56B] text-[#3A2825]'
    : isVipOrRoyal
      ? 'bg-[#FF8FA8] text-white'
      : 'bg-[#C9F2E3] text-[#175B43]';
  const tagText = customer.isRoyal
    ? '👑 ROYAL IDOL'
    : isVipOrRoyal
      ? '✨ VIP SEAT'
      : customer.service === 'NAIL'
        ? t.activeCustomerNailTitle
        : t.activeCustomerTitle;

  const pct = Math.min(100, Math.max(0, Math.round(customer.progress)));
  const avatarBg = customer.isRoyal
    ? '#FFD56B'
    : getDeterministicAvatarColor(customer.user.id);
  const initial = (customer.user.nickname.trim()[0] || 'S').toUpperCase();
  const styleSubtitle =
    customer.service === 'HAIR'
      ? HAIR_STYLE_LABELS[customer.hairStyle]
      : NAIL_SHAPE_LABELS[customer.nailShape];

  const barColor = customer.isRoyal
    ? 'bg-[#FFD56B]'
    : customer.trollEffect
      ? 'bg-[#FF8C7A]'
      : 'bg-[#42B38B]';

  return (
    <section className="absolute top-[850px] left-[256px] w-[444px] pointer-events-none z-20">
      <div
        className={`relative cartoon-card rounded-[24px] px-4 pt-4 pb-3 flex items-center gap-3.5 ${
          customer.isRoyal ? 'bg-[#FFF8D9]' : 'bg-[#FFFDF9]'
        }`}
      >
        {/* Top Floating Status Pill: "ĐANG TRÊN GHẾ" / "ĐANG LÀM NAIL" */}
        <div
          className={`absolute -top-3 left-5 ${tagBg} border-[2.5px] border-[#3A2825] rounded-full px-3 py-0.5 text-[11px] font-display font-extrabold uppercase tracking-wide shadow-sm`}
        >
          {tagText}
        </div>

        {/* Deterministic Pastel Initial Badge by userId */}
        <div
          style={{ backgroundColor: avatarBg }}
          className="w-13 h-13 rounded-full border-[3.5px] border-[#3A2825] flex items-center justify-center font-display font-extrabold text-[22px] text-[#3A2825] shrink-0 shadow-[0_2px_0_#3A2825]"
        >
          {initial}
        </div>

        {/* Player Nickname, Current Hair/Nail Style & Progress Bar (0% -> 100%) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <span className="font-extrabold text-[16px] text-[#3A2825] leading-tight truncate">
                {customer.user.nickname}
              </span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFF0F5] border-[1.5px] border-[#3A2825]/40 text-[#7D6059] whitespace-nowrap shrink-0">
                {styleSubtitle}
              </span>
            </div>

            <span
              className={`font-display font-extrabold text-[17px] pl-1 shrink-0 ${
                customer.trollEffect ? 'text-[#D94B4B]' : 'text-[#42B38B]'
              }`}
            >
              {pct >= 100 ? t.progressDone : `${pct}%`}
            </span>
          </div>

          {/* Progress Bar Track (0% -> 100%) */}
          <div className="w-full h-5 rounded-full bg-[#F5E6DD] border-[3px] border-[#3A2825] overflow-hidden p-0.5">
            <div
              style={{ width: `${Math.max(6, pct)}%` }}
              className={`h-full rounded-full border-r-2 border-[#3A2825] transition-all duration-150 ${barColor}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
