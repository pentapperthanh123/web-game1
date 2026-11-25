import { io, type Socket } from 'socket.io-client';
import { GAMEPLAY_LIMITS, SALON_SYNC_CHANNEL } from '@shared/constants/salonConfig';
import type { NormalizedLiveEvent, SalonSyncMessage } from '@shared/types/events';
import { useSalonStore } from '../store/salonStore';
import { salonAudio } from './audioManager';

interface ServerChatPayload {
  userName?: string;
  text?: string;
  avatarUrl?: string;
  userAvatar?: string;
}

interface ServerGiftPayload {
  donorName?: string;
  userName?: string;
  donorAvatarUrl?: string;
  userAvatar?: string;
  giftName?: string;
  coins?: number;
  diamonds?: number;
  totalCoins?: number;
  streakCount?: number;
  isComboFinal?: boolean;
}

interface ServerLikePayload {
  count?: number;
  userName?: string;
}

interface ServerJoinPayload {
  userName?: string;
  viewerCount?: number;
}

export class SalonCoreReceiver {
  private socket: Socket | null = null;
  private channel: BroadcastChannel | null = null;
  private pendingLikes = 0;
  private pendingLikesHasReal = false;
  private likeBatchTimer: ReturnType<typeof setInterval> | null = null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandler: ((event: MessageEvent<unknown>) => void) | null = null;

  constructor(private readonly isSandboxPreview: boolean) {}

