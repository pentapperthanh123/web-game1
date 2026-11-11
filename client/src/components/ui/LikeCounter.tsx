import { Heart, Sparkles, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, TEAM_KEY } from '../../constants/game';

const BOOST_DISPLAY_MIN_MULTIPLIER = 1.05;

export const LikeCounter = () => {
  const { t } = useTranslation();
  const totalLikesBLG = useGameStore((state) => state.totalLikesBLG);
  const totalLikesGENG = useGameStore((state) => state.totalLikesGENG);
  const teamHeartMomentum = useGameStore((state) => state.teamHeartMomentum);

  const totalCombinedLikes = (totalLikesBLG ?? 0) + (totalLikesGENG ?? 0);
  const threshold = GAME_CONSTANTS.HEART_MILESTONE.THRESHOLD;
  const currentProgress = totalCombinedLikes % threshold;
  const progressPercent = Math.min(100, Math.round((currentProgress / threshold) * 100));

  const blgMultiplier = teamHeartMomentum?.[TEAM_KEY.BLG]?.multiplier ?? 1;
  const gengMultiplier = teamHeartMomentum?.[TEAM_KEY.GENG]?.multiplier ?? 1;
  const isBlgBoostActive = blgMultiplier > BOOST_DISPLAY_MIN_MULTIPLIER;
  const isGengBoostActive = gengMultiplier > BOOST_DISPLAY_MIN_MULTIPLIER;

  return (
    <div className="flex flex-col space-y-1 pointer-events-auto items-end">
      {(isBlgBoostActive || isGengBoostActive) && (
        <div className="flex items-center space-x-1">
          {isBlgBoostActive && (
            <div className="flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/70 text-[8px] font-black text-cyan-200 shadow-md animate-pulse">
              <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" />
              <span>
                {t('Milestone.furySpeedBoost', 'Nộ {{team}} x{{multiplier}}', {
                  team: 'BLG',
                  multiplier: blgMultiplier.toFixed(1),
                })}
              </span>
            </div>
          )}
          {isGengBoostActive && (
            <div className="flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-amber-950/90 border border-amber-400/70 text-[8px] font-black text-amber-200 shadow-md animate-pulse">
              <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" />
              <span>
                {t('Milestone.furySpeedBoost', 'Nộ {{team}} x{{multiplier}}', {
                  team: 'GEN',
                  multiplier: gengMultiplier.toFixed(1),
                })}
              </span>
            </div>
          )}
        </div>
      )}

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
