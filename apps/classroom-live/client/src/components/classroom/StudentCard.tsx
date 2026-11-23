import React from 'react';
import { Crown } from 'lucide-react';
import type { Student } from '../../../../shared/types/classroom';
import { DESK_GRID } from '../../constants/stageLayout';
import { fitFontSize } from '../../utils/fitFontSize';

const PILL_BORDER_PX = 1;
const LINE_HEIGHT_RATIO = 1.2;
const AVATAR_BORDER_PX = 2;
const AVATAR_FALLBACK_FONT = 14;

/** Đệm trái của pill: khi có avatar, pill luồn dưới avatar nên phải chừa thêm phần bị che. */
const getPillPaddingLeft = (isAvatarVisible: boolean): number =>
  isAvatarVisible ? DESK_GRID.CARD_AVATAR_OVERLAP + DESK_GRID.CARD_PILL_PADDING_LEFT : DESK_GRID.CARD_PILL_PADDING_RIGHT;

/**
 * Bề ngang thật dành cho chữ tên: pill bắt đầu tại (avatar - overlap), nên phần chiếm chỗ bên trái là
 * (avatar - overlap) + paddingLeft; cộng thêm đệm phải, viền và vương miện.
 */
const getNameTextWidth = (isAvatarVisible: boolean, isTopOne: boolean): number => {
  const pillStart = isAvatarVisible ? DESK_GRID.CARD_AVATAR_SIZE - DESK_GRID.CARD_AVATAR_OVERLAP : 0;
  const crownSpace = isTopOne ? DESK_GRID.CARD_CROWN_SIZE + DESK_GRID.CARD_CROWN_GAP : 0;
  return (
    DESK_GRID.CARD_MAX_WIDTH -
    pillStart -
    getPillPaddingLeft(isAvatarVisible) -
    DESK_GRID.CARD_PILL_PADDING_RIGHT -
    2 * PILL_BORDER_PX -
    crownSpace
  );
};

const CardAvatar: React.FC<{ student: Student }> = ({ student }) => (
  <div
    className="relative z-10 shrink-0 rounded-full overflow-hidden bg-slate-800 shadow-[0_2px_5px_rgba(0,0,0,0.35)] flex items-center justify-center"
    style={{
      width: DESK_GRID.CARD_AVATAR_SIZE,
      height: DESK_GRID.CARD_AVATAR_SIZE,
      border: `${AVATAR_BORDER_PX}px solid #ffffff`,
    }}
  >
    {student.avatarUrl ? (
      <img src={student.avatarUrl} alt={student.nickname} draggable={false} className="w-full h-full object-cover" />
    ) : (
      <span className="text-white font-black uppercase" style={{ fontSize: AVATAR_FALLBACK_FONT }}>
        {student.nickname.charAt(0)}
      </span>
    )}
  </div>
);

interface StudentCardProps {
  student: Student;
  isAvatarVisible: boolean;
  isTopOne: boolean;
  isCelebrating: boolean;
}

/**
 * Thẻ người chơi phía trên bàn (y 0..34): avatar + tên (+ vương miện top 1).
 * Nằm tách hẳn khỏi ảnh học sinh nên không che tóc, áo hay bàn ghế.
 */
export const StudentCard: React.FC<StudentCardProps> = ({ student, isAvatarVisible, isTopOne, isCelebrating }) => {
  const textWidth = getNameTextWidth(isAvatarVisible, isTopOne);
  const fontSize = fitFontSize(student.nickname, textWidth, DESK_GRID.NAME_TAG_MAX_FONT, DESK_GRID.NAME_TAG_MIN_FONT);
  const pillPaddingLeft = getPillPaddingLeft(isAvatarVisible);

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 w-max flex items-center ${isCelebrating ? 'animate-celebrate-jump' : ''}`}
      style={{ top: DESK_GRID.CARD_TOP, height: DESK_GRID.CARD_HEIGHT, maxWidth: DESK_GRID.CARD_MAX_WIDTH }}
    >
      {isAvatarVisible && <CardAvatar student={student} />}
      <div
        title={student.nickname}
        className="flex items-center min-w-0 bg-white text-[#2b1404] border border-[#8a4b1c] rounded-full font-extrabold shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
        style={{
          height: DESK_GRID.CARD_PILL_HEIGHT,
          marginLeft: isAvatarVisible ? -DESK_GRID.CARD_AVATAR_OVERLAP : 0,
          paddingLeft: pillPaddingLeft,
          paddingRight: DESK_GRID.CARD_PILL_PADDING_RIGHT,
          fontSize,
          lineHeight: `${Math.round(fontSize * LINE_HEIGHT_RATIO)}px`,
        }}
      >
        <span className="truncate whitespace-nowrap">{student.nickname}</span>
        {isTopOne && (
          <Crown
            className="shrink-0 text-amber-500 fill-amber-400"
            style={{ width: DESK_GRID.CARD_CROWN_SIZE, height: DESK_GRID.CARD_CROWN_SIZE, marginLeft: DESK_GRID.CARD_CROWN_GAP }}
          />
        )}
      </div>
    </div>
  );
};

export default StudentCard;
