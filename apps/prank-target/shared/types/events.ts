export type CoreEventType =
  | 'CHAT'
  | 'GIFT'
  | 'LIKE'
  | 'JOIN'
  | 'FOLLOW'
  | 'SHARE'
  | 'ROOM_STATS'
  | 'SESSION_STATUS';

export interface ViewerProfile {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  fansLevel?: number;
}

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

export type AdminDirectActionType =
  | 'TRIGGER_PRANK'
  | 'FORCE_MELTDOWN'
  | 'CLEAN_TARGET'
  | 'RESET_STATE'
  | 'UPDATE_CONFIG'
  | 'REQUEST_SYNC';

export interface AdminDirectActionPayload {
  action?: 'EGG' | 'WIND' | 'BALL' | 'CAKE' | 'MILK' | 'TAUNT' | 'SURPRISE';
  intensity?: number;
  lang?: 'VI' | 'EN';
  micMode?: boolean;
  sfxVolume?: number;
  customKeywords?: Record<string, string[]>;
}

export type PrankSyncMessage =
  | {
      type: 'LIVE_EVENT';
      event: NormalizedLiveEvent;
      timestamp: number;
    }
  | {
      type: 'ADMIN_ACTION';
      action: AdminDirectActionType;
      payload?: AdminDirectActionPayload;
      timestamp: number;
    }
  | {
      type: 'STATE_REPORT';
      state: unknown;
      timestamp: number;
    };
