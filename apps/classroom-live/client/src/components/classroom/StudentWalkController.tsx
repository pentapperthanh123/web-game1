import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Student } from '../../../../shared/types/classroom';
import { getDepthZ, getStudentWalkWaypoints, Point2D } from '../../constants/classroomCoordinates';
import { STUDENT_FIGURE, WALK_LAYOUT } from '../../constants/stageLayout';
import { onStudentWalk } from '../../services/walkBus';
import { useClassroomStore } from '../../store/classroomStore';
import { StudentFigure } from './StudentFigure';
import { getStudentVariant } from '../../utils/studentAppearance';

const MS_PER_SEC = 1000;

interface WalkerEntity {
  id: string;
  student: Student;
  isVip: boolean;
  waypoints: Point2D[];
  segment: number;
  x: number;
  y: number;
}

/** Tiến một bước; trả về false khi đã tới ghế (walker biến mất, bàn tự hiển thị học sinh). */
const advanceWalker = (walker: WalkerEntity, dt: number): boolean => {
  const target = walker.waypoints[walker.segment + 1];
  if (!target) return false;

  const speedMultiplier = walker.isVip ? WALK_LAYOUT.VIP_SPEED_MULTIPLIER : 1;
  const stepDistance = WALK_LAYOUT.SPEED_PPS * speedMultiplier * dt;
  const dx = target.x - walker.x;
  const dy = target.y - walker.y;
  const distance = Math.hypot(dx, dy);

  if (distance > stepDistance) {
    walker.x += (dx / distance) * stepDistance;
    walker.y += (dy / distance) * stepDistance;
    return true;
  }

  walker.x = target.x;
  walker.y = target.y;
  walker.segment += 1;
  return walker.segment < walker.waypoints.length - 1;
};

/**
 * Học sinh mới đi từ hành lang -> lối đi ngang trước hàng 1 -> lối đi dọc -> vào ghế.
 * Cùng dải độ sâu với bàn và cô giáo (Layer 3).
 */
export const StudentWalkController: React.FC = () => {
  const [walkers, setWalkers] = useState<WalkerEntity[]>([]);
  const isAvatarVisible = useClassroomStore((s) => s.isAvatarVisible);
  const walkersRef = useRef<WalkerEntity[]>([]);
  walkersRef.current = walkers;

  useEffect(() => {
    return onStudentWalk((student, targetSlotIndex, isVip) => {
      if (walkersRef.current.length >= WALK_LAYOUT.MAX_CONCURRENT_WALKERS) return;
      const waypoints = getStudentWalkWaypoints(targetSlotIndex);
      const start = waypoints[0];
      const walker: WalkerEntity = {
        id: `walk_${student.id}_${performance.now()}`,
        student,
        isVip,
        waypoints,
        segment: 0,
        x: start.x,
        y: start.y,
      };
      setWalkers((prev) => [...prev, walker]);
    });
  }, []);

  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(WALK_LAYOUT.MAX_FRAME_SEC, (now - lastTime) / MS_PER_SEC);
      lastTime = now;
      if (walkersRef.current.length > 0) {
        setWalkers(walkersRef.current.filter((walker) => advanceWalker(walker, dt)));
      }
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <>
      {walkers.map((walker) => (
        <div
          key={walker.id}
          className="absolute left-0 top-0 pointer-events-none will-change-transform"
          style={{
            transform: `translate3d(${walker.x - STUDENT_FIGURE.WIDTH / 2}px, ${walker.y - STUDENT_FIGURE.HEIGHT / 2}px, 0)`,
            zIndex: getDepthZ(walker.y),
          }}
        >
          <div className="relative animate-walk-bob">
            <StudentFigure student={walker.student} isGirl={getStudentVariant(walker.student).isGirl} isAvatarVisible={isAvatarVisible} />
            {walker.isVip && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center">
                <div className="w-10 h-3 rounded-full bg-amber-400/50 animate-golden-aura border border-amber-300" />
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-400 absolute -top-1 animate-spin" />
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
};

export default StudentWalkController;
