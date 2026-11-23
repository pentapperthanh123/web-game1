import { io, type Socket } from 'socket.io-client';
import { STUDIO_PORTS } from '../../../shared/constants/studioConfig';
import type { NormalizedLiveEvent } from '../../../shared/types/events';

type EventHandler = (event: NormalizedLiveEvent) => void;
type ConnectionHandler = (connected: boolean) => void;

/**
 * Connects directly to the Core Connect Service (Live Connect Gateway on port 5000
 * or fallback Game Server on port 4000) and dispatches NormalizedLiveEvent payloads.
 */
export class CoreReceiver {
  private socket: Socket | null = null;
  private readonly eventListeners: EventHandler[] = [];
  private readonly connectionListeners: ConnectionHandler[] = [];

  constructor(private readonly serverUrl = `http://localhost:${STUDIO_PORTS.GATEWAY}`) {}

  public connect(): void {
    if (this.socket) return;

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 12,
      reconnectionDelay: 1500,
    });

    this.socket.on('connect', () => {
      this.notifyConnection(true);
    });

    this.socket.on('disconnect', () => {
      this.notifyConnection(false);
    });

    // Canonical NormalizedLiveEvent channel from Live Connect Gateway
    this.socket.on('live:event', (event: NormalizedLiveEvent) => {
      this.dispatch(event);
    });

    // Legacy fallback channels if pointed directly at server (port 4000)
    this.socket.on('game:chat', (data: { userName: string; text: string }) => {
      this.dispatch({
        type: 'CHAT',
        timestamp: Date.now(),
        user: { id: data.userName, username: data.userName, nickname: data.userName },
        text: data.text,
      });
    });

    this.socket.on(
      'game:gift',
      (data: { donorName: string; donorAvatarUrl?: string; giftName: string; coins: number }) => {
        this.dispatch({
          type: 'GIFT',
          timestamp: Date.now(),
          user: {
            id: data.donorName,
            username: data.donorName,
            nickname: data.donorName,
            avatarUrl: data.donorAvatarUrl,
          },
          giftName: data.giftName,
          coinValue: data.coins,
          repeatCount: 1,
        });
      }
    );

    this.socket.on('game:like', (data: { userName: string; count: number }) => {
      this.dispatch({
        type: 'LIKE',
        timestamp: Date.now(),
        user: { id: data.userName, username: data.userName, nickname: data.userName },
        count: data.count || 1,
      });
    });
  }

  public onEvent(handler: EventHandler): () => void {
    this.eventListeners.push(handler);
    return () => {
      const idx = this.eventListeners.indexOf(handler);
      if (idx !== -1) this.eventListeners.splice(idx, 1);
    };
  }

  public onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionListeners.push(handler);
    return () => {
      const idx = this.connectionListeners.indexOf(handler);
      if (idx !== -1) this.connectionListeners.splice(idx, 1);
    };
  }

  private notifyConnection(connected: boolean): void {
    for (const listener of this.connectionListeners) {
      listener(connected);
    }
  }

  public dispatch(event: NormalizedLiveEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[PortraitCoreReceiver] Listener error:', err);
      }
    }
  }

  public disconnect(): void {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.notifyConnection(false);
  }
}
