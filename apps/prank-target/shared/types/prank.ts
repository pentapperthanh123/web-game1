import type { ViewerProfile } from './events.js';

export type PrankActionType =
  | 'EGG'
  | 'WIND'
  | 'BALL'
  | 'CAKE'
  | 'MILK'
  | 'TAUNT'
  | 'SURPRISE';

export type CharacterExpression =
  | 'IDLE'
  | 'ANNOYED'
  | 'HIT_IMPACT'
  | 'FURIOUS'
  | 'MELTDOWN';

export type RageTier = 'CHILL' | 'ANNOYED' | 'FURIOUS' | 'MELTDOWN';

export type MorphTargetName =
  | 'angry'
  | 'squint'
  | 'shock'
  | 'puffed'
  | 'mouthOpen'
  | 'jawDrop';

export type AttachmentType3D =
  | 'EGG_SPLAT'
  | 'CAKE_SMEAR'
  | 'BUMP_STARS'
  | 'WIND_TORNADO'
  | 'MILK_SPLASH'
  | 'FLYING_BEANIE';

export type AttachmentTargetBone =
  | 'HEAD'
  | 'NOSE'
  | 'CHEST'
  | 'LEFT_KNEE'
  | 'RIGHT_KNEE';

export interface AttachmentItem3D {
  id: string;
  type: AttachmentType3D;
  targetBone: AttachmentTargetBone;
  localPosition: [number, number, number];
  localRotation: [number, number, number];
  scale: number;
  createdAt: number;
  durationMs: number;
}

export interface ProjectileState3D {
  id: string;
  action: PrankActionType;
  startPos: [number, number, number];
  targetPos: [number, number, number];
  progress: number;
  speed: number;
  initiatorName: string;
  avatarUrl?: string;
}

export type DecalType =
  | 'EGG_SPLAT'
  | 'CAKE_SMEAR'
  | 'MILK_DRIP'
  | 'BUMP_MARK'
  | 'STICKER_FUNNY';

export interface DecalItem {
  id: string;
  type: DecalType;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  createdAt: number;
  durationMs: number;
}

export interface ActivePrankAnimation {
  id: string;
  action: PrankActionType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  initiatorName: string;
  avatarUrl?: string;
  isCompleted: boolean;
}

export interface TopPranker {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  totalCoins: number;
  hitCount: number;
  lastAction: PrankActionType;
}

export interface PrankTargetState {
  rageMeter: number; // 0 -> 100
  tier: RageTier;
  expression: CharacterExpression;
  totalHits: number;
  isMeltdownActive: boolean;
  meltdownEndsAt: number | null;
  activeAttachments: AttachmentItem3D[];
  activeDecals?: DecalItem[];
  topPrankers: TopPranker[];
  lastHit?: {
    action: PrankActionType;
    initiatorName: string;
    avatarUrl?: string;
    timestamp: number;
  };
  cameraShake: number; // 0 -> 1
  screenShake: number; // legacy alias
  micMode: boolean;
  sfxVolume: number;
  language: 'EN' | 'VI'; // Default: EN
}

export interface ActionBadgeConfig {
  id: string;
  action: PrankActionType;
  icon: string;
  labelEn: string;
  labelVi: string;
  subTextEn: string;
  subTextVi: string;
  requiredCoins?: number;
  keywords: string[];
}
