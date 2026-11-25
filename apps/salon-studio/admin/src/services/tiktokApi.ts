import { io, type Socket } from 'socket.io-client';
import type { TikTokStatusPayload } from '@shared/types/events';

type StatusListener = (status: TikTokStatusPayload) => void;
type MetricsListener = (eventsPerMin: number) => void;
type RealEventListener = () => void;

class TikTokServerBridge {
  private socket: Socket | null = null;
  private statusListeners = new Set<StatusListener>();
  private metricsListeners = new Set<MetricsListener>();
  private realEventListeners = new Set<RealEventListener>();
  private eventTimestamps: number[] = [];
  private metricsTimer: ReturnType<typeof setInterval> | null = null;

  private lastStatus: TikTokStatusPayload = {
    status: 'DISCONNECTED',
    username: '',
  };

  public start(): void {
    if (this.socket) return;

    const serverOrigin =
      import.meta.env.VITE_SERVER_URL?.trim() ||
      (typeof window !== 'undefined' ? window.location.origin : '');

    this.socket = io(serverOrigin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    this.socket.on('tiktok:status', (payload: TikTokStatusPayload) => {
      this.lastStatus = payload;
      this.statusListeners.forEach((cb) => cb(payload));
    });

    const recordRealEvent = () => {
      const now = Date.now();
      this.eventTimestamps.push(now);
      this.pruneAndNotifyMetrics(now);
      this.realEventListeners.forEach((cb) => cb());
    };

    this.socket.on('game:chat', recordRealEvent);
    this.socket.on('game:gift', recordRealEvent);
    this.socket.on('game:like', recordRealEvent);
    this.socket.on('game:join', recordRealEvent);
    this.socket.on('live:event', recordRealEvent);

    this.metricsTimer = setInterval(() => {
      this.pruneAndNotifyMetrics(Date.now());
    }, 3000);
  }

  public stop(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private pruneAndNotifyMetrics(now: number): void {
    const cutoff = now - 60_000;
    while (this.eventTimestamps.length > 0 && this.eventTimestamps[0] < cutoff) {
      this.eventTimestamps.shift();
    }
    const count = this.eventTimestamps.length;
    this.metricsListeners.forEach((cb) => cb(count));
  }

  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.lastStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public onEventsPerMin(listener: MetricsListener): () => void {
    this.metricsListeners.add(listener);
    listener(this.eventTimestamps.length);
    return () => {
      this.metricsListeners.delete(listener);
    };
  }

  public onRealTikTokEvent(listener: RealEventListener): () => void {
    this.realEventListeners.add(listener);
    return () => {
      this.realEventListeners.delete(listener);
    };
  }

  public async connectRoom(username: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch('/api/tiktok/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error || 'Không thể kết nối server TikTok' };
    }
    return { ok: true };
  }

  public async disconnectRoom(): Promise<void> {
    await fetch('/api/tiktok/disconnect', { method: 'POST' }).catch(() => {});
  }
}

export const tiktokServerBridge = new TikTokServerBridge();
