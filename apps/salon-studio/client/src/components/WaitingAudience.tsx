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
  const latestBubble = bubbles.length > 0 ? bubbles[bubbles.length - 1] : null;
  const activeSlot = latestBubble ? latestBubble.slotIndex % 3 : -1;
  const tailLeftClass =
    activeSlot === 0 ? 'left-[36px]' : activeSlot === 1 ? 'left-[108px]' : 'left-[180px]';

  return (
    <section className="relative mt-6 w-full pointer-events-none z-20 flex flex-col justify-end">
      {/* Cozy Salon Waiting Sofa positioned directly (24px) below the Queue Card */}
      <div className="relative h-[126px] flex items-end justify-center px-1">
        {/* Compact Viewer Speech Bubble anchored directly above the speaking waiting character (auto-hides after 3s) */}
        {latestBubble && (
          <div className="absolute -top-[18px] inset-x-1 z-30 animate-pop-in">
            <div className="relative bg-[#FFFDF9] border-[2.5px] border-[#3A2825] shadow-[0_2px_0_#3A2825] rounded-[14px] px-2.5 py-1">
              <div className="text-[9.5px] font-black text-[#D4627E] leading-none mb-0.5 flex items-center gap-1 truncate">
                <MessageCircle className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{latestBubble.nickname}</span>
              </div>
              <div className="text-[10.5px] font-extrabold text-[#3A2825] leading-tight truncate">
                “{latestBubble.text}”
              </div>
              {/* Speech pointer tail pointing directly down at the speaking character's head */}
              <div
                className={`absolute -bottom-[7px] ${tailLeftClass} w-3 h-3 bg-[#FFFDF9] border-r-[2.5px] border-b-[2.5px] border-[#3A2825] rotate-45`}
              />
            </div>
          </div>
        )}

        {/* Sofa Backrest Cushion */}
        <div className="absolute inset-x-1.5 bottom-3.5 h-[72px] rounded-[20px] bg-[#FFEAE3] border-[3.5px] border-[#3A2825] shadow-[0_3px_0_#3A2825]" />

        {/* 3 Proportioned Waiting Characters Sitting on Sofa */}
        <div className="relative z-10 w-full flex items-end justify-around px-2 mb-2">
          {WAITING_CHARACTERS.map((char, idx) => (
            <svg
              key={char.id}
              viewBox="0 0 74 92"
              className={`w-[70px] h-[88px] ${idx === 1 ? '-translate-y-1' : ''}`}
            >
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
              <circle cx="37" cy="35" r="24" fill={char.skin} stroke="#3A2825" strokeWidth="3.5" />
              <path
                d="M13 34 A24 24 0 0 1 61 34 Q45 20 37 24 Q27 20 13 34 Z"
                fill={char.hair}
                stroke="#3A2825"
                strokeWidth="3.2"
              />
              {char.hat === 'bow' && (
                <ellipse
                  cx="23"
                  cy="20"
                  rx="7"
                  ry="5"
                  fill="#FF8FA8"
                  stroke="#3A2825"
                  strokeWidth="2"
                />
              )}
              <circle cx="30" cy="37" r="2.8" fill="#3A2825" />
              <circle cx="45" cy="37" r="2.8" fill="#3A2825" />
              <ellipse cx="24" cy="42" rx="4.5" ry="2.6" fill="#FF9EB8" opacity="0.6" />
              <ellipse cx="50" cy="42" rx="4.5" ry="2.6" fill="#FF9EB8" opacity="0.6" />
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
        <div className="absolute bottom-1.5 inset-x-0 h-[26px] rounded-[15px] bg-[#FFD4E2] border-[3.5px] border-[#3A2825] z-10 flex items-center justify-between px-2">
          <div className="w-3.5 h-5 -ml-1.5 rounded-lg bg-[#FFAEC4] border-2 border-[#3A2825]" />
          <span className="text-[9.5px] font-black uppercase text-[#8A4A58] tracking-wider">
            GHẾ CHỜ SALON
          </span>
          <div className="w-3.5 h-5 -mr-1.5 rounded-lg bg-[#FFAEC4] border-2 border-[#3A2825]" />
        </div>

        {/* Little Wooden Feet under Sofa */}
        <div className="absolute -bottom-1 left-4 w-3.5 h-2.5 rounded-b-md bg-[#BA8C63] border-2 border-[#3A2825]" />
        <div className="absolute -bottom-1 right-4 w-3.5 h-2.5 rounded-b-md bg-[#BA8C63] border-2 border-[#3A2825]" />
      </div>
    </section>
  );
};
