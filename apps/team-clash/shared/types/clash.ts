export type TeamId = 'LEFT' | 'RIGHT';

export type CharacterType =
  | 'girl'
  | 'boy'
  | 'cat'
  | 'dog'
  | 'red_fighter'
  | 'blue_fighter';

export interface TeamPresetConfig {
  id: string;
  name: string;
  leftTeam: {
    name: string;
    subName: string;
    primaryColor: string;
    secondaryColor: string;
    glowColor: string;
    keywords: string[];
    avatarUrl?: string;
    characterType?: CharacterType;
  };
  rightTeam: {
    name: string;
    subName: string;
    primaryColor: string;
    secondaryColor: string;
    glowColor: string;
    keywords: string[];
    avatarUrl?: string;
    characterType?: CharacterType;
  };
}

export interface ViewerSummary {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  team: TeamId;
  totalPoints: number;
}

export type PushTier = 'SMALL' | 'MEDIUM' | 'LARGE';

export type PushSource = 'CHAT' | 'LIKE' | 'GIFT';

/** What a single viewer action actually did to the clash (null when it was ignored). */
export interface PushResult {
  team: TeamId;
  /** Push applied, in percentage points of the clash bar. */
  amount: number;
  tier: PushTier;
  source: PushSource;
  viewer: ViewerSummary;
  giftName?: string;
  giftCount?: number;
}

export type RoundStatus ='WAITING' | 'PLAYING' | 'ROUND_END';

export interface GiftAlertItem {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  team: TeamId;
  teamName: string;
  teamColor: string;
  giftName: string;
  coinValue: number;
  repeatCount: number;
  tier: 'SMALL' | 'MEDIUM' | 'LARGE';
  pushPercent: number;
  timestamp: number;
}

export interface ClashMatchState {
  roundNumber: number;
  seriesScore: {
    left: number;
    right: number;
  };
  roundStatus: RoundStatus;
  roundTimeRemaining: number; // in seconds
  roundDurationSeconds: number;
  clashPosition: number; // 0 (Right win) to 100 (Left win), initial 50
  targetPosition: number; // target lerp destination
  leftScore: number;
  rightScore: number;
  activePresetId: string;
  customPreset?: TeamPresetConfig;
  language: 'EN' | 'VI';
  recentLeftContributors: ViewerSummary[];
  recentRightContributors: ViewerSummary[];
  topRoundContributors: ViewerSummary[];
  recentGiftAlerts: GiftAlertItem[];
  lastRoundWinner: TeamId | null;
  roundEndCountdown: number; // seconds
  neutralEnergySurge: number;
  isStrobeWarning: boolean;
}

export interface SoundConfig {
  masterVolume: number;
  sfxVolume: number;
  micModeEnabled: boolean;
  isMuted: boolean;
  youtubeUrl?: string;
}

export interface PushMultipliers {
  chatPush: number;
  likePush: number;
  /** Max push % one viewer's likes can add per round (likes are free, so they are capped). */
  likePushMaxPerUserPerRound: number;
  /** Push % per coin: a gift pushes totalCoins × this, so a x10 Rose combo = one 10-coin gift. */
  giftPushPerCoin: number;
}
