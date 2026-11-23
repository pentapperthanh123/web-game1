import { PRANK_PORTS, PRANK_SYNC_CHANNEL } from '@shared/constants/prankConfig';
import type {
  AdminDirectActionPayload,
  AdminDirectActionType,
  NormalizedLiveEvent,
  PrankSyncMessage,
} from '@shared/types/events';
import type { PrankActionType } from '@shared/types/prank';

declare global {
  interface Window {
    __prankPopups?: Window[];
  }
}

let channel: BroadcastChannel | null = null;
if (typeof BroadcastChannel !== 'undefined') {
  try {
    channel = new BroadcastChannel(PRANK_SYNC_CHANNEL);
  } catch {
    // Ignore fallback
  }
}

export function registerPrankPopup(popup: Window | null): void {
  if (!popup || typeof window === 'undefined') return;
  window.__prankPopups = window.__prankPopups || [];
  if (!window.__prankPopups.includes(popup)) {
    window.__prankPopups.push(popup);
  }
}

export function dispatchSyncMessage(message: PrankSyncMessage): void {
  // 1. BroadcastChannel (inter-tab communication on same origin)
  try {
    channel?.postMessage(message);
  } catch (err) {
    console.warn('[AdminEmitter] BroadcastChannel error:', err);
  }

  // 2. Broadcast to all embedded iframes in the Admin DOM (Live Preview Drawer)
  if (typeof document !== 'undefined') {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(message, '*');
      } catch {
        // Ignore cross-origin frame errors
      }
    });
  }

  // 3. Broadcast to parent / opener windows
  if (typeof window !== 'undefined') {
    try {
      window.postMessage(message, '*');
      if (window.opener) {
        window.opener.postMessage(message, '*');
      }
    } catch {
      // Ignore
    }

    // 4. Broadcast to registered popups
    if (Array.isArray(window.__prankPopups)) {
      for (let i = window.__prankPopups.length - 1; i >= 0; i--) {
        const win = window.__prankPopups[i];
        try {
          if (!win || win.closed) {
            window.__prankPopups.splice(i, 1);
          } else {
            win.postMessage(message, '*');
          }
        } catch {
          // Ignore
        }
      }
    }
  }

  // 5. Non-blocking forward to Gateway if running
  if (message.type === 'LIVE_EVENT') {
    fetch(`http://localhost:${PRANK_PORTS.GATEWAY}/api/mock/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: message.event }),
    }).catch(() => {
      // Offline local mode
    });
  }
}

export function emitPrankAction(action: PrankActionType): void {
  dispatchSyncMessage({
    type: 'ADMIN_ACTION',
    action: 'TRIGGER_PRANK',
    payload: { action },
    timestamp: Date.now(),
  });
}

export function emitForceMeltdown(): void {
  dispatchSyncMessage({
    type: 'ADMIN_ACTION',
    action: 'FORCE_MELTDOWN',
    timestamp: Date.now(),
  });
}

export function emitCleanTarget(): void {
  dispatchSyncMessage({
    type: 'ADMIN_ACTION',
    action: 'CLEAN_TARGET',
    timestamp: Date.now(),
  });
}

export function emitResetState(): void {
  dispatchSyncMessage({
    type: 'ADMIN_ACTION',
    action: 'RESET_STATE',
    timestamp: Date.now(),
  });
}

export function emitConfigUpdate(payload: AdminDirectActionPayload): void {
  dispatchSyncMessage({
    type: 'ADMIN_ACTION',
    action: 'UPDATE_CONFIG',
    payload,
    timestamp: Date.now(),
  });
}

export function emitLiveEvent(event: NormalizedLiveEvent): void {
  dispatchSyncMessage({
    type: 'LIVE_EVENT',
    event,
    timestamp: Date.now(),
  });
}
