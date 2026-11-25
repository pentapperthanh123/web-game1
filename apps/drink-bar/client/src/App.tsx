import React, { useEffect, useRef, useState } from 'react';
import { getMessages } from '@shared/i18n';
import { LeftGiftAndQueuePanel } from './components/LeftGiftAndQueuePanel';
import { SafeZoneGuide } from './components/SafeZoneGuide';
import { ScaledStage } from './components/ScaledStage';
import { TopHeaderAndShelf } from './components/TopHeaderAndShelf';
import { WaitingGuestsStrip } from './components/WaitingGuestsStrip';
import { DrinkBarCanvasLoop } from './engine/drinkBarLoop';
import { drinkBarAudio } from './services/audioManager';
import { DrinkBarCoreReceiver } from './services/coreReceiver';
import { useDrinkBarStore } from './store/drinkBarStore';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() =>
    drinkBarAudio.isUnlocked()
  );
  const isMirrorPreview = useDrinkBarStore((s) => s.isMirrorPreview);
  const language = useDrinkBarStore((s) => s.config.language);
  const sfxEnabled = useDrinkBarStore((s) => s.config.sfxEnabled);
  const sfxMusicEnabled = useDrinkBarStore((s) => s.config.sfxMusicEnabled);

  useEffect(() => {
    const offAudio = drinkBarAudio.subscribeUnlocked(setIsAudioUnlocked);
    const receiver = new DrinkBarCoreReceiver();
    receiver.start();
    return () => {
      offAudio();
      receiver.stop();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const loop = new DrinkBarCanvasLoop(canvas);
    loop.start();
    return () => loop.stop();
  }, []);

  const showAudioUnlockHint =
    !isMirrorPreview && !isAudioUnlocked && (sfxEnabled || sfxMusicEnabled);
  const msg = getMessages(language);

  return (
    <ScaledStage>
      {/* 720x1280 30FPS DPR=1 Cartoon Cafe Canvas (Bar, Cup, Bartender, Particles) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-[720px] h-[1280px] block"
      />

      {/* Zone 1 (y: 16 -> 235): Top Title, Done/Queue/VIP Pills & 4-Drink Shelf */}
      <TopHeaderAndShelf />

      {/* Zone 2 (x: 24 -> 250, y: 255 -> 760): Gift Exchange Card & Order Queue */}
      <LeftGiftAndQueuePanel />

      {/* Zone 3 Front Floor (x: 310 -> 630, y: 722 -> 952): 2-Column Standing Waiting Guests */}
      <WaitingGuestsStrip />

      {/* Zone 4 (y: 960 -> 1280): TikTok LIVE Chat Safe Zone (Guide only in Preview/Host Toggle) */}
      <SafeZoneGuide />

      {/* Subtle standalone Stage audio-unlock pill tucked cleanly at bottom center (never clipped on right edge) */}
      {showAudioUnlockHint && (
        <button
          type="button"
          onClick={() => void drinkBarAudio.unlock(true)}
          className="absolute bottom-[18px] left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-[#FFF1C2] hover:bg-[#FCE397] border-[2.5px] border-[#3B2820] shadow-[0_3px_0_#3B2820] text-[12px] font-black text-[#3B2820] cursor-pointer"
        >
          🔇 {msg.btnEnableAudioStage}
        </button>
      )}
    </ScaledStage>
  );
};

export default App;
