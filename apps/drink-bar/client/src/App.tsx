import React, { useEffect, useRef, useState } from 'react';
import { getMessages } from '@shared/i18n';
import { RECIPE_MAP } from '@shared/recipes';
import type { RecipeId } from '@shared/types';
import { LeftCtaGuidePanel } from './components/LeftCtaGuidePanel';
import { LeftGiftAndQueuePanel } from './components/LeftGiftAndQueuePanel';
import { SafeZoneGuide } from './components/SafeZoneGuide';
import { ScaledStage } from './components/ScaledStage';
import { TopHeaderAndShelf } from './components/TopHeaderAndShelf';
import { WaitingGuestsStrip } from './components/WaitingGuestsStrip';
import { drawFinishedDrinkProduct } from './engine/drawDrinkCup';
import { DrinkBarCanvasLoop } from './engine/drinkBarLoop';
import { drinkBarAudio } from './services/audioManager';
import { DrinkBarCoreReceiver } from './services/coreReceiver';
import { useDrinkBarStore } from './store/drinkBarStore';

const CAPTURE_WIDTH = 240;
const CAPTURE_HEIGHT = 280;

function readCaptureRecipeId(): RecipeId | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('captureDrink');
  if (!raw || !(raw in RECIPE_MAP)) return null;
  return raw as RecipeId;
}

const DrinkProductCaptureCanvas: React.FC<{ recipeId: RecipeId }> = ({ recipeId }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawFinishedDrinkProduct(ctx, recipeId, CAPTURE_WIDTH, CAPTURE_HEIGHT);
  }, [recipeId]);

  return (
    <canvas
      ref={ref}
      width={CAPTURE_WIDTH}
      height={CAPTURE_HEIGHT}
      className="block w-[240px] h-[280px] bg-transparent"
    />
  );
};

export const App: React.FC = () => {
  const captureRecipeId = readCaptureRecipeId();
  if (captureRecipeId) {
    return <DrinkProductCaptureCanvas recipeId={captureRecipeId} />;
  }
  return <DrinkBarStage />;
};

function applyUrlDemoPreset(): void {
  if (typeof window === 'undefined') return;
  const preset = new URLSearchParams(window.location.search).get('demoScene');
  if (!preset) return;
  const store = useDrinkBarStore.getState();
  store.resetToDefaultEmpty();
  store.setUnlimitedInventory(true);

  if (preset === 'idle') {
    return;
  }

  store.processChat({ id: 'u1', nickname: 'Minh Anh' }, 'matcha');
  store.processChat({ id: 'u2', nickname: 'Bảo Ngọc' }, 'tradao it da');
  store.processChat({ id: 'u3', nickname: 'Gia Huy' }, 'cafe');
  store.processChat({ id: 'u4', nickname: 'Khánh Vy' }, 'trachanh');
  store.processChat({ id: 'u5', nickname: 'Tuấn Kiệt' }, 'soda');

  if (preset === 'orders') {
    store.setBrewProgress(34);
    return;
  }

  if (preset === 'pouring') {
    store.setBrewProgress(78);
    return;
  }

  if (preset === 'dance') {
    store.processGift({ id: 'u6', nickname: 'Linh Chi VIP' }, 35);
    store.triggerTikTokDance('LARGE', 'party_hype');
    store.activatePendingDance();
    return;
  }

  if (preset === 'handoff') {
    store.setBrewProgress(96);
  }
}

const DrinkBarStage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() =>
    drinkBarAudio.isUnlocked()
  );
  const isMirrorPreview = useDrinkBarStore((s) => s.isMirrorPreview);
  const language = useDrinkBarStore((s) => s.config.language);
  const sfxEnabled = useDrinkBarStore((s) => s.config.sfxEnabled);
  const sfxMusicEnabled = useDrinkBarStore((s) => s.config.sfxMusicEnabled);

  useEffect(() => {
    applyUrlDemoPreset();
    drinkBarAudio.enableAutoCafeBgm(!isMirrorPreview);
    if (!isMirrorPreview) {
      void drinkBarAudio.unlock(false);
    }
    const offAudio = drinkBarAudio.subscribeUnlocked(setIsAudioUnlocked);
    const receiver = new DrinkBarCoreReceiver();
    receiver.start();
    return () => {
      offAudio();
      receiver.stop();
    };
  }, [isMirrorPreview]);

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
      {/* 720x1080 30FPS DPR=1 Cartoon Cafe Canvas (Bar, Cup, Bartender, Particles) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />

      {/* Zone 1 (y: 0 -> 120): Edge-to-edge 2-Tier Header & Centered Slim Menu Ribbon */}
      <TopHeaderAndShelf />
      <LeftGiftAndQueuePanel />

      {/* Zone 2 (x: 12 -> 154, y: 176 -> 410): Left Order & Donate-to-Dance CTA Guide */}
      <LeftCtaGuidePanel />

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
