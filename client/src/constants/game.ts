export const TEAM_KEY = {
  BLG: 'BLG',
  GENG: 'GENG',
} as const;

export type TeamType = (typeof TEAM_KEY)[keyof typeof TEAM_KEY];

export const BOSS_STATUS = {
  IDLE: 'IDLE',
  HIT: 'HIT',
  ENRAGED: 'ENRAGED',
  DEFEATED: 'DEFEATED',
} as const;

export type BossStatusType = (typeof BOSS_STATUS)[keyof typeof BOSS_STATUS];

export const GAME_CONSTANTS = {
  VIEWPORT: {
    WIDTH: 720,
    HEIGHT: 1280,
    ASPECT_RATIO: 9 / 16,
  },
  BOSS: {
    INITIAL_HP: 100000,
    MAX_HP: 100000,
    NAME: 'Baron Nashor CKTG',
    HIT_FLASH_DURATION_MS: 200,
    ROTATION_SPEED_IDLE: 0.8,
    ROTATION_SPEED_ENRAGED: 2.2,
    COLOR_DEFAULT: '#2e1065', // Deep Void Obsidian Purple
    COLOR_CARAPACE: '#4c1d95', // Royal Void Purple
    COLOR_BELLY: '#e2e8f0', // Pale Ivory chitin belly
    COLOR_ACCENT: '#38bdf8', // Cyan Neon energy
    COLOR_HIT: '#ffffff', // Shock White-Red
    COLOR_ENRAGED: '#991b1b', // Enraged Crimson Void
    COLOR_EYE: '#facc15', // Radiant Void Eye Gold
    COLOR_EYE_VOID: '#ec4899', // Electric Magenta
  },
  MINIONS: {
    MAX_INSTANCES: 120,
    ORBIT_RADIUS_MIN: 2.6,
    ORBIT_RADIUS_MAX: 5.4,
    BASE_DPS: 350,
    LIFETIME_MS: 16000,
    BLG_COLOR: '#06b6d4',
    GENG_COLOR: '#eab308',
  },
  PARTICLES: {
    COUNT: 500,
    EXPLOSION_FORCE: 9.0,
    GRAVITY: 9.8,
    DURATION_MS: 1800,
  },
  HEARTS: {
    MAX_ACTIVE: 60,
    FLOAT_SPEED_MIN: 1.8,
    FLOAT_SPEED_MAX: 3.2,
    COLORS: ['#f43f5e', '#ec4899', '#f97316', '#38bdf8', '#fbbf24', '#a855f7'],
  },
  PROJECTILES: {
    MAX_ACTIVE: 40,
    SPEED: 8.5,
  },
  LEADERBOARD: {
    MAX_DISPLAY: 5,
  },
  CHAT: {
    MAX_MESSAGES: 7,
  },
  VICTORY: {
    COUNTDOWN_SECONDS: 3,
  },
  AUDIO: {
    DEFAULT_ENABLED: true,
    DEFAULT_TTS_ENABLED: true,
    DEFAULT_VOLUME: 0.6,
  },
  RENDER: {
    DPR_MIN: 1,
    DPR_MAX: 1.5,
    CAMERA_FOV: 42,
    CAMERA_POS_Z: 10.8,
    CAMERA_POS_Y: 6.8,
  },
} as const;

export const SIMULATION_PRESETS = [
  { champion: 'Zed', team: TEAM_KEY.BLG, damage: 1500, comment: 'Zed BLG cấu rỉa máu Boss!' },
  { champion: 'Lux', team: TEAM_KEY.BLG, damage: 1200, comment: 'Cầu vồng tối thượng BLG!' },
  { champion: 'Yasuo', team: TEAM_KEY.GENG, damage: 1800, comment: 'Hasagi Gen.G lướt chém!' },
  { champion: 'Ahri', team: TEAM_KEY.GENG, damage: 1350, comment: 'Hôn gió mê hoặc Gen.G!' },
  { champion: 'Chovy CKTG', team: TEAM_KEY.GENG, damage: 5000, comment: 'Chovy tung combo dồn dame!' },
  { champion: 'Bin Đao Phủ', team: TEAM_KEY.BLG, damage: 5000, comment: 'Bin chém bay thanh máu Baron!' },
  { champion: 'Faker', team: TEAM_KEY.GENG, damage: 4500, comment: 'Phân chia thiên hạ!' },
  { champion: 'Knight', team: TEAM_KEY.BLG, damage: 4200, comment: 'Sốc sát thương phép BLG!' },
] as const;

