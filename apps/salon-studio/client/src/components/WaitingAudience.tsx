import React from 'react';
import { useSalonStore } from '../store/salonStore';

const WAITING_CHARACTERS = [
  { id: 'c0', hair: '#523B35', shirt: '#FFD4E2', skin: '#FFE1C8' },
  { id: 'c1', hair: '#E3A84B', shirt: '#C9F2E3', skin: '#FAD2B4' },
  { id: 'c2', hair: '#5A7F9A', shirt: '#FFE5B4', skin: '#FFE8D6' },
] as const;

export const WaitingAudience: React.FC = () => {
  const bubbles = useSalonStore((s) => s.audienceBubbles);

  return (
    <section className="absolute left-3 top-[665px] w-[250px] h-[270px] pointer-events-none z-20 flex flex-col justify-end">
      {/* Rotating short chat bubbles above waiting crowd */}
      <div className="flex flex-col gap-1.5 mb-2 px-1">
        {bubbles.slice(-2).map((b) => (
          <div
            key={b.id}
            className="animate-pop-in bg-[#FFFDF9] border-[3px] border-[#3A2825] shadow-[0_3px_0_#3A2825] rounded-[18px] rounded-bl-sm px-3 py-1.5 max-w-[232px]"
          >
            <div className="text-[10px] font-black text-[#D4627E] leading-none mb-0.5 truncate">
              {b.nickname}
            </div>
            <div className="text-[12px] font-extrabold text-[#3A2825] leading-snug break-words">
              “{b.text}”
            </div>
          </div>
        ))}
      </div>

      {/* Cute Waiting Bench + 3 Chibi Audience Guests */}
      <div className="relative h-[108px] flex items-end justify-around px-2">
        {WAITING_CHARACTERS.map((char, idx) => (
          <svg
            key={char.id}
            viewBox="0 0 70 86"
            className={`w-[72px] h-[88px] ${idx === 1 ? '-translate-y-1.5' : ''}`}
          >
            {/* Shoulders */}
            <rect
              x="12"
              y="50"
              width="46"
              height="32"
              rx="16"
              fill={char.shirt}
              stroke="#3A2825"
              strokeWidth="3.5"
            />
            {/* Head */}
            <circle cx="35" cy="34" r="21" fill={char.skin} stroke="#3A2825" strokeWidth="3.5" />
            {/* Hair cap */}
            <path
              d="M14 33 A21 21 0 0 1 56 33 Q42 22 35 25 Q26 21 14 33 Z"
              fill={char.hair}
              stroke="#3A2825"
              strokeWidth="3.2"
            />
            {/* Eyes & rosy cheeks */}
            <circle cx="28" cy="36" r="2.6" fill="#3A2825" />
            <circle cx="42" cy="36" r="2.6" fill="#3A2825" />
            <ellipse cx="23" cy="41" rx="4" ry="2.4" fill="#FF9EB8" opacity="0.55" />
            <ellipse cx="47" cy="41" rx="4" ry="2.4" fill="#FF9EB8" opacity="0.55" />
            <path
              d="M31 43 Q35 47 39 43"
              stroke="#3A2825"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        ))}

        {/* Pastel Waiting Bench Bar */}
        <div className="absolute bottom-0 inset-x-1 h-4 rounded-full bg-[#E7BC91] border-[3px] border-[#3A2825]" />
      </div>
    </section>
  );
};
