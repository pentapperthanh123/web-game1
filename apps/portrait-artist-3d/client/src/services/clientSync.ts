import { SYNC_CHANNEL_NAME } from '../../../shared/constants/studioConfig';
import type { NormalizedLiveEvent, StudioSyncMessage } from '../../../shared/types/events';
import { useStudioStore } from '../store/studioStore';

const SNAPSHOT_SYNC_INTERVAL_MS = 350;

export function routeNormalizedEvent(event: NormalizedLiveEvent): void {
  const store = useStudioStore.getState();
  const user = event.user ?? {
    id: 'anonymous_viewer',
    username: 'viewer',
    nickname: 'Khách',
  };

  switch (event.type) {
    case 'CHAT':
      store.handleChat(user, String(event.text ?? event.cleanText ?? ''));
      break;
    case 'LIKE':
      store.handleLike(user, Number(event.count) || 1);
      break;
    case 'GIFT':
      store.handleGift(
        user,
        String(event.giftName || 'Gift'),
        Number(event.coinValue) || 1,
        Number(event.repeatCount) || 1
      );
      break;
    case 'JOIN':
      store.handleJoin(user);
      break;
    default:
      break;
  }
}

/**
 * Starts bi-directional real-time sync between Live Client (8020) and Host Admin (8021)
 * via BroadcastChannel + cross-origin iframe/popup window.postMessage.
 */
export function startClientSync(): () => void {
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SYNC_CHANNEL_NAME) : null;

  const postToAdmin = (message: StudioSyncMessage) => {
    try {
      channel?.postMessage(message);
    } catch {
      // Ignore BroadcastChannel errors
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

  const broadcastSnapshot = () => {
    postToAdmin({
      type: 'STATE_SNAPSHOT',
      snapshot: useStudioStore.getState().getSnapshot(),
      timestamp: Date.now(),
    });
  };

  const handleMessage = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const msg = raw as Partial<StudioSyncMessage>;
    const store = useStudioStore.getState();

    if (msg.type === 'LIVE_EVENT' && msg.event) {
      routeNormalizedEvent(msg.event);
      broadcastSnapshot();
      return;
    }

    if (msg.type === 'CONFIG_UPDATE' && msg.config) {
      store.updateConfig(msg.config);
      broadcastSnapshot();
      return;
    }

    if (msg.type === 'ADMIN_ACTION' && msg.action) {
      const payload = msg.payload ?? {};
      switch (msg.action) {
        case 'PROMOTE_TO_FRONT':
          if (payload.userId) store.promoteUserToFront(payload.userId);
          break;
        case 'SKIP_CURRENT':
          store.skipCurrentTurn();
          break;
        case 'REMOVE_USER':
          if (payload.userId) store.removeUserFromStudio(payload.userId);
          break;
        case 'TRIGGER_TROLL_NOW':
          store.triggerTrollOnActive();
          break;
        case 'SET_ACTIVE_STYLE':
          if (payload.style) store.setActiveStyle(payload.style);
          break;
        case 'RESET_SESSION':
          store.resetSession();
          break;
        case 'REQUEST_SNAPSHOT':
          break;
      }
      broadcastSnapshot();
    }
  };

  if (channel) {
    channel.onmessage = (event) => handleMessage(event.data);
  }

  const onWindowMessage = (event: MessageEvent) => handleMessage(event.data);
  window.addEventListener('message', onWindowMessage);

  // Notify admin & stream periodic live snapshots for queue manager UI
  postToAdmin({ type: 'CLIENT_READY', timestamp: Date.now() });
  broadcastSnapshot();
  const snapshotTimer = window.setInterval(broadcastSnapshot, SNAPSHOT_SYNC_INTERVAL_MS);

  return () => {
    window.clearInterval(snapshotTimer);
    window.removeEventListener('message', onWindowMessage);
    channel?.close();
  };
}
