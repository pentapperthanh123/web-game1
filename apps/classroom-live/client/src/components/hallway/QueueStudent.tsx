import React from 'react';
import type { Student } from '../../../../shared/types/classroom';
import { HALLWAY_LAYOUT } from '../../constants/stageLayout';
import { NameTag } from '../common/NameTag';
import { hashString } from '../../utils/hashString';

/** Màu nền avatar khi người xem chưa có ảnh — chọn theo id để mỗi bạn một màu, ổn định giữa các lần render. */
const AVATAR_FALLBACK_COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#14b8a6', '#6366f1'] as const;
const pickFallbackColor = (id: string): string => AVATAR_FALLBACK_COLORS[hashString(id) % AVATAR_FALLBACK_COLORS.length];

const QueueAvatar: React.FC<{ student: Student; isImageVisible: boolean }> = ({ student, isImageVisible }) => (
  <div
    className="relative rounded-full overflow-hidden border-2 border-white shadow-md flex items-center justify-center shrink-0"
    style={{
      width: HALLWAY_LAYOUT.CHIP_SIZE,
      height: HALLWAY_LAYOUT.CHIP_SIZE,
      backgroundColor: pickFallbackColor(student.id),
    }}
  >
    {isImageVisible && student.avatarUrl ? (
      <img src={student.avatarUrl} alt={student.nickname} draggable={false} className="w-full h-full object-cover" />
    ) : (
      <span className="text-[12px] font-black text-white uppercase">{student.nickname.charAt(0)}</span>
    )}
  </div>
);

const OrderBadge: React.FC<{ position: number }> = ({ position }) => (
  <span
    className="absolute -left-2 -top-1 rounded-full bg-amber-400 text-amber-950 border border-white font-black text-[9px] flex items-center justify-center shadow"
    style={{ width: HALLWAY_LAYOUT.ORDER_BADGE_SIZE, height: HALLWAY_LAYOUT.ORDER_BADGE_SIZE }}
  >
    {position}
  </span>
);

/** Một bạn đứng xếp hàng: avatar trên đầu, áo trắng khăn quàng đỏ, số thứ tự và tên (tối đa 2 dòng). */
interface QueueStudentProps {
  student: Student;
  position: number;
  isAvatarVisible: boolean;
}

export const QueueStudent: React.FC<QueueStudentProps> = ({ student, position, isAvatarVisible }) => (
  <div className="relative flex flex-col items-center" style={{ height: HALLWAY_LAYOUT.SLOT_PITCH }}>
    <div className="relative">
      <QueueAvatar student={student} isImageVisible={isAvatarVisible} />
      <OrderBadge position={position} />
    </div>
    <div
      className="-mt-0.5 bg-white border border-slate-300 rounded-b-md flex items-start justify-center overflow-hidden shrink-0"
      style={{ width: HALLWAY_LAYOUT.SHIRT_WIDTH, height: HALLWAY_LAYOUT.SHIRT_HEIGHT }}
    >
      <span className="w-2.5 h-2.5 bg-red-600 rotate-45 -mt-1.5" />
    </div>
    <NameTag
      name={student.nickname}
      maxWidth={HALLWAY_LAYOUT.NAME_MAX_WIDTH}
      maxFont={HALLWAY_LAYOUT.NAME_MAX_FONT}
      minFont={HALLWAY_LAYOUT.NAME_MIN_FONT}
      maxLines={HALLWAY_LAYOUT.NAME_MAX_LINES}
      className="-mt-0.5"
    />
  </div>
);

export default QueueStudent;
