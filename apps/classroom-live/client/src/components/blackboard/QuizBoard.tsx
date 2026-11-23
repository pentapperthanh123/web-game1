import React from 'react';
import { useClassroomStore } from '../../store/classroomStore';

export const QuizBoard: React.FC = () => {
  const currentQuestion = useClassroomStore((s) => s.currentQuestion);
  const sessionState = useClassroomStore((s) => s.sessionState);
  if (!currentQuestion || (currentQuestion.mode !== 'QUIZ' && currentQuestion.mode !== 'ENGLISH')) {
    return null;
  }

  const isReveal = sessionState === 'REVEAL';
  const options = currentQuestion.options || [];

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <div className="text-white text-[12px] font-bold text-center bg-black/30 border border-emerald-500/30 rounded-md px-2 py-1 w-full leading-tight line-clamp-2">
        {currentQuestion.questionText}
      </div>
      <div className="grid grid-cols-2 gap-1 w-full">
        {options.map((option, idx) => {
          const optionChar = option.trim().charAt(0).toUpperCase();
          const isCorrect = isReveal && optionChar === currentQuestion.answer.toUpperCase();
          return (
            <div
              key={idx}
              className={`h-[22px] px-2 rounded-md border text-[11px] font-bold flex items-center justify-between transition-colors duration-300 ${
                isCorrect ? 'bg-amber-400 text-amber-950 border-amber-300' : 'bg-emerald-950/70 text-emerald-100 border-emerald-500/40'
              }`}
            >
              <span className="truncate">{option}</span>
              {isCorrect && <span>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuizBoard;
