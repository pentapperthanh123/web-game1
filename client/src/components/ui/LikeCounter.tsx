import { Heart, Sparkles, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';

const BOOST_DISPLAY_MIN_MULTIPLIER = 1.05;

export const LikeCounter = () => {
  const { t } = useTranslation();
  const totalLikesBLG = useGameStore((state) => state.totalLikesBLG);
  const totalLikesGENG = useGameStore((state) => state.totalLikesGENG);
  const teamHeartMomentum = useGameStore((state) => state.teamHeartMomentum);
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);

  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  const totalCombinedLikes = (totalLikesBLG ?? 0) + (totalLikesGENG ?? 0);
  const threshold = GAME_CONSTANTS.HEART_MILESTONE.THRESHOLD;
  const currentProgress = totalCombinedLikes % threshold;
  const progressPercent = Math.min(100, Math.round((currentProgress / threshold) * 100));

  const leftMultiplier = teamHeartMomentum?.[TEAM_KEY.BLG]?.multiplier ?? 1;
  const rightMultiplier = teamHeartMomentum?.[TEAM_KEY.GENG]?.multiplier ?? 1;
  const isLeftBoostActive = leftMultiplier > BOOST_DISPLAY_MIN_MULTIPLIER;
  const isRightBoostActive = rightMultiplier > BOOST_DISPLAY_MIN_MULTIPLIER;

  return (
    <div className="relative z-[5] flex flex-col space-y-1 pointer-events-auto items-end w-full max-w-full">
      {(isLeftBoostActive || isRightBoostActive) && (
        <div className="flex items-center justify-end flex-wrap gap-1">
          {isLeftBoostActive && (
            <div
              className={`flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full border text-[8px] font-black shadow-md animate-pulse ${leftTheme.pillButtonClass}`}
            >
              <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" />
              <span>
                {t('Milestone.furySpeedBoost', 'Nộ {{team}} x{{multiplier}}', {
                  team: leftTeam.shortTag,
                  multiplier: leftMultiplier.toFixed(1),
                })}
              </span>
            </div>
          )}
          {isRightBoostActive && (
            <div
              className={`flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full border text-[8px] font-black shadow-md animate-pulse ${rightTheme.pillButtonClass}`}
            >
              <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" />
              <span>
                {t('Milestone.furySpeedBoost', 'Nộ {{team}} x{{multiplier}}', {
                  team: rightTeam.shortTag,
                  multiplier: rightMultiplier.toFixed(1),
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Heart Milestone Healing Progress */}
      <div className="flex flex-col px-2 py-1 rounded-lg bg-slate-950/35 border border-emerald-500/40 backdrop-blur-[1px] shadow-md text-[9px] w-full max-w-[136px] sm:w-36">
        <div className="flex items-center justify-between text-emerald-300 font-bold mb-0.5">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-2.5 h-2.5 text-emerald-400 animate-spin" />
            <span className="text-[8px] font-black uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              {t('Milestone.healProgress', 'Đại Hồi Phục:')}
            </span>
          </span>
          <span className="font-mono text-[8px] text-emerald-300 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            {currentProgress}/{threshold}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-900/50 rounded-full overflow-hidden border border-emerald-950/60">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end flex-wrap gap-1">
        {/* Left Team Likes */}
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-950/35 border backdrop-blur-[1px] shadow-md ${leftTheme.likeBadgeBorderClass}`}
        >
          <Heart className={`w-3 h-3 fill-current animate-pulse ${leftTheme.textStrongClass}`} />
          <span
            className={`text-[9px] font-mono font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${leftTheme.textClass}`}
          >
            {(totalLikesBLG ?? 0).toLocaleString()}
          </span>
          <span className={`text-[7px] font-bold uppercase ${leftTheme.textClass}`}>
            {leftTeam.shortTag}
          </span>
        </div>

        {/* Right Team Likes */}
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-950/35 border backdrop-blur-[1px] shadow-md ${rightTheme.likeBadgeBorderClass}`}
        >
          <Heart className={`w-3 h-3 fill-current animate-pulse ${rightTheme.textStrongClass}`} />
          <span
            className={`text-[9px] font-mono font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${rightTheme.textClass}`}
          >
            {(totalLikesGENG ?? 0).toLocaleString()}
          </span>
          <span className={`text-[7px] font-bold uppercase ${rightTheme.textClass}`}>
            {rightTeam.shortTag}
          </span>
        </div>
      </div>
    </div>
  );
};
