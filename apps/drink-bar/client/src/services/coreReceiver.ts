import { io, type Socket } from 'socket.io-client';
import { startBackgroundTicker, type BackgroundTickerHandle } from '@shared/backgroundTicker';
import {
  DRINK_BAR_LOCAL_SYNC_ENDPOINTS,
  DRINK_BAR_SOCKET_EVENTS,
  DRINK_BAR_SYNC_CHANNEL,
  GAMEPLAY_LIMITS,
} from '@shared/config';
import { normalizeUserId } from '@shared/queue';
import type { DrinkBarSyncMessage, NormalizedLiveEvent } from '@shared/types';
import { requestBaristaForceSleep } from '../engine/drinkBarLoop';
import { drinkBarTts } from './ttsEngine';
import { useDrinkBarStore } from '../store/drinkBarStore';

interface ServerChatPayload {
  uniqueId?: string;
  userName?: string;
  text?: string;
  rawText?: string;
  avatarUrl?: string;
  userAvatar?: string;
}

interface ServerGiftPayload {
  uniqueId?: string;
  donorName?: string;
  userName?: string;
  donorAvatarUrl?: string;
  userAvatar?: string;
  giftName?: string;
  coins?: number;
  diamonds?: number;
  streakCount?: number;
  isComboFinal?: boolean;
}

function buildTikTokUserId(uniqueId: string | undefined, nickname: string): string {
  const userKey = (uniqueId || nickname).trim().toLowerCase().replace(/\s+/g, '_');
  return `tt_${userKey}`;
}

interface ServerLikePayload {
  uniqueId?: string;
  count?: number;
  userName?: string;
}

interface ServerJoinPayload {
  uniqueId?: string;
  userName?: string;
  viewerCount?: number;
  topViewerIds?: string[];
}

const MAX_SEEN_EVENT_IDS = 600;
const SNAPSHOT_PUSH_INTERVAL_MS = 450;
const SNAPSHOT_IMMEDIATE_THROTTLE_MS = 100;

