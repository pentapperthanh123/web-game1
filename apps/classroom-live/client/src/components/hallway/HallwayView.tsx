import React from 'react';
import type { Student } from '../../../../shared/types/classroom';
import { useClassroomStore } from '../../store/classroomStore';
import { HALLWAY_LAYOUT } from '../../constants/stageLayout';
import { STAGE_TEXT } from '../../constants/stageText';
import { QueueStudent } from './QueueStudent';

type HallwaySide = 'left' | 'right';

interface QueueEntry {
  student: Student;
  /** Thứ tự chung trong hàng chờ (1 = được vào lớp tiếp theo). */
  position: number;
}

const SIDE_COUNT = 2;
const HEADER_GAP = 4;
const SLOTS_PER_SIDE = Math.floor(
  (HALLWAY_LAYOUT.BOTTOM - HALLWAY_LAYOUT.TOP - HALLWAY_LAYOUT.HEADER_HEIGHT - HEADER_GAP - HALLWAY_LAYOUT.OVERFLOW_HEIGHT) /
    HALLWAY_LAYOUT.SLOT_PITCH
);

/** Chia hàng chờ xen kẽ trái/phải: người số 1 bên trái, số 2 bên phải... */
const splitQueue = (queue: Student[]): Record<HallwaySide, QueueEntry[]> => {
  const entries = queue.map((student, idx) => ({ student, position: idx + 1 }));
  return {
    left: entries.filter((_, idx) => idx % SIDE_COUNT === 0),
    right: entries.filter((_, idx) => idx % SIDE_COUNT === 1),
  };
};

const HallwayHeader: React.FC<{ count: number }> = ({ count }) => (
  <div
    className="w-[64px] rounded-lg bg-gradient-to-b from-[#8a4b1c] to-[#5c2d0c] border border-[#f3c88e]/60 shadow-md flex flex-col items-center justify-center shrink-0"
    style={{ height: HALLWAY_LAYOUT.HEADER_HEIGHT, marginBottom: HEADER_GAP }}
  >
    <span className="text-[9px] font-black uppercase tracking-wide text-[#fde7c2] leading-none whitespace-nowrap">
      {STAGE_TEXT.HALLWAY_LABEL}
    </span>
    <span className="mt-1 text-[13px] font-black text-white leading-none">
      {count}
      <span className="text-[9px] font-bold text-[#fde7c2]"> {STAGE_TEXT.HALLWAY_COUNT_UNIT}</span>
    </span>
  </div>
);

interface HallwayColumnProps {
  side: HallwaySide;
  entries: QueueEntry[];
  isAvatarVisible: boolean;
}

const HallwayColumn: React.FC<HallwayColumnProps> = ({ side, entries, isAvatarVisible }) => {
  const visible = entries.slice(0, SLOTS_PER_SIDE);
  const overflowCount = entries.length - visible.length;
  const centerX = side === 'left' ? HALLWAY_LAYOUT.LEFT_CENTER_X : HALLWAY_LAYOUT.RIGHT_CENTER_X;

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: centerX - HALLWAY_LAYOUT.WIDTH / 2,
        top: HALLWAY_LAYOUT.TOP,
        width: HALLWAY_LAYOUT.WIDTH,
        height: HALLWAY_LAYOUT.BOTTOM - HALLWAY_LAYOUT.TOP,
      }}
    >
      {/* Vạch xếp hàng chạy dọc phía sau các bạn */}
      <div
        className="absolute left-1/2 -translate-x-1/2 border-l-2 border-dashed border-[#b08a5a]/70"
        style={{ top: HALLWAY_LAYOUT.HEADER_HEIGHT, bottom: HALLWAY_LAYOUT.OVERFLOW_HEIGHT }}
      />
      <HallwayHeader count={entries.length} />
      {visible.map((entry) => (
        <QueueStudent key={entry.student.id} student={entry.student} position={entry.position} isAvatarVisible={isAvatarVisible} />
      ))}
      {overflowCount > 0 && (
        <div
          className="relative mt-auto rounded-full bg-amber-400 text-amber-950 text-[11px] font-black px-2.5 flex items-center border-2 border-white shadow-md whitespace-nowrap"
          style={{ height: HALLWAY_LAYOUT.OVERFLOW_HEIGHT - 4 }}
        >
          +{overflowCount} {STAGE_TEXT.HALLWAY_COUNT_UNIT}
        </div>
      )}
    </div>
  );
};

/** Layer 4 — Hàng chờ ngoài hành lang ở 2 rìa (x 0..72 và 648..720), không lấn vào lưới bàn. */
export const HallwayView: React.FC = () => {
  const waitingQueue = useClassroomStore((s) => s.waitingQueue);
  const isAvatarVisible = useClassroomStore((s) => s.isAvatarVisible);
  const { left, right } = splitQueue(waitingQueue);

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      <HallwayColumn side="left" entries={left} isAvatarVisible={isAvatarVisible} />
      <HallwayColumn side="right" entries={right} isAvatarVisible={isAvatarVisible} />
    </div>
  );
};

export default HallwayView;
