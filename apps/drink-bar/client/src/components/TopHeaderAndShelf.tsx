import React from 'react';
import { Coffee, Crown, Sparkles, Users, Volume2, VolumeX } from 'lucide-react';
import { getMessages } from '@shared/i18n';
import { drinkBarAudio } from '../services/audioManager';
import { useDrinkBarStore } from '../store/drinkBarStore';

export const TopHeaderAndShelf: React.FC = () => {
  const language = useDrinkBarStore((s) => s.config.language);
  const ttsEnabled = useDrinkBarStore((s) => s.config.ttsEnabled);
  const setTtsEnabled = useDrinkBarStore((s) => s.setTtsEnabled);
  const todayDoneCount = useDrinkBarStore((s) => s.todayDoneCount);
  const vipCount = useDrinkBarStore((s) => s.vipQueue.length);
  const normalCount = useDrinkBarStore((s) => s.normalQueue.length);

  const msg = getMessages(language);
  const totalQueue = vipCount + normalCount;

  const handleToggleTts = () => {
    void drinkBarAudio.unlock(false);
    setTtsEnabled(!ttsEnabled);
  };

  return (
    <header className="absolute top-0 left-0 right-0 h-[42px] px-3 bg-[#FFF9FA]/95 border-b-[1.5px] border-[#3B2820]/20 pointer-events-none z-20 flex items-center justify-between gap-2">
      {/* Left Brand Title & Done Counter */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-6 h-6 rounded-full bg-[#F4A6BE] border-[2px] border-[#3B2820] flex items-center justify-center shrink-0">
          <Coffee className="w-3.5 h-3.5 text-[#3B2820]" strokeWidth={2.6} />
        </span>
        <span className="font-display font-bold text-[15.5px] tracking-wide leading-none text-[#3B2820] truncate">
          {msg.brandTitle}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE4EC] border-[1.5px] border-[#3B2820]/30 px-2 py-[3px] text-[11px] font-black leading-none text-[#9E3A5A] shrink-0">
          <Sparkles className="w-3 h-3 text-[#9E3A5A]" strokeWidth={2.6} />
          {msg.doneBadge}: {todayDoneCount}
        </span>
      </div>

      {/* Right Combined Queue, VIP Status & Compact AI Voice Toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF9] border-[1.5px] border-[#3B2820]/30 px-2.5 py-[3px] shrink-0">
          <Users className="w-3.5 h-3.5 text-[#3B2820] shrink-0" strokeWidth={2.4} />
          <span className="font-display font-bold text-[13px] leading-none text-[#3B2820]">
            {msg.queueBadge}: {totalQueue}
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-full bg-[#FFF1C2] border-[1.5px] border-[#3B2820]/50 text-[10.5px] font-black leading-none text-[#8A5200]">
            <Crown className="w-2.5 h-2.5 text-[#C47C0E]" strokeWidth={2.8} />
            {msg.vipBadge} {vipCount}
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleTts}
          title={msg.voiceToggleTitle}
          aria-pressed={ttsEnabled}
          aria-label={msg.voiceToggleTitle}
          className={`pointer-events-auto inline-flex items-center justify-center w-6 h-6 rounded-full border-[1.5px] border-[#3B2820] cursor-pointer transition-colors shadow-[0_1.5px_0_#3B2820] ${
            ttsEnabled
              ? 'bg-[#CBEAD2] hover:bg-[#B6E0BF] text-[#245B3A]'
              : 'bg-[#EFE0CC] hover:bg-[#E5D0B6] text-[#7A5F52]'
          }`}
        >
          {ttsEnabled ? (
            <Volume2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2.6} />
          ) : (
            <VolumeX className="w-3.5 h-3.5 shrink-0" strokeWidth={2.6} />
          )}
        </button>
      </div>
    </header>
  );
};