function createReceiverInstanceId(): string {
  return `rx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class DrinkBarCoreReceiver {
  private readonly instanceId = createReceiverInstanceId();
  private socket: Socket | null = null;
  private channel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private pendingLikes = 0;
  private lastLikeFlushMs = 0;
  private lastImmediatePushAt = 0;
  private immediatePushTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private likeBatchTicker: BackgroundTickerHandle | null = null;
  private snapshotTicker: BackgroundTickerHandle | null = null;
  private messageHandler: ((event: MessageEvent<unknown>) => void) | null = null;
  private readonly seenEventIds = new Set<string>();

  public start(): void {
    // 1. Direct postMessage listener (Admin :8071 -> Live Preview iframe :8070?mirror=1)
    if (typeof window !== 'undefined') {
      this.messageHandler = (event: MessageEvent<unknown>) => {
        if (!isSyncMessage(event.data)) return;
        this.handleIncomingSync(event.data, 'POST_MESSAGE');
      };
      window.addEventListener('message', this.messageHandler);
    }

    // 2. Same-origin BroadcastChannel (syncs :8070 tabs together)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(DRINK_BAR_SYNC_CHANNEL);
        this.channel.onmessage = (event: MessageEvent<unknown>) => {
          if (!isSyncMessage(event.data)) return;
          this.handleIncomingSync(event.data, 'BROADCAST');
        };
      } catch (err) {
        console.warn('[DrinkBarCoreReceiver] BroadcastChannel unavailable:', err);
      }
    }

    // 3. Batch LIKE ticker (60ms, active even when tab is inactive)
    this.likeBatchTicker = startBackgroundTicker(
      GAMEPLAY_LIMITS.LIKE_BATCH_INTERVAL_MS,
      () => {
        if (this.pendingLikes <= 0) return;
        const count = this.pendingLikes;
        this.pendingLikes = 0;
        this.lastLikeFlushMs = Date.now();
        useDrinkBarStore.getState().processLikes(count);
      }
    );

    // 4. Periodic snapshot push to Admin (via window.parent & BroadcastChannel)
    this.snapshotTicker = startBackgroundTicker(SNAPSHOT_PUSH_INTERVAL_MS, () => {
      this.broadcastSnapshot();
    });

    // Push key count/queue transitions promptly (throttled to 100ms) so Admin stays 1:1 synced
    this.unsubscribeStore = useDrinkBarStore.subscribe((next, prev) => {
      const didImportantFieldChange =
        next.todayDoneCount !== prev.todayDoneCount ||
        next.resetEpoch !== prev.resetEpoch ||
        next.activeDrink?.orderId !== prev.activeDrink?.orderId ||
        next.activeDrink?.phase !== prev.activeDrink?.phase ||
        next.vipQueue.length !== prev.vipQueue.length ||
        next.normalQueue.length !== prev.normalQueue.length;
      if (didImportantFieldChange) {
        this.scheduleImmediateSnapshot();
      }
    });

    // 5. Connect to Local Vite SSE Sync Hub (100% reliable across all tabs/windows & OBS even when BroadcastChannel is partitioned)
    this.connectSseHub();

    // 6. Connect to Core Connect Service (server:4000 via Vite proxy)
    this.connectSocket();
    this.broadcastSnapshot();
  }

  public stop(): void {
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
    if (this.immediatePushTimer) {
      clearTimeout(this.immediatePushTimer);
      this.immediatePushTimer = null;
    }
    if (this.likeBatchTicker) {
      this.likeBatchTicker.stop();
      this.likeBatchTicker = null;
    }
    if (this.snapshotTicker) {
      this.snapshotTicker.stop();
      this.snapshotTicker = null;
    }
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private rememberEventId(eventId: string): boolean {
    if (this.seenEventIds.has(eventId)) {
      return false;
    }
    if (this.seenEventIds.size >= MAX_SEEN_EVENT_IDS) {
      const oldest = this.seenEventIds.values().next().value;
      if (oldest) {
        this.seenEventIds.delete(oldest);
      }
    }
    this.seenEventIds.add(eventId);
    return true;
  }

  private handleIncomingSync(
    msg: DrinkBarSyncMessage,
    origin: 'POST_MESSAGE' | 'BROADCAST' | 'SOCKET' | 'SSE'
  ): void {
    if (msg.type === 'REQUEST_SNAPSHOT') {
      this.broadcastSnapshot();
      return;
    }

    if (msg.type === 'RELAY_TTS' && msg.action === 'DONE') {
      drinkBarTts.notifyRelayedSpeechDone(msg.utteranceId);
      return;
    }

    if (msg.type === 'STATE_SNAPSHOT') {
      if (msg.senderId && msg.senderId === this.instanceId) {
        return;
      }
      useDrinkBarStore.getState().applyExternalSnapshot(msg.snapshot);
      return;
    }

    if (msg.type === 'RELAY_SFX' || msg.type === 'RELAY_TTS') {
      return;
    }

    if (!this.rememberEventId(msg.eventId)) {
      return;
    }

    // Relay live Admin postMessage into same-origin BroadcastChannel (skip preview-only init sync)
    const isPreviewInitSync = msg.eventId.startsWith('init_');
    if (origin === 'POST_MESSAGE' && !isPreviewInitSync && this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // Ignore closed channel
      }
    }

    if (msg.type === 'LIVE_EVENT') {
      this.processNormalizedEvent(msg.event);
      this.scheduleImmediateSnapshot();
      return;
    }

    if (msg.type === 'ADMIN_ACTION') {
      this.applyAdminAction(msg);
      this.scheduleImmediateSnapshot();
    }
  }

  private applyAdminAction(
    msg: Extract<DrinkBarSyncMessage, { type: 'ADMIN_ACTION' }>
  ): void {
    const store = useDrinkBarStore.getState();
    const payload = msg.payload ?? {};

    switch (msg.action) {
      case 'SET_LANGUAGE':
        if (payload.language) store.setLanguage(payload.language);
        break;
      case 'SET_BREW_DURATION':
        if (typeof payload.brewDurationSec === 'number') {
          store.setBrewDuration(payload.brewDurationSec);
        }
        break;
      case 'SET_SFX_ENABLED':
        if (typeof payload.sfxEnabled === 'boolean') {
          store.setSfxEnabled(payload.sfxEnabled);
        }
        break;
      case 'SET_MUSIC_ENABLED':
        if (typeof payload.sfxMusicEnabled === 'boolean') {
          store.setMusicEnabled(payload.sfxMusicEnabled);
        }
        break;
      case 'SET_BGM_ENABLED':
        if (typeof payload.bgmEnabled === 'boolean') {
          store.setBgmEnabled(payload.bgmEnabled);
        }
        break;
      case 'SET_TTS_ENABLED':
        if (typeof payload.ttsEnabled === 'boolean') {
          store.setTtsEnabled(payload.ttsEnabled);
        }
        break;
      case 'SET_MASTER_VOLUME':
        if (typeof payload.masterVolume === 'number') {
          store.setMasterVolume(payload.masterVolume);
        }
        break;
      case 'SET_MIC_MODE':
        if (typeof payload.micMode === 'boolean') {
          store.setMicMode(payload.micMode);
        }
        break;
      case 'SET_SAFE_ZONE':
        if (typeof payload.showSafeZone === 'boolean') {
          store.setShowSafeZone(payload.showSafeZone);
        }
        break;
      case 'COMPLETE_NOW':
        store.completeNow();
        break;
      case 'ADD_TOPPING':
        store.addTopping(payload.toppingId);
        break;
      case 'NEXT_CUSTOMER':
        store.nextCustomer();
        break;
      case 'CLEAR_SHELF':
        store.clearShelf();
        break;
      case 'RESET_DEFAULT':
        store.resetToDefaultEmpty();
        break;
      case 'FORCE_IDLE_SLEEP':
        store.prepareIdleSleep();
        requestBaristaForceSleep();
        break;
      case 'TRIGGER_TIKTOK_DANCE':
        store.triggerTikTokDance(payload.danceTier, payload.danceStyle);
        break;
      case 'SET_BREW_PROGRESS':
        if (typeof payload.progress === 'number') {
          store.setBrewProgress(payload.progress);
        }
        break;
      case 'RESTOCK_RECIPE':
        if (payload.recipeId) {
          store.restockRecipe(payload.recipeId, payload.addMl);
        }
        break;
      case 'RESTOCK_ALL':
        store.restockAll();
        break;
      case 'SET_DEFAULT_CAPACITY':
        if (typeof payload.defaultCapacityMl === 'number') {
          store.setDefaultCapacity(payload.defaultCapacityMl);
        }
        break;
      case 'SET_AUTO_RESTOCK':
        if (typeof payload.autoRestockEnabled === 'boolean') {
          store.setAutoRestock(payload.autoRestockEnabled);
        }
        break;
      case 'SET_UNLIMITED_INVENTORY':
        if (typeof payload.unlimitedInventory === 'boolean') {
          store.setUnlimitedInventory(payload.unlimitedInventory);
        }
        break;
      case 'SET_MAX_ORDERS_PER_USER':
        if (typeof payload.maxOrdersPerUser === 'number') {
          store.setMaxOrdersPerUser(payload.maxOrdersPerUser);
        }
        break;
    }
  }

  private scheduleImmediateSnapshot(): void {
    const now = Date.now();
    const elapsed = now - this.lastImmediatePushAt;
    if (elapsed >= SNAPSHOT_IMMEDIATE_THROTTLE_MS) {
      this.lastImmediatePushAt = now;
      this.broadcastSnapshot();
      return;
    }
    if (this.immediatePushTimer) {
      return;
    }
    this.immediatePushTimer = setTimeout(() => {
      this.immediatePushTimer = null;
      this.lastImmediatePushAt = Date.now();
      this.broadcastSnapshot();
    }, SNAPSHOT_IMMEDIATE_THROTTLE_MS - elapsed);
  }

  private broadcastSnapshot(): void {
    const snapshot = useDrinkBarStore.getState().getSnapshot();
    const message: DrinkBarSyncMessage = {
      type: 'STATE_SNAPSHOT',
      snapshot,
      senderId: this.instanceId,
      timestamp: Date.now(),
    };

    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(message, '*');
      } catch {
        // Ignore cross-frame error
      }
    }

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch {
        // Ignore closed channel
      }
    }

    if (this.socket?.connected) {
      this.socket.emit(DRINK_BAR_SOCKET_EVENTS.SYNC, message);
    }

    // Active Stage or Mirror Preview pushes snapshot to SSE Hub so Admin & newly opened :8070 tabs stay in sync even when Preview is hidden
    if (typeof fetch !== 'undefined') {
      void fetch(DRINK_BAR_LOCAL_SYNC_ENDPOINTS.EMIT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      }).catch(() => {});
    }
  }

  private connectSseHub(): void {
    if (typeof EventSource === 'undefined' || this.eventSource) return;
    try {
      this.eventSource = new EventSource(DRINK_BAR_LOCAL_SYNC_ENDPOINTS.EVENTS);
      this.eventSource.onmessage = (ev: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(ev.data) as unknown;
          if (!isSyncMessage(parsed)) return;
          this.handleIncomingSync(parsed, 'SSE');
        } catch {
          // Ignore malformed SSE payload
        }
      };
    } catch (err) {
      console.warn('[DrinkBarCoreReceiver] SSE Hub unavailable:', err);
    }
  }

  private connectSocket(): void {
    try {
      const socketUrl =
        import.meta.env.VITE_SERVER_URL?.trim() ||
        (typeof window !== 'undefined' ? window.location.origin : '');

      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 800,
        reconnectionDelayMax: 3000,
        timeout: 2500,
      });

      // Canonical NormalizedLiveEvent stream from Core Connect / Gateway
      this.socket.on('live:event', (event: NormalizedLiveEvent) => {
        this.processNormalizedEvent({ ...event, source: event.source ?? 'REAL' });
      });

      // Cross-process Admin <-> OBS relay via server/
      this.socket.on(DRINK_BAR_SOCKET_EVENTS.SYNC, (msg: unknown) => {
        if (!isSyncMessage(msg)) return;
        this.handleIncomingSync(msg, 'SOCKET');
      });

      // Core server legacy events normalized into NormalizedLiveEvent
      this.socket.on('game:chat', (data: ServerChatPayload) => {
        const nickname = (data.userName || data.uniqueId || 'Guest').trim();
        if (nickname === 'Hệ Thống') return;
        const chatText = data.rawText || data.text || '';
        this.processNormalizedEvent({
          type: 'CHAT',
          source: 'REAL',
          timestamp: Date.now(),
          user: {
            id: buildTikTokUserId(data.uniqueId, nickname),
            nickname,
            avatarUrl: data.avatarUrl || data.userAvatar,
          },
          text: chatText,
          cleanText: chatText,
        });
        this.scheduleImmediateSnapshot();
      });

      this.socket.on('game:gift', (data: ServerGiftPayload) => {
        const nickname = (data.donorName || data.userName || 'VIP').trim();
        const coinValue = Math.max(1, Number(data.coins ?? data.diamonds ?? 1) || 1);
        this.processNormalizedEvent({
          type: 'GIFT',
          source: 'REAL',
          timestamp: Date.now(),
          user: {
            id: buildTikTokUserId(data.uniqueId, nickname),
            nickname,
            avatarUrl: data.donorAvatarUrl || data.userAvatar,
          },
          giftName: data.giftName || 'Gift',
          coinValue,
          repeatCount: data.streakCount ?? 1,
          isStreakEnd: data.isComboFinal,
        });
        this.scheduleImmediateSnapshot();
      });

      this.socket.on('game:like', (data: ServerLikePayload) => {
        const nickname = (data.userName || data.uniqueId || '').trim();
        const user =
          data.uniqueId || nickname
            ? {
                id: buildTikTokUserId(data.uniqueId, nickname || 'guest'),
                nickname: nickname || 'Guest',
              }
            : undefined;
        this.processNormalizedEvent({
          type: 'LIKE',
          source: 'REAL',
          timestamp: Date.now(),
          user,
          count: Math.max(1, Number(data.count) || 1),
        });
      });

      this.socket.on('game:join', (data: ServerJoinPayload) => {
        if (data.uniqueId || data.userName) {
          const nickname = (data.userName || data.uniqueId || 'Guest').trim();
          this.processNormalizedEvent({
            type: 'JOIN',
            source: 'REAL',
            timestamp: Date.now(),
            user: {
              id: buildTikTokUserId(data.uniqueId, nickname),
              nickname,
            },
          });
        }
        if (Array.isArray(data.topViewerIds) && data.topViewerIds.length > 0) {
          this.processNormalizedEvent({
            type: 'ROOM_STATS',
            source: 'REAL',
            timestamp: Date.now(),
            viewerCount: data.viewerCount,
            activeUserIds: data.topViewerIds.map((id) => buildTikTokUserId(id, id)),
          });
        }
      });
    } catch (err) {
      console.warn('[DrinkBarCoreReceiver] Socket init warning:', err);
    }
  }

  public processNormalizedEvent(event: NormalizedLiveEvent): void {
    const store = useDrinkBarStore.getState();

    switch (event.type) {
      case 'CHAT': {
        const text = event.cleanText || event.text || '';
        if (!text.trim()) return;
        const user = event.user ?? { id: 'anon_guest', nickname: 'Guest' };
        store.processChat(user, text);
        break;
      }
      case 'LIKE': {
        if (event.user) {
          store.markUsersOnline([normalizeUserId(event.user)]);
        }
        const added = Math.max(1, event.count ?? 1);
        const now = Date.now();
        // Leading-edge immediate reaction: flush first like burst at 0ms, batch rapid follow-up taps within 60ms
        if (this.pendingLikes === 0 && now - this.lastLikeFlushMs >= GAMEPLAY_LIMITS.LIKE_BATCH_INTERVAL_MS) {
          this.lastLikeFlushMs = now;
          store.processLikes(added);
        } else {
          this.pendingLikes += added;
        }
        break;
      }
      case 'JOIN':
      case 'FOLLOW':
      case 'SHARE': {
        if (event.user) {
          store.markUsersOnline([normalizeUserId(event.user)]);
        }
        break;
      }
      case 'ROOM_STATS': {
        if (event.activeUserIds && event.activeUserIds.length > 0) {
          store.markUsersOnline(event.activeUserIds);
        }
        break;
      }
      case 'GIFT': {
        const user = event.user ?? { id: `gift_${Date.now()}`, nickname: 'VIP' };
        const coins = Math.max(1, event.coinValue ?? 1);
        store.processGift(user, coins);
        break;
      }
      default:
        break;
    }
  }
}

function isSyncMessage(value: unknown): value is DrinkBarSyncMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'type' in value &&
      typeof (value as { type: unknown }).type === 'string'
  );
}
