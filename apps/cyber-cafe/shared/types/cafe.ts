export type LanguageMode = 'VI' | 'EN';

export type PlayerStatus =
  | 'IDLE'
  | 'PLAYING'
  | 'STUDYING_NUP'
  | 'BSOD_ERROR'
  | 'MOM_BUSTED'
  | 'POWER_CUT';

export interface ViewerProfile {
  id: string;
  nickname: string;
  uniqueId?: string;
  avatarUrl?: string;
  isVip?: boolean;
}

export interface PlayerSession {
  user: ViewerProfile;
  timeRemainingSec: number;
  totalTimePlayedSec: number;
  rankScore: number;
  status: PlayerStatus;
  isNoodleBuffActive: boolean;
  noodleBuffExpiresAt: number;
  lastActionTimestamp: number;
}

export type MomStatus = 'INACTIVE' | 'WARNING_3S' | 'BUSTING' | 'SAFE_PASSED';

export interface MomEventState {
  status: MomStatus;
  countdownSec: number;
  expiresAt: number;
  initiatorName?: string;
}

export interface BlackoutState {
  isActive: boolean;
  expiresAt: number;
  vipImmuneUser?: ViewerProfile;
  initiatorName?: string;
}

export interface QueueEntry {
  user: ViewerProfile;
  joinedAt: number;
  isVip: boolean;
}

export interface LeaderboardEntry {
  user: ViewerProfile;
  rankScore: number;
  rank: number;
}

export interface ChatBubbleItem {
  id: number;
  userName: string;
  text: string;
  timestamp: number;
  type?: 'NORMAL' | 'NUP' | 'PANIC' | 'GRIND' | 'TROLL';
}

export interface CafeLiveState {
  currentSession: PlayerSession | null;
  queue: QueueEntry[];
  leaderboard: LeaderboardEntry[];
  momEvent: MomEventState;
  blackout: BlackoutState;
  communityLikes: number;
  communityLikeGoal: number;
  language: LanguageMode;
  autoMomEnabled: boolean;
  momCycleSec: number;
  defaultSessionTimeSec: number;
  micMode: boolean;
  volume: number;
  chatBubbles?: ChatBubbleItem[];
  autoBotEnabled?: boolean;
  autoBotMode?: 'CHILL' | 'CHAOS' | 'RANK_RUSH';
}

export type AdminActionName =
  | 'TRIGGER_MOM'
  | 'TRIGGER_BLACKOUT'
  | 'BUFF_NOODLES'
  | 'TRIGGER_BSOD'
  | 'KICK_OR_ROTATE_PLAYER'
  | 'SET_LANGUAGE'
  | 'UPDATE_CONFIG'
  | 'SET_MIC_MODE'
  | 'SET_VOLUME'
  | 'SET_AUTOBOT'
  | 'SIMULATE_EVENT';

export interface AdminActionPayload {
  language?: LanguageMode;
  defaultSessionTimeSec?: number;
  momCycleSec?: number;
  autoMomEnabled?: boolean;
  micMode?: boolean;
  volume?: number;
  targetUserId?: string;
  bonusSeconds?: number;
  autoBotEnabled?: boolean;
  autoBotMode?: 'CHILL' | 'CHAOS' | 'RANK_RUSH';
}
