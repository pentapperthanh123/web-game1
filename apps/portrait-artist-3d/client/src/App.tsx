import React, { useEffect } from 'react';
import { RulesWoodBoard } from './components/hud/RulesWoodBoard';
import { SpeechBubbleLayer } from './components/hud/SpeechBubbleLayer';
import { TopProgressHud } from './components/hud/TopProgressHud';
import { ScaledStage } from './components/stage/ScaledStage';
import { StudioStage25D } from './components/stage/StudioStage25D';
import { studioSfx } from './engine/audio/studioSfx';
import { routeNormalizedEvent, startClientSync } from './services/clientSync';
import { CoreReceiver } from './services/coreReceiver';
import { useStudioStore } from './store/studioStore';

export const App: React.FC = () => {
  const gatewayUrl = useStudioStore((s) => s.config.gatewayUrl);

  useEffect(() => {
    const handleFirstGesture = () => {
      studioSfx.unlockAudio();
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  useEffect(() => {
    const receiver = new CoreReceiver(gatewayUrl);
    const unsubEvent = receiver.onEvent((event) => {
      routeNormalizedEvent(event);
    });
    const unsubConn = receiver.onConnectionChange((connected) => {
      useStudioStore.getState().setConnectedToCore(connected);
    });

    receiver.connect();
    return () => {
      unsubEvent();
      unsubConn();
      receiver.disconnect();
    };
  }, [gatewayUrl]);

  useEffect(() => {
    return startClientSync();
  }, []);

  return (
    <ScaledStage>
      <StudioStage25D />
      <TopProgressHud />
      <RulesWoodBoard />
      <SpeechBubbleLayer />
    </ScaledStage>
  );
};

export default App;
