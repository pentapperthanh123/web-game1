export type PortraitStyle = 'sketch' | 'watercolor' | 'oil_gold' | 'troll';

export type StudioLocale = 'vi' | 'en';

export type TurnPhase =
  | 'IDLE_WAIT'
  | 'WALK_IN'
  | 'PAINTING'
  | 'REVEAL'
  | 'HANG_UP';

export type CameraPreset =
  | 'WIDE_STUDIO'
  | 'OVER_SHOULDER'
  | 'VIP_SPOTLIGHT'
  | 'REVEAL_CLOSEUP';

export type ArtistMood =
  | 'IDLE'
  | 'PAINTING'
  | 'FAST_SWEAT'
  | 'VIP_WAVE'
  | 'TROLL_SMIRK'
  | 'REVEAL_PROUD';

export interface ViewerProfile {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  fansLevel?: number;
}

export interface QueueEntry {
  id: string;
  user: ViewerProfile;
  isVip: boolean;
  isRoyalVip: boolean;
  requestedStyle?: PortraitStyle;
  enqueuedAt: number;
  giftCoins: number;
  giftName?: string;
}

export interface ActivePortraitSession {
  entry: QueueEntry;
  style: PortraitStyle;
  progress: number; // 0..1
  startedAt: number;
  isRoyalFrame: boolean;
  trollApplied: boolean;
  modelSpeech: string | null;
  modelSpeechUntil: number;
}

export interface GalleryFrameRecord {
  id: string;
  userId: string;
  nickname: string;
  style: PortraitStyle;
  isRoyalFrame: boolean;
  completedAt: number;
  /** Data URL snapshot for admin thumbnail preview (optional). */
  thumbnailUrl?: string;
}

export interface LiveStudioConfig {
  locale: StudioLocale;
  studioName: string;
  basePaintDurationSec: number;
  likeSpeedBoostStep: number;
  maxPaintSpeedMultiplier: number;
  chatKeywords: string[];
  autoChibiFallback: boolean;
  dynamicCameraEnabled: boolean;
  defaultStyle: PortraitStyle;
  micMode: boolean;
  avatarProxyUrl: string;
  communityLikeGoal: number;
  gatewayUrl: string;
}

export interface StudioStateSnapshot {
  phase: TurnPhase;
  cameraPreset: CameraPreset;
  artistMood: ArtistMood;
  activeSession: ActivePortraitSession | null;
  vipQueue: QueueEntry[];
  normalQueue: QueueEntry[];
  totalPaintedCount: number;
  communityLikes: number;
  paintSpeedMultiplier: number;
  vipHatActiveUntil: number;
  gallery: GalleryFrameRecord[];
  config: LiveStudioConfig;
  isConnectedToCore: boolean;
  artistMode: 'VRM' | 'PROCEDURAL_CHIBI';
}
