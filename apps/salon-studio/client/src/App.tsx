import React, { useEffect, useRef } from 'react';
import { GiftCardAndQueue } from './components/GiftCardAndQueue';
import { SafeZoneOverlay } from './components/SafeZoneOverlay';
import { ScaledStage } from './components/ScaledStage';
import { ThankYouBanner } from './components/ThankYouBanner';
import { TopSignAndWall } from './components/TopSignAndWall';
import { WaitingAudience } from './components/WaitingAudience';
import { SalonCanvasLoop } from './engine/salonCanvasRenderer';
import { SalonCoreReceiver } from './services/coreReceiver';
import { useSalonStore } from './store/salonStore';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSandboxPreview = useSalonStore((s) => s.isSandboxPreview);

  useEffect(() => {
    const receiver = new SalonCoreReceiver(isSandboxPreview);
    receiver.start();
    return () => receiver.stop();
  }, [isSandboxPreview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const loop = new SalonCanvasLoop(canvas);
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <ScaledStage>
      {/* Base 30fps Layered 2D Cartoon Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-[720px] h-[1280px] block"
      />

      {/* Zone 1: Top Signboard & Clothesline Gallery (y: 0 -> 230) */}
      <TopSignAndWall />

      {/* Zone 2: Left Gift Price Card + Queue & Waiting Audience (y: 235 -> 960) */}
      <GiftCardAndQueue />
      <WaitingAudience />

      {/* Floating Thank-You / Gift Reaction Pill */}
      <ThankYouBanner />

      {/* Sandbox Preview Watermark Pill (only visible in ?preview=1 sandbox) */}
      {isSandboxPreview && (
        <div className="absolute bottom-3 left-3 z-40 bg-[#FFE5B4] border-2 border-[#3A2825] rounded-full px-3 py-1 text-[11px] font-black text-[#3A2825]">
          SANDBOX PREVIEW — KHÔNG ẢNH HƯỞNG PHIÊN LIVE
        </div>
      )}

      {/* Optional TikTok Safe-Zone Verification Overlay */}
      <SafeZoneOverlay />
    </ScaledStage>
  );
};

export default App;
