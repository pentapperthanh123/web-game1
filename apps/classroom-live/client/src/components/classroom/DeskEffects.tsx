import React from 'react';
import type { Student } from '../../../../shared/types/classroom';
import { DESK_GRID } from '../../constants/stageLayout';
import { STAGE_TEXT } from '../../constants/stageText';

const CONFETTI_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const CONFETTI_COLORS = ['#f59e0b', '#ec4899', '#10b981', '#3b82f6'] as const;
const CONFETTI_RADIUS_PX = 30;
const CHIP_HEIGHT_PX = 14;
const CHIP_STACK_GAP_PX = 2;

/** Hiệu ứng tạm thời hiện trên đầu học sinh (vùng ảnh y 38..), không bao giờ lên thẻ người chơi (y 0..34). */
const HEAD_TOP = DESK_GRID.SEATED_SPRITE_TOP;
const HEAD_CENTER_Y = DESK_GRID.SEATED_SPRITE_TOP + DESK_GRID.SEATED_SPRITE_HEIGHT * DESK_GRID.SEATED_HEAD_CENTER_RATIO;
const CHIP_TOP = HEAD_TOP + 4;
const SECOND_CHIP_TOP = CHIP_TOP + CHIP_HEIGHT_PX + CHIP_STACK_GAP_PX;
/** Tay giơ lên mọc từ mép phải đầu. */
const HAND_TOP = HEAD_TOP;
const HAND_LEFT = 'calc(50% + 10px)';

const EFFECT_CHIP_CLASS =
  'absolute left-1/2 -translate-x-1/2 w-max truncate whitespace-nowrap rounded-full shadow-md text-[9px] font-black px-2 leading-[14px]';
const effectChipStyle = (top: number): React.CSSProperties => ({ top, maxWidth: DESK_GRID.EFFECT_MAX_WIDTH });

const MisbehaviorBadge: React.FC<{ student: Student }> = ({ student }) => {
  if (student.isBeingPunished) {
    return (
      <>
        <div className={`${EFFECT_CHIP_CLASS} bg-amber-500 text-white border border-yellow-200 animate-spank-flinch`} style={effectChipStyle(CHIP_TOP)}>
          {STAGE_TEXT.PUNISH_ALERT}
        </div>
        <div className={`${EFFECT_CHIP_CLASS} bg-white text-amber-950 border border-amber-400`} style={effectChipStyle(SECOND_CHIP_TOP)}>
          {STAGE_TEXT.PUNISH_REPLY}
        </div>
      </>
    );
  }

  if (student.misbehavior === 'TALKING') {
    return (
      <div className={`${EFFECT_CHIP_CLASS} bg-white text-slate-800 border border-amber-400 animate-fade-in`} style={effectChipStyle(CHIP_TOP)}>
        💬 {student.misbehaviorText || STAGE_TEXT.TALKING_DEFAULT}
      </div>
    );
  }

  if (student.misbehavior === 'SLEEPING') {
    return (
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center" style={{ top: HEAD_TOP }}>
        <span className="text-[11px] font-black text-sky-600 animate-sleep-zzz">{STAGE_TEXT.SLEEPING_TEXT}</span>
        <span className="w-3 h-3 rounded-full bg-sky-300/80 border border-sky-400 animate-bubble-sleep" />
      </div>
    );
  }

  if (student.misbehavior === 'EATING') {
    return (
      <div className={`${EFFECT_CHIP_CLASS} bg-amber-50 text-amber-900 border border-amber-500 animate-snack-nibble`} style={effectChipStyle(CHIP_TOP)}>
        🧋 {student.misbehaviorText || STAGE_TEXT.EATING_DEFAULT}
      </div>
    );
  }

  return null;
};

const CorrectAnswerBurst: React.FC = () => (
  <>
    <div className={`${EFFECT_CHIP_CLASS} bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 border border-amber-200 text-[11px] animate-float-badge`} style={effectChipStyle(CHIP_TOP)}>
      {STAGE_TEXT.SCORE_BADGE}
    </div>
    <div className="absolute left-1/2 pointer-events-none" style={{ top: HEAD_CENTER_Y }}>
      {CONFETTI_ANGLES.map((angle, idx) => (
        <span
          key={angle}
          className="absolute w-1.5 h-1.5 rounded-xs animate-ping"
          style={{
            backgroundColor: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
            transform: `rotate(${angle}deg) translate(${CONFETTI_RADIUS_PX}px)`,
          }}
        />
      ))}
    </div>
  </>
);

const RaisedHand: React.FC = () => (
  <div className="absolute animate-wave-arm" style={{ top: HAND_TOP, left: HAND_LEFT }}>
    <svg viewBox="0 0 24 36" className="w-4 h-6">
      <path d="M4 32 L4 18 L12 14 L14 30 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      <path d="M12 14 L14 4 C15 2 18 2 19 4 L19 12 Z" fill="#ffd8be" stroke="#e0a986" strokeWidth="0.8" />
    </svg>
  </div>
);

interface DeskEffectsProps {
  student: Student;
  isCelebrating: boolean;
}

/** Hiệu ứng tạm thời của một bàn (giơ tay, +10đ, chat, ngủ, nhắc nhở) — hiện trên đầu học sinh. */
export const DeskEffects: React.FC<DeskEffectsProps> = ({ student, isCelebrating }) => (
  <>
    {(student.isHandRaised || isCelebrating) && <RaisedHand />}
    {isCelebrating && <CorrectAnswerBurst />}
    {!isCelebrating && <MisbehaviorBadge student={student} />}
  </>
);

export default DeskEffects;
