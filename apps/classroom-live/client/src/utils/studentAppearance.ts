import type { Student } from '../../../shared/types/classroom';
import { STUDENT_VARIANTS, STUDENT_VARIANT_COUNT, StudentVariant } from '../constants/studentVariants';
import { hashString } from './hashString';

/**
 * Kiểu nhân vật của một học sinh: ưu tiên `appearanceIndex` (store gán xoay vòng khi tạo học sinh,
 * nên 12 kiểu luôn xuất hiện đều); thiếu thì chọn cố định theo hash id.
 */
export const getStudentVariant = (student: Pick<Student, 'id' | 'appearanceIndex'>): StudentVariant => {
  const index = student.appearanceIndex ?? hashString(student.id);
  return STUDENT_VARIANTS[index % STUDENT_VARIANT_COUNT];
};
