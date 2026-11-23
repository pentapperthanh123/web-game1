import React from 'react';
import { useClassroomStore } from '../../store/classroomStore';
import { BOARD_LAYOUT, STAGE_SIZE } from '../../constants/stageLayout';
import { STAGE_TEXT } from '../../constants/stageText';
import { clamp } from '../../utils/clamp';

const PERCENT_MAX = 100;
const URGENT_SECONDS = 5;
const LED_SIZE_PX = 2;

const SCREEN_BACKGROUND =
  'linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 28%, transparent 29%), radial-gradient(ellipse at 50% 40%, #1e293b 0%, #0b1120 75%)';

const TelevisionScreen: React.FC = () => {
  const topic = useClassroomStore((s) => s.currentQuestion?.topic) || STAGE_TEXT.DEFAULT_TOPIC;
  const timeRemainingSec = useClassroomStore((s) => s.timeRemainingSec);
  const totalTimeSec = useClassroomStore((s) => s.totalTimeSec);
  const timerPercent = totalTimeSec > 0 ? clamp((timeRemainingSec / totalTimeSec) * PERCENT_MAX, 0, PERCENT_MAX) : PERCENT_MAX;
  const isUrgent = timeRemainingSec <= URGENT_SECONDS;

  return (
    <div className="relative w-full h-full rounded-[2px] overflow-hidden flex flex-col items-center justify-between px-2 py-1.5" style={{ background: SCREEN_BACKGROUND }}>
      <span className="max-w-full truncate text-[9px] font-black uppercase tracking-wider text-amber-300 leading-[12px]">
        {STAGE_TEXT.TOPIC_PREFIX} {topic}
      </span>
      <span
        className={`text-[28px] font-black leading-none tabular-nums ${isUrgent ? 'text-rose-400' : 'text-white'}`}
        style={{ textShadow: '0 0 8px rgba(255,255,255,0.25)' }}
      >
        {timeRemainingSec}
        <span className="text-[13px] ml-0.5">{STAGE_TEXT.SECONDS_SUFFIX}</span>
      </span>
      <div className="w-full h-[5px] rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isUrgent ? 'bg-rose-400' : 'bg-emerald-400'}`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Tivi màn hình phẳng siêu mỏng (viền đen 3px) treo chính giữa phía trên bảng,
 * hiển thị chủ đề + đồng hồ đếm ngược như lớp học thật.
 */
export const BoardTelevision: React.FC = () => (
  <div
    className="absolute pointer-events-none select-none rounded-[5px] shadow-[0_6px_14px_rgba(0,0,0,0.45)]"
    style={{
      left: (STAGE_SIZE.WIDTH - BOARD_LAYOUT.TV_WIDTH) / 2,
      top: BOARD_LAYOUT.TV_TOP,
      width: BOARD_LAYOUT.TV_WIDTH,
      height: BOARD_LAYOUT.TV_HEIGHT,
      padding: BOARD_LAYOUT.TV_BEZEL,
      background: 'linear-gradient(180deg, #2a2a33 0%, #050507 12%, #050507 100%)',
    }}
  >
    <TelevisionScreen />
    <span
      className="absolute rounded-full bg-rose-500"
      style={{ right: BOARD_LAYOUT.TV_BEZEL + 2, bottom: (BOARD_LAYOUT.TV_BEZEL - LED_SIZE_PX) / 2, width: LED_SIZE_PX, height: LED_SIZE_PX }}
    />
  </div>
);

export default BoardTelevision;
