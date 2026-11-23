/**
 * Bố cục sân khấu cố định 720x1280 (9:16).
 * Mọi vùng hiển thị đều dùng tọa độ px tuyệt đối theo khung này;
 * `ScaledStage` lo phần co giãn nên layout không bao giờ lệch theo kích thước cửa sổ.
 */
export const STAGE_SIZE = {
  WIDTH: 720,
  HEIGHT: 1280,
} as const;

/** Các dải dọc (y) của từng vùng chức năng. */
export const STAGE_ZONES = {
  HUD: { TOP: 0, BOTTOM: 125 },
  BOARD: { TOP: 130, BOTTOM: 390 },
  PODIUM: { TOP: 395, BOTTOM: 510 },
  DESKS: { TOP: 515, BOTTOM: 1080 },
  SAFE_BOTTOM: { TOP: 1080, BOTTOM: 1280 },
} as const;

/**
 * Thứ tự lớp hiển thị.
 * Layer 2 (bục giảng & cô giáo) và Layer 3 (bàn học + học sinh đi bộ) dùng chung dải
 * độ sâu `DEPTH_BASE + y chân` để cô giáo/học sinh đi xuống lối đi vẫn che khuất đúng thứ tự.
 */
export const STAGE_Z_INDEX = {
  BACKDROP: 0,
  HUD_BOARD: 100,
  DEPTH_BASE: 200,
  HALLWAY: 2000,
  OVERLAY: 3000,
} as const;

export const HUD_LAYOUT = {
  SIDE_PADDING: 16,
  ROW_TOP: 10,
  ROW_HEIGHT: 36,
  PORTRAIT_TOP: 6,
  PORTRAIT_WIDTH: 40,
  PORTRAIT_HEIGHT: 46,
  ROUND_PILL_WIDTH: 150,
  HEART_BAR_TOP: 60,
  HEART_BAR_LEFT: 110,
  HEART_BAR_WIDTH: 500,
  HEART_BAR_HEIGHT: 28,
  HEART_ICON_SIZE: 36,
  NOTICE_TOP: 98,
  NOTICE_HEIGHT: 22,
  MIN_HEART_PERCENT: 4,
  QUESTIONS_PER_ROUND: 10,
} as const;

export const BOARD_LAYOUT = {
  LEFT: 40,
  RIGHT: 680,
  TOP: STAGE_ZONES.BOARD.TOP,
  BOARD_BOTTOM: 356,
  STATUS_TOP: 362,
  STATUS_BOTTOM: STAGE_ZONES.BOARD.BOTTOM,
  FRAME_WIDTH: 8,
  INNER_PADDING: 8,
  LEADERBOARD_WIDTH: 150,
  COLUMN_GAP: 12,
  LEADERBOARD_SIZE: 5,
  /**
   * Tivi siêu mỏng treo giữa phía trên bảng (16:9, viền 3px): y 126..207, ngay dưới HUD (y 125).
   * Phần câu hỏi trong bảng bắt đầu dưới đáy tivi + TV_GAP_BELOW.
   */
  TV_WIDTH: 144,
  TV_HEIGHT: 81,
  TV_TOP: 126,
  TV_BEZEL: 3,
  TV_GAP_BELOW: 4,
  ANAGRAM_TILE_MAX: 30,
  ANAGRAM_TILE_MIN: 18,
  ANAGRAM_TILE_GAP: 4,
} as const;

export const PODIUM_LAYOUT = {
  LEFT: 60,
  RIGHT: 660,
  PLATFORM_TOP: 440,
  PLATFORM_FRONT_TOP: 498,
  BOTTOM: STAGE_ZONES.PODIUM.BOTTOM,
} as const;

/**
 * Cô giáo bị khóa trong vùng bục giảng: thân nằm trong y 400..495, tâm x trong [100, 620].
 * Chỉ khi đi nhắc nhở mới xuống lối đi giữa các cột bàn (không bao giờ đứng trên avatar).
 */
