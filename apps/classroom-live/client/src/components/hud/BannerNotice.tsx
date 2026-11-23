import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useClassroomStore } from '../../store/classroomStore';
import { STAGE_TEXT } from '../../constants/stageText';

type BannerKind = 'LOCK_READING' | 'BREAK' | null;

const BANNER_BASE_CLASS =
  'h-full px-4 rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 whitespace-nowrap';

/** Banner nào đang cần hiện (dùng để HUD chọn giữa banner và dòng gợi ý quà, không chồng lên nhau). */
export const useBannerKind = (): BannerKind => {
  const sessionState = useClassroomStore((s) => s.sessionState);
  const isLockWhileReading = useClassroomStore((s) => s.isLockWhileReading);

  if (sessionState === 'READING' && isLockWhileReading) return 'LOCK_READING';
  if (sessionState === 'BELL_BREAK') return 'BREAK';
  return null;
};

export const BannerNotice: React.FC<{ kind: Exclude<BannerKind, null> }> = ({ kind }) => {
  if (kind === 'LOCK_READING') {
    return (
      <div className={`${BANNER_BASE_CLASS} bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white border border-red-300 animate-pulse`}>
        <AlertTriangle className="w-3 h-3 text-yellow-300" />
        <span>{STAGE_TEXT.BANNER_LOCK_READING}</span>
        <AlertTriangle className="w-3 h-3 text-yellow-300" />
      </div>
    );
  }

  return (
    <div className={`${BANNER_BASE_CLASS} bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 border border-amber-200`}>
      <Sparkles className="w-3 h-3 text-amber-900" />
      <span>{STAGE_TEXT.BANNER_BREAK}</span>
      <Sparkles className="w-3 h-3 text-amber-900" />
    </div>
  );
};

export default BannerNotice;
