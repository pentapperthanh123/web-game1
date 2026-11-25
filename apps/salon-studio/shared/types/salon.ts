export type SalonServiceMode = 'HAIR' | 'NAIL';
export type SalonScheduleMode = SalonServiceMode | 'AUTO';
export type SalonLanguage = 'VI' | 'EN';
export type AutoBotPace = 'SLOW' | 'NORMAL' | 'BURST';
export type QueuePriority = 'NORMAL' | 'VIP' | 'ROYAL';

export type SalonColorKey = 'pink' | 'gold' | 'blue' | 'purple' | 'black' | 'pastel_peach' | 'pastel_mint' | 'shimmer_rose';
export type HairStyleKey = 'short' | 'long' | 'curly' | 'cool' | 'bob';
export type NailShapeKey = 'oval' | 'square' | 'almond' | 'long';
export type NailArtStyleKey = 'NONE' | 'FRENCH_TIP' | 'FLORAL' | 'STARS';

export type HairTrollType = 'BALD_STRIPE' | 'BURNT_AFRO' | 'BOWL_CUT';
export type NailTrollType = 'SUPER_LONG_CURLED' | 'FUNNY_CHARMS';
export type TrollEffectType = HairTrollType | NailTrollType;

export type AccessoryKey = 'NONE' | 'BOW' | 'SUNGLASSES' | 'SPARKLE_CLIP' | 'ROYAL_CROWN';
export type FacialExpression = 'WAITING' | 'HAPPY' | 'EXCITED' | 'CRYING_TROLL' | 'ROYAL_PROUD';
export type StylistMood = 'WORKING' | 'FAST' | 'PROUD' | 'OOPS' | 'ROYAL';

export type PreviewPresetKey = 'HAIR' | 'NAIL' | 'VIP_QUEUE' | 'TROLL' | 'ROYAL';

export interface ViewerProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

export interface QueuedCustomer {
  orderId: string;
  user: ViewerProfile;
  priority: QueuePriority;
  preferredService?: SalonServiceMode;
  requestedColor?: SalonColorKey;
  requestedHairStyle?: HairStyleKey;
  requestedNailShape?: NailShapeKey;
  enqueuedAt: number;
  giftTag?: string;
}

export interface ActiveCustomerSession {
  orderId: string;
  user: ViewerProfile;
  service: SalonServiceMode;
  priority: QueuePriority;
  colorKey: SalonColorKey;
  hasPastelShimmer: boolean;
  hairStyle: HairStyleKey;
  nailShape: NailShapeKey;
  nailArtStyle?: NailArtStyleKey;
  accessory: AccessoryKey;
  expression: FacialExpression;
  trollEffect: TrollEffectType | null;
  trollTriggeredBy: string | null;
  isRoyal: boolean;
  royalTriggeredBy: string | null;
  progress: number; // 0 -> 100
  durationSec: number;
  elapsedSec: number;
  startedAt: number;
  completedAt: number | null;
  skinTone: string;
  shirtColor: string;
}

export interface FinishedWorkItem {
  id: string;
  nickname: string;
  avatarUrl?: string;
  service: SalonServiceMode;
  colorKey: SalonColorKey;
  hasPastelShimmer: boolean;
  hairStyle: HairStyleKey;
  nailShape: NailShapeKey;
  nailArtStyle?: NailArtStyleKey;
  accessory: AccessoryKey;
  trollEffect: TrollEffectType | null;
  isRoyal: boolean;
  skinTone: string;
  completedAt: number;
}

export interface AudienceBubble {
  id: string;
  nickname: string;
  text: string;
  slotIndex: number; // 0 | 1 | 2
  createdAt: number;
  expiresAt: number;
}

export interface ThankYouToast {
  id: string;
  donorName: string;
  tier: 'SMALL' | 'MEDIUM' | 'LARGE';
  giftName: string;
  createdAt: number;
  expiresAt: number;
}

export interface SalonConfig {
  scheduleMode: SalonScheduleMode;
  language: SalonLanguage;
  turnDurationSec: number;
  trollEnabled: boolean;
  micMode: boolean;
  masterVolume: number;
  showSafeZone: boolean;
}

export interface SalonLiveState {
  config: SalonConfig;
  activeService: SalonServiceMode;
  activeCustomer: ActiveCustomerSession | null;
  vipQueue: QueuedCustomer[];
  normalQueue: QueuedCustomer[];
  finishedWall: FinishedWorkItem[];
  royalTopPin: FinishedWorkItem | null;
  todayCount: number;
  watchingCount: number;
  stylistMood: StylistMood;
  stylistSpeech: string;
  stylistSpeedBoostUntil: number;
  audienceBubbles: AudienceBubble[];
  thankYouToast: ThankYouToast | null;
  autoBotEnabled: boolean;
  autoBotPace: AutoBotPace;
  autoPauseBotOnRealEvent: boolean;
  lastRealEventAt: number | null;
  isSandboxPreview: boolean;
}

export type SalonAdminActionName =
  | 'SET_SCHEDULE_MODE'
  | 'SET_LANGUAGE'
  | 'SET_TURN_DURATION'
  | 'SET_TROLL_ENABLED'
  | 'SET_MIC_MODE'
  | 'SET_MASTER_VOLUME'
  | 'SET_SAFE_ZONE'
  | 'FORCE_COMPLETE_NOW'
  | 'TRIGGER_TROLL_NOW'
  | 'CALL_NEXT_CUSTOMER'
  | 'CLEAR_FINISHED_WALL'
  | 'APPLY_PREVIEW_PRESET'
  | 'PLAY_TEST_SFX';

export interface SalonAdminActionPayload {
  scheduleMode?: SalonScheduleMode;
  language?: SalonLanguage;
  turnDurationSec?: number;
  trollEnabled?: boolean;
  micMode?: boolean;
  masterVolume?: number;
  showSafeZone?: boolean;
  previewPreset?: PreviewPresetKey;
  sfxName?: 'SNIP' | 'CLIPPER' | 'DONE' | 'OOPS' | 'ROYAL' | 'GIFT';
}
