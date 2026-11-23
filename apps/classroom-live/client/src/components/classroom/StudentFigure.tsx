import React from 'react';
import type { Student } from '../../../../shared/types/classroom';
import { DESK_GRID, STAGE_ASSETS, STUDENT_FIGURE } from '../../constants/stageLayout';
import { STAGE_TEXT } from '../../constants/stageText';
import { useAssetAvailable } from '../../services/assetProbe';
import { NameTag } from '../common/NameTag';

const BODY_HEIGHT = STUDENT_FIGURE.HEAD_HEIGHT + STUDENT_FIGURE.SHIRT_HEIGHT - STUDENT_FIGURE.SHIRT_OVERLAP;

const HairBow: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <span
    className="absolute rounded-full bg-rose-600 border border-red-800"
    style={{
      top: STUDENT_FIGURE.BOW_TOP,
      [side]: -STUDENT_FIGURE.BOW_SIZE / 2,
      width: STUDENT_FIGURE.BOW_SIZE,
      height: STUDENT_FIGURE.BOW_SIZE,
    }}
  />
);

/** Học sinh chibi nhìn từ phía sau (tóc + áo trắng + khăn quàng đỏ) — dùng khi chưa có `student-body.png`. */
export const StudentBodyFallback: React.FC<{ isGirl: boolean }> = ({ isGirl }) => (
  <div className="absolute inset-x-0 top-0 flex flex-col items-center" style={{ height: BODY_HEIGHT }}>
    <div
      className="relative bg-gradient-to-b from-[#2a170d] to-[#140b06] rounded-t-full rounded-b-[18px] border border-[#140b06] shadow-sm"
      style={{ width: STUDENT_FIGURE.HEAD_WIDTH, height: STUDENT_FIGURE.HEAD_HEIGHT }}
    >
      {isGirl && (
        <>
          <HairBow side="left" />
          <HairBow side="right" />
        </>
      )}
    </div>
    <div
      className="relative bg-white border border-slate-300 rounded-b-lg flex items-start justify-center overflow-hidden shadow-sm"
      style={{
        width: STUDENT_FIGURE.SHIRT_WIDTH,
        height: STUDENT_FIGURE.SHIRT_HEIGHT,
        marginTop: -STUDENT_FIGURE.SHIRT_OVERLAP,
      }}
    >
      <span
        className="bg-red-600 rotate-45 border border-red-700"
        style={{
          width: STUDENT_FIGURE.SCARF_SIZE,
          height: STUDENT_FIGURE.SCARF_SIZE,
          marginTop: -STUDENT_FIGURE.SCARF_SIZE / 2,
        }}
      />
    </div>
  </div>
);

interface StudentAvatarProps {
  student: Student;
  top: number;
  /** false => ẩn ảnh người xem, chỉ hiện chữ cái đầu (tuỳ chọn tắt avatar). */
  isImageVisible: boolean;
}

/** Avatar TikTok 44px (đặt tuyệt đối, căn giữa ngang theo khối cha). */
const StudentAvatar: React.FC<StudentAvatarProps> = ({ student, top, isImageVisible }) => (
  <div
    className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden border-[3px] border-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] bg-slate-800"
    style={{ top, width: STUDENT_FIGURE.AVATAR_SIZE, height: STUDENT_FIGURE.AVATAR_SIZE }}
  >
    {isImageVisible && student.avatarUrl ? (
      <img src={student.avatarUrl} alt={student.nickname} draggable={false} className="w-full h-full object-cover" />
    ) : (
      <div
        className="w-full h-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black flex items-center justify-center uppercase"
        style={{ fontSize: STUDENT_FIGURE.AVATAR_FALLBACK_FONT }}
      >
        {student.nickname.charAt(0)}
      </div>
    )}
  </div>
);

/** Thẻ tên học sinh (đặt tuyệt đối, căn giữa ngang). */
const StudentNameTag: React.FC<{ name: string; top: number }> = ({ name, top }) => (
  <NameTag
    name={name}
    maxWidth={DESK_GRID.NAME_TAG_MAX_WIDTH}
    maxFont={DESK_GRID.NAME_TAG_MAX_FONT}
    minFont={DESK_GRID.NAME_TAG_MIN_FONT}
    className="absolute left-1/2 -translate-x-1/2"
    style={{ top }}
  />
);

interface StudentFigureProps {
  student: Student;
  isGirl: boolean;
  isAvatarVisible: boolean;
  className?: string;
}

/** Thân + avatar 44px + thẻ tên trong khối 64x80 cố định (học sinh đang đi bộ vào lớp). */
export const StudentFigure: React.FC<StudentFigureProps> = ({ student, isGirl, isAvatarVisible, className = '' }) => {
  const hasBodyImage = useAssetAvailable(STAGE_ASSETS.STUDENT_BODY);

  return (
    <div className={`relative ${className}`} style={{ width: STUDENT_FIGURE.WIDTH, height: STUDENT_FIGURE.HEIGHT }}>
      {hasBodyImage ? (
        <img
          src={STAGE_ASSETS.STUDENT_BODY}
          alt={STAGE_TEXT.STUDENT_ALT}
          draggable={false}
          className="absolute inset-x-0 top-0 w-full object-contain"
          style={{ height: BODY_HEIGHT }}
        />
      ) : (
        <StudentBodyFallback isGirl={isGirl} />
      )}
      <StudentAvatar student={student} top={STUDENT_FIGURE.AVATAR_TOP} isImageVisible={isAvatarVisible} />
      <StudentNameTag name={student.nickname} top={STUDENT_FIGURE.NAME_TAG_TOP} />
    </div>
  );
};

export default StudentFigure;
