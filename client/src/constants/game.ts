import { SilverScrapesDuelState } from '../types/game';
import { findMasterChampion } from './championsMaster';

export const APP_TITLE = 'LOL CKTG';

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
    SPAWN_GRACE_PERIOD_MS: 1000, // 1s grace period: only after 1s do newly summoned champions deal and receive damage
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
  HEART_MILESTONE: {
    THRESHOLD: 200, // Mỗi khi đạt thêm 200 tim (200, 400, 600...) sẽ kích hoạt hồi máu toàn bản đồ
    HEAL_AMOUNT: 100, // Lượng máu hồi phục cho toàn bộ tướng
    BANNER_DURATION_MS: 3200,
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
    COUNTDOWN_SECONDS: 5,
  },
  BO5: {
    TARGET_WINS: 3,
    MAX_ROUNDS: 5,
    ROUND_TRANSITION_SECONDS: 5,
  },
  SERIES_FORMATS: {
    BO1: { TARGET_WINS: 1, MAX_ROUNDS: 1 },
    BO3: { TARGET_WINS: 2, MAX_ROUNDS: 3 },
    BO5: { TARGET_WINS: 3, MAX_ROUNDS: 5 },
  },
  SILVER_SCRAPES: {
    DURATION_SECONDS: 60,
    EXTEND_SECONDS: 30,
    BUFF_DURATION_MS: 90000,
    BUFF_DAMAGE_MULTIPLIER: 1.2,
    LAST_STAND_SHIELD_SECONDS: 15,
    TUG_OF_WAR_INITIAL_PERCENT: 50,
  },
  SUMMON_RULES: {
    MAX_ACTIVE_PER_USER: 1, // Option B: Mỗi người chỉ có tối đa 1 tướng đang sống trên sàn
    ALIVE_SUPPORT_HEAL: 50, // Option B: Comment tiếp theo khi tướng còn sống sẽ hồi +50 HP tiếp sức
    ALIVE_SUPPORT_DAMAGE: 200, // Option B: Đòn đánh tiếp sức gây thêm +200 sát thương vào Boss
    LIFETIME_EXTENSION_MS: 3000, // Option B: Gia hạn thêm 3s thời gian tham chiến cho tướng
  },
  PRO_FURY: {
    MAX_FURY: 100,
    FURY_AUTO_CAP: 90, // Tuyển thủ tự đánh tối đa 90% Nộ — cần người xem chat/donate/tap tim để kích hoạt Bạo Nộ 100%
    FURY_GAIN_AUTO_ATTACK: 10, // +10 Nộ mỗi đòn giữ nhịp
    FURY_GAIN_HEART_TAP: 4, // +4 Nộ cho tuyển thủ khi người xem thả tim (nhân thêm theo tốc độ tap)
    FURY_GAIN_SUMMON_MATCH: 35, // +35 Nộ khi người xem chat gọi tướng trùng với tuyển thủ
    FURY_GAIN_GIFT_BOOST: 50, // +50 Nộ cho toàn đội hình tuyển thủ khi có người xem tặng quà
    FURY_ULTIMATE_DAMAGE_MULTIPLIER: 4.5, // 4.5x sát thương khi tung Đòn Bạo Nộ
    FURY_ULTIMATE_DURATION_MS: 1200,
  },
  SIGNATURE_SYNERGY: {
    DAMAGE_MULTIPLIER: 1.25,
    BONUS_PERCENT: 25,
    GOLD_COLOR: '#fbbf24',
    BADGE_PREFIX: 'TƯỚNG TỦ',
  },
  TIKTOK_ENGAGEMENT: {
    FOLLOW_FURY_GAIN: 10,
    SHARE_BURST_DAMAGE: 500,
    SHARE_HEAL_AMOUNT: 50,
    GIFT_DAMAGE_PER_COIN: 120,
    GIFT_HEAL_AMOUNT: 50,
    STREAK_BURST_METEOR_COUNT: 3,
    DEFAULT_METEOR_COUNT: 8,
  },
  MINION_FURY: {
    MAX_FURY: 100,
    GAIN_PER_ATTACK: 25, // +25 Nộ mỗi lần tướng triệu hồi tung đòn đánh thường
    ULTIMATE_DAMAGE_MULTIPLIER: 2.2, // 2.2x sát thương khi tướng triệu hồi đầy 100% Nộ
    HEART_TAP_GAIN_BASE: 6, // +6 Nộ cơ bản cho tướng triệu hồi mỗi nhịp thả tim
    HEART_TAP_RAPID_WINDOW_MS: 900, // Khoảng cách giữa các lần tap được tính là tap nhanh liên tục
    HEART_TAP_SPEED_WINDOW_MS: 2500, // Thời gian duy trì bội số tăng tốc Nộ sau cú tap gần nhất
    HEART_TAP_MULTIPLIER_STEP: 0.22, // Mỗi lần tap liên tiếp tăng thêm 0.22x tốc độ tích Nộ
    HEART_TAP_MULTIPLIER_MAX: 3.0, // Tối đa 3.0x tốc độ tích Nộ khi tap tim liên tục
    HEART_TAP_ATTACK_SPEED_MAX: 1.75, // Tối đa 1.75x tốc độ ra đòn cho tướng triệu hồi khi tap tim nhanh
  },
  AUDIO: {
    DEFAULT_ENABLED: true,
    DEFAULT_TTS_ENABLED: false,
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
  { champion: 'Jax', team: TEAM_KEY.BLG, damage: 2200, comment: 'Jax BLG Nhảy Nện gõ Boss!' },
  { champion: 'Xin Zhao', team: TEAM_KEY.BLG, damage: 1800, comment: 'Phong Lôi Thương BLG càn quét!' },
  { champion: 'Ahri', team: TEAM_KEY.BLG, damage: 2400, comment: 'Quả Cầu Ma Thuật BLG dồn dame!' },
  { champion: "Kai'Sa", team: TEAM_KEY.BLG, damage: 3200, comment: 'Cơn Mưa Icathia BLG bắn phá Baron!' },
  { champion: 'Rakan', team: TEAM_KEY.BLG, damage: 1600, comment: 'Xuất Hiện Hoành Tráng BLG!' },
  { champion: "K'Sante", team: TEAM_KEY.GENG, damage: 2100, comment: "K'Sante Gen.G Chơi Khô Máu!" },
  { champion: 'Nidalee', team: TEAM_KEY.GENG, damage: 2600, comment: 'Phóng Lao Cực Đại Gen.G xuyên tim Boss!' },
  { champion: 'Yone', team: TEAM_KEY.GENG, damage: 3400, comment: 'Đoạt Mệnh & Trảm Hồn Gen.G lướt chém!' },
  { champion: 'Ezreal', team: TEAM_KEY.GENG, damage: 2800, comment: 'Cung Ánh Sáng Gen.G bắn tỉa!' },
  { champion: 'Nautilus', team: TEAM_KEY.GENG, damage: 1500, comment: 'Thủy Lôi Tầm Nhiệt Gen.G giữ chân!' },
  { champion: 'Zed', team: TEAM_KEY.BLG, damage: 2500, comment: 'Dấu Ấn Tử Thần BLG sát thương bùng nổ!' },
  { champion: 'Yasuo', team: TEAM_KEY.GENG, damage: 2700, comment: 'Hasagi Trăn Trối Gen.G lướt kiếm!' },
  { champion: 'Aatrox', team: TEAM_KEY.BLG, damage: 3100, comment: 'Đường Kiếm Darkin BLG chém sập Baron!' },
  { champion: 'Sylas', team: TEAM_KEY.GENG, damage: 2900, comment: 'Tước Đoạt Tuyệt Kỹ Gen.G phản kích!' },
] as const;

