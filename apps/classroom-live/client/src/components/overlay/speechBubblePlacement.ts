import { SPEECH_BUBBLE_LAYOUT, STAGE_SIZE, TEACHER_LAYOUT } from '../../constants/stageLayout';
import { clamp } from '../../utils/clamp';

export type BubbleTailSide = 'left' | 'right' | 'bottom';

export interface BubblePlacementInput {
  teacherX: number;
  feetY: number;
  isOnPodium: boolean;
  bubbleWidth: number;
  bubbleHeight: number;
  /** Tâm x của bàn đang được nhắc nhở (bong bóng sẽ mở về phía ngược lại để không che bàn). */
  targetDeskX?: number;
}

export interface BubblePlacement {
  left: number;
  top: number;
  maxWidth: number;
  tailSide: BubbleTailSide;
  /** Vị trí mũi bong bóng tính từ mép trái (tail bottom) hoặc mép trên (tail trái/phải). */
  tailOffset: number;
}

const { EDGE_MARGIN, MAX_WIDTH, TEACHER_GAP, HEAD_GAP, TAIL_LENGTH, TAIL_INSET, PODIUM_TOP, SIDE_TAIL_TOP } =
  SPEECH_BUBBLE_LAYOUT;
const STAGE_RIGHT_LIMIT = STAGE_SIZE.WIDTH - EDGE_MARGIN;
const TEACHER_HALF_WIDTH = TEACHER_LAYOUT.WIDTH / 2;

/** Kẹp biên ngang: clamp(16px, left, 720 - width - 16px). */
const clampBubbleLeft = (preferredLeft: number, bubbleWidth: number): number =>
  clamp(preferredLeft, EDGE_MARGIN, STAGE_SIZE.WIDTH - bubbleWidth - EDGE_MARGIN);

const limitWidth = (availableWidth: number): number => clamp(availableWidth, 0, MAX_WIDTH);

/** Trên bục: đặt cạnh cô giáo (phía rộng hơn), giới hạn bề rộng để không bao giờ phủ lên đầu cô. */
const placeBesideTeacher = ({ teacherX, bubbleWidth }: BubblePlacementInput): BubblePlacement => {
  const isRightSide = teacherX <= STAGE_SIZE.WIDTH / 2;

  if (isRightSide) {
    const nearEdge = teacherX + TEACHER_HALF_WIDTH + TEACHER_GAP;
    return {
      left: clampBubbleLeft(nearEdge, bubbleWidth),
      top: PODIUM_TOP,
      maxWidth: limitWidth(STAGE_RIGHT_LIMIT - nearEdge),
      tailSide: 'left',
      tailOffset: SIDE_TAIL_TOP,
    };
  }

  const nearEdge = teacherX - TEACHER_HALF_WIDTH - TEACHER_GAP;
  return {
    left: clampBubbleLeft(nearEdge - bubbleWidth, bubbleWidth),
    top: PODIUM_TOP,
    maxWidth: limitWidth(nearEdge - EDGE_MARGIN),
    tailSide: 'right',
    tailOffset: SIDE_TAIL_TOP,
  };
};

/** Dưới lớp: đặt phía trên đầu; nếu đang nhắc nhở thì mở về phía xa bàn đó. */
const placeAboveHead = (input: BubblePlacementInput): BubblePlacement => {
  const { teacherX, feetY, bubbleWidth, bubbleHeight, targetDeskX } = input;
  const headY = feetY - TEACHER_LAYOUT.HEIGHT;
  const top = headY - HEAD_GAP - TAIL_LENGTH - bubbleHeight;

  let preferredLeft = teacherX - bubbleWidth / 2;
  let maxWidth = limitWidth(STAGE_SIZE.WIDTH - 2 * EDGE_MARGIN);

  if (targetDeskX !== undefined && targetDeskX > teacherX) {
    const rightEdge = teacherX + TAIL_INSET;
    preferredLeft = rightEdge - bubbleWidth;
    maxWidth = limitWidth(rightEdge - EDGE_MARGIN);
  }
  if (targetDeskX !== undefined && targetDeskX <= teacherX) {
    const leftEdge = teacherX - TAIL_INSET;
    preferredLeft = leftEdge;
    maxWidth = limitWidth(STAGE_RIGHT_LIMIT - leftEdge);
  }

  const left = clampBubbleLeft(preferredLeft, bubbleWidth);
  return {
    left,
    top,
    maxWidth,
    tailSide: 'bottom',
    tailOffset: clamp(teacherX - left, TAIL_INSET, Math.max(TAIL_INSET, bubbleWidth - TAIL_INSET)),
  };
};

export const computeBubblePlacement = (input: BubblePlacementInput): BubblePlacement =>
  input.isOnPodium ? placeBesideTeacher(input) : placeAboveHead(input);
