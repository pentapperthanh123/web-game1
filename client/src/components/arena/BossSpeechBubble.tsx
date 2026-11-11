import React from 'react';
import { Flame, Zap, Swords, MessageSquare, Crown } from 'lucide-react';
import { BossSpeechItem } from '../../constants/bossSpeech';

interface BossSpeechBubbleProps {
  speech: BossSpeechItem | null;
  isElderDragon: boolean;
  isRestless: boolean;
}

const renderSpeechIcon = (iconType: BossSpeechItem['icon']) => {
  switch (iconType) {
    case 'flame':
      return <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />;
    case 'zap':
      return <Zap className="w-3.5 h-3.5 text-yellow-300 shrink-0 animate-bounce" />;
    case 'swords':
      return <Swords className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    case 'crown':
      return <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    default:
      return <MessageSquare className="w-3.5 h-3.5 text-purple-300 shrink-0" />;
  }
};

export const BossSpeechBubble: React.FC<BossSpeechBubbleProps> = React.memo(
  ({ speech, isElderDragon, isRestless }) => {
    if (!speech) return null;

    // Distinct theme colors based on Boss type and emotional state
    const bubbleThemeClass = isRestless
      ? 'bg-gradient-to-r from-rose-950/95 via-red-900/90 to-rose-950/95 border-rose-400 text-rose-50 shadow-[0_0_30px_rgba(244,63,94,0.75)]'
      : isElderDragon
        ? 'bg-gradient-to-r from-slate-950/95 via-amber-950/90 to-slate-950/95 border-amber-400 text-amber-50 shadow-[0_0_30px_rgba(245,158,11,0.7)]'
        : 'bg-gradient-to-r from-slate-950/95 via-purple-950/90 to-slate-950/95 border-purple-400 text-purple-50 shadow-[0_0_30px_rgba(168,85,247,0.7)]';

    const tailThemeClass = isRestless
      ? 'border-t-rose-400'
      : isElderDragon
        ? 'border-t-amber-400'
        : 'border-t-purple-400';

    // Anatomically accurate positioning:
    // Both Elder Dragon and Baron sit at top-[59.5%]/[60%], giving ample room above.
    // Bubble sits right above the monster crown (-top-8 sm:-top-10) with tail pointing to head.
    const positionClass = isElderDragon
      ? '-top-8 sm:-top-10 left-1/2 -translate-x-1/2'
      : '-top-8 sm:-top-10 left-1/2 -translate-x-1/2';

    return (
      <div
        className={`absolute ${positionClass} pointer-events-none z-30 select-none w-max max-w-[280px] sm:max-w-[360px]`}
      >
        <div className="animate-speech-bubble">
          {/* Main Comic Dialogue Pill */}
          <div
            className={`px-3.5 py-1.5 rounded-2xl border-2 text-[11px] sm:text-xs font-black tracking-wide flex items-center space-x-2 backdrop-blur-md ${bubbleThemeClass}`}
          >
            {renderSpeechIcon(speech.icon)}
            <span className="leading-snug drop-shadow-md text-center">{speech.text}</span>
          </div>

          {/* Downward Speech Bubble Tail pointing straight to monster's head */}
          <div className="flex justify-center -mt-[1px]">
            <div
              className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] ${tailThemeClass}`}
            />
          </div>
        </div>
      </div>
    );
  }
);

BossSpeechBubble.displayName = 'BossSpeechBubble';
