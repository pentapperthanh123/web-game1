import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { SALON_I18N } from '@shared/constants/i18n';
import { useSalonStore } from '../store/salonStore';

export const ThankYouBanner: React.FC = () => {
  const toast = useSalonStore((s) => s.thankYouToast);
  const language = useSalonStore((s) => s.config.language);

  if (!toast) return null;

  const t = SALON_I18N[language];
  const bgClass =
    toast.tier === 'LARGE'
      ? 'bg-[#FFE58F]'
      : toast.tier === 'MEDIUM'
        ? 'bg-[#FFD5CC]'
        : 'bg-[#D5F7EA]';

  const suffix =
    toast.tier === 'LARGE'
      ? t.royalBannerSuffix
      : toast.tier === 'MEDIUM'
        ? t.trollBannerSuffix
        : t.thankYouSuffix;

  return (
    <div className="absolute top-[238px] left-[256px] right-4 flex justify-center pointer-events-none z-30">
      <div
        key={toast.id}
        className={`animate-pop-in cartoon-pill rounded-full px-4 py-1.5 flex items-center gap-2 max-w-[440px] ${bgClass}`}
      >
        {toast.tier === 'LARGE' ? (
          <Crown className="w-4 h-4 text-[#B87400] fill-[#FFD56B] shrink-0" />
        ) : toast.tier === 'MEDIUM' ? (
          <span className="text-sm leading-none shrink-0">😂</span>
        ) : (
          <Sparkles className="w-4 h-4 text-[#2D9B73] shrink-0" />
        )}
        <span className="text-[13px] font-black text-[#3A2825] truncate">
          [{toast.donorName}] {suffix}
        </span>
      </div>
    </div>
  );
};
