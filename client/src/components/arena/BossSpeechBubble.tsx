import React from 'react';
import { Flame, Zap, Swords, MessageSquare, Crown } from 'lucide-react';
import { BossSpeechItem } from '../../constants/bossSpeech';
import { BossThemeConfig } from '../../constants/game';

interface BossSpeechBubbleProps {
  speech: BossSpeechItem | null;
  themeConfig: BossThemeConfig;
  isRestless: boolean;
}

const renderSpeechIcon = (iconType: BossSpeechItem['icon']) => {
  switch (iconType) {
    case 'flame':
      return <Flame className="w-2.5 h-2.5 text-amber-300/90 shrink-0 animate-pulse" />;
    case 'zap':
      return <Zap className="w-2.5 h-2.5 text-yellow-200/90 shrink-0 animate-bounce" />;
    case 'swords':
      return <Swords className="w-2.5 h-2.5 text-cyan-300/90 shrink-0" />;
    case 'crown':
      return <Crown className="w-2.5 h-2.5 text-amber-200/90 shrink-0" />;
    default:
      return <MessageSquare className="w-2.5 h-2.5 text-purple-200/90 shrink-0" />;
  }
};

const RESTLESS_BUBBLE_THEME =
  'bg-slate-950/95 border-2 border-rose-400 text-white font-bold shadow-[0_0_20px_rgba(244,63,94,0.65)]';
const RESTLESS_TAIL_THEME = 'border-t-rose-400';

export const BossSpeechBubble: React.FC<BossSpeechBubbleProps> = React.memo(
  ({ speech, themeConfig, isRestless }) => {
    if (!speech) return null;

    // Distinct theme colors based on Boss type and emotional state
    const bubbleThemeClass = isRestless
      ? RESTLESS_BUBBLE_THEME
      : themeConfig.bubbleThemeClass;

    const tailThemeClass = isRestless
      ? RESTLESS_TAIL_THEME
      : themeConfig.bubbleTailThemeClass;

    return (
      <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 pointer-events-none z-50 select-none w-max max-w-[200px] sm:max-w-[250px]">
        <div className="animate-speech-bubble opacity-100">
          {/* Main Comic Dialogue Pill */}
          <div
            className={`px-3 py-1.5 rounded-xl border-2 text-[9.5px] sm:text-[10.5px] font-bold tracking-normal flex items-center space-x-1.5 shadow-2xl ${bubbleThemeClass}`}
          >
            {renderSpeechIcon(speech.icon)}
            <span className="leading-tight drop-shadow text-center">{speech.text}</span>
          </div>

          {/* Downward Speech Bubble Tail pointing straight to monster's head */}
          <div className="flex justify-center -mt-[1px]">
            <div
              className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] ${tailThemeClass}`}
            />
          </div>
        </div>
      </div>
    );
  }
);

BossSpeechBubble.displayName = 'BossSpeechBubble';
