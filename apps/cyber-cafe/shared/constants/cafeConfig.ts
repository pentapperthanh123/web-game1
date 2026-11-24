export const CAFE_PORTS = {
  CLIENT: 8050,
  ADMIN: 8051,
  GATEWAY: 5000,
  FALLBACK_SERVER: 4000,
} as const;

export const CAFE_SYNC_CHANNEL = 'CYBER_CAFE_SYNC_BUS' as const;

export const PERFORMANCE_LIMITS = {
  STAGE_WIDTH: 720,
  STAGE_HEIGHT: 1280,
  TARGET_FPS: 30,
  FRAME_INTERVAL_MS: 1000 / 30, // 33.33ms
  MAX_PARTICLES: 70,
  CHAT_COOLDOWN_PER_USER_MS: 1500,
  LIKE_BATCH_INTERVAL_MS: 200,
  LIKE_TIME_GAIN_SEC: 0.4,
  COMMUNITY_LIKE_THRESHOLD: 100,
  COMMUNITY_LIKE_BUFF_SEC: 15,
} as const;

export const GAMEPLAY_CONSTANTS = {
  DEFAULT_SESSION_TIME_SEC: 60,
  MIN_SESSION_TIME_SEC: 45,
  MAX_SESSION_TIME_SEC: 120,
  DEFAULT_MOM_CYCLE_SEC: 45,
  MIN_MOM_CYCLE_SEC: 30,
  MAX_MOM_CYCLE_SEC: 90,
  MOM_WARNING_DURATION_SEC: 3,
  MOM_BUST_ANIMATION_SEC: 2.5,
  MOM_SAFE_COOLDOWN_SEC: 4.0,
  POWER_CUT_DURATION_SEC: 3.5,
  BSOD_DURATION_SEC: 3.0,
  NOODLE_BUFF_DURATION_SEC: 25,
  NOODLE_TIME_BONUS_SEC: 45,
  RESET_TIME_PENALTY_SEC: 25,
  GRIND_TIME_BONUS_SEC: 8,
  GRIND_BASE_SCORE: 15,
  GRIND_MULTIPLIER_BUFF: 2,
  MAX_QUEUE_CAPACITY: 20,
  MAX_LEADERBOARD_ENTRIES: 5,
} as const;

export const KEYWORD_MAP = {
  SIT_AND_PLAY: ['ngoi', 'ngồi', 'cay', 'cày', 'choi', 'chơi', 'may', 'máy', 'me', 'play'],
  GRIND_AND_SCORE: ['cay', 'cày', 'pk', 'boss', 'hit', 'gõ'],
  HIDE_FROM_MOM: ['nup', 'núp', 'alt', 'tab', 'hoc', 'học'],
} as const;

export const GIFT_TIERS = {
  SMALL_MIN_COIN: 1,
  SMALL_MAX_COIN: 4,
  MEDIUM_MIN_COIN: 5,
  MEDIUM_MAX_COIN: 29,
  LARGE_MIN_COIN: 30,
} as const;

export const UI_COLORS = {
  CRT_GREEN: '#22c55e',
  CRT_AMBER: '#f59e0b',
  CRT_BLUE: '#38bdf8',
  CRT_BSOD: '#0022cc',
  NET_RED: '#ef4444',
  WOOD_DESK: '#3f2214',
  NEON_GLOW: '#00ffcc',
} as const;

export type AutobotModeType = 'CHILL' | 'CHAOS' | 'RANK_RUSH';

export interface AutobotConfigPreset {
  name: string;
  description: string;
  intervalMs: number;
  grindChance: number;
  likeChance: number;
  queueChance: number;
  giftChance: number;
  dodgeSuccessRate: number;
}

export const AUTOBOT_PRESETS: Record<AutobotModeType, AutobotConfigPreset> = {
  CHILL: {
    name: 'Chill Net 2008',
    description: 'Cày cuốc êm đềm, ngắm cảnh, thi thoảng nạp giờ và húp mì tôm',
    intervalMs: 2200,
    grindChance: 0.50,
    likeChance: 0.30,
    queueChance: 0.15,
    giftChance: 0.05,
    dodgeSuccessRate: 0.90,
  },
  CHAOS: {
    name: 'Quán Net Hỗn Loạn',
    description: 'Tranh nhau đá ghế, gọi mẹ cầm chổi, cúp cầu dao và rút dây mạng liên tục',
    intervalMs: 900,
    grindChance: 0.25,
    likeChance: 0.25,
    queueChance: 0.25,
    giftChance: 0.25,
    dodgeSuccessRate: 0.45,
  },
  RANK_RUSH: {
    name: 'Cao Thủ Cày Top',
    description: 'Spam cày PK boss thần tốc, né mẹ cực nhạy để giữ vững ghế VIP',
    intervalMs: 1100,
    grindChance: 0.75,
    likeChance: 0.18,
    queueChance: 0.05,
    giftChance: 0.02,
    dodgeSuccessRate: 0.96,
  },
};

export const RETRO_NET_QUOTES = {
  SIT_AND_QUEUE: [
    'Anh chủ quán ơi cho em 1 máy!',
    'Nạp em 5 ngàn máy 2 anh ơi!',
    'Cho em 1 bát mì tôm 2 trứng lòng đào!',
    'Bác ơi cốc trà đá với bao Thăng Long!',
    'Máy 2 còn bao nhiêu phút vậy anh?',
  ],
  GRIND_AND_SCORE: [
    'Cày cật lực lên Top 1 server anh em ơi!',
    'Đập chuột gãy phím Mitsumi rồi!',
    'PK boss lẹ lụm kiếm Hoàng Kim!',
    'Sting Dâu tiếp thêm 200% công lực!',
    'Combo Thập Bát Chưởng đây này!',
  ],
  MOM_WARNING: [
    'Má ơi mẹ mày tới đầu ngõ kìa chạy đi!',
    'Alt Tab bật Word lên nhanh mày ơi!!',
    'Núp lẹ không mẹ vụt nát mông bây giờ!',
    'Em đang học bài làm văn thật mà mẹ ơi!',
    'Hú hồn mẹ vừa lướt qua...',
  ],
  TROLL_AND_BUSTED: [
    'Thằng nào bấm nút reset máy tao đấy???',
    'Ai rút dây mạng LAN máy 2 vậy trời!',
    'Đang combo thì cúp điện cả quán là sao!!',
    'Bị mẹ véo tai lôi cổ về ăn cơm rồi hu hu...',
  ],
};
