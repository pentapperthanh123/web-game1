import { DESK_GRID, HALLWAY_LAYOUT, STAGE_Z_INDEX, TEACHER_LAYOUT, WALK_LAYOUT } from './stageLayout';

export interface Point2D {
  x: number;
  y: number;
}

export interface DeskCell {
  slotIndex: number;
  row: number;
  col: number;
  /** Góc trên-trái của ô bàn (px trên sân khấu 720x1280). */
  left: number;
  top: number;
  /** Tâm ô bàn. */
  centerX: number;
  centerY: number;
}

export const DESK_COUNT = DESK_GRID.ROWS * DESK_GRID.COLS;

const buildDeskCell = (slotIndex: number): DeskCell => {
  const row = Math.floor(slotIndex / DESK_GRID.COLS);
  const col = slotIndex % DESK_GRID.COLS;
  const left = DESK_GRID.LEFT + col * DESK_GRID.COL_PITCH;
  const top = DESK_GRID.TOP + row * DESK_GRID.ROW_PITCH;
  return {
    slotIndex,
    row,
    col,
    left,
    top,
    centerX: left + DESK_GRID.COL_PITCH / 2,
    centerY: top + DESK_GRID.ROW_PITCH / 2,
  };
};

export const DESK_CELLS: readonly DeskCell[] = Array.from({ length: DESK_COUNT }, (_, idx) => buildDeskCell(idx));

/** Lối đi dọc nằm giữa các cột bàn (bỏ 2 mép ngoài vì sát hàng chờ hành lang). */
export const INNER_AISLE_X: readonly number[] = Array.from(
  { length: DESK_GRID.COLS - 1 },
  (_, idx) => DESK_GRID.LEFT + (idx + 1) * DESK_GRID.COL_PITCH
);

const getDeskCell = (slotIndex: number): DeskCell => DESK_CELLS[slotIndex] ?? DESK_CELLS[0];

/** Cột 0 dùng lối đi bên phải bàn, các cột còn lại dùng lối đi bên trái bàn. */
export const getDeskAisleX = (slotIndex: number): number => {
  const { col } = getDeskCell(slotIndex);
  const aisleIndex = Math.min(Math.max(0, col - 1), INNER_AISLE_X.length - 1);
  return INNER_AISLE_X[aisleIndex];
};

export const getDeskDepthZ = (slotIndex: number): number =>
  STAGE_Z_INDEX.DEPTH_BASE + getDeskCell(slotIndex).top + DESK_GRID.DEPTH_OFFSET;

export const getDepthZ = (feetY: number): number => STAGE_Z_INDEX.DEPTH_BASE + Math.floor(feetY);

/** Điểm dừng của cô giáo khi nhắc nhở: trong lối đi cạnh bàn, đầu nằm dưới hiệu ứng của bàn. */
export const getTeacherInspectionStop = (slotIndex: number): Point2D => ({
  x: getDeskAisleX(slotIndex),
  y: getDeskCell(slotIndex).top + TEACHER_LAYOUT.INSPECT_FEET_OFFSET,
});

/** Đi ngang trên bục tới đầu lối đi, rồi đi thẳng xuống điểm dừng. */
export const getTeacherInspectionPath = (slotIndex: number): Point2D[] => {
  const stop = getTeacherInspectionStop(slotIndex);
  return [{ x: stop.x, y: TEACHER_LAYOUT.FEET_Y }, stop];
};

/** Đi thẳng lên bục theo lối đi hiện tại, rồi về giữa bục. */
export const getTeacherReturnPath = (from: Point2D): Point2D[] => [
  { x: from.x, y: TEACHER_LAYOUT.FEET_Y },
  { x: TEACHER_LAYOUT.DEFAULT_X, y: TEACHER_LAYOUT.FEET_Y },
];

/** Học sinh mới: hành lang -> lối đi ngang trước hàng 1 -> lối đi dọc -> trượt vào ghế. */
export const getStudentWalkWaypoints = (targetSlotIndex: number): Point2D[] => {
  const cell = getDeskCell(targetSlotIndex);
  const isLeftHalf = cell.col <= Math.floor(DESK_GRID.COLS / 2);
  const hallwayX = isLeftHalf ? HALLWAY_LAYOUT.LEFT_CENTER_X : HALLWAY_LAYOUT.RIGHT_CENTER_X;
  const aisleX = getDeskAisleX(targetSlotIndex);

  return [
    { x: hallwayX, y: WALK_LAYOUT.FRONT_AISLE_Y },
    { x: aisleX, y: WALK_LAYOUT.FRONT_AISLE_Y },
    { x: aisleX, y: cell.centerY },
    { x: cell.centerX, y: cell.centerY },
  ];
};
