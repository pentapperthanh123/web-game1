import { STUDIO_PORTS, SYNC_CHANNEL_NAME } from '../../../shared/constants/studioConfig';
import type {
  AdminActionName,
  AdminActionPayload,
  NormalizedLiveEvent,
  StudioSyncMessage,
} from '../../../shared/types/events';
import type { LiveStudioConfig, StudioStateSnapshot } from '../../../shared/types/studio';

declare global {
  interface Window {
    __portraitPopups?: Window[];
  }
}

const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SYNC_CHANNEL_NAME) : null;

export function registerPortraitPopup(popup: Window | null): void {
  if (!popup || typeof window === 'undefined') return;
  window.__portraitPopups = window.__portraitPopups || [];
  if (!window.__portraitPopups.includes(popup)) {
    window.__portraitPopups.push(popup);
  }
}

function dispatchToClients(message: StudioSyncMessage): void {
  try {
    channel?.postMessage(message);
  } catch {
    // Ignore BroadcastChannel errors
  }

  if (typeof document !== 'undefined') {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(message, '*');
      } catch {
        // Ignore cross-frame errors
      }
    });
  }

  if (typeof window !== 'undefined' && Array.isArray(window.__portraitPopups)) {
    for (let i = window.__portraitPopups.length - 1; i >= 0; i--) {
      const win = window.__portraitPopups[i];
      try {
        if (!win || win.closed) {
          window.__portraitPopups.splice(i, 1);
        } else {
          win.postMessage(message, '*');
        }
      } catch {
        // Ignore cross-window errors
      }
    }
  }
}

export function emitLiveEvent(event: NormalizedLiveEvent): void {
  dispatchToClients({
    type: 'LIVE_EVENT',
    event,
    timestamp: Date.now(),
  });

  // Also forward to local Live Connect Gateway if running (non-blocking)
  fetch(`http://localhost:${STUDIO_PORTS.GATEWAY}/api/mock/emit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  }).catch(() => {
    // Offline local preview mode — handled directly via BroadcastChannel/postMessage
  });
}

export function emitAdminAction(
  action: AdminActionName,
  payload: AdminActionPayload = {}
): void {
  dispatchToClients({
    type: 'ADMIN_ACTION',
    action,
    payload,
    timestamp: Date.now(),
  });
}

export function emitLiveConfig(config: Partial<LiveStudioConfig>): void {
  dispatchToClients({
    type: 'CONFIG_UPDATE',
    config,
    timestamp: Date.now(),
  });
}

export function subscribeClientSnapshots(
  onSnapshot: (snapshot: StudioStateSnapshot) => void,
  onClientReady: () => void
): () => void {
  const handleRaw = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const msg = raw as Partial<StudioSyncMessage>;
    if (msg.type === 'STATE_SNAPSHOT' && msg.snapshot) {
      onSnapshot(msg.snapshot);
      return;
    }
    if (msg.type === 'CLIENT_READY') {
      onClientReady();
    }
  };

  const onChannelMsg = (ev: MessageEvent) => handleRaw(ev.data);
  const onWindowMsg = (ev: MessageEvent) => handleRaw(ev.data);

  channel?.addEventListener('message', onChannelMsg);
  window.addEventListener('message', onWindowMsg);

  return () => {
    channel?.removeEventListener('message', onChannelMsg);
    window.removeEventListener('message', onWindowMsg);
  };
}
