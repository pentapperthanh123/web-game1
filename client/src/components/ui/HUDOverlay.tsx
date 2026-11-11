import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { BossHealthBar } from './BossHealthBar';
import { TeamScoreBoard } from './TeamScoreBoard';
import { DPSLeaderboard } from './DPSLeaderboard';
import { GiftBanner } from './GiftBanner';
import { FloatingDamage } from './FloatingDamage';
import { LiveChatStream } from './LiveChatStream';
import { LikeCounter } from './LikeCounter';
import { VictoryOverlay } from './VictoryOverlay';
import { ScreenFlash } from './ScreenFlash';
import { TeamRosterBar } from './TeamRosterBar';

export const HUDOverlay = () => {
  const { t } = useTranslation();
  const [isAudioOn, setIsAudioOn] = useState<boolean>(() => audioService.isAudioEnabled);

  const toggleAudio = () => {
    const next = !isAudioOn;
    setIsAudioOn(next);
    audioService.isAudioEnabled = next;
    if (next) {
      audioService.playGiftFanfare();
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-2 sm:p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] px-[max(0.75rem,env(safe-area-inset-left))] pointer-events-none z-10 overflow-hidden select-none">
      {/* Incandescent Flash on Ultimates */}
      <ScreenFlash />

      {/* Top Section: Esports Broadcast Header & Scores */}
      <header className="space-y-0.5 sm:space-y-1 shrink-0 pt-0.5">
        <div className="flex items-center justify-center space-x-1.5 pt-0.5">
          <div className="inline-block px-3 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md mb-1 shadow-md">
            <span className="text-[10px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-amber-400">
              {t('Game.title', 'CKTG 2026: ĐẠI CHIẾN BLG VS GEN.G')}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleAudio}
            className="pointer-events-auto p-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white transition active:scale-95 shadow-md mb-1"
            title={isAudioOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {isAudioOn ? (
              <Volume2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <VolumeX className="w-3 h-3 text-slate-500" />
            )}
          </button>
        </div>

        <BossHealthBar />
        <TeamScoreBoard />
      </header>

      {/* Roster Bars on Left & Right Sides */}
      <TeamRosterBar side="left" />
      <TeamRosterBar side="right" />

      {/* Floating 3D Elements */}
      <FloatingDamage />
      <GiftBanner />
      <VictoryOverlay />

      {/* Center 3D viewport remains 100% unobstructed for Baron Nashor */}

      {/* Bottom Section: Leaderboard, Live Chat Stream, Like Counter & Instructions */}
      <footer className="space-y-1.5 pb-1 sm:pb-2 shrink-0">
        {/* Floating Mini Leaderboard positioned above chat */}
        <div className="flex justify-start px-1 pointer-events-auto">
          <DPSLeaderboard />
        </div>

        {/* Split Bottom Row: Live Chat on Left, Like Counter on Right */}
        <div className="flex items-end justify-between px-1">
          <LiveChatStream />
          <LikeCounter />
        </div>

        {/* Viewer Chat Guide */}
        <div className="max-w-md mx-auto px-2 text-center pointer-events-auto">
          <div className="text-[10px] font-semibold text-cyan-200/90 bg-slate-950/75 border border-cyan-800/40 rounded-full py-1 px-3 backdrop-blur-md shadow-lg">
            {t('HUD.howToPlay', 'Chat: [Tên tướng] BLG hoặc [Tên tướng] GEN để triệu hồi chiến binh!')}
          </div>
        </div>
      </footer>
    </div>
  );
};
