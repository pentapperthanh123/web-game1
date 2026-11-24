import React from 'react';
import { Flame, Shield, MessageCircle } from 'lucide-react';
import { useCafeStore } from '../../store/cafeStore';

export const ChatBubblesOverlay: React.FC = () => {
  const chatBubbles = useCafeStore((s) => s.chatBubbles) || [];

  if (chatBubbles.length === 0) return null;

  return (
    <div className="absolute top-[520px] left-6 right-6 z-35 pointer-events-none flex flex-col items-center gap-1.5">
      {chatBubbles.slice(-3).map((bubble, idx) => {
        const isNup = bubble.type === 'NUP';
        const isGrind = bubble.type === 'GRIND';

        let badgeBg = 'bg-neutral-900 border-neutral-700 text-white';
        let Icon = MessageCircle;
        let iconColor = 'text-cyan-400';

        if (isNup) {
          badgeBg = 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
          Icon = Shield;
          iconColor = 'text-emerald-400';
        } else if (isGrind) {
          badgeBg = 'bg-amber-950 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
          Icon = Flame;
          iconColor = 'text-amber-400';
        }

        return (
          <div
            key={bubble.id || idx}
            className={`max-w-[85%] px-3 py-1.5 rounded-2xl border-2 font-mono text-xs shadow-xl flex items-center gap-2 backdrop-blur-md animate-bounce ${badgeBg}`}
            style={{
              animationDuration: '1.8s',
              transform: `scale(${1 - (chatBubbles.length - 1 - idx) * 0.08})`,
              opacity: 0.7 + idx * 0.15,
            }}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
            <div className="truncate">
              <span className="font-bold text-yellow-300 mr-1.5">{bubble.userName}:</span>
              <span className="font-medium text-white tracking-wide">"{bubble.text}"</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
