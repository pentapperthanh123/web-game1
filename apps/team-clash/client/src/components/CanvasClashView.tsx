import React, { useEffect, useRef } from 'react';
import { ClashCanvasEngine, type ClashFrameState } from '../engine/ClashCanvasEngine';
import { coreReceiver } from '../services/coreReceiver';
import { getClashText } from '../i18n/clashText';
import { useClashStore } from '../store/clashStore';
import { GiftTallyPanel } from './GiftTallyPanel';
import { PushOverlay, type PushOverlayHandle } from './PushOverlay';

function formatDamage(amount: number): string {
  return `+${amount < 10 ? amount.toFixed(1) : amount.toFixed(0)}%`;
}

export const CanvasClashView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<PushOverlayHandle | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new ClashCanvasEngine();
    // Reused every frame instead of allocating a fresh snapshot object.
    const frameState: ClashFrameState = {
      clashPosition: 50,
      preset: useClashStore.getState().getActivePreset(),
      isStrobeWarning: false,
      screenShake: 0,
    };

    let lastTickTime = performance.now();
    const handleTick = (customDelta?: number) => {
      const now = performance.now();
      const deltaSeconds =
        typeof customDelta === 'number' && customDelta > 0
          ? customDelta
          : Math.max(0, Math.min(1.0, (now - lastTickTime) / 1000));
      lastTickTime = now;
      if (deltaSeconds > 0) {
        useClashStore.getState().tickGameLoop(deltaSeconds);
      }
    };

    engine.init(
      canvasRef.current,
      (deltaSeconds) => {
        handleTick(deltaSeconds);
      },
      () => {
        const state = useClashStore.getState();
        frameState.clashPosition = state.clashPosition;
        frameState.preset = state.getActivePreset();
        frameState.isStrobeWarning = state.isStrobeWarning;
        frameState.screenShake = state.screenShake;
        return frameState;
      }
    );

    // Heartbeat ticker: ensures game loop & canvas rendering NEVER freeze even if tab is unfocused / backgrounded
    const heartbeatTimer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastTickTime) / 1000;
      if (elapsed >= 0.08) {
        lastTickTime = now;
        const deltaSeconds = Math.min(0.5, elapsed);
        engine.step(deltaSeconds);
      }
    }, 100);

    engine.setLayoutListener((layout) => overlayRef.current?.applyLayout(layout));

    // Arena reaction for every push that was actually applied
    coreReceiver.setPushFxHandler((push) => {
      engine.applyPush(push.team, push.tier);
      // Gifts and "G"/"B" chat pushes both pop a damage number out of the orb (likes stay subtle).
      if (push.source === 'GIFT' || push.source === 'CHAT') {
        const text = getClashText(useClashStore.getState().language);
        engine.showGiftDamage(
          push.team,
          push.tier,
          formatDamage(push.amount),
          push.tier === 'LARGE' ? text.critical : null
        );
      }
    });

    // Gifts fly from the gift panel into the orb before their push lands
    coreReceiver.setGiftStrikeHandler((team, tier, icon, onImpact) =>
      engine.launchGiftStrike(team, tier, icon, onImpact)
    );

    return () => {
      clearInterval(heartbeatTimer);
      coreReceiver.setPushFxHandler(null);
      coreReceiver.setGiftStrikeHandler(null);
      engine.destroy();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full"
      />
      <PushOverlay ref={overlayRef} />
      <GiftTallyPanel />
    </>
  );
};
