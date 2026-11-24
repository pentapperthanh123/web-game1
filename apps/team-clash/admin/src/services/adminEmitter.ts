import { io, type Socket } from 'socket.io-client';
import { CLASH_PORTS, SYNC_CHANNEL_NAME } from '../../../shared/constants/clashConfig';
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

/** Real TikTok Live connection state, pushed by the game server on every change (and on connect). */
export interface TikTokServerStatus {
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';
  username?: string;
  error?: string;
  attempt?: number;
  nextRetryAt?: number;
}

class AdminEmitter {
  private channel: BroadcastChannel | null = null;
  private socket: Socket | null = null;
  private readonly serverUrl: string;
  private readonly tiktokStatusListeners = new Set<(status: TikTokServerStatus) => void>();

  /** Subscribe before or after init(); listeners survive socket re-creation. */
  public onTikTokStatus(listener: (status: TikTokServerStatus) => void): () => void {
    this.tiktokStatusListeners.add(listener);
    return () => {
      this.tiktokStatusListeners.delete(listener);
    };
  }

  constructor() {
    this.serverUrl =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL) ||
      (typeof window !== 'undefined' && window.location.hostname
        ? `${window.location.protocol}//${window.location.hostname}:${CLASH_PORTS.GAME_SERVER}`
        : `http://localhost:${CLASH_PORTS.GAME_SERVER}`);
  }

  public init(): () => void {
    // 1. Socket.IO connection to Game Server (communicates with Client 8030 & OBS)
    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log(`[AdminEmitter] Connected to Game Server on ${this.serverUrl}`);
      });

      this.socket.on('clash:state', (data: unknown) => {
        this.handleMessage(data);
      });

      this.socket.on('clash:action', (data: unknown) => {
        this.handleMessage(data);
      });

      this.socket.on('tiktok:status', (data: TikTokServerStatus) => {
        if (!data || typeof data.status !== 'string') return;
        this.tiktokStatusListeners.forEach((listener) => listener(data));
      });
    } catch {
      // Socket init tolerance
    }

    // 2. BroadcastChannel for same-origin tabs
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    }

    // 3. Window PostMessage listener
    const windowListener = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };
    window.addEventListener('message', windowListener);

    return () => {
      window.removeEventListener('message', windowListener);
      this.channel?.close();
      this.channel = null;
      this.socket?.disconnect();
      this.socket = null;
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
    // 0. Socket.io to Game Server (reaches standalone clients on port 8030, OBS, LAN)
    try {
      this.socket?.emit('clash:action', msg);
    } catch {
      // Socket tolerance
    }

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