  public start(): void {
    // 1. postMessage listener (used by Admin Live Preview / Sandbox Preview iframe)
    if (typeof window !== 'undefined') {
      this.messageHandler = (event: MessageEvent<unknown>) => {
        if (!event.data || typeof event.data !== 'object' || !('type' in event.data)) return;
        const msg = event.data as SalonSyncMessage;
        if (this.isSandboxPreview) {
          // Sandbox iframe ONLY accepts explicitly targeted PREVIEW commands
          if ('target' in msg && msg.target === 'PREVIEW') {
            this.handleSyncMessage(msg);
          }
          return;
        }
        if ('target' in msg && msg.target === 'PREVIEW') return;
        this.handleSyncMessage(msg);
      };
      window.addEventListener('message', this.messageHandler);
    }

    // 2. Like batch timer (every 200ms)
    this.likeBatchTimer = setInterval(() => {
      if (this.pendingLikes > 0) {
        const count = this.pendingLikes;
        const isReal = this.pendingLikesHasReal;
        this.pendingLikes = 0;
        this.pendingLikesHasReal = false;
        useSalonStore.getState().processLikes(count, isReal);
      }
    }, GAMEPLAY_LIMITS.LIKE_BATCH_INTERVAL_MS);

    // Sandbox preview stays completely isolated from live BroadcastChannel & Socket.IO
    if (this.isSandboxPreview) return;

    // 3. Local BroadcastChannel for Admin <-> Live Stage sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(SALON_SYNC_CHANNEL);
        this.channel.onmessage = (event: MessageEvent<SalonSyncMessage>) => {
          const msg = event.data;
          if (!msg || ('target' in msg && msg.target === 'PREVIEW')) return;
          if (msg.type === 'REQUEST_SNAPSHOT') {
            this.broadcastSnapshot();
            return;
          }
          this.handleSyncMessage(msg);
        };
      } catch (err) {
        console.warn('[SalonCoreReceiver] BroadcastChannel unavailable:', err);
      }
    }

    // 4. Periodic state snapshot push to Admin panel
    this.snapshotTimer = setInterval(() => {
      this.broadcastSnapshot();
    }, 800);

    // 5. Socket.IO connection to Core Connect Service (proxied via /socket.io -> server:4000)
    this.connectSocket();
  }

  public stop(): void {
    if (this.likeBatchTimer) {
      clearInterval(this.likeBatchTimer);
      this.likeBatchTimer = null;
    }
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
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

  private broadcastSnapshot(): void {
    if (!this.channel) return;
    try {
      const state = useSalonStore.getState();
      this.channel.postMessage({
        type: 'STATE_SNAPSHOT',
        snapshot: {
          config: state.config,
          activeService: state.activeService,
          activeCustomer: state.activeCustomer,
          vipQueue: state.vipQueue,
          normalQueue: state.normalQueue,
          finishedWall: state.finishedWall,
          royalTopPin: state.royalTopPin,
          todayCount: state.todayCount,
          watchingCount: state.watchingCount,
          stylistMood: state.stylistMood,
          stylistSpeech: state.stylistSpeech,
          stylistSpeedBoostUntil: state.stylistSpeedBoostUntil,
          audienceBubbles: state.audienceBubbles,
          thankYouToast: state.thankYouToast,
          autoBotEnabled: state.autoBotEnabled,
          autoBotPace: state.autoBotPace,
          autoPauseBotOnRealEvent: state.autoPauseBotOnRealEvent,
          lastRealEventAt: state.lastRealEventAt,
          isSandboxPreview: state.isSandboxPreview,
        },
        timestamp: Date.now(),
      } satisfies SalonSyncMessage);
    } catch {
      // Ignore closed channel
    }
  }

  private connectSocket(): void {
    try {
      const socketUrl =
        import.meta.env.VITE_SERVER_URL?.trim() ||
        (typeof window !== 'undefined' ? window.location.origin : '');
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      });

      this.socket.on('live:event', (event: NormalizedLiveEvent) => {
        this.processLiveEvent({ ...event, source: event.source ?? 'REAL' });
      });

      this.socket.on('game:chat', (data: ServerChatPayload) => {
        const nickname = data.userName || 'Khách Live';
        if (nickname === 'Hệ Thống') return;
        this.processLiveEvent({
          type: 'CHAT',
          source: 'REAL',
          timestamp: Date.now(),
          user: {
            id: `tt_${nickname.toLowerCase()}`,
            nickname,
            avatarUrl: data.avatarUrl || data.userAvatar,
          },
          text: data.text || '',
          cleanText: data.text || '',
        });
      });

      this.socket.on('game:gift', (data: ServerGiftPayload) => {
        const nickname = data.donorName || data.userName || 'Khách VIP';
        const coinValue = Number(data.coins ?? data.diamonds ?? 1) || 1;
        this.processLiveEvent({
          type: 'GIFT',
          source: 'REAL',
          timestamp: Date.now(),
          user: {
            id: `tt_${nickname.toLowerCase()}`,
            nickname,
            avatarUrl: data.donorAvatarUrl || data.userAvatar,
          },
          giftName: data.giftName || 'Gift',
          coinValue,
          repeatCount: data.streakCount ?? 1,
          isStreakEnd: data.isComboFinal,
        });
      });

      this.socket.on('game:like', (data: ServerLikePayload) => {
        this.processLiveEvent({
          type: 'LIKE',
          source: 'REAL',
          timestamp: Date.now(),
          count: Math.max(1, Number(data.count) || 1),
        });
      });

      this.socket.on('game:join', (data: ServerJoinPayload) => {
        this.processLiveEvent({
          type: 'JOIN',
          source: 'REAL',
          timestamp: Date.now(),
          viewerCount: data.viewerCount,
        });
      });
    } catch (err) {
      console.warn('[SalonCoreReceiver] Socket.IO init warning:', err);
    }
  }

  public processLiveEvent(event: NormalizedLiveEvent): void {
    const store = useSalonStore.getState();
    const isReal = event.source === 'REAL';

    switch (event.type) {
      case 'CHAT': {
        const text = event.cleanText || event.text || '';
        if (!text.trim()) return;
        const user = event.user ?? { id: 'anon_chat', nickname: 'Khách TikTok' };
        store.processChat(user, text, isReal);
        break;
      }
      case 'LIKE': {
        this.pendingLikes += Math.max(1, event.count ?? 1);
        if (isReal) this.pendingLikesHasReal = true;
        break;
      }
      case 'GIFT': {
        const user = event.user ?? { id: `gift_${Date.now()}`, nickname: 'Khách VIP' };
        const coins = Math.max(1, event.coinValue ?? 1);
        store.processGift(user, coins, event.giftName ?? 'Gift', isReal);
        break;
      }
      case 'JOIN':
      case 'ROOM_STATS': {
        store.processJoin(event.viewerCount);
        break;
      }
    }
  }

  private handleSyncMessage(msg: SalonSyncMessage): void {
    if (msg.type === 'LIVE_EVENT') {
      this.processLiveEvent(msg.event);
      return;
    }

    if (msg.type !== 'ADMIN_ACTION') return;

    const store = useSalonStore.getState();
    const payload = msg.payload ?? {};

    switch (msg.action) {
      case 'SET_SCHEDULE_MODE':
        if (payload.scheduleMode) store.setScheduleMode(payload.scheduleMode);
        break;
      case 'SET_LANGUAGE':
        if (payload.language) store.setLanguage(payload.language);
        break;
      case 'SET_TURN_DURATION':
        if (typeof payload.turnDurationSec === 'number') {
          store.setTurnDuration(payload.turnDurationSec);
        }
        break;
      case 'SET_TROLL_ENABLED':
        if (typeof payload.trollEnabled === 'boolean') {
          store.setTrollEnabled(payload.trollEnabled);
        }
        break;
      case 'SET_MIC_MODE':
        if (typeof payload.micMode === 'boolean') {
          store.setMicMode(payload.micMode);
        }
        break;
      case 'SET_MASTER_VOLUME':
        if (typeof payload.masterVolume === 'number') {
          store.setMasterVolume(payload.masterVolume);
        }
        break;
      case 'SET_SAFE_ZONE':
        if (typeof payload.showSafeZone === 'boolean') {
          store.setSafeZone(payload.showSafeZone);
        }
        break;
      case 'FORCE_COMPLETE_NOW':
        store.forceCompleteNow();
        break;
      case 'TRIGGER_TROLL_NOW':
        store.triggerTrollNow('Host');
        break;
      case 'CALL_NEXT_CUSTOMER':
        store.callNextCustomer();
        break;
      case 'CLEAR_FINISHED_WALL':
        store.clearFinishedWall();
        break;
      case 'APPLY_PREVIEW_PRESET':
        if (payload.previewPreset) store.applyPreviewPreset(payload.previewPreset);
        break;
      case 'PLAY_TEST_SFX':
        if (payload.sfxName) salonAudio.play(payload.sfxName);
        break;
    }
  }
}
