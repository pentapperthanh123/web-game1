import { useEffect } from 'react';
import { useClassroomStore } from '../../store/classroomStore';
import { DEFAULT_TEACHER_POSE, useTeacherPoseStore } from '../../store/teacherPoseStore';
import type { Facing, TeacherPose } from '../../store/teacherPoseStore';
import { TEACHER_LAYOUT, WALK_LAYOUT } from '../../constants/stageLayout';
import {
  DESK_CELLS,
  Point2D,
  getTeacherInspectionPath,
  getTeacherReturnPath,
} from '../../constants/classroomCoordinates';
import { clamp } from '../../utils/clamp';

const MS_PER_SEC = 1000;
const FACING_DEADZONE_PX = 1;

const getPose = () => useTeacherPoseStore.getState();
const setPose = (patch: Partial<TeacherPose>) => getPose().setPose(patch);

const facingFromDelta = (dx: number): Facing | undefined => {
  if (Math.abs(dx) <= FACING_DEADZONE_PX) return undefined;
  return dx > 0 ? 1 : -1;
};

/** Đi lần lượt qua các waypoint với tốc độ cố định. Trả về hàm hủy. */
const followPath = (waypoints: Point2D[], speedPps: number, onArrive: () => void): (() => void) => {
  const start = getPose();
  const cursor = { x: start.x, y: start.feetY };
  let segment = 0;
  let lastTime = performance.now();
  let frameId = 0;

  const step = (now: number) => {
    const dt = Math.min(WALK_LAYOUT.MAX_FRAME_SEC, (now - lastTime) / MS_PER_SEC);
    lastTime = now;

    const target = waypoints[segment];
    if (!target) {
      setPose({ isWalking: false });
      onArrive();
      return;
    }

    const dx = target.x - cursor.x;
    const dy = target.y - cursor.y;
    const distance = Math.hypot(dx, dy);
    const stepDistance = speedPps * dt;

    if (distance <= stepDistance) {
      cursor.x = target.x;
      cursor.y = target.y;
      segment += 1;
    } else {
      cursor.x += (dx / distance) * stepDistance;
      cursor.y += (dy / distance) * stepDistance;
    }

    const facing = facingFromDelta(dx) ?? getPose().facing;
    setPose({ x: cursor.x, feetY: cursor.y, facing, isWalking: true });
    frameId = requestAnimationFrame(step);
  };

  frameId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frameId);
};

/** Đi tuần qua lại trên bục, x luôn kẹp trong [MIN_X, MAX_X], y khóa ở FEET_Y. */
const startPatrol = (): (() => void) => {
  let lastTime = performance.now();
  let frameId = 0;
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;
  let isPaused = false;

  setPose({ feetY: TEACHER_LAYOUT.FEET_Y, x: clamp(getPose().x, TEACHER_LAYOUT.MIN_X, TEACHER_LAYOUT.MAX_X) });

  const resumeWalking = (nextFacing: Facing) => {
    setPose({ facing: nextFacing, isWalking: true });
    isPaused = false;
    lastTime = performance.now();
  };

  const step = (now: number) => {
    const dt = Math.min(WALK_LAYOUT.MAX_FRAME_SEC, (now - lastTime) / MS_PER_SEC);
    lastTime = now;

    if (!isPaused) {
      const { x, facing } = getPose();
      const nextX = clamp(x + facing * TEACHER_LAYOUT.PATROL_SPEED_PPS * dt, TEACHER_LAYOUT.MIN_X, TEACHER_LAYOUT.MAX_X);
      const hasReachedEdge = nextX === TEACHER_LAYOUT.MIN_X || nextX === TEACHER_LAYOUT.MAX_X;
      setPose({ x: nextX, isWalking: !hasReachedEdge });

      if (hasReachedEdge) {
        isPaused = true;
        const nextFacing: Facing = nextX === TEACHER_LAYOUT.MAX_X ? -1 : 1;
        pauseTimer = setTimeout(() => resumeWalking(nextFacing), TEACHER_LAYOUT.PATROL_PAUSE_MS);
      }
    }

    frameId = requestAnimationFrame(step);
  };

  setPose({ isWalking: true });
  frameId = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(frameId);
    if (pauseTimer) clearTimeout(pauseTimer);
    setPose({ isWalking: false });
  };
};

/**
 * Điều khiển chuyển động cô giáo:
 * - PATROL: chỉ di chuyển trong vùng bục giảng.
 * - WALKING_TO_STUDENT: đi tới lối đi cạnh bàn (không đứng trên avatar), quay mặt vào bàn.
 * - RETURNING: theo lối đi quay về giữa bục rồi tiếp tục đi tuần.
 */
export const useTeacherMotion = (): void => {
  const sessionState = useClassroomStore((s) => s.sessionState);
  const teacherDutyState = useClassroomStore((s) => s.teacherDutyState);
  const inspectingTargetSlot = useClassroomStore((s) => s.inspectingTargetSlot);
  const punishStudent = useClassroomStore((s) => s.punishStudent);

  useEffect(() => {
    if (teacherDutyState !== 'PATROL') return;
    if (sessionState === 'ANSWERING') return startPatrol();
    if (sessionState === 'READING' || sessionState === 'IDLE') {
      setPose(DEFAULT_TEACHER_POSE);
      return;
    }
    setPose({ isWalking: false });
  }, [sessionState, teacherDutyState]);

  useEffect(() => {
    if (teacherDutyState === 'WALKING_TO_STUDENT' && inspectingTargetSlot !== null) {
      const targetCell = DESK_CELLS[inspectingTargetSlot];
      return followPath(getTeacherInspectionPath(inspectingTargetSlot), TEACHER_LAYOUT.WALK_SPEED_PPS, () => {
        const faceDesk: Facing = targetCell && targetCell.centerX < getPose().x ? -1 : 1;
        setPose({ facing: faceDesk });
        punishStudent(inspectingTargetSlot);
      });
    }

    if (teacherDutyState === 'RETURNING') {
      const { x, feetY } = getPose();
      return followPath(getTeacherReturnPath({ x, y: feetY }), TEACHER_LAYOUT.WALK_SPEED_PPS, () => {
        setPose({ ...DEFAULT_TEACHER_POSE });
        useClassroomStore.setState({ teacherDutyState: 'PATROL', inspectingTargetSlot: null });
      });
    }
  }, [teacherDutyState, inspectingTargetSlot, punishStudent]);
};
