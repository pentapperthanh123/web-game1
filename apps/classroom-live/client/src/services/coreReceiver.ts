import { io, Socket } from 'socket.io-client';

export interface CoreLiveEvent {
  type: 'CHAT' | 'GIFT' | 'LIKE' | 'JOIN' | 'FOLLOW' | 'SHARE' | 'ROOM_STATS';
  platform?: string;
  timestamp: number;
  user?: {
    id: string;
    username: string;
    nickname: string;
    avatarUrl?: string;
    fansLevel?: number;
  };
  [key: string]: unknown;
}

export type EventCallback = (event: CoreLiveEvent) => void;

/**
 * Kết nối nhận sự kiện NormalizedLiveEvent từ Live Connect Gateway (5000)
 * hoặc Game Server (4000).
 */
export class CoreReceiver {
  private socket: Socket | null = null;
  private readonly listeners: EventCallback[] = [];

  constructor(private readonly serverUrl = 'http://localhost:5000') {}

  public connect(): void {
    if (this.socket) return;

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log(`[CoreReceiver] Connected to Core Live Stream at ${this.serverUrl}`);
    });

    this.socket.on('disconnect', () => {
      console.warn('[CoreReceiver] Disconnected from Core Live Stream');
    });

    // Lắng nghe cả kênh chuẩn live:event từ gateway và game:chat/gift từ server cũ
    this.socket.on('live:event', (event: CoreLiveEvent) => {
      this.dispatch(event);
    });

    // Fallback nếu kết nối trực tiếp vào Game Server 4000
    this.socket.on('game:chat', (data: { userName: string; text: string }) => {
      this.dispatch({
        type: 'CHAT',
        timestamp: Date.now(),
        user: { id: data.userName, username: data.userName, nickname: data.userName },
        text: data.text,
      });
    });

    this.socket.on('game:gift', (data: { donorName: string; giftName: string; coins: number }) => {
      this.dispatch({
        type: 'GIFT',
        timestamp: Date.now(),
        user: { id: data.donorName, username: data.donorName, nickname: data.donorName },
        giftName: data.giftName,
        coinValue: data.coins,
        repeatCount: 1,
      });
    });

    this.socket.on('game:like', (data: { userName: string; count: number }) => {
      this.dispatch({
        type: 'LIKE',
        timestamp: Date.now(),
        user: { id: data.userName, username: data.userName, nickname: data.userName },
        count: data.count || 1,
      });
    });
  }

  public onEvent(callback: EventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  public dispatch(event: CoreLiveEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[CoreReceiver] Listener error:', err);
      }
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

