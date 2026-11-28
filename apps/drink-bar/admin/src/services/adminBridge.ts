import { io, type Socket } from 'socket.io-client';
import {
  DEMO_BOT_NAMES,
  DRINK_BAR_LOCAL_SYNC_ENDPOINTS,
  DRINK_BAR_PORTS,
  DRINK_BAR_SOCKET_EVENTS,
  GAMEPLAY_LIMITS,
  TIKTOK_API_ENDPOINTS,
} from '@shared/config';
import { MENU_RECIPE_LIST, RECIPE_MAP } from '@shared/recipes';
import { isRecipeAvailable } from '@shared/inventory';
import { sharedSoundEngine } from '@shared/soundEngine';
import { sharedTtsPlayer } from '@shared/ttsPlayer';
import type {
  DanceStyle,
  DrinkBarAdminActionName,
  DrinkBarAdminActionPayload,
  DrinkBarLiveState,
  DrinkBarSyncMessage,
  GiftTier,
  IceLevel,
  NormalizedLiveEvent,
  RecipeId,
  TikTokCheckResult,
  TikTokStatusPayload,
  ViewerProfile,
} from '@shared/types';

type SnapshotListener = (snapshot: DrinkBarLiveState) => void;
type StatusListener = (status: TikTokStatusPayload) => void;

let syncSeq = 0;

function createEventId(prefix: string): string {
  syncSeq += 1;
  return `${prefix}_${Date.now()}_${syncSeq}`;
}

const SIM_AVATAR_BG_LIST = 'ffd5dc,d1d4f9,c0aede,b6e3f4,ffdfbf';

function buildViewerAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${SIM_AVATAR_BG_LIST}`;
}

function randomGuestProfile(): ViewerProfile {
  const name = DEMO_BOT_NAMES[Math.floor(Math.random() * DEMO_BOT_NAMES.length)];
  const suffix = Math.floor(10 + Math.random() * 89);
  const nickname = `${name} ${suffix}`;
  return {
    id: `guest_${name.toLowerCase().replace(/\s+/g, '_')}_${suffix}`,
    nickname,
    avatarUrl: buildViewerAvatarUrl(nickname),
  };
}

class DrinkBarAdminBridge {
  private socket: Socket | null = null;
  private eventSource: EventSource | null = null;
  private previewIframe: HTMLIFrameElement | null = null;
  private messageHandler: ((event: MessageEvent<unknown>) => void) | null = null;
  private readonly snapshotListeners = new Set<SnapshotListener>();
  private readonly statusListeners = new Set<StatusListener>();
  private latestSnapshot: DrinkBarLiveState | null = null;
  private lastStatus: TikTokStatusPayload = {
    status: 'DISCONNECTED',
    username: '',
  };

  public getLatestSnapshot(): DrinkBarLiveState | null {
    return this.latestSnapshot;
  }

  public start(): void {
    if (typeof window !== 'undefined' && !this.messageHandler) {
      this.messageHandler = (event: MessageEvent<unknown>) => {
        const data = event.data;
        if (!data || typeof data !== 'object' || !('type' in data)) return;
        const msg = data as DrinkBarSyncMessage;
        if (msg.type === 'STATE_SNAPSHOT') {
          this.acceptIncomingSnapshot(msg.snapshot);
        } else if (msg.type === 'RELAY_SFX') {
          if (!this.previewIframe) return;
          sharedSoundEngine.play(msg.kind, msg.tier, msg.danceStyle, msg.pitchScale);
        } else if (msg.type === 'RELAY_TTS') {
          if (!this.previewIframe) return;
          handleRelayedTts(msg, (utteranceId) => {
            if (this.previewIframe?.contentWindow) {
              try {
                this.previewIframe.contentWindow.postMessage(
                  {
                    type: 'RELAY_TTS',
                    action: 'DONE',
                    utteranceId,
                    timestamp: Date.now(),
                  } satisfies DrinkBarSyncMessage,
                  '*'
                );
              } catch {
                // Ignore cross-frame error
              }
            }
          });
        }
      };
      window.addEventListener('message', this.messageHandler);
    }

    if (!this.socket) {
      try {
        const serverOrigin =
          import.meta.env.VITE_SERVER_URL?.trim() ||
          (typeof window !== 'undefined' ? window.location.origin : '');
    this.socket = io(serverOrigin, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 800,
          reconnectionDelayMax: 3000,
          timeout: 2500,
        });

        this.socket.on('tiktok:status', (payload: TikTokStatusPayload) => {
          this.lastStatus = payload;
          this.statusListeners.forEach((cb) => cb(payload));
        });

        this.socket.on(DRINK_BAR_SOCKET_EVENTS.SYNC, (raw: unknown) => {
          if (!raw || typeof raw !== 'object' || !('type' in raw)) return;
          const msg = raw as DrinkBarSyncMessage;
          if (msg.type === 'STATE_SNAPSHOT') {
            this.acceptIncomingSnapshot(msg.snapshot);
          }
        });
      } catch {
        // Core server optional during offline local testing
      }
    }

    if (typeof EventSource !== 'undefined' && !this.eventSource) {
      try {
        const clientHubEventsUrl = `${getClientStageUrl(false)}${DRINK_BAR_LOCAL_SYNC_ENDPOINTS.EVENTS}`;
        this.eventSource = new EventSource(clientHubEventsUrl);
        this.eventSource.onmessage = (ev: MessageEvent<string>) => {
          try {
            const parsed = JSON.parse(ev.data) as DrinkBarSyncMessage;
            if (parsed.type === 'STATE_SNAPSHOT') {
              this.acceptIncomingSnapshot(parsed.snapshot);
            }
          } catch {
            // Ignore malformed SSE message
          }
        };
      } catch {
        // Ignore SSE init warning
      }
    }
  }

  public stop(): void {
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
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

  public setPreviewIframe(iframe: HTMLIFrameElement | null): void {
    this.previewIframe = iframe;
    if (!iframe) {
      sharedTtsPlayer.stopAll();
      return;
    }
    if (iframe.contentWindow) {
      if (this.latestSnapshot) {
        try {
          iframe.contentWindow.postMessage(
            {
              type: 'STATE_SNAPSHOT',
              snapshot: this.latestSnapshot,
              timestamp: Date.now(),
            } satisfies DrinkBarSyncMessage,
            '*'
          );
        } catch {
          // Ignore cross-frame timing error
        }
      }
      this.requestSnapshot();
    }
  }

  public requestSnapshot(): void {
    if (!this.previewIframe?.contentWindow) return;
    try {
      this.previewIframe.contentWindow.postMessage(
        { type: 'REQUEST_SNAPSHOT', timestamp: Date.now() } satisfies DrinkBarSyncMessage,
        '*'
      );
    } catch {
      // Ignore frame timing error
    }
  }

  private acceptIncomingSnapshot(incoming: DrinkBarLiveState): void {
    const curr = this.latestSnapshot;
    if (curr) {
      const currEpoch = curr.resetEpoch ?? 0;
      const incomingEpoch = incoming.resetEpoch ?? 0;
      if (incomingEpoch < currEpoch) {
        return;
      }
      if (incomingEpoch === currEpoch && incoming.todayDoneCount < curr.todayDoneCount) {
        return;
      }
    }
    this.latestSnapshot = incoming;
    this.snapshotListeners.forEach((cb) => cb(incoming));
  }

  public subscribeSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    if (this.latestSnapshot) {
      listener(this.latestSnapshot);
    }
    this.requestSnapshot();
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  public subscribeTikTokStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.lastStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private dispatchSync(msg: DrinkBarSyncMessage): void {
    // 1. Direct postMessage to embedded Mirror Preview iframe (:8070?mirror=1)
    if (this.previewIframe?.contentWindow) {
      try {
        this.previewIframe.contentWindow.postMessage(msg, '*');
      } catch {
        // Ignore cross-frame error
      }
    }

    // 2. Socket.IO relay via Core Connect server (:4000) when running
    if (this.socket?.connected) {
      this.socket.emit(DRINK_BAR_SOCKET_EVENTS.SYNC, msg);
    }

    // 3. Built-in Vite HTTP/SSE Hub relay on Client Stage (:8070) — syncs all standalone :8070 tabs & OBS browser sources even when Preview is hidden!
    if (typeof fetch !== 'undefined') {
      const clientHubEmitUrl = `${getClientStageUrl(false)}${DRINK_BAR_LOCAL_SYNC_ENDPOINTS.EMIT}`;
      void fetch(clientHubEmitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      }).catch(() => {});
    }
  }

  public emitLiveEvent(event: NormalizedLiveEvent): void {
    if (this.previewIframe) {
      void sharedSoundEngine.unlock(false);
    }
    this.dispatchSync({
      type: 'LIVE_EVENT',
      eventId: createEventId('ev'),
      event,
      timestamp: Date.now(),
    });
  }

  public syncLocalAudioConfig(payload: DrinkBarAdminActionPayload): void {
    if (typeof payload.sfxEnabled === 'boolean') {
      sharedSoundEngine.setSfxEnabled(payload.sfxEnabled);
    }
    if (typeof payload.sfxMusicEnabled === 'boolean') {
      sharedSoundEngine.setMusicEnabled(payload.sfxMusicEnabled);
    }
    if (typeof payload.bgmEnabled === 'boolean') {
      sharedSoundEngine.setBgmEnabled(payload.bgmEnabled);
    }
    if (typeof payload.ttsEnabled === 'boolean' && !payload.ttsEnabled) {
      sharedTtsPlayer.stopAll();
    }
    if (typeof payload.masterVolume === 'number') {
      sharedSoundEngine.setMasterVolume(payload.masterVolume);
    }
    if (typeof payload.micMode === 'boolean') {
      sharedSoundEngine.setMicMode(payload.micMode);
    }
  }

  public emitAdminAction(
    action: DrinkBarAdminActionName,
    payload?: DrinkBarAdminActionPayload
  ): void {
    if (this.previewIframe) {
      void sharedSoundEngine.unlock(false);
    }
    if (payload) {
      this.syncLocalAudioConfig(payload);
    }
    this.dispatchSync({
      type: 'ADMIN_ACTION',
      eventId: createEventId('act'),
      action,
      payload,
      timestamp: Date.now(),
    });
  }

  public syncConfigToPreviewOnly(
    action: DrinkBarAdminActionName,
    payload: DrinkBarAdminActionPayload
  ): void {
    this.syncLocalAudioConfig(payload);
    if (!this.previewIframe?.contentWindow) return;
    try {
      this.previewIframe.contentWindow.postMessage(
        {
          type: 'ADMIN_ACTION',
          eventId: createEventId('init'),
          action,
          payload,
          timestamp: Date.now(),
        } satisfies DrinkBarSyncMessage,
        '*'
      );
    } catch {
      // Ignore frame timing error
    }
  }

  public async checkTikTok(username?: string): Promise<TikTokCheckResult> {
    const res = await fetch(TIKTOK_API_ENDPOINTS.CHECK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      throw new Error(
        body.message || body.error || `HTTP ${res.status}: Không thể kiểm tra TikTok Connector`
      );
    }
    return (await res.json()) as TikTokCheckResult;
  }

  public async connectTikTok(username: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(TIKTOK_API_ENDPOINTS.CONNECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error };
    }
    return { ok: true };
  }

  public async disconnectTikTok(): Promise<void> {
    await fetch(TIKTOK_API_ENDPOINTS.DISCONNECT, { method: 'POST' }).catch(() => {});
  }
}

function handleRelayedTts(
  msg: Extract<DrinkBarSyncMessage, { type: 'RELAY_TTS' }>,
  onDone?: (utteranceId?: number) => void
): void {
  if (msg.action === 'CANCEL') {
    sharedTtsPlayer.stopAll();
    return;
  }
  if (msg.action === 'DONE' || !msg.text) return;
  // Interrupt any previous relayed speech immediately so Admin voice matches current live action at 0ms!
  sharedTtsPlayer.stopAll();
  void sharedTtsPlayer.speak({
    text: msg.text,
    fallbackTexts: msg.fallbackTexts,
    language: msg.language ?? 'VI',
    rate: msg.rate ?? GAMEPLAY_LIMITS.TTS_RATE,
    pitch: msg.pitch ?? GAMEPLAY_LIMITS.TTS_PITCH,
    volume: msg.volume ?? GAMEPLAY_LIMITS.NORMAL_VOLUME_GAIN,
    allowIframeRelay: false,
    onFinish: () => {
      onDone?.(msg.utteranceId);
    },
  });
}

export const drinkBarAdminBridge = new DrinkBarAdminBridge();

export function getClientStageUrl(isMirror = false): string {
  const base =
    typeof window === 'undefined'
      ? `http://localhost:${DRINK_BAR_PORTS.CLIENT}`
      : `${window.location.protocol}//${window.location.hostname || 'localhost'}:${DRINK_BAR_PORTS.CLIENT}`;
  return isMirror ? `${base}?mirror=1` : base;
}

