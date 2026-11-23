/**
 * Các kiểu nhân vật học sinh ngồi bàn (ảnh trong public/assets/students/<id>.png).
 * Tạo bằng client/art-source/build_student_sprites.py — id phải khớp bảng VARIANTS trong script.
 * Thứ tự xen kẽ nữ / nam để khi gán xoay vòng, lớp học luôn trộn đều.
 */
export interface StudentVariant {
  id: string;
  isGirl: boolean;
}

export const STUDENT_VARIANTS: readonly StudentVariant[] = [
  { id: 'girl-pigtails-red', isGirl: true },
  { id: 'boy-short-black', isGirl: false },
  { id: 'girl-bun-red', isGirl: true },
  { id: 'boy-cap-blue', isGirl: false },
  { id: 'girl-pigtails-pink', isGirl: true },
  { id: 'boy-short-brown', isGirl: false },
  { id: 'girl-headband-pink', isGirl: true },
  { id: 'boy-short-chestnut', isGirl: false },
  { id: 'girl-pigtails-blue', isGirl: true },
  { id: 'boy-cap-red', isGirl: false },
  { id: 'girl-bun-yellow', isGirl: true },
  { id: 'boy-short-deep', isGirl: false },
];

export const STUDENT_VARIANT_COUNT = STUDENT_VARIANTS.length;

/** Kiểu dự phòng theo giới tính khi ảnh của kiểu được chọn chưa có. */
export const DEFAULT_GIRL_VARIANT = STUDENT_VARIANTS[0];
export const DEFAULT_BOY_VARIANT = STUDENT_VARIANTS[1];

const STUDENT_SPRITE_DIR = '/assets/students/';
const STUDENT_SPRITE_EXTENSION = '.png';

export const getStudentSpriteSrc = (variant: StudentVariant): string =>
  `${STUDENT_SPRITE_DIR}${variant.id}${STUDENT_SPRITE_EXTENSION}`;