export const GAME_THEME = {
  BARON: 'BARON',
  ELDER_DRAGON: 'ELDER_DRAGON',
} as const;

export type GameThemeType = (typeof GAME_THEME)[keyof typeof GAME_THEME];

export const THEME_STORAGE_KEY = 'lol_game_theme_config';

export const THEME_CONFIGS: Record<
  GameThemeType,
  {
    id: GameThemeType;
    nameVi: string;
    bossName: string;
    roarTextVi: string;
    backgroundImageWebp: string;
    backgroundImagePng: string;
    bossImageWebp: string;
    bossImagePng: string;
    auraColorClass: {
      idle: string;
      enraged: string;
      roar: string;
    };
    ambientMistClass: string;
    bossScale: string;
    avatarIcon: string;
    containerPosition: string;
    spriteSize: string;
    groundAuraClass: string;
  }
> = {
  [GAME_THEME.BARON]: {
    id: GAME_THEME.BARON,
    nameVi: 'Hang Baron Hư Không',
    bossName: 'Baron Nashor CKTG',
    roarTextVi: 'BARON GẦM RÚ HƯ KHÔNG!',
    backgroundImageWebp: '/images/arena_background_2d.webp',
    backgroundImagePng: '/images/arena_background_2d.png',
    bossImageWebp: '/images/boss_baron_2d.webp',
    bossImagePng: '/images/boss_baron_2d.png',
    auraColorClass: {
      idle: 'bg-purple-600/35 shadow-[0_0_90px_rgba(168,85,247,0.5)]',
      enraged: 'bg-rose-600/50 shadow-[0_0_120px_rgba(244,63,94,0.7)]',
      roar: 'bg-violet-500/60 shadow-[0_0_140px_rgba(139,92,246,0.85)]',
    },
    ambientMistClass: 'from-transparent via-purple-950/20 to-slate-950/40',
    bossScale: 'scale-100',
    avatarIcon: '/images/boss_baron_2d.png',
    containerPosition: 'top-[59.5%] sm:top-[60%]',
    spriteSize: 'w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96',
    groundAuraClass: 'top-[78%] w-64 h-16 bg-purple-500/20',
  },
  [GAME_THEME.ELDER_DRAGON]: {
    id: GAME_THEME.ELDER_DRAGON,
    nameVi: 'Hang Rồng Ngàn Tuổi',
    bossName: 'Rồng Ngàn Tuổi CKTG',
    roarTextVi: 'LONG THẦN THỔI LỬA NGUYÊN TỐ!',
    backgroundImageWebp: '/images/arena_elder_dragon_2d.webp',
    backgroundImagePng: '/images/arena_elder_dragon_2d.png',
    bossImageWebp: '/images/boss_elder_dragon_2d.webp',
    bossImagePng: '/images/boss_elder_dragon_2d.png',
    auraColorClass: {
      idle: 'bg-cyan-500/35 shadow-[0_0_90px_rgba(6,182,212,0.55)]',
      enraged: 'bg-amber-500/50 shadow-[0_0_120px_rgba(245,158,11,0.75)]',
      roar: 'bg-gradient-to-r from-cyan-400 to-amber-400 shadow-[0_0_140px_rgba(251,191,36,0.85)]',
    },
    ambientMistClass: 'from-transparent via-cyan-950/25 to-amber-950/35',
    bossScale: 'scale-105',
    avatarIcon: '/images/elder_dragon_icon_135001.webp',
    containerPosition: 'top-[59.5%] sm:top-[60%]',
    spriteSize: 'w-[430px] h-[240px] sm:w-[490px] sm:h-[275px] md:w-[560px] md:h-[315px]',
    groundAuraClass: 'top-[80%] w-80 h-16 bg-cyan-500/30',
  },
};

export const ASSET_PATHS = {
  ARENA_BACKGROUND_WEBP: '/images/arena_background_2d.webp',
  ARENA_BACKGROUND_PNG: '/images/arena_background_2d.png',
  BOSS_BARON_WEBP: '/images/boss_baron_2d.webp',
  BOSS_BARON_PNG: '/images/boss_baron_2d.png',
  BOSS_ELDER_DRAGON_WEBP: '/images/boss_elder_dragon_2d.webp',
  BOSS_ELDER_DRAGON_PNG: '/images/boss_elder_dragon_2d.png',
  ARENA_ELDER_DRAGON_WEBP: '/images/arena_elder_dragon_2d.webp',
  ARENA_ELDER_DRAGON_PNG: '/images/arena_elder_dragon_2d.png',
} as const;

export const UI_CONSTANTS = {
  HIT_ANIMATION_DURATION_MS: 220,
  GHOST_HP_DELAY_MS: 350,
} as const;

export const GUEST_SIMULATION_CONSTANTS = {
  DEFAULT_NAME: 'Khách_VIP_88',
  GIFTS: [
    { id: 'rose', name: 'Hoa Hồng 🌹', coins: 1, label: 'Thường', icon: '🌹', color: '#f43f5e' },
    { id: 'cookie', name: 'Bánh Quy 🍪', coins: 10, label: 'Thường', icon: '🍪', color: '#f59e0b' },
    { id: 'watergun', name: 'Súng Nước 🔫', coins: 50, label: 'Hiếm', icon: '🔫', color: '#06b6d4' },
    { id: 'heart_worlds', name: 'Trái Tim CKTG 💖', coins: 199, label: 'Hiếm', icon: '💖', color: '#ec4899' },
    { id: 'dragon', name: 'Rồng Thần CKTG 🐉', coins: 1000, label: 'VIP', icon: '🐉', color: '#eab308' },
    { id: 'phoenix', name: 'Phượng Hoàng Lửa 🔥', coins: 2500, label: 'VIP', icon: '🔥', color: '#ef4444' },
  ],
  QUICK_CHAMPIONS: {
    [TEAM_KEY.BLG]: ['Jax', 'Nidalee', 'Ahri', "Kai'Sa", 'Rakan', 'Aatrox', 'Zed'],
    [TEAM_KEY.GENG]: ["K'Sante", 'Lee Sin', 'Yone', 'Ezreal', 'Leona', 'Yasuo', 'Sylas'],
  },
  PRESET_CHATS: {
    [TEAM_KEY.BLG]: [
      'BLG Vô Địch! 🔥',
      'Bin gánh team!',
      'Knight xuất chiêu!',
      'Viper bắn cháy máy!',
    ],
    [TEAM_KEY.GENG]: [
      'GEN.G Cố Lên! ⚡',
      'Chovy out trình!',
      'Canyon bắt lẻ đỉnh!',
      'Ruler xả sát thương!',
    ],
  },
} as const;

