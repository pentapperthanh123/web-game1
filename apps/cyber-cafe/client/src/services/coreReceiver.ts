import { io, type Socket } from 'socket.io-client';
import { CAFE_PORTS, CAFE_SYNC_CHANNEL, PERFORMANCE_LIMITS } from '@shared/constants/cafeConfig';
import type { CyberCafeSyncMessage, NormalizedLiveEvent } from '@shared/types/events';
import { useCafeStore } from '../store/cafeStore';

export class CoreReceiver {
  private socket: Socket | null = null;
  private channel: BroadcastChannel | null = null;
  private pendingLikeCount = 0;
  private likeBatchTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly gatewayUrl = `http://localhost:${CAFE_PORTS.GATEWAY}`) {}

  public start(): void {
    // 1. Local BroadcastChannel for Admin sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CAFE_SYNC_CHANNEL);
        this.channel.onmessage = (event: MessageEvent<CyberCafeSyncMessage>) => {
          this.handleSyncMessage(event.data);
        };
      } catch (err) {
        console.warn('[CoreReceiver] BroadcastChannel not supported:', err);
      }
    }

    // 2. Window postMessage listener
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data && typeof event.data === 'object' && 'type' in event.data) {
          this.handleSyncMessage(event.data as CyberCafeSyncMessage);
        }
      });
    }

    // 3. Like batching timer (every 200ms)
    this.likeBatchTimer = setInterval(() => {
      if (this.pendingLikeCount > 0) {
        const count = this.pendingLikeCount;
        this.pendingLikeCount = 0;
        useCafeStore.getState().processLikes(count);
      }
    }, PERFORMANCE_LIMITS.LIKE_BATCH_INTERVAL_MS);

    // 4. Socket.IO connection to Core Gateway
    this.connectSocket();
  }

  public stop(): void {
    if (this.likeBatchTimer) {
      clearInterval(this.likeBatchTimer);
      this.likeBatchTimer = null;
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private connectSocket(): void {
    try {
      this.socket = io(this.gatewayUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        console.log('[CoreReceiver] Connected to Core Live Gateway at', this.gatewayUrl);
      });

      this.socket.on('live:event', (event: NormalizedLiveEvent) => {
        this.processLiveEvent(event);
      });

      // Legacy fallback handlers
      this.socket.on('game:chat', (data: { userName: string; text: string; userAvatar?: string }) => {
        this.processLiveEvent({
          type: 'CHAT',
          timestamp: Date.now(),
          user: { id: `chat_${data.userName}`, nickname: data.userName, avatarUrl: data.userAvatar },
          text: data.text,
        });
      });

      this.socket.on('game:gift', (data: { userName: string; giftName?: string; diamonds?: number; userAvatar?: string }) => {
        this.processLiveEvent({
          type: 'GIFT',
          timestamp: Date.now(),
          user: { id: `gift_${data.userName}`, nickname: data.userName, avatarUrl: data.userAvatar },
          coinValue: data.diamonds || 1,
          giftName: data.giftName,
        });
      });

      this.socket.on('game:like', (data: { count?: number }) => {
        this.processLiveEvent({
          type: 'LIKE',
          timestamp: Date.now(),
          count: data.count || 1,
        });
      });
    } catch (err) {
      console.warn('[CoreReceiver] Socket.IO initialization error:', err);
    }
  }

  public processLiveEvent(event: NormalizedLiveEvent): void {
    const store = useCafeStore.getState();

    switch (event.type) {
      case 'CHAT': {
        const user = event.user || {
          id: 'anon_user',
          nickname: 'Khách Quán Net',
        };
        const text = event.cleanText || event.text || '';
        if (text) {
          store.processChat(user, text);
        }
        break;
      }

      case 'LIKE': {
        const count = event.count || 1;
        this.pendingLikeCount += count;
        break;
      }

      case 'GIFT': {
        const user = event.user || {
          id: `gift_user_${Date.now()}`,
          nickname: 'Đại Gia Nạp Nét',
          isVip: true,
        };
        const coinValue = event.coinValue || 1;
        store.processGift(user, coinValue, event.giftName);
        break;
      }
    }
  }

  private handleSyncMessage(msg: CyberCafeSyncMessage): void {
    const store = useCafeStore.getState();

    if (msg.type === 'LIVE_EVENT') {
      this.processLiveEvent(msg.event);
      return;
    }

    if (msg.type === 'ADMIN_ACTION') {
      const payload = msg.payload || {};
      switch (msg.action) {
        case 'TRIGGER_MOM':
          store.triggerMomAlert('Host Gọi Mẹ');
          break;
        case 'TRIGGER_BLACKOUT':
          store.triggerBlackout(undefined, payload.bonusSeconds || 3.5);
          break;
        case 'BUFF_NOODLES':
          store.buffNoodles('Host Tặng Mì Tôm');
          break;
        case 'TRIGGER_BSOD':
          store.triggerBsod('Host Rút Mạng');
          break;
        case 'KICK_OR_ROTATE_PLAYER':
          store.kickOrRotatePlayer('Host Đổi Khách');
          break;
        case 'SET_LANGUAGE':
          if (payload.language) store.setLanguage(payload.language);
          break;
        case 'SET_MIC_MODE':
          if (typeof payload.micMode === 'boolean') store.setMicMode(payload.micMode);
          break;
        case 'SET_VOLUME':
          if (typeof payload.volume === 'number') store.setVolume(payload.volume);
          break;
        case 'SET_AUTOBOT':
          if (typeof payload.autoBotEnabled === 'boolean') {
            store.setAutoBot(payload.autoBotEnabled, payload.autoBotMode || 'CHILL');
          }
          break;
        case 'UPDATE_CONFIG':
          store.updateConfig({
            defaultSessionTimeSec: payload.defaultSessionTimeSec ?? store.defaultSessionTimeSec,
            momCycleSec: payload.momCycleSec ?? store.momCycleSec,
            autoMomEnabled: payload.autoMomEnabled ?? store.autoMomEnabled,
          });
          break;
      }
    }
  }
}
