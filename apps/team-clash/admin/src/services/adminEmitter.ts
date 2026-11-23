import { SYNC_CHANNEL_NAME } from '../../../shared/constants/clashConfig';
import type {
  AdminActionPayload,
  AdminActionType,
  ClashSyncMessage,
  NormalizedLiveEvent,
} from '../../../shared/types/events';
import { useAdminStore } from '../store/adminStore';

declare global {
  interface Window {
    __clashPopups?: Window[];
  }
}

export function registerClashPopup(popup: Window | null): void {
  if (!popup || typeof window === 'undefined') return;
  window.__clashPopups = window.__clashPopups || [];
  if (!window.__clashPopups.includes(popup)) {
    window.__clashPopups.push(popup);
  }
}

class AdminEmitter {
  private channel: BroadcastChannel | null = null;

  public init(): () => void {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    }

    const windowListener = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };
    window.addEventListener('message', windowListener);

    return () => {
      window.removeEventListener('message', windowListener);
      this.channel?.close();
      this.channel = null;
    };
  }

  private handleMessage(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const msg = data as ClashSyncMessage;

    if (msg.type === 'STATE_SYNC' && msg.state) {
      useAdminStore.getState().updateLiveState(msg.state);
    }
  }

  public emitAction(action: AdminActionType, payload?: AdminActionPayload): void {
    this.post({
      type: 'ADMIN_ACTION',
      action,
      payload,
      timestamp: Date.now(),
    });
  }

  public emitLiveEvent(event: NormalizedLiveEvent): void {
    this.post({
      type: 'LIVE_EVENT',
      event,
      timestamp: Date.now(),
    });
  }

  private post(msg: ClashSyncMessage): void {
    // 1. BroadcastChannel across tabs
    try {
      this.channel?.postMessage(msg);
    } catch {
      // Ignore broadcast errors
    }

    // 2. Window Opener (if Admin was opened from Client)
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(msg, '*');
      }
    } catch {
      // Ignore cross-window restrictions
    }

    // 3. Embedded Iframes (Client Drawer preview inside Admin)
    if (typeof document !== 'undefined') {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage(msg, '*');
        } catch {
          // Ignore iframe cross-origin restrictions
        }
      });
    }

    // 4. Registered Popup Windows
    if (typeof window !== 'undefined' && Array.isArray(window.__clashPopups)) {
      for (let i = window.__clashPopups.length - 1; i >= 0; i--) {
        const popup = window.__clashPopups[i];
        try {
          if (!popup || popup.closed) {
            window.__clashPopups.splice(i, 1);
          } else {
            popup.postMessage(msg, '*');
          }
        } catch {
          // Ignore popup errors
        }
      }
    }
  }
}

export const adminEmitter = new AdminEmitter();
