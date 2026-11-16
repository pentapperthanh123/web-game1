import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';
import { TEAM_KEY } from '../../../constants/game';
import { TeamColorPalette, TeamProfile } from '../../../types/team';
import { TeamLogo } from '../../icons/TeamLogos';

interface VictorySeriesScoreCardProps {
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  leftTheme: TeamColorPalette;
  rightTheme: TeamColorPalette;
  leftScore: number;
  rightScore: number;
  targetWins: number;
  seriesFormat: string;
}

export const VictorySeriesScoreCard = ({
  leftTeam,
  rightTeam,
  leftTheme,
  rightTheme,
  leftScore,
  rightScore,
  targetWins,
  seriesFormat,
}: VictorySeriesScoreCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/90 shadow-lg space-y-1">
      <div className="text-[8.5px] font-black tracking-widest text-slate-400 uppercase flex items-center justify-center space-x-1 whitespace-nowrap">
        <Flame className="w-2.5 h-2.5 text-amber-400 shrink-0" />
        <span>{t('Victory.bo5Score', 'TỈ SỐ {{format}} HIỆN TẠI', { format: seriesFormat })}</span>
      </div>

      <div className="flex items-center justify-between px-1 sm:px-2 gap-1.5">
        {/* Left Team Block */}
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-0.5 shrink-0">
            <TeamLogo teamProfile={leftTeam} teamSlot={TEAM_KEY.BLG} className="w-5 h-5 object-contain" />
          </div>
          <div className="text-left min-w-0">
            <div className={`text-[11px] font-black leading-tight whitespace-nowrap ${leftTheme.textStrongClass}`}>
              {leftTeam.shortTag}
            </div>
            <div className="flex space-x-1 mt-0.5">
              {Array.from({ length: targetWins }).map((_, i) => (
                <span
                  key={`win-left-${i}`}
                  className={`w-2 h-2 rotate-45 border transition-all ${
                    i < leftScore ? leftTheme.winPipActiveClass : 'bg-slate-900 border-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Center Score Display */}
        <div className="flex items-center space-x-1.5 px-3 py-0.5 rounded-lg bg-slate-950 border border-slate-800 shadow-inner shrink-0 whitespace-nowrap">
          <span className={`font-mono text-sm sm:text-base font-black ${leftTheme.textStrongClass}`}>
            {leftScore}
          </span>
          <span className="text-slate-500 font-black text-xs">-</span>
          <span className={`font-mono text-sm sm:text-base font-black ${rightTheme.textStrongClass}`}>
            {rightScore}
          </span>
        </div>

        {/* Right Team Block */}
        <div className="flex items-center space-x-1.5 flex-row-reverse space-x-reverse min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-0.5 shrink-0">
            <TeamLogo teamProfile={rightTeam} teamSlot={TEAM_KEY.GENG} className="w-5 h-5 object-contain" />
          </div>
          <div className="text-right min-w-0">
            <div className={`text-[11px] font-black leading-tight whitespace-nowrap ${rightTheme.textStrongClass}`}>
              {rightTeam.shortTag}
            </div>
            <div className="flex space-x-1 justify-end mt-0.5">
              {Array.from({ length: targetWins }).map((_, i) => (
                <span
                  key={`win-right-${i}`}
                  className={`w-2 h-2 rotate-45 border transition-all ${
                    i < rightScore ? rightTheme.winPipActiveClass : 'bg-slate-900 border-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
