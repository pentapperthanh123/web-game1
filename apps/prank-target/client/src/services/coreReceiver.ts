import { io, type Socket } from 'socket.io-client';
import {
  DEFAULT_KEYWORD_MAP,
  PERFORMANCE_3D_LIMITS,
  PRANK_PORTS,
  PRANK_SYNC_CHANNEL,
} from '@shared/constants/prankConfig';
import { ACTION_GIFT_RULES } from '@shared/actions';
import type { NormalizedLiveEvent, PrankSyncMessage } from '@shared/types/events';
import type { PrankActionType } from '@shared/types/prank';
import { usePrankStore } from '../store/prankStore';

export type OnPrankTriggerCallback = (
  action: PrankActionType,
  initiatorName: string,
  avatarUrl?: string,
  coins?: number
) => void;

export class CoreReceiver {
  private socket: Socket | null = null;
  private channel: BroadcastChannel | null = null;
  private triggerCallback: OnPrankTriggerCallback | null = null;
  private cleanCallback: (() => void) | null = null;

  // Rate limiting / Anti-spam cooldown per user
  private readonly userCooldowns = new Map<string, number>();

  // Like batching accumulator
  private pendingLikeCount = 0;
  private likeBatchTimer: ReturnType<typeof setInterval> | null = null;

  // Active keyword map (can be updated from Admin)
  private keywordMap: Record<PrankActionType, string[]> = { ...DEFAULT_KEYWORD_MAP };

  constructor(private readonly gatewayUrl = `http://localhost:${PRANK_PORTS.GATEWAY}`) {}

  public setTriggerCallback(cb: OnPrankTriggerCallback): void {
    this.triggerCallback = cb;
  }

  public setCleanCallback(cb: () => void): void {
    this.cleanCallback = cb;
  }

  public setKeywordMap(map: Record<PrankActionType, string[]>): void {
    this.keywordMap = map;
  }

