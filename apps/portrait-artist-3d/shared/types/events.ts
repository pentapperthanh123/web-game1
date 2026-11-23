import type { LiveStudioConfig, PortraitStyle, StudioStateSnapshot, ViewerProfile } from './studio';

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

export type AdminActionName =
  | 'PROMOTE_TO_FRONT'
  | 'SKIP_CURRENT'
  | 'REMOVE_USER'
  | 'TRIGGER_TROLL_NOW'
  | 'SET_ACTIVE_STYLE'
  | 'RESET_SESSION'
  | 'REQUEST_SNAPSHOT';

export interface AdminActionPayload {
  userId?: string;
  style?: PortraitStyle;
}

export type StudioSyncMessage =
  | {
      type: 'LIVE_EVENT';
      event: NormalizedLiveEvent;
      timestamp: number;
    }
  | {
      type: 'ADMIN_ACTION';
      action: AdminActionName;
      payload: AdminActionPayload;
      timestamp: number;
    }
  | {
      type: 'CONFIG_UPDATE';
      config: Partial<LiveStudioConfig>;
      timestamp: number;
    }
  | {
      type: 'STATE_SNAPSHOT';
      snapshot: StudioStateSnapshot;
      timestamp: number;
    }
  | {
      type: 'CLIENT_READY';
      timestamp: number;
    };
