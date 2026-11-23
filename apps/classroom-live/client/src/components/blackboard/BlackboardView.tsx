import React from 'react';
import { Trophy } from 'lucide-react';
import { AnagramBoard } from './AnagramBoard';
import { QuizBoard } from './QuizBoard';
import { BoardTelevision } from './BoardTelevision';
import { useClassroomStore } from '../../store/classroomStore';
import { BOARD_LAYOUT } from '../../constants/stageLayout';
import { STAGE_TEXT } from '../../constants/stageText';
import { DESK_COUNT } from '../../constants/classroomCoordinates';

const BoardLeaderboard: React.FC = () => {
  const students = useClassroomStore((s) => s.students);
  const topStudents = Object.values(students)
    .sort((a, b) => b.score - a.score)
    .slice(0, BOARD_LAYOUT.LEADERBOARD_SIZE);

  return (
    <div className="flex flex-col shrink-0 min-h-0" style={{ width: BOARD_LAYOUT.LEADERBOARD_WIDTH }}>
      <div className="flex items-center gap-1 font-black text-amber-300 text-[13px] pb-1">
        <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span>{STAGE_TEXT.LEADERBOARD_TITLE}</span>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 justify-center">
        {topStudents.length === 0 && (
          <span className="text-[11px] italic text-emerald-200/70">{STAGE_TEXT.LEADERBOARD_EMPTY}</span>
        )}
        {topStudents.map((student, idx) => (
          <div key={student.id} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 font-black text-[9px] flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="truncate text-gray-100 font-semibold">{student.nickname}</span>
            </div>
            <span className="font-black text-amber-300 ml-1 shrink-0">{student.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Gợi ý ở chân bảng; câu trắc nghiệm nhắc cách gõ A/B/C/D (dòng này trước nằm trong ô câu hỏi). */
const getPhaseHint = (isAnswering: boolean, isQuiz: boolean): string => {
  if (!isAnswering) return STAGE_TEXT.READING_HINT;
  if (isQuiz) return STAGE_TEXT.QUIZ_HINT;
  return STAGE_TEXT.ANSWERING_HINT;
};

const BoardFooter: React.FC = () => {
  const fastestWinnerId = useClassroomStore((s) => s.fastestWinnerId);
  const students = useClassroomStore((s) => s.students);
  const sessionState = useClassroomStore((s) => s.sessionState);
  const questionMode = useClassroomStore((s) => s.currentQuestion?.mode);
  const fastestName = fastestWinnerId && students[fastestWinnerId] ? students[fastestWinnerId].nickname : STAGE_TEXT.FASTEST_NONE;
  const isQuiz = questionMode === 'QUIZ' || questionMode === 'ENGLISH';
  const phaseHint = getPhaseHint(sessionState === 'ANSWERING', isQuiz);

  return (
    <div className="flex items-center justify-between gap-2 border-t border-emerald-500/30 pt-1 text-[11px] text-emerald-200 shrink-0">
      <div className="flex items-center gap-1 font-semibold min-w-0">
        <span className="text-amber-400 font-bold shrink-0">{STAGE_TEXT.FASTEST_LABEL}</span>
        <span className="font-extrabold text-white truncate">{fastestName}</span>
      </div>
      <span className="bg-gradient-to-r from-[#e5ab48] to-[#d99726] border border-[#a0681a] text-[#4d2805] text-[10px] font-black px-2 rounded-full shrink-0 whitespace-nowrap">
        {phaseHint}
      </span>
    </div>
  );
};

/** Khoảng trống đầu cột câu hỏi để chừa chỗ cho tivi phủ lên mép trên bảng. */
const TV_CLEARANCE =
  BOARD_LAYOUT.TV_TOP +
  BOARD_LAYOUT.TV_HEIGHT +
  BOARD_LAYOUT.TV_GAP_BELOW -
  (BOARD_LAYOUT.TOP + BOARD_LAYOUT.FRAME_WIDTH + BOARD_LAYOUT.INNER_PADDING);
const CHALK_FONT_FAMILY = "'Segoe Print', 'Comic Sans MS', 'Chalkboard SE', cursive";

/** Sĩ số viết phấn ở góc phải trên cùng của bảng, như lớp học thật. */
const BoardRollCall: React.FC = () => {
  const desks = useClassroomStore((s) => s.desks);
  const seatedCount = desks.filter((desk) => desk.studentId !== null).length;

  return (
    <div
      className="self-start text-[12px] font-bold text-white/90 whitespace-nowrap border-b border-white/40 leading-[16px]"
      style={{ fontFamily: CHALK_FONT_FAMILY }}
    >
      {STAGE_TEXT.SEATED_LABEL}: {seatedCount}/{DESK_COUNT}
    </div>
  );
};

const BoardQuestionPanel: React.FC = () => {
  const currentQuestion = useClassroomStore((s) => s.currentQuestion);
  const isAnagram = currentQuestion?.mode === 'ANAGRAM';
  const isQuiz = currentQuestion?.mode === 'QUIZ' || currentQuestion?.mode === 'ENGLISH';

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-1">
      <div className="flex justify-end shrink-0" style={{ height: TV_CLEARANCE }}>
        <BoardRollCall />
      </div>
      <div className="flex-1 min-h-0 flex flex-col justify-center items-center overflow-hidden">
        {isAnagram && <AnagramBoard />}
        {isQuiz && <QuizBoard />}
      </div>
      <BoardFooter />
    </div>
  );
};

/** Layer 1 — Bảng xanh (y 130..356) + tivi treo giữa phía trên bảng; thanh sĩ số nằm riêng bên dưới. */
export const BlackboardView: React.FC = () => (
  <>
    <div
      className="absolute pointer-events-none select-none rounded-lg bg-gradient-to-b from-[#8a4b1c] to-[#5c2d0c] shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
      style={{
        left: BOARD_LAYOUT.LEFT,
        top: BOARD_LAYOUT.TOP,
        width: BOARD_LAYOUT.RIGHT - BOARD_LAYOUT.LEFT,
        height: BOARD_LAYOUT.BOARD_BOTTOM - BOARD_LAYOUT.TOP,
        padding: BOARD_LAYOUT.FRAME_WIDTH,
      }}
    >
      <div
        className="w-full h-full rounded-md flex overflow-hidden"
        style={{
          padding: BOARD_LAYOUT.INNER_PADDING,
          gap: BOARD_LAYOUT.COLUMN_GAP,
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.06), transparent 60%), linear-gradient(180deg, #145236 0%, #0e3f29 100%)',
        }}
      >
        <BoardLeaderboard />
        <BoardQuestionPanel />
      </div>
    </div>
    <BoardTelevision />
  </>
);

export default BlackboardView;
