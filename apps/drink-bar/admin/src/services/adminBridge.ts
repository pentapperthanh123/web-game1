import { io, type Socket } from 'socket.io-client';
import {
  DEMO_BOT_NAMES,
  DRINK_BAR_PORTS,
  DRINK_BAR_SOCKET_EVENTS,
  GAMEPLAY_LIMITS,
} from '@shared/config';
import { RECIPE_LIST, RECIPE_MAP } from '@shared/recipes';
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

function randomGuestProfile(): ViewerProfile {
  const name = DEMO_BOT_NAMES[Math.floor(Math.random() * DEMO_BOT_NAMES.length)];
  const suffix = Math.floor(10 + Math.random() * 89);
  return {
    id: `guest_${name.toLowerCase().replace(/\s+/g, '_')}_${suffix}`,
    nickname: `${name} ${suffix}`,
  };
}

class DrinkBarAdminBridge {
  private socket: Socket | null = null;
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
          this.latestSnapshot = msg.snapshot;
          this.snapshotListeners.forEach((cb) => cb(msg.snapshot));
        } else if (msg.type === 'RELAY_SFX') {
          sharedSoundEngine.play(msg.kind, msg.tier, msg.danceStyle, msg.pitchScale);
        } else if (msg.type === 'RELAY_TTS') {
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
          transports: ['websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 5000,
          timeout: 2000,
        });

        this.socket.on('tiktok:status', (payload: TikTokStatusPayload) => {
          this.lastStatus = payload;
          this.statusListeners.forEach((cb) => cb(payload));
        });
      } catch {
        // Core server optional during offline local testing
      }
    }
  }

  public stop(): void {
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public setPreviewIframe(iframe: HTMLIFrameElement | null): void {
    this.previewIframe = iframe;
    if (iframe?.contentWindow) {
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

  public subscribeSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
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
    if (this.previewIframe?.contentWindow) {
      try {
        this.previewIframe.contentWindow.postMessage(msg, '*');
      } catch {
        // Ignore cross-frame error
      }
    }

    if (this.socket?.connected) {
      this.socket.emit(DRINK_BAR_SOCKET_EVENTS.SYNC, msg);
    }
  }

  public emitLiveEvent(event: NormalizedLiveEvent): void {
    void sharedSoundEngine.unlock(false);
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
    void sharedSoundEngine.unlock(false);
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

  public async connectTikTok(username: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch('/api/tiktok/connect', {
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
    await fetch('/api/tiktok/disconnect', { method: 'POST' }).catch(() => {});
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
  void sharedTtsPlayer.speak({
    text: msg.text,
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

const MENU_KEYWORDS: readonly string[] = ['matcha', 'tra', 'cafe', 'soda', 'nuocep'];

let botGuestCursor = 0;
let menuRotateCursor = 0;

function nextBotGuestProfile(): ViewerProfile {
  const name = DEMO_BOT_NAMES[botGuestCursor % DEMO_BOT_NAMES.length];
  botGuestCursor += 1;
  return {
    id: `bot_${name.toLowerCase().replace(/\s+/g, '_')}`,
    nickname: name,
  };
}

function pickAvailableMenuKeyword(): string {
  const snapshot = drinkBarAdminBridge.getLatestSnapshot();
  if (!snapshot) {
    const kw = MENU_KEYWORDS[menuRotateCursor % MENU_KEYWORDS.length];
    menuRotateCursor += 1;
    return kw;
  }
  const stocked = RECIPE_LIST.filter((r) => isRecipeAvailable(snapshot.inventory, r.id));
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

export function triggerGiftSmallSimulation(
  source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'
): void {
  const user = randomGuestProfile();
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
  source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'
): void {
  const user = randomGuestProfile();
  const coins = 5 + Math.floor(Math.random() * 15);
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
  source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'
): void {
  const user = randomGuestProfile();
  const coins = 30 + Math.floor(Math.random() * 40);
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
