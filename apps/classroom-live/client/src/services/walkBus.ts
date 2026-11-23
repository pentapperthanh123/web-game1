import type { Student } from '../../../shared/types/classroom';

type WalkListener = (student: Student, targetSlotIndex: number, isVip: boolean) => void;
const listeners = new Set<WalkListener>();

export const triggerStudentWalk = (student: Student, targetSlotIndex: number, isVip: boolean = false) => {
  listeners.forEach((fn) => fn(student, targetSlotIndex, isVip));
};

export const onStudentWalk = (fn: WalkListener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