const MENU_KEYWORDS: readonly string[] = [
  'matcha',
  'trà sữa',
  'tradao',
  'trachanh',
  'cafe',
  'cacao',
  'soda',
  'nuocep',
];

let botGuestCursor = 0;
let menuRotateCursor = 0;

function nextBotGuestProfile(): ViewerProfile {
  const name = DEMO_BOT_NAMES[botGuestCursor % DEMO_BOT_NAMES.length];
  botGuestCursor += 1;
  return {
    id: `bot_${name.toLowerCase().replace(/\s+/g, '_')}`,
    nickname: name,
    avatarUrl: buildViewerAvatarUrl(name),
  };
}

function pickAvailableMenuKeyword(): string {
  const snapshot = drinkBarAdminBridge.getLatestSnapshot();
  if (!snapshot) {
    const kw = MENU_KEYWORDS[menuRotateCursor % MENU_KEYWORDS.length];
    menuRotateCursor += 1;
    return kw;
  }
  const stocked = MENU_RECIPE_LIST.filter((r) => isRecipeAvailable(snapshot.inventory, r.id));
  if (stocked.length === 0) {
    const kw = MENU_KEYWORDS[menuRotateCursor % MENU_KEYWORDS.length];
    menuRotateCursor += 1;
    return kw;
  }
  const chosen = stocked[menuRotateCursor % stocked.length];
  menuRotateCursor += 1;
  return chosen.botKeyword;
}