export const BOSS_ANIMATION_CONSTANTS = {
  HIT_DURATION_MS: 320,
  HEAVY_HIT_DURATION_MS: 440,
  ATTACK_DURATION_MS: 750,
  ULTIMATE_ATTACK_DURATION_MS: 950,
  GROUND_SHOCKWAVE_DURATION_MS: 700,
} as const;

export const BOSS_DEFEAT_CONSTANTS = {
  VICTORY_DELAY_MS: 2800,
  SHATTER_ANIMATION_MS: 1350,
  CRACK_PHASE_END_RATIO: 0.22,
  EXPLOSION_END_RATIO: 0.65,
  SHOCKWAVE_RADIUS_INNER: 4.5,
  SHOCKWAVE_RADIUS_MID: 7.5,
  SHOCKWAVE_RADIUS_OUTER: 10.5,
  BURST_STAGGER_MS: 140,
  SCREEN_SHAKE_INTENSITY: 1.75,
  SHARD_COUNT: 38,
  SOUL_STREAM_COUNT: 14,
  BLG_STREAM_TARGET_X: -4.2,
  GENG_STREAM_TARGET_X: 4.2,
  BARON_DEFEAT_COLOR: '#a855f7',
  BARON_SECONDARY_COLOR: '#38bdf8',
  ELDER_DRAGON_DEFEAT_COLOR: '#f59e0b',
  ELDER_SECONDARY_COLOR: '#fef08a',
} as const;

export const BOSS_ENRAGED_CONSTANTS = {
  HEALTH_THRESHOLD_PERCENT: 0.35,
  ENTRANCE_BANNER_DURATION_MS: 3800,
  SCREEN_SHAKE_INTENSITY: 1.4,
  SCREEN_FLASH_COLOR: '#ef4444',
  EYE_COLOR_BARON: '#f43f5e',
  EYE_COLOR_ELDER: '#f97316',
  ATTACK_INTERVAL_MULTIPLIER: 0.65,
  RETALIATION_INTERVAL_MS: 3800,
  NORMAL_RETALIATION_INTERVAL_MS: 7500,
  DAMAGE_BOOST_MULTIPLIER: 1.5,
} as const;

export const BOSS_CREST_CONSTANTS = {
  FLOAT_DURATION_MS: 3000,
  ORBITAL_SPIN_DURATION_MS: 8000,
  REVEAL_DELAY_MS: 1800,
  COLOR_BLG: '#00f2fe',
  COLOR_GENG: '#f59e0b',
  COLOR_BARON_VOID: '#c084fc',
} as const;

export const BOSS_IDLE_CONSTANTS = {
  RESTLESS_THRESHOLD_MS: 9000,
  AMBIENT_ACTION_INTERVAL_MS: 4500,
  POKE_DURATION_MS: 480,
  SPEECH_BUBBLE_DURATION_MS: 5500,
  SPEECH_COOLDOWN_MS: 16000,
  EYE_SURGE_DURATION_MS: 1400,
  WING_GUST_DURATION_MS: 1100,
  AMBIENT_ROAR_MIN_MS: 12000,
  AMBIENT_ROAR_MAX_MS: 20000,
  AMBIENT_ROAR_DURATION_MS: 900,
  FLIP_MIN_INTERVAL_MS: 9000,
  FLIP_MAX_INTERVAL_MS: 15000,
  FLIP_COOLDOWN_MS: 2800,
  FLIP_TRANSITION_MS: 480,
  VERTICAL_PATROL_MIN_INTERVAL_MS: 6500,
  VERTICAL_PATROL_MAX_INTERVAL_MS: 11000,
  VERTICAL_PATROL_TRANSITION_MS: 1600,
  VERTICAL_TIERS_DRAGON_PX: [-26, 0, 14],
  VERTICAL_TIERS_BARON_PX: [-14, 0, 12],
} as const;

