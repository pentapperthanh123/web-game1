import React, { useEffect, useRef } from 'react';
import { ScaledStage } from './components/ScaledStage';
import { TopHud } from './components/stage/TopHud';
import { SpotlightStation } from './components/stage/SpotlightStation';
import { ChatBubblesOverlay } from './components/stage/ChatBubblesOverlay';
import { QuickGuide } from './components/stage/QuickGuide';
import { SparkCanvas } from './components/stage/SparkCanvas';
import { SafeBottomZone } from './components/stage/SafeBottomZone';
import { CoreReceiver } from './services/coreReceiver';
import { useCafeStore } from './store/cafeStore';

export const App: React.FC = () => {
  const receiverRef = useRef<CoreReceiver | null>(null);
  const tickSecond = useCafeStore((s) => s.tickSecond);

  // 1. Initialize CoreReceiver for Live Events and Admin Sync
  useEffect(() => {
    const receiver = new CoreReceiver();
    receiverRef.current = receiver;
    receiver.start();

    return () => {
      receiver.stop();
    };
  }, []);

  // 2. 1-second Game Tick Interval
  useEffect(() => {
    const timer = setInterval(() => {
      tickSecond();
    }, 1000);

    return () => clearInterval(timer);
  }, [tickSecond]);

  // 3. Hotkey 'b' / 'B' to quick toggle Auto-Bot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        const store = useCafeStore.getState();
        store.setAutoBot(!store.autoBotEnabled);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ScaledStage>
      {/* 1. Top HUD: Net 2008 / 3.000đ/H + Top 3 Rank + Queue Counter */}
      <TopHud />

      {/* 2. Spotlight Station: Central Machine + CRT + Desk + Character + Mom & Blackout Overlays */}
      <SpotlightStation />

      {/* 2.5 Comic Floating Chat Bubbles */}
      <ChatBubblesOverlay />

      {/* 3. Quick Guide: 3 Concise Lines in Open Space */}
      <QuickGuide />

      {/* 4. Locked 30 FPS Spark & Steam Particle Layer */}
      <SparkCanvas />

      {/* 5. Clean Bottom Safe Zone for TikTok LIVE Chat Overlay */}
      <SafeBottomZone />
    </ScaledStage>
  );
};

export default App;
