import React, { useEffect, useRef } from 'react';
import { ScaledStage } from './components/ScaledStage';
import { ThreeCanvas } from './components/ThreeCanvas';
import { TopHUD } from './components/TopHUD';
import { ActionBadges } from './components/ActionBadges';
import { MeltdownOverlay } from './components/MeltdownOverlay';
import { GiftImpactBanner } from './components/GiftImpactBanner';
import { CoreReceiver, type OnPrankTriggerCallback } from './services/coreReceiver';
import type { PrankActionType } from '@shared/types/prank';

export const App: React.FC = () => {
  const receiverRef = useRef<CoreReceiver | null>(null);
  const triggerRef = useRef<OnPrankTriggerCallback | null>(null);

  useEffect(() => {
    const receiver = new CoreReceiver();
    receiverRef.current = receiver;
    receiver.start();

    return () => {
      receiver.destroy();
    };
  }, []);

  const handleRegisterTrigger = (fn: OnPrankTriggerCallback) => {
    triggerRef.current = fn;
    if (receiverRef.current) {
      receiverRef.current.setTriggerCallback(fn);
    }
  };

  const handleRegisterClean = (fn: () => void) => {
    if (receiverRef.current) {
      receiverRef.current.setCleanCallback(fn);
    }
  };

  const handleBadgeClick = (action: PrankActionType) => {
    triggerRef.current?.(action, 'Viewer Tap');
  };

  return (
    <ScaledStage>
      {/* 1. Main Interactive 3D Three.js 30 FPS Canvas (y: 0 -> 1280) */}
      <ThreeCanvas
        onRegisterTrigger={handleRegisterTrigger}
        onRegisterClean={handleRegisterClean}
      />

      {/* 2. Top HUD Bar (y: 0 -> 130) */}
      <TopHUD />

      {/* 3. Left & Right Action Badges (y: 175 -> 700) */}
      <ActionBadges onBadgeClick={handleBadgeClick} />

      {/* 4. Active Gift Announcement Banner */}
      <GiftImpactBanner />

      {/* 5. 100% Meltdown Warning Overlay */}
      <MeltdownOverlay />

      {/* 6. Bottom Safe Zone (y: 985 -> 1280) - Reserved for TikTok Live Chat */}
      <div className="absolute bottom-0 left-0 right-0 h-[295px] pointer-events-none z-10 flex flex-col justify-end p-4">
        <div className="bg-gradient-to-t from-black/60 to-transparent p-3 rounded-xl border border-white/5 flex items-center justify-between text-[11px] text-neutral-400 font-medium">
          <span>🎯 Prank Target 3D • Three.js Interactive Live</span>
          <span className="text-neutral-500">Safe Zone for Chat (y: 985–1280)</span>
        </div>
      </div>
    </ScaledStage>
  );
};

export default App;
