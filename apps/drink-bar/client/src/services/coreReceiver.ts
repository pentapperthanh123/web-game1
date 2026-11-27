import { io, type Socket } from 'socket.io-client';
import { startBackgroundTicker, type BackgroundTickerHandle } from '@shared/backgroundTicker';
import {
  DRINK_BAR_SOCKET_EVENTS,
  DRINK_BAR_SYNC_CHANNEL,
  GAMEPLAY_LIMITS,
} from '@shared/config';
import type { DrinkBarSyncMessage, NormalizedLiveEvent } from '@shared/types';
import { requestBaristaForceSleep } from '../engine/drinkBarLoop';
import { drinkBarTts } from './ttsEngine';
import { useDrinkBarStore } from '../store/drinkBarStore';

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
  streakCount?: number;
  isComboFinal?: boolean;
}

interface ServerLikePayload {
  count?: number;
  userName?: string;
}

const MAX_SEEN_EVENT_IDS = 120;
const SNAPSHOT_PUSH_INTERVAL_MS = 450;

export class DrinkBarCoreReceiver {
  private socket: Socket | null = null;
  private channel: BroadcastChannel | null = null;
  private pendingLikes = 0;
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

    // 3. Batch LIKE ticker (200ms, active even when tab is inactive)
    this.likeBatchTicker = startBackgroundTicker(
      GAMEPLAY_LIMITS.LIKE_BATCH_INTERVAL_MS,
      () => {
        if (this.pendingLikes <= 0) return;
        const count = this.pendingLikes;
        this.pendingLikes = 0;
        useDrinkBarStore.getState().processLikes(count);
      }
    );

    // 4. Periodic snapshot push to Admin (via window.parent & BroadcastChannel)
    this.snapshotTicker = startBackgroundTicker(SNAPSHOT_PUSH_INTERVAL_MS, () => {
      this.broadcastSnapshot();
    });

    // 5. Connect to Core Connect Service (server:4000 via Vite proxy)
    this.connectSocket();
    this.broadcastSnapshot();
  }

  public stop(): void {
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
    origin: 'POST_MESSAGE' | 'BROADCAST' | 'SOCKET'
  ): void {
    if (msg.type === 'REQUEST_SNAPSHOT') {
      this.broadcastSnapshot();
      return;
    }

    if (msg.type === 'RELAY_TTS' && msg.action === 'DONE') {
      drinkBarTts.notifyRelayedSpeechDone(msg.utteranceId);
      return;
    }

    if (
      msg.type === 'STATE_SNAPSHOT' ||
      msg.type === 'RELAY_SFX' ||
      msg.type === 'RELAY_TTS'
    ) {
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
      this.broadcastSnapshot();
      return;
    }

    if (msg.type === 'ADMIN_ACTION') {
      this.applyAdminAction(msg);
      this.broadcastSnapshot();
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
    }
  }

  private broadcastSnapshot(): void {
    const snapshot = useDrinkBarStore.getState().getSnapshot();
    const message: DrinkBarSyncMessage = {
      type: 'STATE_SNAPSHOT',
      snapshot,
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
  }

  private connectSocket(): void {
    try {
      const socketUrl =
        import.meta.env.VITE_SERVER_URL?.trim() ||
        (typeof window !== 'undefined' ? window.location.origin : '');

      this.socket = io(socketUrl, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 15000,
        timeout: 2000,
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
        const nickname = (data.userName || 'Guest').trim();
        if (nickname === 'Hệ Thống') return;
        this.processNormalizedEvent({
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
        const nickname = (data.donorName || data.userName || 'VIP').trim();
        const coinValue = Math.max(1, Number(data.coins ?? data.diamonds ?? 1) || 1);
        this.processNormalizedEvent({
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
        this.processNormalizedEvent({
          type: 'LIKE',
          source: 'REAL',
          timestamp: Date.now(),
          count: Math.max(1, Number(data.count) || 1),
        });
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
        this.pendingLikes += Math.max(1, event.count ?? 1);
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
