import type { ClashMatchState, PushMultipliers, SoundConfig, TeamId, TeamPresetConfig } from './clash';

export type CoreEventType =
  | 'CHAT'
  | 'GIFT'
  | 'LIKE'
  | 'JOIN'
  | 'FOLLOW'
  | 'SHARE'
  | 'ROOM_STATS';

export interface NormalizedViewer {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
}

export interface NormalizedLiveEvent {
  type: CoreEventType;
  platform?: string;
  timestamp: number;
  user?: NormalizedViewer;
  text?: string;
  cleanText?: string;
  giftId?: string | number;
  giftName?: string;
  coinValue?: number;
  repeatCount?: number;
  isStreakEnd?: boolean;
  count?: number;
  team?: TeamId | string;
}

export type AdminActionType =
  | 'START_ROUND'
  | 'PAUSE_ROUND'
  | 'RESET_ROUND'
  | 'RESET_MATCH'
  | 'REBALANCE_50_50'
  | 'DRAMA_BOOST'
  | 'SET_PRESET'
  | 'SET_CUSTOM_PRESET'
  | 'SET_LANGUAGE'
  | 'SET_ROUND_DURATION'
  | 'SET_PUSH_MULTIPLIERS'
  | 'SET_SOUND_CONFIG'
  | 'TEST_SOUND'
  | 'SIMULATE_EVENT';

export interface AdminActionPayload {
  presetId?: string;
  customPreset?: TeamPresetConfig;
  language?: 'EN' | 'VI';
  durationSeconds?: number;
  multipliers?: Partial<PushMultipliers>;
  soundConfig?: Partial<SoundConfig>;
  soundType?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ROUND_END';
  soundTeam?: 'LEFT' | 'RIGHT';
  simulatedEvent?: NormalizedLiveEvent;
}

export type ClashSyncMessage =
  | {
      type: 'LIVE_EVENT';
      event: NormalizedLiveEvent;
      timestamp: number;
    }
  | {
      type: 'ADMIN_ACTION';
      action: AdminActionType;
      payload?: AdminActionPayload;
      timestamp: number;
    }
  | {
      type: 'STATE_SYNC';
      state: Partial<ClashMatchState>;
      timestamp: number;
    };
