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
  'bg-gradient-to-r from-rose-950/60 via-red-900/55 to-rose-950/60 border-rose-400/50 text-rose-100/90 shadow-[0_0_12px_rgba(244,63,94,0.28)]';
const RESTLESS_TAIL_THEME = 'border-t-rose-400/50';

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
      <div className="absolute -top-6 sm:-top-7 left-1/2 -translate-x-1/2 pointer-events-none z-[45] select-none w-max max-w-[185px] sm:max-w-[230px]">
        <div className="animate-speech-bubble opacity-95">
          {/* Main Comic Dialogue Pill */}
          <div
            className={`px-2.5 py-1 rounded-xl border text-[9px] sm:text-[10px] font-semibold tracking-normal flex items-center space-x-1.5 backdrop-blur-sm ${bubbleThemeClass}`}
          >
            {renderSpeechIcon(speech.icon)}
            <span className="leading-tight drop-shadow-sm text-center">{speech.text}</span>
          </div>

          {/* Downward Speech Bubble Tail pointing straight to monster's head */}
          <div className="flex justify-center -mt-[1px]">
            <div
              className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] ${tailThemeClass}`}
            />
          </div>
        </div>
      </div>
    );
  }
);

BossSpeechBubble.displayName = 'BossSpeechBubble';