export const BOSS_IDLE_SPEECHES = {
  ELDER_DRAGON: {
    POKE: [
      'Dám chọc giận Long Tộc sao?!',
      'Kẻ nào to gan dám chạm vào ta?!',
      'Mau triệu hồi anh hùng của các ngươi!',
      'Lửa rồng sẽ thiêu rụi tất cả!',
      'Ngươi nghĩ ta là thú cưng sao?!',
    ],
    AMBIENT: [
      'Đấu trường này là của Rồng Ngàn Tuổi!',
      'Kẻ nào dám nghênh chiến?',
      'Long lực cổ đại đang dâng trào...',
      'Đội nào sẽ trở thành tro bụi trước sức mạnh Long Thần?',
    ],
    RESTLESS: [
      'Đấu trường quá yên tĩnh... Triệu hồi tướng mau!',
      'Ta đang mất kiên nhẫn đấy!',
      'Hãy thả tim và comment triệu hồi tướng đi!',
    ],
  },
  BARON: {
    POKE: [
      'Grừừ... Dám chọc vào Hư Không sao?!',
      'Ngươi muốn làm mồi cho sâu bọ à?!',
      'Triệu hồi thêm tướng mau lên!',
      'Chỉ có thế thôi sao?!',
      'Hư Không sẽ nuốt chửng ngươi!',
    ],
    AMBIENT: [
      'Hư Không đang vẫy gọi...',
      'Các ngươi run sợ trước Baron rồi sao?',
      'Ai sẽ là kẻ đầu tiên ngã xuống?',
      'Nọc độc đang sôi sục trong tĩnh mạch...',
    ],
    RESTLESS: [
      'Không ai dám đấu với ta sao?!',
      'Mau triệu hồi trợ thủ đi nào!',
      'Baron đang đói khát chiến binh...',
    ],
  },
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
    GEN: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      accent: '#ffa751',
      crit: '#fde047',
    },
  },
  BOSS_TARGET: [0, 0.45, 0] as readonly [number, number, number],
  WING_BOUNDS: {
    [TEAM_KEY.BLG]: {
      minX: -2.35,
      maxX: -1.35,
      minY: -0.75,
      maxY: 0.95,
      minZ: 0.5,
      maxZ: 2.1,
    },
    [TEAM_KEY.GENG]: {
      minX: 1.35,
      maxX: 2.35,
      minY: -0.75,
      maxY: 0.95,
      minZ: 0.5,
      maxZ: 2.1,
    },
    GEN: {
      minX: 1.35,
      maxX: 2.35,
      minY: -0.75,
      maxY: 0.95,
      minZ: 0.5,
      maxZ: 2.1,
    },
  },
  CHAMPION_MOVEMENT: {
    TOKEN_SCALE: 0.62,
    MIN_SPEED: 0.85,
    MAX_SPEED: 1.65,
    WANDER_INTERVAL_MIN_S: 1.8,
    WANDER_INTERVAL_MAX_S: 3.5,
    ATTACK_INTERVAL_MIN_S: 0.9,
    ATTACK_INTERVAL_MAX_S: 1.7,
    CAST_RECOIL_DISTANCE: 0.08,
    CAST_LIFT_HEIGHT: 0.08,
    ATTACK_DURATION_S: 0.34,
    BOB_AMPLITUDE: 0.12,
    BOB_SPEED: 2.8,
    ENTRANCE_DURATION_MS: 750,
    ENTRANCE_SWOOP_Y: 0.32,
    ENTRANCE_SWOOP_X: 0.0,
    DEFEAT_DURATION_MS: 700,
    VIEWPORT_SAFE_NDC_X: 0.86,
    VIEWPORT_SAFE_NDC_Y_MIN: -0.80,
    VIEWPORT_SAFE_NDC_Y_MAX: 0.65,
    NAMEPLATE_WIDTH: 0.54,
    NAMEPLATE_HEIGHT: 0.135,
    NAMEPLATE_POS_Y: -0.28,
    NAMEPLATE_POS_Z: 0.04,
  },
  SUMMON: {
    PORTAL_DURATION_MS: 1200,
    SPOTLIGHT_DURATION_MS: 2200,
    MAX_ACTIVE_PORTALS: 8,
    MAX_VISIBLE_ORBS: 16,
    MAX_VISIBLE_BADGES_PER_TEAM: 4,
    CRIT_CHANCE: 0.28,
    CRIT_MULTIPLIER: 4,
    NORMAL_MULTIPLIER: 2,
    CRIT_FOLLOWUP_DELAY_MS: 95,
    PORTAL_BURST_PARTICLES: 20,
  },
  DAMAGE: {
    PROJECTILE_DURATION_MS: 420,
    PROJECTILE_MAX_ACTIVE: 36,
    BARRAGE_INTERVAL_S: 0.24,
    DPS_TICK_INTERVAL_S: 1.0,
    SLASH_DURATION_S: 0.36,
    MAX_ACTIVE_SLASHES: 8,
    HIT_IMPACT_DURATION_MS: 420,
    MAX_ACTIVE_HIT_IMPACTS: 6,
    FLOATING_DURATION_MS: 1200,
    MAX_FLOATING_DAMAGE: 8,
    FLOATING_SCALE_NORMAL: 0.95,
    FLOATING_SCALE_CRIT: 1.0,
    FLOATING_SCALE_ULTIMATE: 1.12,
    COMBO_WINDOW_MS: 2800,
    CRIT_SHOCKWAVE_RADIUS: 2.2,
    ULTIMATE_SHOCKWAVE_RADIUS: 3.2,
  },
  PARTICLES: {
    MAX_BURST_QUEUE: 6,
    BURST_COUNT_NORMAL: 16,
    BURST_COUNT_CRIT: 36,
    BURST_COUNT_ULTIMATE: 80,
    BURST_COUNT_SUMMON: 28,
    INTENSITY_NORMAL: 1,
    INTENSITY_CRIT: 2,
    INTENSITY_ULTIMATE: 4,
    SPEED_MIN: 2.2,
    SPEED_MULTIPLIER: 2.1,
  },
} as const;

export const CKTG_VFX_CONFIG = {
  SMITE_CHANCE_ON_CRIT: 0.75,
  CREST_SCALE: {
    NORMAL: 1.0,
    CRIT: 1.45,
    ULTIMATE: 1.85,
  },
  TEAM_BRANDING: {
    [TEAM_KEY.BLG]: {
      name: 'Bilibili Gaming',
      tag: 'BLG',
      primaryNeon: '#00f2fe',
      secondaryNeon: '#ff6699',
      glow: '0 0 20px #00f2fe, 0 0 40px #ff6699',
      tagBadgeClass: 'bg-cyan-950/90 border border-cyan-400 text-cyan-200',
    },
    [TEAM_KEY.GENG]: {
      name: 'Gen.G Esports',
      tag: 'GEN',
      primaryNeon: '#ffe259',
      secondaryNeon: '#ffa751',
      glow: '0 0 20px #ffe259, 0 0 40px #ffa751',
      tagBadgeClass: 'bg-amber-950/90 border border-amber-400 text-amber-200',
    },
  },
} as const;

export const COMBO_TIER_CONFIG = {
  NORMAL: {
    min: 2,
    max: 9,
    tagKey: 'Combat.comboNormal',
    tagFallback: 'COMBO',
  },
  GREAT: {
    min: 10,
    max: 24,
    tagKey: 'Combat.comboGreat',
    tagFallback: 'GREAT COMBO!',
  },
  SUPER: {
    min: 25,
    max: 49,
    tagKey: 'Combat.comboSuper',
    tagFallback: 'SUPER COMBO!!',
  },
  HYPER: {
    min: 50,
    max: Infinity,
    tagKey: 'Combat.comboHyper',
    tagFallback: 'HYPER COMBO 👑',
  },
} as const;

export const OVERLAY_SECTION = {
  CHAT: 'chat',
  LEADERBOARD: 'leaderboard',
  TEAM_ROSTERS: 'teamRosters',
  BOSS_HEALTH: 'bossHealth',
  TEAM_SCORES: 'teamScores',
  LIKE_COUNTER: 'likeCounter',
  HOW_TO_PLAY: 'howToPlay',
} as const;

export type OverlaySectionKey = (typeof OVERLAY_SECTION)[keyof typeof OVERLAY_SECTION];

export const DEFAULT_OVERLAY_VISIBILITY = {
  chat: true,
  leaderboard: true,
  teamRosters: true,
  bossHealth: true,
  teamScores: true,
  likeCounter: true,
  howToPlay: true,
} as const;

export const OVERLAY_STORAGE_KEY = 'lol_overlay_visibility_config';

export const ARROW_VFX_CONFIG = {
  DURATION_MS: 660,
  MAX_ACTIVE: 24,
  COLORS: {
    BLG: '#06b6d4',
    BLG_CRIT: '#38bdf8',
    GENG: '#eab308',
    GENG_CRIT: '#f59e0b',
  },
} as const;

