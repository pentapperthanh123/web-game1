import { io, type Socket } from 'socket.io-client';
import { CAFE_PORTS, CAFE_SYNC_CHANNEL } from '@shared/constants/cafeConfig';
import type { AdminActionName, AdminActionPayload } from '@shared/types/cafe';
import type { CyberCafeSyncMessage, NormalizedLiveEvent } from '@shared/types/events';

let channel: BroadcastChannel | null = null;
if (typeof BroadcastChannel !== 'undefined') {
  try {
    channel = new BroadcastChannel(CAFE_SYNC_CHANNEL);
  } catch {
    // Ignore fallback
  }
}

let socket: Socket | null = null;
try {
  socket = io(`http://localhost:${CAFE_PORTS.GATEWAY}`, {
    transports: ['websocket', 'polling'],
    autoConnect: false,
  });
} catch {
  // Ignore fallback
}

export function dispatchSyncMessage(message: CyberCafeSyncMessage): void {
  // 1. BroadcastChannel (inter-tab communication)
  try {
    channel?.postMessage(message);
  } catch (err) {
    console.warn('[AdminEmitter] BroadcastChannel error:', err);
  }

  // 2. Broadcast to embedded iframes
  if (typeof document !== 'undefined') {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(message, '*');
      } catch {
        // Ignore cross-origin frame errors
      }
    });
  }

  // 3. Broadcast to window / opener
  if (typeof window !== 'undefined') {
    try {
      window.postMessage(message, '*');
      if (window.opener) {
        window.opener.postMessage(message, '*');
      }
    } catch {
      // Ignore
    }
  }

  // 4. Socket.io if connected
  if (socket && socket.connected) {
    socket.emit('game:action', message);
  }
}

export function emitAdminAction(action: AdminActionName, payload?: AdminActionPayload): void {
  dispatchSyncMessage({
    type: 'ADMIN_ACTION',
    action,
    payload,
    timestamp: Date.now(),
  });
}

export function emitLiveEvent(event: NormalizedLiveEvent): void {
  dispatchSyncMessage({
    type: 'LIVE_EVENT',
    event,
    timestamp: Date.now(),
  });
}

export function emitSetAutoBot(enabled: boolean, mode: 'CHILL' | 'CHAOS' | 'RANK_RUSH' = 'CHILL'): void {
  emitAdminAction('SET_AUTOBOT', {
    autoBotEnabled: enabled,
    autoBotMode: mode,
  });
}

export function simulateChat(nickname: string, text: string): void {
  emitLiveEvent({
    type: 'CHAT',
    timestamp: Date.now(),
    user: {
      id: `sim_${nickname.toLowerCase().replace(/\s+/g, '_')}`,
      nickname,
    },
    text,
    cleanText: text,
  });
}

export function simulateGift(nickname: string, coinValue: number, giftName: string): void {
  emitLiveEvent({
    type: 'GIFT',
    timestamp: Date.now(),
    user: {
      id: `sim_gift_${nickname.toLowerCase().replace(/\s+/g, '_')}`,
      nickname,
      isVip: coinValue >= 5,
    },
    coinValue,
    giftName,
  });
}

export function simulateLike(count = 10): void {
  emitLiveEvent({
    type: 'LIKE',
    timestamp: Date.now(),
    count,
  });
}
