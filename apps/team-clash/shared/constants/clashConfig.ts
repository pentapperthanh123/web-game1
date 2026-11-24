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

/**
 * Arena geometry for the push (tug-of-war) visual. The clash orb, the territory border and
 * both fighters are all derived from one clash position so they can never disagree.
 */
export const CLASH_ARENA_LAYOUT = {
  /** Closest a fighter's feet center can get to the stage edge (back foot stays on screen). */
  FIGHTER_WALL_MARGIN_X: 66,
  /** Orb ↔ fighter distance while that fighter still has room behind it. */
  FIGHTER_STANDOFF_X: 190,
  /** Orb ↔ fighter distance when that fighter is pinned against its wall (knockout point). */
  FIGHTER_PINNED_GAP_X: 96,
  /** Fighter feet line, measured below the vertical middle of the center stage. */
  FIGHTER_FEET_OFFSET_Y: 120,
  /** Hand (beam origin) relative to the fighter's feet, in the fighter's local, unmirrored space. */
  HAND_LOCAL_X: 46,
  HAND_LOCAL_Y: -77,
  /** Lean (degrees) at full advantage / full disadvantage. */
  MAX_LEAN_DEG: 9,
  /** Extra lean while a fresh push impulse is active. */
  PUSH_LEAN_DEG: 5,
  /** Forward lunge of the pushing fighter and recoil of the pushed one, at impulse 1. */
  PUSH_LUNGE_PX: 16,
  PUSH_RECOIL_PX: 8,
  /** Orb displacement toward the pushed side, at impulse 1. */
  ORB_KICK_PX: 14,
  IMPULSE_DECAY_PER_SECOND: 3.2,
  /** Pinned fighters tremble when the clash is closer than this to their wall (in %). */
  STRAIN_THRESHOLD_PERCENT: 18,
  STRAIN_JITTER_PX: 1.8,
  /** Retreat speed (px/frame) above which dust kicks up under the fighter's feet. */
  DUST_MIN_SPEED_PX: 0.6,
} as const;

/** Impulse added to a team's push animation per push tier (clamped to 1). */
export const PUSH_TIER_IMPULSE = {
  SMALL: 0.45,
  MEDIUM: 0.75,
  LARGE: 1,
} as const;

/** Sparks spawned at the clash orb per push tier. */
/** A chat push is rare (once per viewer per cooldown), so it gets the beam-tier visuals and SFX. */
export const CHAT_PUSH_TIER = 'MEDIUM' as const;
/** Screen shake (0–1) when a chat push lands. */
export const CHAT_PUSH_SHAKE = 0.35;

export const PUSH_TIER_SPARKS = {
  SMALL: 5,
  MEDIUM: 18,
  LARGE: 35,
} as const;

/** Coin thresholds that decide the gift push tier. */
export const GIFT_TIER_COINS = {
  MEDIUM: 5,
  LARGE: 30,
} as const;

/** Floating "who pushed" chips that pop out above the clash orb. */
export const PUSH_FEED_CONFIG = {
  MAX_VISIBLE_PER_TEAM: 3,
  /** Visible chips + one sliding-out slot. */
  MAX_KEPT_PER_TEAM: 4,
  CHIP_LIFETIME_MS: 2600,
  GIFT_CHIP_LIFETIME_MS: 4200,
  CHIP_EXIT_MS: 320,
  PRUNE_INTERVAL_MS: 150,
  /** Bottom edge of the newest chip (stage px). */
  BASE_BOTTOM_Y: 528,
  SLOT_GAP_PX: 58,
  /** Gap between the orb and the inner edge of a team's chip column. */
  ORB_GAP_X: 14,
  /** Max chip width, also used to keep the column inside the stage. */
  MAX_CHIP_WIDTH_PX: 230,
  STAGE_EDGE_PADDING_PX: 8,
} as const;

/** Bottom-right gift menu panel (stage px); pinned cleanly at the bottom-right corner with comfortable floor clearance. */
export const GIFT_PANEL_CONFIG = {
  BOTTOM_Y: 1200,
  RIGHT_X: 16,
  WIDTH: 216,
  /** Received gifts that are not in the fixed menu get extra rows (latest first). */
  MAX_EXTRA_ROWS: 1,
} as const;

/**
 * Gift "strike": the gift icon flies from the tally panel into the clash orb, curving in from
 * the giver's side; the push is applied on impact together with a floating damage number.
 */