export const CHAMPION_SKILL_VFX_TYPE = {
  SHURIKEN: 'SHURIKEN',
  LASER: 'LASER',
  TORNADO: 'TORNADO',
  SPIRIT_ORB: 'SPIRIT_ORB',
  VOID_MISSILE: 'VOID_MISSILE',
  JAVELIN: 'JAVELIN',
  CRESCENT_ARC: 'CRESCENT_ARC',
  SONIC_WAVE: 'SONIC_WAVE',
  MELEE_LEAP: 'MELEE_LEAP',
  BLADE_SLASH: 'BLADE_SLASH',
  SPINNING_LANTERN: 'SPINNING_LANTERN',
  WIND_SPEAR: 'WIND_SPEAR',
  NTOFO_SLAM: 'NTOFO_SLAM',
  ANCHOR_DEPTH: 'ANCHOR_DEPTH',
  GOLDEN_FEATHER: 'GOLDEN_FEATHER',
  SAND_SOLDIER: 'SAND_SOLDIER',
  DARKIN_BLADE: 'DARKIN_BLADE',
  SPINNING_AXE: 'SPINNING_AXE',
  ROCKET_MISSILE: 'ROCKET_MISSILE',
  SHOCK_ORB: 'SHOCK_ORB',
  SPIRIT_SPEAR: 'SPIRIT_SPEAR',
  ARROW: 'ARROW',
} as const;

export type ChampionSkillVFXType =
  (typeof CHAMPION_SKILL_VFX_TYPE)[keyof typeof CHAMPION_SKILL_VFX_TYPE];

export interface ChampionVFXConfig {
  type: ChampionSkillVFXType;
  skillName: string;
  ultimateType: ChampionSkillVFXType;
  ultimateSkillName: string;
  glowColor: string;
  coreColor: string;
}

