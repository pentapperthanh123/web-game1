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

const RESTLESS_BUBBLE_THEME =
  'bg-gradient-to-r from-rose-950/95 via-red-900/90 to-rose-950/95 border-rose-400 text-rose-50 shadow-[0_0_30px_rgba(244,63,94,0.75)]';
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
      <div className="absolute -top-8 sm:-top-10 left-1/2 -translate-x-1/2 pointer-events-none z-30 select-none w-max max-w-[280px] sm:max-w-[360px]">
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
