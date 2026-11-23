import { SYNC_CHANNEL_NAME } from '../../../shared/constants/clashConfig';
import type { ClashSyncMessage } from '../../../shared/types/events';
import { useClashStore } from '../store/clashStore';
import { audioService } from './audioService';
import { coreReceiver } from './coreReceiver';

const STATE_SYNC_INTERVAL_MS = 300;

export function startClientSync(): () => void {
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SYNC_CHANNEL_NAME) : null;

  const postToAdmin = (message: ClashSyncMessage) => {
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

    if (msg.type === 'LIVE_EVENT' && msg.event) {
      coreReceiver.dispatchEvent(msg.event);
    } else if (msg.type === 'ADMIN_ACTION') {
      const store = useClashStore.getState();
      switch (msg.action) {
        case 'RESET_ROUND':
          store.resetRound();
          break;
        case 'REBALANCE_50_50':
          store.rebalance5050();
          break;
        case 'DRAMA_BOOST':
          store.dramaBoost();
          break;
        case 'SET_PRESET':
          if (msg.payload?.presetId) {
            store.setPreset(msg.payload.presetId);
          }
          break;
        case 'SET_CUSTOM_PRESET':
          if (msg.payload?.customPreset) {
            store.setCustomPreset(msg.payload.customPreset);
          }
          break;
        case 'SET_LANGUAGE':
          if (msg.payload?.language) {
            store.setLanguage(msg.payload.language);
          }
          break;
        case 'SET_ROUND_DURATION':
          if (msg.payload?.durationSeconds) {
            store.setRoundDuration(msg.payload.durationSeconds);
          }
          break;
        case 'SET_PUSH_MULTIPLIERS':
          if (msg.payload?.multipliers) {
            store.setPushMultipliers(msg.payload.multipliers);
          }
          break;
        case 'SET_SOUND_CONFIG':
          if (msg.payload?.soundConfig) {
            audioService.setConfig(msg.payload.soundConfig);
          }
          break;
        case 'TEST_SOUND':
          if (msg.payload?.soundType) {
            audioService.unlockAudio();
            audioService.playPushSound(msg.payload.soundType, msg.payload.soundTeam);
          }
          break;
        case 'SIMULATE_EVENT':
          if (msg.payload?.simulatedEvent) {
            coreReceiver.dispatchEvent(msg.payload.simulatedEvent);
          }
          break;
        default:
          break;
      }
    }
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
