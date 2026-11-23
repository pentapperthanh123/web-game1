import type { PushMultipliers, SoundConfig } from '../types/clash';

export const CLASH_STAGE = {
  WIDTH: 720,
  HEIGHT: 1280,
  ASPECT_RATIO: 9 / 16,
  FPS_TARGET: 30,
  FRAME_INTERVAL_MS: 1000 / 30, // ~33.33ms
  SAFE_ZONE_BOTTOM_Y: 985,
  CENTER_STAGE_TOP_Y: 155,
  CENTER_STAGE_BOTTOM_Y: 980,
  TOP_HUD_HEIGHT: 150,
} as const;

export const DEFAULT_PUSH_MULTIPLIERS: PushMultipliers = {
  chatPush: 0.6, // in percentage points (+0.6%)
  likePush: 0.1, // in percentage points (+0.1% per like)
  smallGiftPush: 9.0, // 1-4 coins (+9%)
  mediumGiftPush: 20.0, // 5-29 coins (+20%)
  largeGiftPush: 35.0, // 30+ coins (+35%)
};

export const DEFAULT_ROUND_DURATION_SECONDS = 90;

export const ROUND_END_DISPLAY_SECONDS = 5;

export const CHAT_RATE_LIMIT_PER_USER_MS = 350;

export const LIKE_BATCH_INTERVAL_MS = 200;

export const STROBE_WARNING_THRESHOLDS = {
  RIGHT_CRITICAL: 80, // Left is pushing Right to near death
  LEFT_CRITICAL: 20, // Right is pushing Left to near death
} as const;

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  masterVolume: 0.8,
  sfxVolume: 0.9,
  micModeEnabled: false,
  isMuted: false,
};

export const SYNC_CHANNEL_NAME = 'team_clash_sync';

export const CLASH_PORTS = {
  CLIENT: 8030,
  ADMIN: 8031,
  CORE_GATEWAY: 5000,
  GAME_SERVER: 4000,
} as const;
