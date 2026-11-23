import { Volume2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CanvasClashView } from './components/CanvasClashView';
import { GuidanceBanner } from './components/GuidanceBanner';
import { RoundEndOverlay } from './components/RoundEndOverlay';
import { ScaledStage } from './components/ScaledStage';
import { SideBadges } from './components/SideBadges';
import { TopHUD } from './components/TopHUD';
import { audioService } from './services/audioService';
import { startClientSync } from './services/clientSync';
import { coreReceiver } from './services/coreReceiver';
import { useClashStore } from './store/clashStore';

export const App: React.FC = () => {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const roundStatus = useClashStore((s) => s.roundStatus);

  useEffect(() => {
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

  // Play Victory sound when round finishes
  useEffect(() => {
    if (roundStatus === 'ROUND_END') {
      audioService.playPushSound('ROUND_END');
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

      {/* 3. Audio Unlock Pill (Shown if browser blocked autoplay before user click) */}
      {!isAudioUnlocked && (
        <div className="absolute top-[160px] inset-x-0 z-40 flex justify-center pointer-events-auto">
          <button
            type="button"
            onClick={handleManualUnlock}
            className="flex items-center space-x-2 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 text-white font-black text-xs px-4 py-2 rounded-full shadow-2xl border border-white/40 animate-pulse hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>🔊 CHẠM ĐỂ BẬT ÂM THANH PK</span>
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