export const TEACHER_LAYOUT = {
  MIN_X: 100,
  MAX_X: 620,
  DEFAULT_X: 360,
  TOP_Y: 400,
  FEET_Y: 495,
  WIDTH: 52,
  HEIGHT: 95,
  PATROL_SPEED_PPS: 30,
  WALK_SPEED_PPS: 170,
  PATROL_PAUSE_MS: 2200,
  CELEBRATE_MS: 2400,
  /**
   * y chân so với mép trên ô bàn khi đứng ở lối đi để nhắc nhở.
   * Đầu cô (134 - 95 = 39) nằm dưới thẻ người chơi (y 0..34); chân lùi ra sau thẻ của hàng dưới
   * (z thấp hơn hàng dưới) nên không che avatar/tên nào.
   */
  INSPECT_FEET_OFFSET: 134,
  ON_PODIUM_TOLERANCE: 1,
} as const;

/** Lưới 25 bàn (5x5) nằm giữa 2 hành lang. */
export const DESK_GRID = {
  ROWS: 5,
  COLS: 5,
  LEFT: 80,
  TOP: STAGE_ZONES.DESKS.TOP,
  COL_PITCH: 112,
  ROW_PITCH: 113,
  /** y (tính từ mép trên ô) dùng làm độ sâu khi sắp xếp z với cô giáo/học sinh đi bộ. */
  DEPTH_OFFSET: 93,
  /**
   * Bố cục ô 112x113 — các lớp KHÔNG chồng lên nhau:
   *   y  0..34  : thẻ người chơi (avatar + tên, vương miện nếu top 1)
   *   y 38..113 : ảnh học sinh ngồi bàn (để trống, chỉ hiệu ứng tạm thời mới hiện trên đầu)
   */
  CARD_TOP: 0,
  CARD_HEIGHT: 34,
  CARD_AVATAR_SIZE: 34,
  CARD_PILL_HEIGHT: 24,
  /** Pill tên luồn dưới avatar 10px để thẻ liền khối. */
  CARD_AVATAR_OVERLAP: 10,
  /** 108 trong ô 112: thẻ 2 bàn cạnh nhau luôn cách nhau ≥ 4px; đầu cô giáo đứng nhắc nhở nằm dưới hàng thẻ. */
  CARD_MAX_WIDTH: 108,
  CARD_PILL_PADDING_LEFT: 4,
  CARD_PILL_PADDING_RIGHT: 8,
  CARD_CROWN_SIZE: 12,
  CARD_CROWN_GAP: 3,
  /** Thẻ tên dùng cho học sinh đang đi bộ (StudentFigure). */
  NAME_TAG_MAX_WIDTH: 74,
  NAME_TAG_MAX_FONT: 12,
  NAME_TAG_MIN_FONT: 9,
  /** Ảnh `student-seated-{girl,boy}.png` (tỉ lệ 0.8279): y 38..113, tâm đầu ở 19% chiều cao ảnh. */
  SEATED_SPRITE_TOP: 38,
  SEATED_SPRITE_HEIGHT: 75,
  SEATED_SPRITE_ASPECT: 0.8279,
  SEATED_HEAD_CENTER_RATIO: 0.19,
  /**
   * Hiệu ứng tạm thời (chat, ngủ, nhắc nhở, +10đ) hiện trên đầu học sinh. Rộng tối đa 70px:
   * mép chip cách lối đi 21px nên không lấn vào chỗ cô giáo đứng nhắc nhở.
   */
  EFFECT_MAX_WIDTH: 70,
  /** Bản vẽ dự phòng (bàn trống / thiếu ảnh) nằm cùng vùng với ảnh. */
  DESK_WIDTH: 62,
  DESK_HEIGHT: 34,
  DESK_TOP_OFFSET: 66,
  CHAIR_TOP: 96,
  CHAIR_WIDTH: 40,
  CHAIR_HEIGHT: 16,
  FALLBACK_BODY_TOP: 38,
  FALLBACK_BODY_SCALE: 0.6,
} as const;

