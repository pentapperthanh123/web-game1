import { Volume2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CanvasClashView } from './components/CanvasClashView';
import { GiftDonationOverlay } from './components/GiftDonationOverlay';
import { GuidanceBanner } from './components/GuidanceBanner';
import { RoundEndOverlay } from './components/RoundEndOverlay';
import { ScaledStage } from './components/ScaledStage';
import { SideBadges } from './components/SideBadges';
import { TopHUD } from './components/TopHUD';
import { audioService } from './services/audioService';
import { startClientSync } from './services/clientSync';
import { coreReceiver } from './services/coreReceiver';
import { youtubeBgmService } from './services/youtubeBgmService';
import { useClashText } from './i18n/clashText';
import { useClashStore } from './store/clashStore';

export const App: React.FC = () => {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const roundStatus = useClashStore((s) => s.roundStatus);
  const text = useClashText();

  useEffect(() => {
    // 0. Pre-initialize YouTube Iframe API early so it is ready on first click
    youtubeBgmService.init();

    // 1. Connect to Core Gateway Socket.io
    coreReceiver.connect();

    // 2. Start BroadcastChannel sync with Host Admin (port 8031)
    const stopSync = startClientSync();

    // 3. Audio unlock tracking
    const unsubAudio = audioService.onUnlockChange((unlocked) => {
      setIsAudioUnlocked(unlocked);
    });

    const handleFirstGesture = () => {
      audioService.unlockAudio();
    };

    window.addEventListener('pointerdown', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      stopSync();
      coreReceiver.disconnect();
      unsubAudio();
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Play Victory sound when round finishes & resume BGM when next round begins
  useEffect(() => {
    if (roundStatus === 'ROUND_END') {
      audioService.onRoundEnd();
    } else if (roundStatus === 'PLAYING') {
      audioService.onRoundStart();
    }
  }, [roundStatus]);

  const handleManualUnlock = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioService.unlockAudio();
  };

  return (
    <ScaledStage>
      {/* 1. Canvas 2D 30 FPS Battle Arena */}
      <CanvasClashView />

      {/* 2. Top HUD: Scores, Live Badge, Round Countdown */}
      <TopHUD />

      {/* 2.5 Quick Resume Trigger Pill (only shown when Host pauses the round) */}
      {roundStatus === 'WAITING' && (
        <div className="absolute top-[180px] inset-x-0 z-30 flex flex-col items-center pointer-events-auto px-4">
          <button
            type="button"
            onClick={() => {
              audioService.unlockAudio();
              useClashStore.getState().startRound();
              coreReceiver.emitClashMessage({
                type: 'ADMIN_ACTION',
                action: 'START_ROUND',
                timestamp: Date.now(),
              });
            }}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 via-rose-600 to-cyan-600 text-white font-black text-xs px-5 py-2 rounded-full shadow-lg border border-white/40 animate-pulse hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <span>▶️ TIẾP TỤC TRẬN ĐẤU (Bấm hoặc gõ G / B)</span>
          </button>
        </div>
      )}

      {/* 3. Floating Donation & Gift Combo Alert Cards */}
      <GiftDonationOverlay />

      {/* 4. Audio Unlock Pill (Shown if browser blocked autoplay before user click) */}
      {!isAudioUnlocked && (
        <div className="absolute top-[160px] inset-x-0 z-40 flex justify-center pointer-events-auto">
          <button
            type="button"
            onClick={handleManualUnlock}
            className="flex items-center space-x-2 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 text-white font-black text-xs px-4 py-2 rounded-full shadow-2xl border border-white/40 animate-pulse hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>{text.tapToEnableSound}</span>
          </button>
        </div>
      )}

      {/* 4. Side Badges: Recent Top Contributors */}
      <SideBadges />

      {/* 5. Guidance Banner: Single-line keyword instructions */}
      <GuidanceBanner />

      {/* 6. Safe Zone Indicator for bottom chat overlay */}
      <div className="absolute top-[985px] inset-x-0 bottom-0 pointer-events-none" />

      {/* 7. Round End Overlay with Top 3 MVP Podium */}
      <RoundEndOverlay />
    </ScaledStage>
  );
};

export default App;
