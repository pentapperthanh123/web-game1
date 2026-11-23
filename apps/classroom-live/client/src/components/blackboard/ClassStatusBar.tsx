import React from 'react';
import { useClassroomStore } from '../../store/classroomStore';
import { BOARD_LAYOUT } from '../../constants/stageLayout';
import { STAGE_TEXT } from '../../constants/stageText';
import { DESK_COUNT } from '../../constants/classroomCoordinates';

const STATUS_CHIP_CLASS =
  'shrink-0 h-full flex items-center gap-1 rounded-full px-3 text-[11px] font-bold border shadow-md whitespace-nowrap';

/** Thanh riêng dưới bảng xanh: Sĩ số | học sinh mới vào | Chờ ngoài. Không đè lên bảng hay đồng hồ. */
export const ClassStatusBar: React.FC = () => {
  const desks = useClassroomStore((s) => s.desks);
  const waitingCount = useClassroomStore((s) => s.waitingQueue.length);
  const latestEntry = useClassroomStore((s) => s.recentEntries[0]);
  const seatedCount = desks.filter((desk) => desk.studentId !== null).length;

  return (
    <div
      className="absolute flex items-center gap-2 pointer-events-none select-none"
      style={{
        left: BOARD_LAYOUT.LEFT,
        top: BOARD_LAYOUT.STATUS_TOP,
        width: BOARD_LAYOUT.RIGHT - BOARD_LAYOUT.LEFT,
        height: BOARD_LAYOUT.STATUS_BOTTOM - BOARD_LAYOUT.STATUS_TOP,
      }}
    >
      <div className={`${STATUS_CHIP_CLASS} bg-[#031d11] border-emerald-400/60 text-emerald-100`}>
        {STAGE_TEXT.SEATED_LABEL}: <strong className="text-white">{seatedCount}</strong>/{DESK_COUNT}
      </div>

      <div className="flex-1 min-w-0 h-full flex items-center justify-center">
        {latestEntry && (
          <div className="max-w-full h-full flex items-center gap-1.5 bg-white/95 border border-amber-400 text-slate-800 rounded-full px-3 text-[11px] font-bold shadow-md animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="font-extrabold text-rose-600 truncate shrink">{latestEntry.nickname}</span>
            <span className="text-gray-600 truncate">{latestEntry.reason}</span>
          </div>
        )}
      </div>

      <div className={`${STATUS_CHIP_CLASS} bg-[#3a2106] border-amber-400/60 text-amber-200`}>
        {STAGE_TEXT.WAITING_LABEL}: <strong className="text-amber-100">{waitingCount}</strong>
      </div>
    </div>
  );
};

export default ClassStatusBar;
