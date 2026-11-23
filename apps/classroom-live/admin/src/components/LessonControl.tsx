import React from 'react';
import { Play, SkipForward, Eye, Bell } from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { emitAdminAction } from '../services/adminEmitter';

export const LessonControl: React.FC = () => {
  const { currentQuestionIndex, questions, setCurrentQuestionIndex } = useAdminStore();
  const currentQ = questions[currentQuestionIndex] || questions[0];

  const handleStartQuestion = () => {
    emitAdminAction('START_QUESTION', { question: currentQ });
  };

  const handleNextQuestion = () => {
    const nextIdx = (currentQuestionIndex + 1) % questions.length;
    setCurrentQuestionIndex(nextIdx);
    emitAdminAction('START_QUESTION', { question: questions[nextIdx] });
  };

  const handleRevealHint = () => {
    emitAdminAction('UNLOCK_HINT');
  };

  const handleBellBreak = () => {
    emitAdminAction('TRIGGER_BREAK');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
          <span>🎓 Điều Phối Tiết Học</span>
        </h2>
        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-gray-300 font-mono">
          Câu {currentQuestionIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Thông tin câu hỏi hiện tại */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-amber-300 uppercase">Chủ đề: {currentQ?.topic}</span>
          <span className="text-[10px] bg-slate-800 text-gray-300 px-1.5 py-0.5 rounded">
            {currentQ?.mode}
          </span>
        </div>
        <p className="text-xs text-gray-200 line-clamp-2 mt-1">{currentQ?.questionText}</p>
        <div className="text-xs font-bold text-emerald-300 mt-1">
          Đáp án: <span className="underline">{currentQ?.answer}</span>
        </div>
      </div>

      {/* Các nút bấm điều khiển tức thời */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
        <button
          type="button"
          onClick={handleStartQuestion}
          className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-md cursor-pointer active:scale-95"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Phát Đề</span>
        </button>

        <button
          type="button"
          onClick={handleNextQuestion}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-md cursor-pointer active:scale-95"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>Qua Câu</span>
        </button>

        <button
          type="button"
          onClick={handleRevealHint}
          className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-md cursor-pointer active:scale-95"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Lật Gợi Ý</span>
        </button>

        <button
          type="button"
          onClick={handleBellBreak}
          className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-md cursor-pointer active:scale-95"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Đánh Trống</span>
        </button>
      </div>
    </div>
  );
};

export default LessonControl;
