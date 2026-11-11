import { Heart, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS } from '../../constants/game';

export const LikeCounter = () => {
  const { t } = useTranslation();
  const totalLikesBLG = useGameStore((state) => state.totalLikesBLG);
  const totalLikesGENG = useGameStore((state) => state.totalLikesGENG);

  const totalCombinedLikes = (totalLikesBLG ?? 0) + (totalLikesGENG ?? 0);
  const threshold = GAME_CONSTANTS.HEART_MILESTONE.THRESHOLD;
  const currentProgress = totalCombinedLikes % threshold;
  const progressPercent = Math.min(100, Math.round((currentProgress / threshold) * 100));

  return (
    <div className="flex flex-col space-y-1 pointer-events-auto items-end">
      {/* Heart Milestone Healing Progress */}
      <div className="flex flex-col px-2 py-1 rounded-lg bg-slate-950/85 border border-emerald-500/50 backdrop-blur-md shadow-md text-[9px] w-32">
        <div className="flex items-center justify-between text-emerald-300 font-bold mb-0.5">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-2.5 h-2.5 text-emerald-400 animate-spin" />
            <span className="text-[8px] font-black uppercase tracking-wider">
              {t('Milestone.healProgress', 'Đại Hồi Phục:')}
            </span>
          </span>
          <span className="font-mono text-[8px] text-emerald-300 font-bold">
            {currentProgress}/{threshold}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-emerald-950">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center space-x-1">
        {/* BLG Likes */}
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-950/80 border border-cyan-800/80 backdrop-blur-md shadow-md">
          <Heart className="w-3 h-3 fill-current text-cyan-400 animate-pulse" />
          <span className="text-[9px] font-mono font-black text-cyan-300">
            {(totalLikesBLG ?? 0).toLocaleString()}
          </span>
          <span className="text-[7px] font-bold text-cyan-400/80 uppercase">BLG</span>
        </div>

        {/* Gen.G Likes */}
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-950/80 border border-amber-800/80 backdrop-blur-md shadow-md">
          <Heart className="w-3 h-3 fill-current text-amber-400 animate-pulse" />
          <span className="text-[9px] font-mono font-black text-amber-300">
            {(totalLikesGENG ?? 0).toLocaleString()}
          </span>
          <span className="text-[7px] font-bold text-amber-400/80 uppercase">GEN</span>
        </div>
      </div>
    </div>
  );
};
