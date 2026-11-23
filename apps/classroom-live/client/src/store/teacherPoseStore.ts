import { create } from 'zustand';
import { TEACHER_LAYOUT } from '../constants/stageLayout';

export type Facing = 1 | -1;

export interface TeacherPose {
  /** Tâm ngang của cô giáo (px sân khấu). */
  x: number;
  /** y bàn chân (px sân khấu). Trên bục luôn bằng TEACHER_LAYOUT.FEET_Y. */
  feetY: number;
  facing: Facing;
  isWalking: boolean;
}

interface TeacherPoseStore extends TeacherPose {
  setPose: (patch: Partial<TeacherPose>) => void;
}

export const DEFAULT_TEACHER_POSE: TeacherPose = {
  x: TEACHER_LAYOUT.DEFAULT_X,
  feetY: TEACHER_LAYOUT.FEET_Y,
  facing: 1,
  isWalking: false,
};

/** Vị trí cô giáo dùng chung cho Layer 2 (nhân vật) và Layer 5 (bong bóng thoại). */
export const useTeacherPoseStore = create<TeacherPoseStore>((set) => ({
  ...DEFAULT_TEACHER_POSE,
  setPose: (patch) => set(patch),
}));

export const isTeacherOnPodium = (feetY: number): boolean =>
  feetY <= TEACHER_LAYOUT.FEET_Y + TEACHER_LAYOUT.ON_PODIUM_TOLERANCE;