export const CHAMPION_VFX_MAP: Record<string, ChampionVFXConfig> = {
  // --- BLG ROSTER ---
  jax: {
    type: CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN,
    skillName: 'Nhảy Nện [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN,
    ultimateSkillName: 'Sức Mạnh Bậc Thầy [R]',
    glowColor: '#38bdf8',
    coreColor: '#fef08a',
  },
  bin: {
    type: CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN,
    skillName: 'Phản Công [E]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN,
    ultimateSkillName: 'Sức Mạnh Bậc Thầy [R]',
    glowColor: '#38bdf8',
    coreColor: '#fef08a',
  },
  xinzhao: {
    type: CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR,
    skillName: 'Phong Lôi Thương [W]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR,
    ultimateSkillName: 'Bán Nguyệt Thương [R]',
    glowColor: '#06b6d4',
    coreColor: '#ffffff',
  },
  'xin zhao': {
    type: CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR,
    skillName: 'Phong Lôi Thương [W]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR,
    ultimateSkillName: 'Bán Nguyệt Thương [R]',
    glowColor: '#06b6d4',
    coreColor: '#ffffff',
  },
  xun: {
    type: CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR,
    skillName: 'Can Trường [E]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR,
    ultimateSkillName: 'Bán Nguyệt Thương [R]',
    glowColor: '#06b6d4',
    coreColor: '#ffffff',
  },
  ahri: {
    type: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    skillName: 'Quả Cầu Ma Thuật [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    ultimateSkillName: 'Hôn Gió Phi Hồ [R]',
    glowColor: '#06b6d4',
    coreColor: '#ec4899',
  },
  knight: {
    type: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    skillName: 'Quả Cầu Ma Thuật [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    ultimateSkillName: 'Hôn Gió Phi Hồ [R]',
    glowColor: '#06b6d4',
    coreColor: '#ec4899',
  },
  kaisa: {
    type: CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE,
    skillName: 'Cơn Mưa Icathia [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE,
    ultimateSkillName: 'Bản Năng Sát Thủ [R]',
    glowColor: '#a855f7',
    coreColor: '#e0e7ff',
  },
  "kai'sa": {
    type: CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE,
    skillName: 'Cơn Mưa Icathia [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE,
    ultimateSkillName: 'Bản Năng Sát Thủ [R]',
    glowColor: '#a855f7',
    coreColor: '#e0e7ff',
  },
  elk: {
    type: CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE,
    skillName: 'Cơn Mưa Icathia [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE,
    ultimateSkillName: 'Bản Năng Sát Thủ [R]',
    glowColor: '#a855f7',
    coreColor: '#06b6d4',
  },
  rakan: {
    type: CHAMPION_SKILL_VFX_TYPE.GOLDEN_FEATHER,
    skillName: 'Phi Tiêu Lông Vũ [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.GOLDEN_FEATHER,
    ultimateSkillName: 'Bộ Pháp Thần Tốc [R]',
    glowColor: '#38bdf8',
    coreColor: '#fbbf24',
  },
  on: {
    type: CHAMPION_SKILL_VFX_TYPE.GOLDEN_FEATHER,
    skillName: 'Xuất Hiện Hoành Tráng [W]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.GOLDEN_FEATHER,
    ultimateSkillName: 'Bộ Pháp Thần Tốc [R]',
    glowColor: '#38bdf8',
    coreColor: '#fbbf24',
  },

  // --- GEN.G ROSTER ---
  ksante: {
    type: CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM,
    skillName: 'Tàn Phá [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM,
    ultimateSkillName: 'Chơi Khô Máu [R]',
    glowColor: '#f59e0b',
    coreColor: '#ef4444',
  },
  "k'sante": {
    type: CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM,
    skillName: 'Tàn Phá [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM,
    ultimateSkillName: 'Chơi Khô Máu [R]',
    glowColor: '#f59e0b',
    coreColor: '#ef4444',
  },
  kiin: {
    type: CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM,
    skillName: 'Mở Đường [W]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM,
    ultimateSkillName: 'Chơi Khô Máu [R]',
    glowColor: '#f59e0b',
    coreColor: '#ef4444',
  },
  nidalee: {
    type: CHAMPION_SKILL_VFX_TYPE.JAVELIN,
    skillName: 'Phóng Lao [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.JAVELIN,
    ultimateSkillName: 'Cú Vồ Báo Chúa [R]',
    glowColor: '#eab308',
    coreColor: '#84cc16',
  },
  canyon: {
    type: CHAMPION_SKILL_VFX_TYPE.JAVELIN,
    skillName: 'Phóng Lao Cực Đại [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.JAVELIN,
    ultimateSkillName: 'Cú Vồ Báo Chúa [R]',
    glowColor: '#f59e0b',
    coreColor: '#84cc16',
  },
  yone: {
    type: CHAMPION_SKILL_VFX_TYPE.BLADE_SLASH,
    skillName: 'Tử Kiếm [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.BLADE_SLASH,
    ultimateSkillName: 'Đoạt Mệnh [R]',
    glowColor: '#ef4444',
    coreColor: '#38bdf8',
  },
  chovy: {
    type: CHAMPION_SKILL_VFX_TYPE.BLADE_SLASH,
    skillName: 'Xuất Hồn [E]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.BLADE_SLASH,
    ultimateSkillName: 'Đoạt Mệnh [R]',
    glowColor: '#f59e0b',
    coreColor: '#ef4444',
  },
  ezreal: {
    type: CHAMPION_SKILL_VFX_TYPE.CRESCENT_ARC,
    skillName: 'Phát Bắn Thần Bí [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.CRESCENT_ARC,
    ultimateSkillName: 'Cung Ánh Sáng [R]',
    glowColor: '#fbbf24',
    coreColor: '#ffffff',
  },
  ruler: {
    type: CHAMPION_SKILL_VFX_TYPE.CRESCENT_ARC,
    skillName: 'Tinh Hoa Huyền Bí [W]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.CRESCENT_ARC,
    ultimateSkillName: 'Cung Ánh Sáng [R]',
    glowColor: '#f59e0b',
    coreColor: '#ffffff',
  },
  nautilus: {
    type: CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH,
    skillName: 'Phóng Mỏ Neo [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH,
    ultimateSkillName: 'Thủy Lôi Tầm Nhiệt [R]',
    glowColor: '#0284c7',
    coreColor: '#38bdf8',
  },
  duro: {
    type: CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH,
    skillName: 'Thủy Triều Dữ Dội [E]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH,
    ultimateSkillName: 'Thủy Lôi Tầm Nhiệt [R]',
    glowColor: '#eab308',
    coreColor: '#38bdf8',
  },

  // --- POPULAR / LEGENDARY CHAMPIONS ---
  azir: {
    type: CHAMPION_SKILL_VFX_TYPE.SAND_SOLDIER,
    skillName: 'Cát Lưu Binh [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SAND_SOLDIER,
    ultimateSkillName: 'Phân Chia Thiên Hạ [R]',
    glowColor: '#f59e0b',
    coreColor: '#fef08a',
  },
  faker: {
    type: CHAMPION_SKILL_VFX_TYPE.SAND_SOLDIER,
    skillName: 'Đế Vương Shurima [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SAND_SOLDIER,
    ultimateSkillName: 'Phân Chia Thiên Hạ [R]',
    glowColor: '#f59e0b',
    coreColor: '#fef08a',
  },
  yasuo: {
    type: CHAMPION_SKILL_VFX_TYPE.TORNADO,
    skillName: 'Bão Kiếm [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.TORNADO,
    ultimateSkillName: 'Trăn Trối [R]',
    glowColor: '#38bdf8',
    coreColor: '#ffffff',
  },
  zed: {
    type: CHAMPION_SKILL_VFX_TYPE.SHURIKEN,
    skillName: 'Phi Tiêu Sắc Lẻm [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SHURIKEN,
    ultimateSkillName: 'Dấu Ấn Tử Thần [R]',
    glowColor: '#ef4444',
    coreColor: '#ffffff',
  },
  akali: {
    type: CHAMPION_SKILL_VFX_TYPE.SHURIKEN,
    skillName: 'Phi Đao Năm Điểm [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SHURIKEN,
    ultimateSkillName: 'Sát Chiêu Hoàn Hảo [R]',
    glowColor: '#10b981',
    coreColor: '#ffffff',
  },
  lux: {
    type: CHAMPION_SKILL_VFX_TYPE.LASER,
    skillName: 'Khóa Ánh Sáng [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.LASER,
    ultimateSkillName: 'Cầu Vồng Tối Thượng [R]',
    glowColor: '#ec4899',
    coreColor: '#ffffff',
  },
  aatrox: {
    type: CHAMPION_SKILL_VFX_TYPE.DARKIN_BLADE,
    skillName: 'Đường Kiếm Darkin [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.DARKIN_BLADE,
    ultimateSkillName: 'Chiến Binh Tận Thế [R]',
    glowColor: '#dc2626',
    coreColor: '#f87171',
  },
  leesin: {
    type: CHAMPION_SKILL_VFX_TYPE.SONIC_WAVE,
    skillName: 'Sóng Âm [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SONIC_WAVE,
    ultimateSkillName: 'Nộ Long Cước [R]',
    glowColor: '#0284c7',
    coreColor: '#bae6fd',
  },
  'lee sin': {
    type: CHAMPION_SKILL_VFX_TYPE.SONIC_WAVE,
    skillName: 'Sóng Âm [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SONIC_WAVE,
    ultimateSkillName: 'Nộ Long Cước [R]',
    glowColor: '#0284c7',
    coreColor: '#bae6fd',
  },
  draven: {
    type: CHAMPION_SKILL_VFX_TYPE.SPINNING_AXE,
    skillName: 'Rìu Xoay [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPINNING_AXE,
    ultimateSkillName: 'Lốc Xoáy Tử Thần [R]',
    glowColor: '#ef4444',
    coreColor: '#fef08a',
  },
  'hans sama': {
    type: CHAMPION_SKILL_VFX_TYPE.SPINNING_AXE,
    skillName: 'Rìu Xoay [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPINNING_AXE,
    ultimateSkillName: 'Lốc Xoáy Tử Thần [R]',
    glowColor: '#ef4444',
    coreColor: '#fef08a',
  },
  jinx: {
    type: CHAMPION_SKILL_VFX_TYPE.ROCKET_MISSILE,
    skillName: 'Giật Bắn [W]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.ROCKET_MISSILE,
    ultimateSkillName: 'Tên Lửa Siêu Khủng Khiếp [R]',
    glowColor: '#ec4899',
    coreColor: '#38bdf8',
  },
  gumayusi: {
    type: CHAMPION_SKILL_VFX_TYPE.ARROW,
    skillName: 'Mũi Tên Xuyên Phá [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.ARROW,
    ultimateSkillName: 'Sợi Xích Tội Lỗi [R]',
    glowColor: '#dc2626',
    coreColor: '#ffffff',
  },
  kalista: {
    type: CHAMPION_SKILL_VFX_TYPE.SPIRIT_SPEAR,
    skillName: 'Đâm Thấu [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPIRIT_SPEAR,
    ultimateSkillName: 'Định Mệnh Vẫy Gọi [R]',
    glowColor: '#10b981',
    coreColor: '#6ee7b7',
  },
  jayce: {
    type: CHAMPION_SKILL_VFX_TYPE.SHOCK_ORB,
    skillName: 'Cầu Sấm [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SHOCK_ORB,
    ultimateSkillName: 'Cổng Gia Tốc Siêu Nạp [E-Q]',
    glowColor: '#38bdf8',
    coreColor: '#ffffff',
  },
  varus: {
    type: CHAMPION_SKILL_VFX_TYPE.ARROW,
    skillName: 'Mũi Tên Xuyên Phá [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.ARROW,
    ultimateSkillName: 'Sợi Xích Tội Lỗi [R]',
    glowColor: '#a855f7',
    coreColor: '#ffffff',
  },
  ashe: {
    type: CHAMPION_SKILL_VFX_TYPE.ARROW,
    skillName: 'Tán Xạ Tiễn [W]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.ARROW,
    ultimateSkillName: 'Đại Băng Tiễn [R]',
    glowColor: '#38bdf8',
    coreColor: '#ffffff',
  },
  syndra: {
    type: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    skillName: 'Quả Cầu Bóng Tối [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    ultimateSkillName: 'Bùng Nổ Sức Mạnh [R]',
    glowColor: '#7c3aed',
    coreColor: '#c084fc',
  },
  orianna: {
    type: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    skillName: 'Lệnh: Tấn Công [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    ultimateSkillName: 'Lệnh: Sóng Âm [R]',
    glowColor: '#0ea5e9',
    coreColor: '#e0f2fe',
  },
  thresh: {
    type: CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH,
    skillName: 'Án Tử [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH,
    ultimateSkillName: 'Đóng Băng Hồn [R]',
    glowColor: '#10b981',
    coreColor: '#6ee7b7',
  },
  keria: {
    type: CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH,
    skillName: 'Án Tử Thần Thánh [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH,
    ultimateSkillName: 'Đóng Băng Hồn [R]',
    glowColor: '#dc2626',
    coreColor: '#38bdf8',
  },
  doran: {
    type: CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN,
    skillName: 'Phản Công [E]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN,
    ultimateSkillName: 'Sức Mạnh Bậc Thầy [R]',
    glowColor: '#dc2626',
    coreColor: '#fef08a',
  },
  oner: {
    type: CHAMPION_SKILL_VFX_TYPE.SONIC_WAVE,
    skillName: 'Sóng Âm [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SONIC_WAVE,
    ultimateSkillName: 'Nộ Long Cước [R]',
    glowColor: '#dc2626',
    coreColor: '#bae6fd',
  },
  zeus: {
    type: CHAMPION_SKILL_VFX_TYPE.DARKIN_BLADE,
    skillName: 'Đường Kiếm Darkin [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.DARKIN_BLADE,
    ultimateSkillName: 'Chiến Binh Tận Thế [R]',
    glowColor: '#f97316',
    coreColor: '#ef4444',
  },
  viper: {
    type: CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE,
    skillName: 'Cơn Mưa Icathia [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE,
    ultimateSkillName: 'Bản Năng Sát Thủ [R]',
    glowColor: '#f97316',
    coreColor: '#a855f7',
  },
  caps: {
    type: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    skillName: 'Ảo Ảnh [W]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB,
    ultimateSkillName: 'Mô Phỏng [R]',
    glowColor: '#ef4444',
    coreColor: '#fbbf24',
  },
  artemis: {
    type: CHAMPION_SKILL_VFX_TYPE.ARROW,
    skillName: 'Mũi Tên Tinh Thể [Q]',
    ultimateType: CHAMPION_SKILL_VFX_TYPE.ARROW,
    ultimateSkillName: 'Bão Tên Ánh Sáng [R]',
    glowColor: '#eab308',
    coreColor: '#38bdf8',
  },
};

