import React, { useEffect, useState } from 'react';
import { usePrankStore } from '../store/prankStore';
import { Sparkles } from 'lucide-react';

export const GiftImpactBanner: React.FC = () => {
  const { lastHit, language } = usePrankStore();
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!lastHit) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2400);
    return () => clearTimeout(timer);
  }, [lastHit]);

  if (!visible || !lastHit) return null;

  const getActionText = () => {
    if (language === 'VI') {
      switch (lastHit.action) {
        case 'EGG':
          return 'đã ném TRỨNG VỠ!';
        case 'CAKE':
          return 'đã úp BÁNH KEM!';
        case 'MILK':
          return 'đã tạt SỮA TƯƠI!';
        case 'BALL':
          return 'đã ném BÓNG NẨY!';
        case 'WIND':
          return 'đã thổi GIÓ BÃO!';
        case 'TAUNT':
          return 'đã CHỌC CÁU!';
        case 'SURPRISE':
          return 'đã kích hoạt BẤT NGỜ!';
      }
    }
    return `threw ${lastHit.action}!`;
  };

  return (
    <div className="absolute top-[145px] left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3 bg-neutral-950/85 backdrop-blur-md border border-amber-400/60 px-5 py-2.5 rounded-2xl shadow-[0_4px_20px_rgba(251,191,36,0.3)]">
        {/* User avatar or placeholder */}
        <div className="w-10 h-10 rounded-full border-2 border-amber-400 overflow-hidden bg-neutral-800 flex items-center justify-center font-bold text-amber-300 text-sm shrink-0">
          {lastHit.avatarUrl ? (
            <img
              src={lastHit.avatarUrl}
              alt={lastHit.initiatorName}
              className="w-full h-full object-cover"
            />
          ) : (
            lastHit.initiatorName.slice(0, 2).toUpperCase()
          )}
        </div>

        {/* Text announcement */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-yellow-300 truncate max-w-[170px]">
              {lastHit.initiatorName}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          </div>
          <span className="text-xs font-bold text-white tracking-wide">
            {getActionText()}
          </span>
        </div>
      </div>
    </div>
  );
};
