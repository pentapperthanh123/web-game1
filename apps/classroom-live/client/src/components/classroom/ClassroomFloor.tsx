import React from 'react';
import { DeskItem } from './DeskItem';
import { useClassroomStore } from '../../store/classroomStore';
import { DESK_CELLS, getDeskDepthZ } from '../../constants/classroomCoordinates';
import { DESK_GRID } from '../../constants/stageLayout';

const findTopStudentId = (students: Record<string, { id: string; score: number }>): string | null => {
  let topId: string | null = null;
  let maxScore = 0;
  for (const student of Object.values(students)) {
    if (student.score > maxScore) {
      maxScore = student.score;
      topId = student.id;
    }
  }
  return topId;
};

/** Layer 3 — Lưới 25 bàn (5x5), mỗi bàn nằm trọn trong ô px cố định, không chồng lên nhau. */
export const ClassroomFloor: React.FC = () => {
  const desks = useClassroomStore((s) => s.desks);
  const students = useClassroomStore((s) => s.students);
  const isAvatarVisible = useClassroomStore((s) => s.isAvatarVisible);
  const topOneStudentId = findTopStudentId(students);

  return (
    <>
      {desks.map((desk) => {
        const cell = DESK_CELLS[desk.slotIndex];
        if (!cell) return null;
        const student = desk.studentId ? students[desk.studentId] : undefined;

        return (
          <div
            key={desk.slotIndex}
            className="absolute pointer-events-none"
            style={{
              left: cell.left,
              top: cell.top,
              width: DESK_GRID.COL_PITCH,
              height: DESK_GRID.ROW_PITCH,
              zIndex: getDeskDepthZ(desk.slotIndex),
            }}
          >
            <DeskItem student={student} isTopOne={student?.id === topOneStudentId} isAvatarVisible={isAvatarVisible} />
          </div>
        );
      })}
    </>
  );
};

export default ClassroomFloor;
