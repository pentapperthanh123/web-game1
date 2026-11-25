import type {
  SalonAdminActionName,
  SalonAdminActionPayload,
  SalonLiveState,
  ViewerProfile,
} from './salon.js';

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
  source?: 'REAL' | 'SIMULATOR' | 'AUTOBOT';
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
  viewerCount?: number;
}

export type TikTokConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface TikTokStatusPayload {
  status: TikTokConnectionState;
  username: string;
  error?: string;
  attempt?: number;
  nextRetryAt?: number | null;
  roomId?: string;
}

export type SalonSyncMessage =
  | {
      type: 'LIVE_EVENT';
      event: NormalizedLiveEvent;
      timestamp: number;
      target?: 'LIVE' | 'PREVIEW';
    }
  | {
      type: 'ADMIN_ACTION';
      action: SalonAdminActionName;
      payload?: SalonAdminActionPayload;
      timestamp: number;
      target?: 'LIVE' | 'PREVIEW';
    }
  | {
      type: 'STATE_SNAPSHOT';
      snapshot: SalonLiveState;
      timestamp: number;
    }
  | {
      type: 'REQUEST_SNAPSHOT';
      timestamp: number;
    };