/**
 * Nhân vật học sinh 2D (nhìn từ sau lưng) dùng chung cho bàn học và học sinh đang đi.
 * Avatar 44px là phần nổi bật nhất; tóc bao quanh avatar 5px mỗi bên.
 */
export const STUDENT_FIGURE = {
  WIDTH: 64,
  HEIGHT: 80,
  HEAD_WIDTH: 54,
  HEAD_HEIGHT: 46,
  AVATAR_SIZE: 44,
  AVATAR_TOP: 2,
  AVATAR_FALLBACK_FONT: 18,
  BOW_SIZE: 14,
  BOW_TOP: 10,
  SHIRT_WIDTH: 52,
  SHIRT_HEIGHT: 18,
  SHIRT_OVERLAP: 4,
  SCARF_SIZE: 14,
  /** Thẻ tên dưới chân nhân vật đang đi bộ. */
  NAME_TAG_TOP: 64,
} as const;

export const HALLWAY_LAYOUT = {
  WIDTH: 72,
  LEFT_CENTER_X: 36,
  RIGHT_CENTER_X: 684,
  TOP: STAGE_ZONES.DESKS.TOP,
  BOTTOM: STAGE_ZONES.DESKS.BOTTOM,
  /** Biển "Hàng chờ" + số người của bên đó. */
  HEADER_HEIGHT: 40,
  /** Mỗi bạn: avatar 26 + áo 10 + tên tối đa 2 dòng (27) - chồng mép 4 => 59 ≤ 60px, 8 bạn mỗi bên. */
  SLOT_PITCH: 60,
  CHIP_SIZE: 26,
  SHIRT_WIDTH: 26,
  SHIRT_HEIGHT: 10,
  ORDER_BADGE_SIZE: 15,
  OVERFLOW_HEIGHT: 26,
  NAME_MAX_WIDTH: 68,
  NAME_MAX_FONT: 10,
  NAME_MIN_FONT: 8,
  NAME_MAX_LINES: 2,
} as const;

/**
 * Bàn giáo viên đặt bên trái bục giảng. Cùng dải độ sâu với cô giáo (z theo DEPTH_Y > FEET_Y)
 * nên khi cô đi tuần qua phía sau bàn, bàn che phần thân dưới một cách tự nhiên.
 */
export const TEACHER_DESK_LAYOUT = {
  CENTER_X: 150,
  WIDTH: 136,
  /** Mép trên khối SVG (gồm cả đồ vật trên bàn). */
  TOP: 422,
  HEIGHT: 80,
  DEPTH_Y: 502,
} as const;

export const WALK_LAYOUT = {
  /** Lối đi ngang giữa bục giảng và hàng bàn đầu tiên. */
  FRONT_AISLE_Y: 512,
  SPEED_PPS: 160,
  VIP_SPEED_MULTIPLIER: 1.4,
  MAX_CONCURRENT_WALKERS: 8,
  MAX_FRAME_SEC: 0.05,
} as const;

export const SPEECH_BUBBLE_LAYOUT = {
  MAX_WIDTH: 340,
  EDGE_MARGIN: 16,
  TEACHER_GAP: 10,
  HEAD_GAP: 12,
  PODIUM_TOP: 402,
  /** Mũi nhọn: dài 10px (vừa khít TEACHER_GAP khi đặt cạnh cô), đáy rộng 18px. */
  TAIL_LENGTH: 10,
  TAIL_HALF_BASE: 9,
  TAIL_INSET: 16,
  SIDE_TAIL_TOP: 18,
  BORDER_WIDTH: 2,
  FILL_COLOR: '#ffffff',
  BORDER_COLOR: '#d9822b',
} as const;

/** Asset sạch (không chứa ảnh chụp màn hình). Thiếu file nào sẽ tự dùng bản vẽ CSS/SVG. */
export const STAGE_ASSETS = {
  BACKGROUND: '/assets/bg-classroom.png',
  TEACHER: '/assets/teacher.png',
  DESK: '/assets/desk.png',
  STUDENT_BODY: '/assets/student-body.png',
  PORTRAIT: '/assets/bac_ho.png',
} as const;
