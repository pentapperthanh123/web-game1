import type { AdminActionName, AdminActionPayload, CafeLiveState, ViewerProfile } from './cafe.js';

export type CoreEventType =
  | 'CHAT'
  | 'GIFT'
  | 'LIKE'
  | 'JOIN'
  | 'FOLLOW'
  | 'SHARE'
  | 'ROOM_STATS'
  | 'SESSION_STATUS';

export interface NormalizedLiveEvent {
  type: CoreEventType;
  platform?: string;
  timestamp: number;
  user?: ViewerProfile;
  text?: string;
  cleanText?: string;
  giftId?: string | number;
  giftName?: string;
  coinValue?: number;
  repeatCount?: number;
  isStreakEnd?: boolean;
  count?: number;
}

export type CyberCafeSyncMessage =
  | {
      type: 'LIVE_EVENT';
      event: NormalizedLiveEvent;
      timestamp: number;
    }
  | {
      type: 'ADMIN_ACTION';
      action: AdminActionName;
      payload?: AdminActionPayload;
      timestamp: number;
    }
  | {
      type: 'STATE_SNAPSHOT';
      snapshot: CafeLiveState;
      timestamp: number;
    }
  | {
      type: 'PLAY_SFX';
      sfx: string;
      timestamp: number;
    };