export const DEFAULT_CHAMPION_VFX: ChampionVFXConfig = {
  type: CHAMPION_SKILL_VFX_TYPE.ARROW,
  skillName: 'Phát Bắn Thường [Đòn Đánh]',
  ultimateType: CHAMPION_SKILL_VFX_TYPE.CRESCENT_ARC,
  ultimateSkillName: 'Tuyệt Kỹ Ánh Sáng [R]',
  glowColor: '#38bdf8',
  coreColor: '#ffffff',
};

export const getChampionSkillVFX = (
  championName: string,
  isCrit = false
): { type: ChampionSkillVFXType; skillName: string; glowColor: string; coreColor: string } => {
  const normalized = championName.trim().toLowerCase();

  // If not full fury / not crit -> Always standard clean auto-attack ("bắn thường")
  if (!isCrit) {
    const master = findMasterChampion(championName);
    const baseConfig = CHAMPION_VFX_MAP[normalized];
    const themeColor = master?.skill?.glowColor || baseConfig?.glowColor || '#38bdf8';
    return {
      type: CHAMPION_SKILL_VFX_TYPE.ARROW,
      skillName: 'Đòn Đánh Thường',
      glowColor: themeColor,
      coreColor: '#ffffff',
    };
  }

  // 1. Full Fury / Bạo Nộ: Check custom pro player & team specific overrides first
  if (CHAMPION_VFX_MAP[normalized]) {
    const baseConfig = CHAMPION_VFX_MAP[normalized];
    return {
      type: baseConfig.ultimateType,
      skillName: baseConfig.ultimateSkillName,
      glowColor: baseConfig.glowColor,
      coreColor: baseConfig.coreColor,
    };
  }

  for (const [key, config] of Object.entries(CHAMPION_VFX_MAP)) {
    if (normalized.includes(key)) {
      return {
        type: config.ultimateType,
        skillName: config.ultimateSkillName,
        glowColor: config.glowColor,
        coreColor: config.coreColor,
      };
    }
  }

  // 2. Full Fury / Bạo Nộ: Comprehensive 173 Champion Master Registry match
  const master = findMasterChampion(championName);
  if (master) {
    return {
      type: master.skill.ultimateVfxType as ChampionSkillVFXType,
      skillName: master.skill.ultimateSkillName,
      glowColor: master.skill.glowColor,
      coreColor: master.skill.coreColor,
    };
  }

  // 3. Fallback
  return {
    type: DEFAULT_CHAMPION_VFX.ultimateType,
    skillName: DEFAULT_CHAMPION_VFX.ultimateSkillName,
    glowColor: DEFAULT_CHAMPION_VFX.glowColor,
    coreColor: DEFAULT_CHAMPION_VFX.coreColor,
  };
};

export const AUTO_PRO_STORAGE_KEY = 'lol_auto_pro_battle_config';

export const AUTO_PRO_BATTLE_CONSTANTS = {
  DEFAULT_INTERVAL_MS: 2800,
  MIN_INTERVAL_MS: 900,
  MAX_INTERVAL_MS: 4500,
  TICK_MS: 120,
  INITIAL_STAGGER_MS: 220,
  DAMAGE_MIN: 85,
  DAMAGE_MAX: 155,
  CRIT_CHANCE: 0.12,
  CRIT_MULTIPLIER: 1.4,
  BOSS_HP_FLOOR_PERCENT: 0.15, // Auto-pro giữ nhịp tối đa tới 15% HP Boss, người xem phải ra đòn dứt điểm
  FLYING_ARROW_HIT_DELAY_MS: 580,
  ROSTER_ATTACK_GLOW_MS: 440,
  ROLE_COOLDOWN_FACTOR: {
    ADC: 0.85,
    MID: 0.94,
    JUG: 1.0,
    TOP: 1.1,
    SUP: 1.18,
  },
} as const;

export const BOSS_MECHANICS_CONSTANTS = {
  PHASES: {
    PHASE_2_THRESHOLD_PERCENT: 0.65,
    PHASE_3_THRESHOLD_PERCENT: 0.35,
  },
  SHIELD: {
    TRIGGER_THRESHOLDS: [0.5, 0.22] as readonly number[],
    SHIELD_HP: 6500,
    DURATION_MS: 12000,
    HEAL_PENALTY_AMOUNT: 8000,
    BREAK_BONUS_DAMAGE: 4000,
    BROKEN_BANNER_MS: 2200,
  },
  WEAK_POINT: {
    SPAWN_INTERVAL_MS: 14000,
    DURATION_MS: 6500,
    DAMAGE_MULTIPLIER: 2.0,
    POKE_BASE_DAMAGE: 350,
    SPOTS: ['left-horn', 'core-chest', 'right-claw'] as const,
  },
} as const;

