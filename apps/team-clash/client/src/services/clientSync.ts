import { SYNC_CHANNEL_NAME } from '../../../shared/constants/clashConfig';
import type { ClashSyncMessage } from '../../../shared/types/events';
import { useClashStore } from '../store/clashStore';
import { audioService } from './audioService';
import { coreReceiver } from './coreReceiver';

const STATE_SYNC_INTERVAL_MS = 300;

export function startClientSync(): () => void {
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SYNC_CHANNEL_NAME) : null;

  const isIframe = typeof window !== 'undefined' && window.parent && window.parent !== window;

  const postToAdmin = (message: ClashSyncMessage) => {
    // 0. Only master standalone clients (OBS, TikTok LIVE Studio, external tab) emit to socket server.
    // In-admin iframe previews do NOT emit to socket to avoid race conditions with the real live stage.
    if (!isIframe) {
      coreReceiver.emitClashMessage(message);
    }

    try {
      channel?.postMessage(message);
    } catch {
      // Ignore broadcast channel errors
    }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*');
      }
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(message, '*');
      }
    } catch {
      // Ignore cross-window restrictions
    }
  };

  const handleMessage = (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const msg = data as ClashSyncMessage;
    coreReceiver.handleClashAction(msg);
  };

  if (channel) {
    channel.onmessage = (event) => handleMessage(event.data);
  }

  const windowListener = (event: MessageEvent) => handleMessage(event.data);
  window.addEventListener('message', windowListener);

  // Periodic state snapshot to Admin
  const intervalId = setInterval(() => {
    const state = useClashStore.getState();
    postToAdmin({
      type: 'STATE_SYNC',
      state: {
        roundNumber: state.roundNumber,
        seriesScore: state.seriesScore,
        roundStatus: state.roundStatus,
        roundTimeRemaining: state.roundTimeRemaining,
        roundDurationSeconds: state.roundDurationSeconds,
        clashPosition: state.clashPosition,
        targetPosition: state.targetPosition,
        leftScore: state.leftScore,
        rightScore: state.rightScore,
        activePresetId: state.activePresetId,
        language: state.language,
        recentLeftContributors: state.recentLeftContributors,
        recentRightContributors: state.recentRightContributors,
        topRoundContributors: state.topRoundContributors,
        lastRoundWinner: state.lastRoundWinner,
        roundEndCountdown: state.roundEndCountdown,
        isStrobeWarning: state.isStrobeWarning,
      },
      timestamp: Date.now(),
    });
  }, STATE_SYNC_INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener('message', windowListener);
    channel?.close();
  };
}
