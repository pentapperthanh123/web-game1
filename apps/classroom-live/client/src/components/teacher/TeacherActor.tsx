import React, { useEffect, useState } from 'react';
import { useClassroomStore } from '../../store/classroomStore';
import { useTeacherPoseStore } from '../../store/teacherPoseStore';
import { TEACHER_LAYOUT } from '../../constants/stageLayout';
import { DESK_CELLS, getDepthZ } from '../../constants/classroomCoordinates';
import { TeacherSprite } from './TeacherSprite';
import { useTeacherMotion } from './useTeacherMotion';

type TeacherAnimation = 'STRIKE' | 'CELEBRATE' | 'WALK' | 'IDLE';

const ANIMATION_CLASS: Record<TeacherAnimation, string> = {
  STRIKE: 'animate-teacher-strike',
  CELEBRATE: 'animate-celebrate-jump',
  WALK: 'animate-walk-bob',
  IDLE: 'animate-idle-breathe',
};

const useCelebration = (): boolean => {
  const sessionState = useClassroomStore((s) => s.sessionState);
  const fastestWinnerId = useClassroomStore((s) => s.fastestWinnerId);
  const [isCelebrating, setIsCelebrating] = useState<boolean>(false);

  useEffect(() => {
    if (sessionState !== 'REVEAL' || !fastestWinnerId) return;
    setIsCelebrating(true);
    const timer = setTimeout(() => setIsCelebrating(false), TEACHER_LAYOUT.CELEBRATE_MS);
    return () => clearTimeout(timer);
  }, [sessionState, fastestWinnerId]);

  return isCelebrating;
};

/**
 * Layer 2 — Cô giáo. Không có bong bóng thoại ở đây (bong bóng nằm ở Layer 5 để đầu nhân vật
 * không bao giờ che chữ). z-index theo y bàn chân để sắp xếp đúng với các hàng bàn khi xuống lối đi.
 */
export const TeacherActor: React.FC = () => {
  useTeacherMotion();
  const { x, feetY, facing, isWalking } = useTeacherPoseStore();
  const teacherDutyState = useClassroomStore((s) => s.teacherDutyState);
  const inspectingTargetSlot = useClassroomStore((s) => s.inspectingTargetSlot);
  const isCelebrating = useCelebration();

  const targetCell = inspectingTargetSlot !== null ? DESK_CELLS[inspectingTargetSlot] : undefined;
  const isPunishing = teacherDutyState === 'PUNISHING';
  const facingDesk = targetCell && targetCell.centerX < x ? -1 : 1;
  const effectiveFacing = isPunishing && targetCell ? facingDesk : facing;

  let animation: TeacherAnimation = 'IDLE';
  if (isWalking) animation = 'WALK';
  if (isCelebrating) animation = 'CELEBRATE';
  if (isPunishing) animation = 'STRIKE';

  return (
    <div
      data-teacher
      className="absolute left-0 top-0 pointer-events-none will-change-transform"
      style={{
        width: TEACHER_LAYOUT.WIDTH,
        height: TEACHER_LAYOUT.HEIGHT,
        transform: `translate3d(${x - TEACHER_LAYOUT.WIDTH / 2}px, ${feetY - TEACHER_LAYOUT.HEIGHT}px, 0)`,
        zIndex: getDepthZ(feetY),
      }}
    >
      <div className="w-full h-full" style={{ transform: `scaleX(${effectiveFacing})`, transformOrigin: 'bottom center' }}>
        <div className={`w-full h-full ${ANIMATION_CLASS[animation]}`} style={{ transformOrigin: 'bottom center' }}>
          <TeacherSprite />
        </div>
      </div>
    </div>
  );
};

export default TeacherActor;