export const AUDIO_SFX_CONSTANTS = {
  SKILL_THROTTLE_MS: 65,
  COMBO_MILESTONE_THROTTLE_MS: 1200,
  COMBO_EARLY_MILESTONES: [10, 25] as readonly number[],
  COMBO_STEP_MILESTONE: 50,
  UI_CLICK_FREQ_ON: 740,
  UI_CLICK_FREQ_OFF: 420,
} as const;

export const DEFAULT_AUTO_PRO_BATTLE_CONFIG = {
  enabled: false,
  onlyWhenIdle: true,
  intervalMs: AUTO_PRO_BATTLE_CONSTANTS.DEFAULT_INTERVAL_MS,
};

export const AUTO_SUMMON_STORAGE_KEY = 'lol_auto_summon_config';

export const AUTO_SUMMON_CONSTANTS = {
  DEFAULT_CHAMPION: 'Ahri',
  DEFAULT_SPEED_MS: 800,
  MIN_SPEED_MS: 200,
  MAX_SPEED_MS: 2000,
  SPEED_STEP_MS: 100,
  DEFAULT_BATCH_SIZE: 1,
  BATCH_SIZE_OPTIONS: [1, 2, 3, 4, 6, 8] as readonly number[],
  SPEED_PRESETS: [
    { speedMs: 400, labelVi: 'Siêu tốc (400ms)', labelEn: 'Turbo (400ms)' },
    { speedMs: 800, labelVi: 'Nhanh (800ms)', labelEn: 'Fast (800ms)' },
    { speedMs: 1500, labelVi: 'Vừa (1500ms)', labelEn: 'Normal (1500ms)' },
  ] as const,
  SWARM_COUNT: 10,
  CHAMPION_GRID_LIMIT: 60,
  FEEDBACK_DURATION_MS: 2400,
  DEFAULT_ADMIN_SUMMONER: 'Admin_Summon',
  DEFAULT_VIEWER_PREFIX: 'Viewer',
  VIEWER_NAMES: [
    'Minh',
    'Hùng',
    'Lan',
    'Tuấn',
    'Tài',
    'Vy',
    'Hân',
    'Linh',
    'Khang',
    'Phúc',
    'Nhi',
    'Quân',
  ] as readonly string[],
  VIEWER_SUFFIX_MIN: 10,
  VIEWER_SUFFIX_MOD: 90,
} as const;

export const DEFAULT_AUTO_SUMMON_CONFIG = {
  enabled: false,
  team: TEAM_KEY.BLG,
  selectedChampion: AUTO_SUMMON_CONSTANTS.DEFAULT_CHAMPION,
  speedMs: AUTO_SUMMON_CONSTANTS.DEFAULT_SPEED_MS,
  batchSize: AUTO_SUMMON_CONSTANTS.DEFAULT_BATCH_SIZE,
  alternateTeams: true,
  randomChampions: true,
};

export const ADMIN_CONSTANTS = {
  HP_PRESETS: [
    { label: '100,000 HP (Full)', hp: 100000, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' },
    { label: '30,000 HP (Cuồng Nộ)', hp: 30000, color: 'text-amber-400 border-amber-500/40 bg-amber-950/40' },
    { label: '15,000 HP (Kết Liễu)', hp: 15000, color: 'text-rose-400 border-rose-500/40 bg-rose-950/40' },
    { label: '0 HP (Hạ Gục)', hp: 0, color: 'text-red-500 border-red-500/50 bg-red-950/50' },
  ] as const,
  BOSS_SKILLS: [
    { index: 0, id: 'skill_1', nameVi: 'Mưa Gai / Hỏa Cầu (Skill 1)', nameEn: 'Spike Rain / Fireball (Skill 1)' },
    { index: 1, id: 'skill_2', nameVi: 'Quét Đuôi / Gió Bão (Skill 2)', nameEn: 'Tail Sweep / Tempest (Skill 2)' },
    { index: 2, id: 'skill_3', nameVi: 'Nuốt Chửng Hắc Ám (Skill 3)', nameEn: 'Void Devourer (Skill 3)' },
    { index: 3, id: 'skill_4', nameVi: 'Nộ Thần Thoại (Skill 4)', nameEn: 'Mythic Rage (Skill 4)' },
  ] as const,
  BOT_SPEED_PRESETS: [
    { speedMs: 500, labelVi: 'Nhanh (500ms)', labelEn: 'Fast (500ms)' },
    { speedMs: 1200, labelVi: 'Vừa (1200ms)', labelEn: 'Normal (1200ms)' },
    { speedMs: 2500, labelVi: 'Chậm (2500ms)', labelEn: 'Slow (2500ms)' },
  ] as const,
  PRO_INTERVAL_PRESETS: [
    { intervalMs: 1500, label: '1.5s' },
    { intervalMs: 2500, label: '2.5s' },
    { intervalMs: 4000, label: '4.0s' },
  ] as const,
  OVERLAYS: [
    { key: 'bossHealth', labelVi: 'Thanh Máu Quái Vật', labelEn: 'Boss Health Bar' },
    { key: 'teamScores', labelVi: 'Tỉ Số & Sát Thương BO5', labelEn: 'BO5 Scores & DPS' },
    { key: 'teamRosters', labelVi: 'Danh Sách Tuyển Thủ 2 Bên', labelEn: 'Team Roster Bars' },
    { key: 'leaderboard', labelVi: 'Bảng Xếp Hạng Top DPS', labelEn: 'DPS Leaderboard' },
    { key: 'chat', labelVi: 'Khung Bình Luận Trực Tiếp', labelEn: 'Live Chat Stream' },
    { key: 'likeCounter', labelVi: 'Đếm Lượt Tim & Tinh Thần', labelEn: 'Like Counter' },
    { key: 'howToPlay', labelVi: 'Cách Tham Gia & Quà Tặng', labelEn: 'How to Play & Rewards' },
  ] as const,
} as const;

export const DEFAULT_DUEL_STATE: SilverScrapesDuelState = {
  isActive: false,
  timeRemaining: 60,
  totalDuration: 60,
  tugOfWarPercent: 50,
  selectedLane: 'MID',
  leftFighter: {
    id: 'blg_mid',
    name: 'Knight',
    champion: 'Ahri',
    avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ahri.png',
    team: 'BLG',
  },
  rightFighter: {
    id: 'gen_mid',
    name: 'Chovy',
    champion: 'Yone',
    avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Yone.png',
    team: 'GENG',
  },
  winner: null,
  isLastStandActive: false,
  winningTeamBuff: null,
};

