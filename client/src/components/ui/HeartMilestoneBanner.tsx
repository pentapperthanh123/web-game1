import { Heart, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';

export const HeartMilestoneBanner = () => {
  const { t } = useTranslation();
  const banner = useGameStore((state) => state.activeHeartMilestoneBanner);

  if (!banner) return null;

  return (
    <div className="w-full pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="px-3 py-2 rounded-2xl border border-emerald-400/90 bg-slate-950/95 backdrop-blur-xl shadow-[0_0_26px_rgba(16,185,129,0.65)] flex items-center space-x-2.5 text-white">
        <div className="p-1.5 rounded-xl border border-emerald-400/80 bg-emerald-950/85 flex items-center justify-center shrink-0 shadow-[0_0_12px_#10b981]">
          <Heart className="w-4 h-4 fill-current text-rose-400 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0 leading-tight">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center space-x-1 truncate">
              <Sparkles className="w-3 h-3 text-yellow-300 animate-spin shrink-0" />
              <span className="truncate">{t('Milestone.healTitle', 'ĐẠI HỒI PHỤC TOÀN BẢN ĐỒ!')}</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-[8px] font-black tracking-wider text-white uppercase shrink-0">
              {t('Milestone.healSubtitle', 'MỐC {{milestone}} TIM ĐẠT ĐƯỢC', {
                milestone: banner.milestoneCount.toLocaleString(),
              })}
            </span>
          </div>

          <div className="text-[11px] font-bold flex items-center justify-between space-x-2 pt-0.5">
            <span className="text-slate-200 truncate">
              {t('Milestone.healNotice', 'Hồi phục +{{amount}} HP cho toàn bộ anh hùng', {
                amount: banner.healAmount,
              })}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 text-[10px] font-mono font-black shrink-0">
              +{banner.healAmount} HP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
