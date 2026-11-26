export type Language = 'EN' | 'VI';

export type RecipeId =
  | 'matcha'
  | 'thai_tea'
  | 'coffee_milk'
  | 'berry_soda'
  | 'blue_citrus';

export type BrewToolType =
  | 'chasen'
  | 'shaker'
  | 'coffee_machine'
  | 'soda_pour'
  | 'juicer';

export type BrewStageNumber = 1 | 2 | 3 | 4 | 5;

export type ToppingId =
  | 'boba_pearls'
  | 'fruit_slice'
  | 'cream_swirl'
  | 'sparkle_aura';

export type SugarLevel = 'LESS' | 'NORMAL' | 'SWEET';

export type IceLevel = 'NONE' | 'LESS' | 'NORMAL' | 'EXTRA';

export type BartenderMood =
  | 'IDLE'
  | 'BREWING'
  | 'HAPPY'
  | 'CHEERING'
  | 'TIKTOK_DANCE';

export type DrinkPhase = 'IDLE' | 'BREWING' | 'SHOWCASE';

export type AutoBotPace = 'SLOW' | 'NORMAL' | 'FAST';

export type GiftTier = 'SMALL' | 'MEDIUM' | 'LARGE';

export type DanceStyle = 'heart_sway' | 'groove_wave' | 'party_hype';

export type SfxKind =
  | 'cup_place'
  | 'sugar_click'
  | 'ice_clink'
  | 'matcha_scoop'
  | 'chasen'
  | 'whip_froth'
  | 'shaker'
  | 'cafe_drip'
  | 'soda_fizz'
  | 'juicer'
  | 'pour'
  | 'topping'
  | 'lid_snap'
  | 'straw_insert'
  | 'chime'
  | 'signature'
  | 'chat_pop'
  | 'like_pop'
  | 'dance_jingle';

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
  nickname: string;
  avatarUrl?: string;
}

export interface NormalizedLiveEvent {
  type: CoreEventType;
  platform?: string;
  source?: 'REAL' | 'SIMULATOR' | 'AUTOBOT';
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
  viewerCount?: number;
}

export type TikTokConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface TikTokStatusPayload {
  status: TikTokConnectionState;
  username: string;
  error?: string;
  attempt?: number;
  nextRetryAt?: number | null;
}

export interface DrinkOrder {
  orderId: string;
  user: ViewerProfile;
  recipeId: RecipeId;
  toppings: ToppingId[];
  sugarLevel: SugarLevel;
  iceLevel: IceLevel;
  isVip: boolean;
  isSignature: boolean;
  isGlowUpgraded: boolean;
  createdAt: number;
}

export interface ActiveDrink extends DrinkOrder {
  progress: number; // 0 to 100
  phase: DrinkPhase;
  showcaseRemainingMs: number;
  lastUpdatedAt: number;
}

export interface FinishedDrink {
  orderId: string;
  user: ViewerProfile;
  recipeId: RecipeId;
  toppings: ToppingId[];
  isVip: boolean;
  isSignature: boolean;
  completedAt: number;
}

export interface GuestBubble {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  slotIndex: number;
  expiresAt: number;
}

export interface BartenderSpeech {
  text: string;
  expiresAt: number;
}

export interface InventorySlot {
  recipeId: RecipeId;
  currentMl: number;
  maxMl: number;
  restockAt: number | null;
}

export type DrinkInventoryMap = Record<RecipeId, InventorySlot>;

export interface DrinkBarConfig {
  language: Language;
  brewDurationSec: number;
  sfxEnabled: boolean;
  sfxMusicEnabled: boolean;
  masterVolume: number;
  micMode: boolean;
  showSafeZone: boolean;
  defaultCapacityMl: number;
  autoRestockEnabled: boolean;
}

export interface DrinkBarLiveState {
  config: DrinkBarConfig;
  activeDrink: ActiveDrink | null;
  secondaryDrink: ActiveDrink | null;
  activeSlots: [ActiveDrink | null, ActiveDrink | null];
  vipQueue: DrinkOrder[];
  normalQueue: DrinkOrder[];
  finishedShelf: FinishedDrink[];
  inventory: DrinkInventoryMap;
  todayDoneCount: number;
  bartenderMood: BartenderMood;
  bartenderSpeech: BartenderSpeech | null;
  speedBoostUntil: number;
  waveUntil: number;
  danceUntil: number;
  danceStartedAt: number;
  danceTier: GiftTier;
  danceStyle: DanceStyle;
  guestBubbles: GuestBubble[];
  lastEventAt: number;
}

export type DrinkBarAdminActionName =
  | 'SET_LANGUAGE'
  | 'SET_BREW_DURATION'
  | 'SET_SFX_ENABLED'
  | 'SET_MUSIC_ENABLED'
  | 'SET_MASTER_VOLUME'
  | 'SET_MIC_MODE'
  | 'SET_SAFE_ZONE'
  | 'COMPLETE_NOW'
  | 'ADD_TOPPING'
  | 'NEXT_CUSTOMER'
  | 'CLEAR_SHELF'
  | 'TRIGGER_TIKTOK_DANCE'
  | 'SET_BREW_PROGRESS'
  | 'RESTOCK_RECIPE'
  | 'RESTOCK_ALL'
  | 'SET_DEFAULT_CAPACITY'
  | 'SET_AUTO_RESTOCK';

export interface DrinkBarAdminActionPayload {
  language?: Language;
  brewDurationSec?: number;
  sfxEnabled?: boolean;
  sfxMusicEnabled?: boolean;
  masterVolume?: number;
  micMode?: boolean;
  showSafeZone?: boolean;
  toppingId?: ToppingId;
  danceTier?: GiftTier;
  danceStyle?: DanceStyle;
  progress?: number;
  recipeId?: RecipeId;
  addMl?: number;
  defaultCapacityMl?: number;
  autoRestockEnabled?: boolean;
}

export type DrinkBarSyncMessage =
  | {
      type: 'LIVE_EVENT';
      eventId: string;
      event: NormalizedLiveEvent;
      timestamp: number;
    }
  | {
      type: 'ADMIN_ACTION';
      eventId: string;
      action: DrinkBarAdminActionName;
      payload?: DrinkBarAdminActionPayload;
      timestamp: number;
    }
  | {
      type: 'STATE_SNAPSHOT';
      snapshot: DrinkBarLiveState;
      timestamp: number;
    }
  | {
      type: 'REQUEST_SNAPSHOT';
      timestamp: number;
    }
  | {
      type: 'RELAY_SFX';
      kind: SfxKind;
      tier?: GiftTier;
      danceStyle?: DanceStyle;
      pitchScale?: number;
      timestamp: number;
    };
