import { TeamSlotKey } from './teams.js';

export const TIKTOK_PIPELINE_CONSTANTS = {
  AFFINITY_TTL_MS: 4 * 60 * 60 * 1000,
  MAX_TRACKED_VIEWERS: 5000,
  GIFT_STREAK_TTL_MS: 45_000,
  MAX_TRACKED_STREAKS: 1000,
  MAX_FOLLOW_HISTORY: 8000,
  SHARE_COOLDOWN_MS: 15_000,
  AFFINITY_REMINDER_COOLDOWN_MS: 60_000,
  STREAK_GIFT_TYPE: 1,
  DEFAULT_UNIT_COINS: 10,
  MAX_LIKE_BATCH_CLAMP: 15,
  FOLLOW_FURY_GAIN: 10,
  SHARE_BURST_DAMAGE: 500,
  SHARE_HEAL_AMOUNT: 50,
  DUEL_CHAT_DELTA: 0.8,
  DUEL_LIKE_DELTA: 0.2,
  DUEL_FOLLOW_DELTA: 1.0,
  DUEL_SHARE_DELTA: 1.5,
  DUEL_GIFT_TIER_HIGH_COINS: 1000,
  DUEL_GIFT_TIER_MID_COINS: 50,
  DUEL_GIFT_DELTA_HIGH: 25.0,
  DUEL_GIFT_DELTA_MID: 10.0,
  DUEL_GIFT_DELTA_LOW: 3.0,
} as const;

export type AffinityResolutionSource = 'explicit' | 'affinity' | 'balanced_fallback';

export type TikTokSimulationType = 'chat' | 'like' | 'gift' | 'follow' | 'share';

export interface TeamScoreBalance {
  leftScore: number;
  rightScore: number;
}

export interface TikTokChatInput {
  uniqueId?: string;
  nickname?: string;
  userAvatarUrl?: string;
  comment: string;
}

export interface TikTokGiftInput {
  uniqueId?: string;
  nickname?: string;
  giftId?: string | number;
  giftName?: string;
  diamondCount?: number;
  giftType?: number;
  repeatCount?: number;
  repeatEnd?: boolean;
  explicitTeam?: TeamSlotKey;
}

export interface TikTokLikeInput {
  uniqueId?: string;
  nickname?: string;
  likeCount?: number;
  explicitTeam?: TeamSlotKey;
}

export interface TikTokSocialInput {
  uniqueId?: string;
  nickname?: string;
  explicitTeam?: TeamSlotKey;
}

export interface PipelineStatsSummary {
  trackedAffinityCount: number;
  leftAffinityCount: number;
  rightAffinityCount: number;
  activeStreakCount: number;
  followCount: number;
  shareCount: number;
  blockedAntiSpamCount: number;
}

export interface SimulationResult {
  accepted: boolean;
  action: TikTokSimulationType;
  team?: TeamSlotKey;
  source?: AffinityResolutionSource;
  championName?: string;
  deltaCoins?: number;
  streakCount?: number;
  reason?: string;
  stats: PipelineStatsSummary;
}
