import React from 'react';
import { MessageSquare, Heart, Gift } from 'lucide-react';
import { useCafeStore } from '../../store/cafeStore';

export const QuickGuide: React.FC = () => {
  const language = useCafeStore((s) => s.language);
  const isEn = language === 'EN';

  const line1 = isEn ? 'Type "play" → Sit' : 'Gõ "ngồi" → Vào máy';
  const line2 = isEn ? 'Tap → +Time' : 'Thả tim → Nạp giờ (+0.4s)';
  const line3 = isEn ? 'Gift → Troll / Kick' : 'Quà → Phá / Đá ghế';

  return (
    <div className="absolute top-[872px] left-6 right-6 z-20 flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-950/85 border border-amber-500/25 backdrop-blur-md shadow-xl font-mono text-[11px]">
      <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
        <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>{line1}</span>
      </div>
      <div className="h-3 w-[1px] bg-neutral-800" />
      <div className="flex items-center gap-1.5 text-pink-300 font-bold">
        <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400 shrink-0" />
        <span>{line2}</span>
      </div>
      <div className="h-3 w-[1px] bg-neutral-800" />
      <div className="flex items-center gap-1.5 text-amber-300 font-bold">
        <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>{line3}</span>
      </div>
    </div>
  );
};