export const GIFT_STRIKE_CONFIG = {
  /** Launch point inside the gift panel: from the panel's left edge / up from its bottom edge. */
  ORIGIN_INSET_X: 30,
  ORIGIN_INSET_Y: 70,
  /** How far the curve swings out to the giver's side / above the orb before hitting it. */
  ARC_SIDE_PX: 240,
  ARC_LIFT_PX: 240,
  FLIGHT_SECONDS: { SMALL: 0.5, MEDIUM: 0.6, LARGE: 0.72 },
  ICON_SIZE_PX: { SMALL: 34, MEDIUM: 44, LARGE: 58 },
  /** Accelerating flight: progress = t^EASE_POWER. */
  EASE_POWER: 1.6,
  TRAIL_GHOSTS: 3,
  TRAIL_STEP: 0.07,
  MAX_IN_FLIGHT: 10,
  DAMAGE_POP_SECONDS: 0.9,
  DAMAGE_POP_RISE_PX: 52,
  /** Damage numbers start just under the orb, shifted toward the side that got hit, so they
   *  clear the push-feed chips above and left/right hits never stack on each other. */
  DAMAGE_POP_OFFSET_X: 72,
  DAMAGE_POP_OFFSET_Y: 62,
  DAMAGE_FONT_PX: { SMALL: 26, MEDIUM: 34, LARGE: 44 },
  MAX_DAMAGE_POPS: 10,
} as const;

/** Name plate (avatar + name of the latest pusher) drawn under each fighter. */
export const FIGHTER_NAMEPLATE_CONFIG = {
  TOP_OFFSET_BELOW_FEET_Y: 18,
  /** Keeps the plate on screen: min distance from either stage edge to the plate center. */
  EDGE_MARGIN_X: 104,
} as const;

/** Layout writes to DOM are skipped when movement is below this (px). */
export const LAYOUT_WRITE_EPSILON_PX = 0.25;

/** Clash position snaps to its target once closer than this (%), so knockouts land on time. */
export const CLASH_POSITION_SNAP_EPSILON = 0.05;

/** Clash position at dead center (0 = RIGHT knocked out… 100 = LEFT pushed through). */
export const CLASH_CENTER_POSITION = 50;

export const CLASH_POSITION_LERP_FACTOR = 0.12;

export const DEFAULT_AVATAR_URL_PREFIX = 'https://api.dicebear.com/7.x/bottts/svg?seed=';

export const DEFAULT_PUSH_MULTIPLIERS: PushMultipliers = {
  chatPush: 3.0, // +3% per accepted "G"/"B" comment (each viewer: once per CHAT_RATE_LIMIT window)
  likePush: 0.02, // +0.02% per like (50 likes = +1%)
  likePushMaxPerUserPerRound: 5.0, // one fast tapper can't carry the round alone
  giftPushPerCoin: 1.0, // Rose 1 coin = +1%, Finger Heart 5 = +5%, Doughnut 30 = +30%; no cap
};

export const DEFAULT_ROUND_DURATION_SECONDS = 300; // 5 minutes default
export const ROUND_DURATION_OPTIONS = [45, 60, 90, 120, 300] as const;

export const ROUND_END_DISPLAY_SECONDS = 12;

/** Each viewer's chat pushes at most once per window; extra comments inside it are ignored. */
export const CHAT_RATE_LIMIT_PER_USER_MS = 30_000;

export const LIKE_BATCH_INTERVAL_MS = 200;

export const STROBE_WARNING_THRESHOLDS = {
  RIGHT_CRITICAL: 80, // Left is pushing Right to near death
  LEFT_CRITICAL: 20, // Right is pushing Left to near death
} as const;

/** Local BGM served from client/public (downloaded once, played offline instead of streaming YouTube). */
export const LOCAL_BGM_FILE_PATH = '/audio/bgm.mp3';
export const DEFAULT_BGM_SOURCE = LOCAL_BGM_FILE_PATH;

/** A BGM source ending in an audio extension is played as a local/direct file, not via YouTube. */
export const AUDIO_FILE_URL_REGEX = /\.(mp3|ogg|m4a|aac|wav|webm|opus)(\?.*)?$/i;

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  masterVolume: 0.8,
  sfxVolume: 0.9,
  micModeEnabled: false,
  isMuted: false,
  youtubeUrl: DEFAULT_BGM_SOURCE,
};

export const YOUTUBE_VIDEO_ID_REGEX =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;

export const SYNC_CHANNEL_NAME = 'team_clash_sync';

export const CLASH_PORTS = {
  CLIENT: 8030,
  ADMIN: 8031,
  CORE_GATEWAY: 5000,
  GAME_SERVER: 4000,
} as const;

/**
 * ngrok integration (see apps/team-clash/ngrok.clash.yml + start_ngrok_clash.bat).
 * The admin dev server reads the local ngrok agent API and serves the tunnels' public URLs at
 * PUBLIC_URLS_PATH, so a remotely opened admin can point its preview/popup at the client tunnel.
 */
export const CLASH_NGROK = {
  AGENT_API_URL: 'http://127.0.0.1:4040/api/tunnels',
  CLIENT_TUNNEL: 'clash-client',
  ADMIN_TUNNEL: 'clash-admin',
  PUBLIC_URLS_PATH: '/__clash/public-urls',
  AGENT_TIMEOUT_MS: 1500,
} as const;
