import React from 'react';
import { Clock } from 'lucide-react';
import { useClassroomStore } from '../../store/classroomStore';

export const CountdownTimer: React.FC = () => {
  const { timeRemainingSec, totalTimeSec, sessionState } = useClassroomStore();

  if (sessionState !== 'ANSWERING' && sessionState !== 'READING') return null;

  const percent = Math.max(0, Math.min(100, (timeRemainingSec / totalTimeSec) * 100));
  const isUrgent = timeRemainingSec <= 5;

  return (
    <div className="relative flex items-center gap-2 bg-emerald-950/90 border border-emerald-500/50 rounded-full px-3 py-1 shadow-inner">
      <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-400 animate-spin' : 'text-emerald-300'}`} />
      <div className="w-24 h-2 bg-emerald-900/60 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isUrgent ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs font-black font-mono ${isUrgent ? 'text-rose-400 text-sm' : 'text-emerald-200'}`}>
        {timeRemainingSec}s
      </span>
    </div>
  );
};

