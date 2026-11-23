import React from 'react';
import { Trophy, Users } from 'lucide-react';
import { useClassroomStore } from '../../store/classroomStore';

export const LeaderboardWing: React.FC = () => {
  const { students, teams } = useClassroomStore();

  // Top 4 học sinh có điểm cao nhất
  const topStudents = Object.values(students)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <div className="w-full flex justify-between items-start text-white text-[10px] pointer-events-none mb-1">
      {/* Góc trái: Bảng thi đua cá nhân */}
      <div className="bg-black/60 border border-amber-500/40 rounded-lg p-1.5 w-[140px] shadow-sm backdrop-blur-xs">
        <div className="flex items-center gap-1 font-bold text-amber-300 border-b border-amber-500/30 pb-0.5 mb-1">
          <Trophy className="w-3 h-3 text-amber-400" />
          <span>Bảng thi đua</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {topStudents.length === 0 ? (
            <span className="text-gray-400 text-[9px] italic">Chưa có điểm</span>
          ) : (
            topStudents.map((s, idx) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="truncate max-w-[95px] text-gray-200 font-medium">
                  {idx + 1}. {s.nickname}
                </span>
                <span className="font-bold text-amber-300">{s.score}đ</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Góc phải: Thi đua 4 Tổ */}
      <div className="bg-black/60 border border-blue-500/40 rounded-lg p-1.5 w-[130px] shadow-sm backdrop-blur-xs">
        <div className="flex items-center gap-1 font-bold text-blue-300 border-b border-blue-500/30 pb-0.5 mb-1">
          <Users className="w-3 h-3 text-blue-400" />
          <span>Thi đua 4 Tổ</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[9px]">
          {([1, 2, 3, 4] as const).map((tid) => {
            const team = teams[tid];
            const isBuffed = team.buffExpiresAt > Date.now();
            return (
              <div
                key={tid}
                className="flex items-center justify-between px-1 py-0.5 rounded"
                style={{ backgroundColor: `${team.color}25`, borderLeft: `2px solid ${team.color}` }}
              >
                <span className="font-semibold text-gray-200">{team.name}</span>
                <span className="font-bold" style={{ color: team.color }}>
                  {team.totalScore}
                  {isBuffed && <span className="text-amber-300 text-[8px] ml-0.5 animate-pulse">x2</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

