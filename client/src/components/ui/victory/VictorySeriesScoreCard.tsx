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
    <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/90 shadow-2xl space-y-2">
      <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase flex items-center justify-center space-x-1 whitespace-nowrap">
        <Flame className="w-3 h-3 text-amber-400 shrink-0" />
        <span>{t('Victory.bo5Score', 'TỈ SỐ {{format}} HIỆN TẠI', { format: seriesFormat })}</span>
      </div>

      <div className="flex items-center justify-between px-1 sm:px-3 gap-2">
        {/* Left Team Block */}
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0">
            <TeamLogo teamProfile={leftTeam} teamSlot={TEAM_KEY.BLG} className="w-6 h-6 object-contain" />
          </div>
          <div className="text-left min-w-0">
            <div className={`text-xs font-black leading-tight whitespace-nowrap ${leftTheme.textStrongClass}`}>
              {leftTeam.shortTag}
            </div>
            <div className="flex space-x-1 mt-1">
              {Array.from({ length: targetWins }).map((_, i) => (
                <span
                  key={`win-left-${i}`}
                  className={`w-2.5 h-2.5 rotate-45 border transition-all ${
                    i < leftScore ? leftTheme.winPipActiveClass : 'bg-slate-900 border-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Center Score Display */}
        <div className="flex items-center space-x-2 px-3.5 py-1 rounded-xl bg-slate-950 border border-slate-800 shadow-inner shrink-0 whitespace-nowrap">
          <span className={`font-mono text-base sm:text-lg font-black ${leftTheme.textStrongClass}`}>
            {leftScore}
          </span>
          <span className="text-slate-500 font-black">-</span>
          <span className={`font-mono text-base sm:text-lg font-black ${rightTheme.textStrongClass}`}>
            {rightScore}
          </span>
        </div>

        {/* Right Team Block */}
        <div className="flex items-center space-x-2 flex-row-reverse space-x-reverse min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0">
            <TeamLogo teamProfile={rightTeam} teamSlot={TEAM_KEY.GENG} className="w-6 h-6 object-contain" />
          </div>
          <div className="text-right min-w-0">
            <div className={`text-xs font-black leading-tight whitespace-nowrap ${rightTheme.textStrongClass}`}>
              {rightTeam.shortTag}
            </div>
            <div className="flex space-x-1 justify-end mt-1">
              {Array.from({ length: targetWins }).map((_, i) => (
                <span
                  key={`win-right-${i}`}
                  className={`w-2.5 h-2.5 rotate-45 border transition-all ${
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
