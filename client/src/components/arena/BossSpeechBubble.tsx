import React from 'react';
import { Flame, Zap, Swords, MessageSquare, Crown } from 'lucide-react';
import { BossSpeechItem } from '../../constants/bossSpeech';
import { BossThemeConfig, GameThemeType, getBossSpeechBubbleAnchorClass } from '../../constants/game';

interface BossSpeechBubbleProps {
  speech: BossSpeechItem | null;
  themeConfig: BossThemeConfig;
  gameTheme: GameThemeType;
  isRestless: boolean;
  /** Whether the boss name/HP HUD is active above/around the boss. */
  isAboveHealthBar: boolean;
}

const renderSpeechIcon = (iconType: BossSpeechItem['icon']) => {
  switch (iconType) {
    case 'flame':
      return <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0 stroke-[2.2] animate-pulse drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" />;
    case 'zap':
      return <Zap className="w-3.5 h-3.5 text-yellow-300 shrink-0 stroke-[2.2] drop-shadow-[0_0_4px_rgba(253,224,71,0.8)]" />;
    case 'swords':
      return <Swords className="w-3.5 h-3.5 text-cyan-300 shrink-0 stroke-[2.2] drop-shadow-[0_0_4px_rgba(103,232,249,0.8)]" />;
    case 'crown':
      return <Crown className="w-3.5 h-3.5 text-amber-200 shrink-0 stroke-[2.2] drop-shadow-[0_0_4px_rgba(253,230,138,0.8)]" />;
    default:
      return <MessageSquare className="w-3.5 h-3.5 text-purple-200 shrink-0 stroke-[2.2] drop-shadow-[0_0_4px_rgba(233,213,255,0.8)]" />;
  }
};

const RESTLESS_BUBBLE_THEME =
  'bg-slate-950/95 border-2 border-rose-400 text-white font-bold shadow-[0_0_20px_rgba(244,63,94,0.65)]';
const RESTLESS_TAIL_THEME = 'border-t-rose-400';

export const BossSpeechBubble: React.FC<BossSpeechBubbleProps> = React.memo(
  ({ speech, themeConfig, gameTheme, isRestless, isAboveHealthBar }) => {
    if (!speech) return null;
    const anchorClass = getBossSpeechBubbleAnchorClass(gameTheme, isAboveHealthBar);

    // Distinct theme colors based on Boss type and emotional state
    const bubbleThemeClass = isRestless
      ? RESTLESS_BUBBLE_THEME
      : themeConfig.bubbleThemeClass;

    const tailThemeClass = isRestless
      ? RESTLESS_TAIL_THEME
      : themeConfig.bubbleTailThemeClass;

    return (
      <div className={anchorClass}>
        <div className="animate-speech-bubble opacity-100">
          {/* Main Comic Dialogue Pill */}
          <div
            className={`px-3 py-1.5 rounded-xl border-2 text-[10px] sm:text-[11px] font-bold tracking-normal flex items-center gap-2 shadow-2xl backdrop-blur-sm ${bubbleThemeClass}`}
          >
            {renderSpeechIcon(speech.icon)}
            <span className="leading-tight drop-shadow text-center text-balance">{speech.text}</span>
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
