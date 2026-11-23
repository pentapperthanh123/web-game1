import React, { useLayoutEffect, useRef, useState } from 'react';
import { useClassroomStore } from '../../store/classroomStore';
import { isTeacherOnPodium, useTeacherPoseStore } from '../../store/teacherPoseStore';
import { DESK_CELLS } from '../../constants/classroomCoordinates';
import { SPEECH_BUBBLE_LAYOUT } from '../../constants/stageLayout';
import { computeBubblePlacement } from './speechBubblePlacement';
import { BubbleTail } from './BubbleTail';

interface BubbleSize {
  width: number;
  height: number;
}

const EMPTY_SIZE: BubbleSize = { width: 0, height: 0 };

/** Theo dõi kích thước layout thật của bong bóng (đơn vị px sân khấu, không bị ảnh hưởng bởi scale). */
const useElementSize = (ref: React.RefObject<HTMLDivElement | null>, isActive: boolean): BubbleSize => {
  const [size, setSize] = useState<BubbleSize>(EMPTY_SIZE);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !isActive) return;

    const measure = () => {
      const next = { width: element.offsetWidth, height: element.offsetHeight };
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, isActive]);

  return size;
};

/**
 * Layer 5 — Bong bóng thoại của cô giáo. Luôn nằm trên nhân vật, kẹp biên ngang
 * trong [16, 720 - width - 16], tối đa 340px nên không bao giờ bị cắt chữ ở mép màn hình.
 */
export const TeacherSpeechBubble: React.FC = () => {
  const text = useClassroomStore((s) => s.activeSpeechBubble);
  const inspectingTargetSlot = useClassroomStore((s) => s.inspectingTargetSlot);
  const teacherX = useTeacherPoseStore((s) => s.x);
  const feetY = useTeacherPoseStore((s) => s.feetY);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const size = useElementSize(bubbleRef, Boolean(text));

  if (!text) return null;

  const targetCell = inspectingTargetSlot !== null ? DESK_CELLS[inspectingTargetSlot] : undefined;
  const placement = computeBubblePlacement({
    teacherX,
    feetY,
    isOnPodium: isTeacherOnPodium(feetY),
    bubbleWidth: size.width,
    bubbleHeight: size.height,
    targetDeskX: targetCell?.centerX,
  });
  const isMeasured = size.width > 0;

  return (
    <div
      ref={bubbleRef}
      data-speech-bubble
      className="absolute left-0 top-0 text-[#432009] rounded-2xl px-3 py-1.5 text-[12px] font-black leading-snug shadow-xl text-center break-words"
      style={{
        background: SPEECH_BUBBLE_LAYOUT.FILL_COLOR,
        border: `${SPEECH_BUBBLE_LAYOUT.BORDER_WIDTH}px solid ${SPEECH_BUBBLE_LAYOUT.BORDER_COLOR}`,
        width: 'max-content',
        maxWidth: placement.maxWidth,
        transform: `translate3d(${placement.left}px, ${placement.top}px, 0)`,
        visibility: isMeasured ? 'visible' : 'hidden',
      }}
    >
      <span className="relative">{text}</span>
      <BubbleTail side={placement.tailSide} offset={placement.tailOffset} />
    </div>
  );
};

export default TeacherSpeechBubble;