  public start(): void {
    // 1. Initialize BroadcastChannel for local Admin sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(PRANK_SYNC_CHANNEL);
        this.channel.onmessage = (event: MessageEvent<PrankSyncMessage>) => {
          this.handleSyncMessage(event.data);
        };
      } catch (err) {
        console.warn('[CoreReceiver] BroadcastChannel not supported or failed:', err);
      }
    }

    // 2. Window postMessage listener (for iframes/popups)
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data && typeof event.data === 'object' && 'type' in event.data) {
          this.handleSyncMessage(event.data as PrankSyncMessage);
        }
      });
    }

    // 3. Like batching timer (every 200ms)
    let communityLikeAccumulator = 0;

    this.likeBatchTimer = setInterval(() => {
      if (this.pendingLikeCount > 0) {
        const count = this.pendingLikeCount;
        this.pendingLikeCount = 0;
        communityLikeAccumulator += count;

        // +0.5% per 10 likes into rageMeter
        const rageToAdd = (count / 10) * PERFORMANCE_3D_LIMITS.LIKE_RAGE_GAIN_PER_10;
        usePrankStore.getState().addRage(rageToAdd);

        // Every 50 community likes triggers a random prank
        if (communityLikeAccumulator >= PERFORMANCE_3D_LIMITS.LIKE_THRESHOLD_RANDOM_PRANK && this.triggerCallback) {
          communityLikeAccumulator %= PERFORMANCE_3D_LIMITS.LIKE_THRESHOLD_RANDOM_PRANK;
          const actions: PrankActionType[] = ['EGG', 'BALL', 'WIND', 'MILK', 'CAKE'];
          const randomAction = actions[Math.floor(Math.random() * actions.length)];
          this.triggerCallback(randomAction, 'TikTok Viewers ❤️');
        }
      }
    }, PERFORMANCE_3D_LIMITS.LIKE_BATCH_INTERVAL_MS);

    // 4. Socket.IO connection to Live Gateway or Core Server
    this.connectSocket();
  }

  private connectSocket(): void {
    try {
      this.socket = io(this.gatewayUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 15,
        reconnectionDelay: 1500,
      });

      this.socket.on('connect', () => {
        console.log('[CoreReceiver] Connected to Core Live Gateway at', this.gatewayUrl);
      });

      // Canonical event stream
      this.socket.on('live:event', (event: NormalizedLiveEvent) => {
        this.processLiveEvent(event);
      });

      // Legacy fallback channels (port 4000)
      this.socket.on('game:chat', (data: { userName: string; text: string; userAvatar?: string }) => {
        this.processLiveEvent({
          type: 'CHAT',
          timestamp: Date.now(),
          user: {
            id: data.userName,
            username: data.userName,
            nickname: data.userName,
            avatarUrl: data.userAvatar,
          },
          text: data.text,
        });
      });

      this.socket.on(
        'game:gift',
        (data: { donorName: string; donorAvatarUrl?: string; giftName: string; coins: number }) => {
          this.processLiveEvent({
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
          });
        }
      );

      this.socket.on('game:like', (data: { count?: number }) => {
        this.pendingLikeCount += data.count || 1;
      });
    } catch (err) {
      console.warn('[CoreReceiver] Socket connection error:', err);
    }
  }

  public processLiveEvent(event: NormalizedLiveEvent): void {
    switch (event.type) {
      case 'CHAT':
        this.handleChatEvent(event);
        break;
      case 'GIFT':
        this.handleGiftEvent(event);
        break;
      case 'LIKE':
        this.pendingLikeCount += event.count || 1;
        break;
      case 'JOIN':
        // Mild passive activity
        break;
    }
  }

  private handleChatEvent(event: NormalizedLiveEvent): void {
    const rawText = (event.text || event.cleanText || '').toLowerCase().trim();
    if (!rawText) return;

    const username = event.user?.nickname || event.user?.username || 'Viewer';
    const userId = event.user?.id || username;

    // Cooldown check per user to prevent single-user flooding
    const now = Date.now();
    const lastUserAction = this.userCooldowns.get(userId) || 0;
    if (now - lastUserAction < PERFORMANCE_3D_LIMITS.CHAT_COOLDOWN_PER_USER_MS) {
      return;
    }

    // Match action from keywords
    let matchedAction: PrankActionType | null = null;
    for (const [action, keywords] of Object.entries(this.keywordMap)) {
      if (keywords.some((kw) => rawText.includes(kw.toLowerCase()))) {
        matchedAction = action as PrankActionType;
        break;
      }
    }

    if (matchedAction && this.triggerCallback) {
      this.userCooldowns.set(userId, now);
      const rule = ACTION_GIFT_RULES[matchedAction];
      const rageDelta = rule ? rule.rageGain : 8;

      if (matchedAction === 'TAUNT') {
        // Taunt immediately boosts rage and plays taunt sound without projectile
        usePrankStore.getState().addRage(rageDelta);
        usePrankStore.getState().setExpression('FURIOUS');
        setTimeout(() => {
          usePrankStore.getState().setExpression('IDLE');
        }, 1000);
      } else {
        this.triggerCallback(matchedAction, username, event.user?.avatarUrl, 1);
        usePrankStore.getState().addRage(rageDelta);
      }
    }
  }

  private handleGiftEvent(event: NormalizedLiveEvent): void {
    const username = event.user?.nickname || event.user?.username || 'Generous Pranker';
    const coins = Math.max(1, event.coinValue || 1);
    const avatarUrl = event.user?.avatarUrl;

    if (!this.triggerCallback) return;

    if (coins >= 30) {
      // Large gift (30+ coins): Chaos Shower (rain 6 random items across 4 seconds per spec)
      usePrankStore.getState().triggerMeltdown();
      const actions: PrankActionType[] = ['EGG', 'CAKE', 'BALL', 'MILK', 'WIND'];
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const act = actions[Math.floor(Math.random() * actions.length)];
          this.triggerCallback?.(act, username, avatarUrl, Math.floor(coins / 6));
        }, i * 650);
      }
    } else if (coins >= 5) {
      // Medium gift (5-29 coins): Combo Bựa (3-4 items rapid sequence)
      usePrankStore.getState().addRage(25);
      const actions: PrankActionType[] = ['EGG', 'CAKE', 'BALL', 'MILK'];
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const act = actions[Math.floor(Math.random() * actions.length)];
          this.triggerCallback?.(act, username, avatarUrl, Math.floor(coins / 3));
        }, i * 380);
      }
    } else {
      // Small gift (1-4 coins): Single fast prank + avatar announcement
      const smallAction: PrankActionType = coins === 3 ? 'CAKE' : coins === 2 ? 'MILK' : 'EGG';
      const rageDelta = ACTION_GIFT_RULES[smallAction]?.rageGain || 8;
      usePrankStore.getState().addRage(rageDelta);
      this.triggerCallback(smallAction, username, avatarUrl, coins);
    }
  }

  private handleSyncMessage(msg: PrankSyncMessage): void {
    if (msg.type === 'LIVE_EVENT') {
      this.processLiveEvent(msg.event);
    } else if (msg.type === 'ADMIN_ACTION') {
      const { action, payload } = msg;
      const store = usePrankStore.getState();

      switch (action) {
        case 'TRIGGER_PRANK':
          if (payload?.action && this.triggerCallback) {
            this.triggerCallback(payload.action, 'Host Admin', undefined, 1);
          }
          break;
        case 'FORCE_MELTDOWN':
          store.triggerMeltdown();
          break;
        case 'CLEAN_TARGET':
          store.cleanTarget();
          this.cleanCallback?.();
          break;
        case 'RESET_STATE':
          store.resetSession();
          this.cleanCallback?.();
          break;
        case 'UPDATE_CONFIG':
          if (payload?.lang) store.setLanguage(payload.lang);
          if (payload?.micMode !== undefined) store.setMicMode(payload.micMode);
          if (payload?.sfxVolume !== undefined) store.setSfxVolume(payload.sfxVolume);
          if (payload?.customKeywords) this.setKeywordMap(payload.customKeywords);
          break;
      }
    }
  }

  public destroy(): void {
    if (this.likeBatchTimer) clearInterval(this.likeBatchTimer);
    this.channel?.close();
    this.socket?.disconnect();
  }
}