const ICE_CHAT_MODIFIER_MAP: Record<IceLevel, string> = {
  NORMAL: '',
  LESS: ' it da',
  EXTRA: ' nhieu da',
  NONE: ' khong da',
};

export function triggerSpecificOrderSimulation(
  recipeId: RecipeId,
  iceLevel: IceLevel = 'NORMAL',
  source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'
): void {
  const user = source === 'AUTOBOT' ? nextBotGuestProfile() : randomGuestProfile();
  const baseKw = RECIPE_MAP[recipeId].botKeyword;
  const text = `${baseKw}${ICE_CHAT_MODIFIER_MAP[iceLevel]}`;
  drinkBarAdminBridge.emitLiveEvent({
    type: 'CHAT',
    source,
    timestamp: Date.now(),
    user,
    text,
    cleanText: text,
  });
}

export function triggerCustomChatSimulation(
  nickname: string,
  commentText: string,
  avatarUrl?: string
): void {
  const cleanComment = commentText.trim();
  if (!cleanComment) return;
  const cleanName = nickname.trim() || 'Minh Anh';
  const userId = `viewer_${cleanName.toLowerCase().replace(/\s+/g, '_')}`;
  const resolvedAvatar = avatarUrl?.trim() || buildViewerAvatarUrl(cleanName);
  drinkBarAdminBridge.emitLiveEvent({
    type: 'CHAT',
    source: 'SIMULATOR',
    timestamp: Date.now(),
    user: {
      id: userId,
      nickname: cleanName,
      avatarUrl: resolvedAvatar,
    },
    text: cleanComment,
    cleanText: cleanComment,
  });
}

export function triggerOrderSimulation(source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'): void {
  const user = source === 'AUTOBOT' ? nextBotGuestProfile() : randomGuestProfile();
  const keyword = pickAvailableMenuKeyword();
  drinkBarAdminBridge.emitLiveEvent({
    type: 'CHAT',
    source,
    timestamp: Date.now(),
    user,
    text: keyword,
    cleanText: keyword,
  });
}

