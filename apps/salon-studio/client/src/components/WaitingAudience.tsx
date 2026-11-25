import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useSalonStore } from '../store/salonStore';

const WAITING_CHARACTERS = [
  { id: 'c0', hair: '#523B35', shirt: '#FFD4E2', skin: '#FFE1C8', hat: 'none' },
  { id: 'c1', hair: '#E3A84B', shirt: '#C9F2E3', skin: '#FAD2B4', hat: 'bow' },
  { id: 'c2', hair: '#5A7F9A', shirt: '#FFE5B4', skin: '#FFE8D6', hat: 'none' },
] as const;

export const WaitingAudience: React.FC = () => {
  const bubbles = useSalonStore((s) => s.audienceBubbles);

  return (
    <section className="absolute left-4 top-[735px] w-[265px] h-[210px] pointer-events-none z-20 flex flex-col justify-end">
      {/* Rotating short community chat bubbles above waiting couch */}
      <div className="flex flex-col gap-1.5 mb-2 px-0.5">
        {bubbles.slice(-2).map((b) => (
          <div
            key={b.id}
            className="animate-pop-in bg-[#FFFDF9] border-[3px] border-[#3A2825] shadow-[0_3px_0_#3A2825] rounded-[18px] rounded-bl-sm px-3 py-1.5 max-w-[245px]"
          >
            <div className="text-[10px] font-black text-[#D4627E] leading-none mb-0.5 flex items-center gap-1 truncate">
              <MessageCircle className="w-2.5 h-2.5 shrink-0" />
              <span>{b.nickname}</span>
            </div>
            <div className="text-[12px] font-extrabold text-[#3A2825] leading-snug break-words">
              “{b.text}”
            </div>
          </div>
        ))}
      </div>

      {/* Cozy Salon Waiting Sofa with larger, clearly proportioned waiting guests */}
      <div className="relative h-[122px] flex items-end justify-center px-1">
        {/* Sofa Backrest Cushion */}
        <div className="absolute inset-x-2 bottom-4 h-[76px] rounded-[22px] bg-[#FFEAE3] border-[3.5px] border-[#3A2825] shadow-[0_3px_0_#3A2825]" />

        {/* 3 Proportioned Waiting Characters Sitting on Sofa */}
        <div className="relative z-10 w-full flex items-end justify-around px-3 mb-2">
          {WAITING_CHARACTERS.map((char, idx) => (
            <svg
              key={char.id}
              viewBox="0 0 74 92"
              className={`w-[78px] h-[96px] ${idx === 1 ? '-translate-y-1' : ''}`}
            >
              {/* Torso / Clothes */}
              <rect
                x="13"
                y="52"
                width="48"
                height="34"
                rx="16"
                fill={char.shirt}
                stroke="#3A2825"
                strokeWidth="3.5"
              />
              {/* Head (radius 24 for clear visibility) */}
              <circle cx="37" cy="35" r="24" fill={char.skin} stroke="#3A2825" strokeWidth="3.5" />
              {/* Hair */}
              <path
                d="M13 34 A24 24 0 0 1 61 34 Q45 20 37 24 Q27 20 13 34 Z"
                fill={char.hair}
                stroke="#3A2825"
                strokeWidth="3.2"
              />
              {char.hat === 'bow' && (
                <ellipse cx="23" cy="20" rx="7" ry="5" fill="#FF8FA8" stroke="#3A2825" strokeWidth="2" />
              )}
              {/* Eyes looking curiously toward salon station */}
              <circle cx="30" cy="37" r="2.8" fill="#3A2825" />
              <circle cx="45" cy="37" r="2.8" fill="#3A2825" />
              {/* Rosy cheeks */}
              <ellipse cx="24" cy="42" rx="4.5" ry="2.6" fill="#FF9EB8" opacity="0.6" />
              <ellipse cx="50" cy="42" rx="4.5" ry="2.6" fill="#FF9EB8" opacity="0.6" />
              {/* Smile */}
              <path
                d="M33 44 Q37 48 41 44"
                stroke="#3A2825"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          ))}
        </div>

        {/* Sofa Seat Cushion Bar */}
        <div className="absolute bottom-2 inset-x-0 h-[28px] rounded-[16px] bg-[#FFD4E2] border-[3.5px] border-[#3A2825] z-10 flex items-center justify-between px-2">
          {/* Sofa Armrests on sides */}
          <div className="w-4 h-6 -ml-2 rounded-lg bg-[#FFAEC4] border-2 border-[#3A2825]" />
          <span className="text-[10px] font-black uppercase text-[#8A4A58] tracking-wider">
            Ghế Chờ Salon
          </span>
          <div className="w-4 h-6 -mr-2 rounded-lg bg-[#FFAEC4] border-2 border-[#3A2825]" />
        </div>

        {/* Little Wooden Feet under Sofa */}
        <div className="absolute -bottom-1 left-4 w-4 h-3 rounded-b-md bg-[#BA8C63] border-2 border-[#3A2825]" />
        <div className="absolute -bottom-1 right-4 w-4 h-3 rounded-b-md bg-[#BA8C63] border-2 border-[#3A2825]" />
      </div>
    </section>
  );
};
