import {
  DEMO_VIEWER_NAMES,
} from '@shared/constants/presets';
import { SALON_PORTS, SALON_SYNC_CHANNEL } from '@shared/constants/salonConfig';
import type { NormalizedLiveEvent, SalonSyncMessage } from '@shared/types/events';
import type {
  PreviewPresetKey,
  SalonAdminActionName,
  SalonAdminActionPayload,
  SalonLiveState,
} from '@shared/types/salon';

type SnapshotListener = (snapshot: SalonLiveState) => void;

class SalonAdminEmitter {
  private channel: BroadcastChannel | null = null;
  private previewIframe: HTMLIFrameElement | null = null;
  private snapshotListeners = new Set<SnapshotListener>();

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(SALON_SYNC_CHANNEL);
        this.channel.onmessage = (event: MessageEvent<SalonSyncMessage>) => {
          const msg = event.data;
          if (msg?.type === 'STATE_SNAPSHOT') {
            const snapshot = msg.snapshot;
            this.snapshotListeners.forEach((cb) => cb(snapshot));
          }
        };
      } catch {
        // Fallback silently
      }
    }
  }

  public setPreviewIframe(iframe: HTMLIFrameElement | null): void {
    this.previewIframe = iframe;
  }

  public subscribeSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    this.channel?.postMessage({
      type: 'REQUEST_SNAPSHOT',
      timestamp: Date.now(),
    } satisfies SalonSyncMessage);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  public dispatchLive(message: SalonSyncMessage): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      // Ignore closed channel
    }

    // Also forward to preview iframe when it is mirroring live
    if (this.previewIframe?.contentWindow && message.type !== 'STATE_SNAPSHOT') {
      try {
        this.previewIframe.contentWindow.postMessage(message, '*');
      } catch {
        // Ignore cross-origin frame errors
      }
    }
  }

  public dispatchPreviewOnly(message: SalonSyncMessage): void {
    if (!this.previewIframe?.contentWindow) return;
    try {
      this.previewIframe.contentWindow.postMessage(message, '*');
    } catch {
      // Ignore frame errors
    }
  }

  public emitAdminAction(
    action: SalonAdminActionName,
    payload?: SalonAdminActionPayload,
    target: 'LIVE' | 'PREVIEW' = 'LIVE'
  ): void {
    const msg: SalonSyncMessage = {
      type: 'ADMIN_ACTION',
      action,
      payload,
      target,
      timestamp: Date.now(),
    };
    if (target === 'PREVIEW') {
      this.dispatchPreviewOnly(msg);
    } else {
      this.dispatchLive(msg);
    }
  }

  public emitPreviewPreset(preset: PreviewPresetKey): void {
    this.emitAdminAction('APPLY_PREVIEW_PRESET', { previewPreset: preset }, 'PREVIEW');
  }

  public emitLiveEvent(event: NormalizedLiveEvent): void {
    this.dispatchLive({
      type: 'LIVE_EVENT',
      event,
      target: 'LIVE',
      timestamp: Date.now(),
    });
  }
}

export const salonAdminEmitter = new SalonAdminEmitter();

export function getStageBaseUrl(): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${SALON_PORTS.CLIENT}`;
  }
  const host = window.location.hostname || 'localhost';
  return `${window.location.protocol}//${host}:${SALON_PORTS.CLIENT}`;
}

function randomGuest(): { id: string; nickname: string } {
  const name = DEMO_VIEWER_NAMES[Math.floor(Math.random() * DEMO_VIEWER_NAMES.length)];
  const suffix = Math.floor(10 + Math.random() * 89);
  return {
    id: `sim_${name.toLowerCase().replace(/\s+/g, '_')}_${suffix}`,
    nickname: `${name} ${suffix}`,
  };
}

export function simulateQueueCustomer(source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'): void {
  const user = randomGuest();
  const keywords = ['toc', 'nail', 'cat', 'mong', 'play'];
  const kw = keywords[Math.floor(Math.random() * keywords.length)];
  salonAdminEmitter.emitLiveEvent({
    type: 'CHAT',
    source,
    timestamp: Date.now(),
    user,
    text: `${kw} cho em với!`,
    cleanText: `${kw} cho em với!`,
  });
}

export function simulateSmallGiftVip(source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'): void {
  const user = randomGuest();
  salonAdminEmitter.emitLiveEvent({
    type: 'GIFT',
    source,
    timestamp: Date.now(),
    user,
    giftName: 'Rose',
    coinValue: 1,
    repeatCount: 1,
  });
}

export function simulateMediumTrollGift(source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'): void {
  const user = randomGuest();
  salonAdminEmitter.emitLiveEvent({
    type: 'GIFT',
    source,
    timestamp: Date.now(),
    user,
    giftName: 'Ice Cream',
    coinValue: 10,
    repeatCount: 1,
  });
}

export function simulateLargeRoyalGift(source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'): void {
  const user = randomGuest();
  salonAdminEmitter.emitLiveEvent({
    type: 'GIFT',
    source,
    timestamp: Date.now(),
    user,
    giftName: 'Royal Crown',
    coinValue: 50,
    repeatCount: 1,
  });
}

export function simulateLikeBurst(
  count = 12,
  source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'
): void {
  salonAdminEmitter.emitLiveEvent({
    type: 'LIKE',
    source,
    timestamp: Date.now(),
    count,
  });
}

export function simulateStyleChat(
  customText?: string,
  source: 'SIMULATOR' | 'AUTOBOT' = 'SIMULATOR'
): void {
  const user = randomGuest();
  const styles = ['tóc hồng', 'tóc vàng', 'tóc xoăn', 'tóc ngầu', 'nail xanh', 'nail tím'];
  const text = customText || styles[Math.floor(Math.random() * styles.length)];
  salonAdminEmitter.emitLiveEvent({
    type: 'CHAT',
    source,
    timestamp: Date.now(),
    user,
    text,
    cleanText: text,
  });
}