export const ASSET_PATHS = {
  ARENA_BACKGROUND_WEBP: '/images/arena_background_2d.webp',
  ARENA_BACKGROUND_PNG: '/images/arena_background_2d.png',
  BOSS_BARON_WEBP: '/images/boss_baron_2d.webp',
  BOSS_BARON_PNG: '/images/boss_baron_2d.png',
} as const;

export const UI_CONSTANTS = {
  HIT_ANIMATION_DURATION_MS: 220,
  GHOST_HP_DELAY_MS: 350,
} as const;

export const DAMAGE_TYPE = {
  NORMAL: 'NORMAL',
  CRIT: 'CRIT',
  ULTIMATE: 'ULTIMATE',
} as const;

export type DamageType = (typeof DAMAGE_TYPE)[keyof typeof DAMAGE_TYPE];

export const COMBAT_VFX_CONSTANTS = {
  TEAM_COLORS: {
    [TEAM_KEY.BLG]: {
      primary: '#00f2fe',
      secondary: '#38bdf8',
      accent: '#22d3ee',
      crit: '#67e8f9',
    },
    [TEAM_KEY.GENG]: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      accent: '#ffa751',
      crit: '#fde047',
    },
  },
  BOSS_TARGET: [0, 0.45, 0] as readonly [number, number, number],
  WING_BOUNDS: {
    [TEAM_KEY.BLG]: {
      minX: -4.1,
      maxX: -2.2,
      minY: -1.4,
      maxY: -0.2,
      minZ: 1.0,
      maxZ: 2.7,
    },
    [TEAM_KEY.GENG]: {
      minX: 2.2,
      maxX: 4.1,
      minY: -1.4,
      maxY: -0.2,
      minZ: 1.0,
      maxZ: 2.7,
    },
  },
  SUMMON: {
    PORTAL_DURATION_MS: 1600,
    SPOTLIGHT_DURATION_MS: 2600,
    MAX_ACTIVE_PORTALS: 12,
    MAX_VISIBLE_ORBS: 16,
    MAX_VISIBLE_BADGES_PER_TEAM: 4,
    CRIT_CHANCE: 0.28,
    CRIT_MULTIPLIER: 4,
    NORMAL_MULTIPLIER: 2,
    CRIT_FOLLOWUP_DELAY_MS: 95,
    PORTAL_BURST_PARTICLES: 48,
  },
  DAMAGE: {
    PROJECTILE_DURATION_MS: 420,
    PROJECTILE_MAX_ACTIVE: 56,
    BARRAGE_INTERVAL_S: 0.24,
    DPS_TICK_INTERVAL_S: 1.0,
    SLASH_DURATION_S: 0.36,
    MAX_ACTIVE_SLASHES: 14,
    HIT_IMPACT_DURATION_MS: 420,
    MAX_ACTIVE_HIT_IMPACTS: 12,
    FLOATING_DURATION_MS: 1350,
    MAX_FLOATING_DAMAGE: 18,
    COMBO_WINDOW_MS: 2800,
    CRIT_SHOCKWAVE_RADIUS: 4.5,
    ULTIMATE_SHOCKWAVE_RADIUS: 6.8,
  },
  PARTICLES: {
    MAX_BURST_QUEUE: 10,
    BURST_COUNT_NORMAL: 26,
    BURST_COUNT_CRIT: 64,
    BURST_COUNT_ULTIMATE: 180,
    BURST_COUNT_SUMMON: 42,
    INTENSITY_NORMAL: 1,
    INTENSITY_CRIT: 2,
    INTENSITY_ULTIMATE: 4,
    SPEED_MIN: 2.2,
    SPEED_MULTIPLIER: 2.1,
  },
} as const;