export function triggerFlavorChatSimulation(
  source: 'SIMULATOR' | 'AUTOBOT' = 'AUTOBOT'
): void {
  const user = nextBotGuestProfile();
  const keyword = pickAvailableMenuKeyword();
  const modifiers = ['', '', ' it duong', ' nhieu da'];
  const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
  const text = `${keyword}${mod}`;
  drinkBarAdminBridge.emitLiveEvent({
    type: 'CHAT',
    source,
    timestamp: Date.now(),
    user,
    text,
    cleanText: text,
  });
}

export function triggerJumpBrewStep(progress: number): void {
  drinkBarAdminBridge.emitAdminAction('SET_BREW_PROGRESS', {
    progress,
  });
}

export function triggerTikTokDanceTest(
  danceTier: GiftTier = 'LARGE',
  danceStyle?: DanceStyle
): void {
  drinkBarAdminBridge.emitAdminAction('TRIGGER_TIKTOK_DANCE', {
    danceTier,
    danceStyle,
  });
}

export function triggerLikeSimulation(
  count = 8,
  source: 'SIMULATOR' | 'AUTOBOT' = 'AUTOBOT'
): void {
  drinkBarAdminBridge.emitLiveEvent({
    type: 'LIKE',
    source,
    timestamp: Date.now(),
    count,
  });
}

function pickGiftDonorProfile(
  source: 'SIMULATOR' | 'AUTOBOT',
  preferredName?: string
): ViewerProfile {
  const snapshot = drinkBarAdminBridge.getLatestSnapshot();
  const cleanPreferred = preferredName?.trim().toLowerCase() ?? '';

  if (snapshot) {
    const candidates: ViewerProfile[] = [
      ...(snapshot.activeDrink ? [snapshot.activeDrink.user] : []),
      ...snapshot.vipQueue.map((o) => o.user),
      ...snapshot.normalQueue.map((o) => o.user),
    ];

    if (cleanPreferred) {
      const matched = candidates.find(
        (u) => u.nickname.trim().toLowerCase() === cleanPreferred
      );
      if (matched) {
        return matched;
      }
    }

    // Upgrade the customer already at the counter/queue instead of spawning a stranger into VIP
    if (snapshot.activeDrink) {
      return snapshot.activeDrink.user;
    }
    if (snapshot.normalQueue.length > 0) {
      return snapshot.normalQueue[0].user;
    }
    if (snapshot.vipQueue.length > 0) {
      return snapshot.vipQueue[0].user;
    }
  }

  return source === 'AUTOBOT' ? nextBotGuestProfile() : randomGuestProfile();
}

export function triggerGiftSmallSimulation(
  source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR',
  preferredName?: string
): void {
  const user = pickGiftDonorProfile(source, preferredName);
  const coins = 1 + Math.floor(Math.random() * 4);
  drinkBarAdminBridge.emitLiveEvent({
    type: 'GIFT',
    source,
    timestamp: Date.now(),
    user,
    giftName: 'Rose',
    coinValue: coins,
    repeatCount: 1,
  });
}

export function triggerGiftMediumSimulation(
  source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR',
  preferredName?: string
): void {
  const user = pickGiftDonorProfile(source, preferredName);
  const coins = 5 + Math.floor(Math.random() * 5);
  drinkBarAdminBridge.emitLiveEvent({
    type: 'GIFT',
    source,
    timestamp: Date.now(),
    user,
    giftName: 'Glow Cup Gift',
    coinValue: coins,
    repeatCount: 1,
  });
}

export function triggerGiftLargeSimulation(
  source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR',
  preferredName?: string
): void {
  const user = pickGiftDonorProfile(source, preferredName);
  const coins = 10 + Math.floor(Math.random() * 25);
  drinkBarAdminBridge.emitLiveEvent({
    type: 'GIFT',
    source,
    timestamp: Date.now(),
    user,
    giftName: 'Signature Crown',
    coinValue: coins,
    repeatCount: 1,
  });
}
