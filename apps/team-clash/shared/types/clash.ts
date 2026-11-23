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

export type RoundStatus = 'WAITING' | 'PLAYING' | 'ROUND_END';

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
  lastRoundWinner: TeamId | null;
  roundEndCountdown: number; // 5 seconds
  neutralEnergySurge: number;
  isStrobeWarning: boolean;
}

export interface SoundConfig {
  masterVolume: number;
  sfxVolume: number;
  micModeEnabled: boolean;
  isMuted: boolean;
}

export interface PushMultipliers {
  chatPush: number;
  likePush: number;
  smallGiftPush: number;
  mediumGiftPush: number;
  largeGiftPush: number;
}
