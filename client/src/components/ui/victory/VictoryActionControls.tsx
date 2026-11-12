import { useTranslation } from 'react-i18next';
import { ArrowRight, RotateCcw } from 'lucide-react';

interface VictoryActionControlsProps {
  isSeriesEnded: boolean;
  seriesFormat: string;
  isAdvancing: boolean;
  nextQueuedMatchLabel: string | null;
  remainingQueueCount: number;
  onStartNextRound: () => void;
  onResetSeriesMatch: () => void;
  onAdvanceQueuedMatch: () => void;
}

export const VictoryActionControls = ({
  isSeriesEnded,
  seriesFormat,
  isAdvancing,
  nextQueuedMatchLabel,
  remainingQueueCount,
  onStartNextRound,
  onResetSeriesMatch,
  onAdvanceQueuedMatch,
}: VictoryActionControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="pt-0.5 flex flex-col items-center space-y-2">
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] sm:text-[11px] text-slate-300 shadow whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span>
          {isSeriesEnded
            ? t('Victory.seriesEndedNotice', 'Loạt trận {{format}} đã kết thúc!', {
                format: seriesFormat,
              })
            : t('Victory.roundIntermissionPrompt', 'Nghỉ giữa hiệp - Sẵn sàng cho ván tiếp theo')}
        </span>
      </div>

      {isSeriesEnded ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
          {nextQueuedMatchLabel && (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={onAdvanceQueuedMatch}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_20px_rgba(16,185,129,0.55)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <span>
                {t('Victory.nextQueuedMatch', 'TRẬN TIẾP THEO: {{label}} ({{remaining}})', {
                  label: nextQueuedMatchLabel,
                  remaining: remainingQueueCount,
                })}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}
          <button
            type="button"
            disabled={isAdvancing}
            onClick={onResetSeriesMatch}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-[0_0_18px_rgba(245,158,11,0.5)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>{t('Victory.newSeries', 'BẮT ĐẦU TRẬN ĐẤU MỚI')}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isAdvancing}
          onClick={onStartNextRound}
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-[0_0_18px_rgba(6,182,212,0.55)] flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap animate-pulse hover:animate-none"
        >
          <span>{t('Victory.nextRoundNow', 'VÀO VÁN TIẾP THEO')}</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>
      )}
    </div>
  );
};
