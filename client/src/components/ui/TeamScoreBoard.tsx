import { useTranslation } from 'react-i18next';
import { Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamLogo } from '../icons/TeamLogos';
import { TeamComboBadge } from './TeamComboBadge';
import { SummonSpotlight } from './SummonShowcase';

export const TeamScoreBoard = () => {
  const { t } = useTranslation();
  const teamScoreBLG = useGameStore((state) => state.teamScoreBLG);
  const teamScoreGENG = useGameStore((state) => state.teamScoreGENG);
  const bo5Score = useGameStore((state) => state.bo5Score);
  const currentRound = useGameStore((state) => state.currentRound);
  const seriesFormat = useGameStore((state) => state.seriesFormat);
  const bo5TargetWins = useGameStore((state) => state.bo5TargetWins);
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);
  const teamCombos = useGameStore((state) => state.teamCombos);

  const blgCombo = teamCombos[TEAM_KEY.BLG];
  const gengCombo = teamCombos[TEAM_KEY.GENG];

  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  const totalScore = teamScoreBLG + teamScoreGENG;
  let leftRatio = 50;
  let rightRatio = 50;
  if (totalScore > 0) {
    leftRatio = (teamScoreBLG / totalScore) * 100;
    rightRatio = (teamScoreGENG / totalScore) * 100;
  }

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-3 mt-1 pointer-events-auto select-none">
      {/* Dynamic Team Headers (Fixed min-height so combo appearance never pushes lineups) */}
      <div className="flex items-center justify-between mb-1 min-h-[34px] sm:min-h-[38px]">
        {/* Left Team Block */}
        <div className={`relative flex items-center space-x-1.5 sm:space-x-2 min-w-0 flex-1 justify-start ${leftTheme.textStrongClass}`}>
          {/* Summon Notification Mini-Pill right above Left Team Logo */}
          <div className="absolute -top-6 left-0 z-40 pointer-events-none">
            <SummonSpotlight side="left" />
          </div>

          <div
            style={{ boxShadow: leftTheme.glowStyle }}
            className={`relative shrink-0 p-0.5 rounded-md border ${leftTheme.bgSoftClass} ${leftTheme.borderSoftClass}`}
          >
            <TeamLogo teamProfile={leftTeam} className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 shrink-0">
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-xs sm:text-sm font-black uppercase tracking-wider truncate ${leftTheme.textClass}`}
              >
                {leftTeam.shortTag}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-mono font-extrabold px-1 rounded border shrink-0 ${leftTheme.textMutedClass} ${leftTheme.bgSoftClass} ${leftTheme.borderSoftClass}`}
              >
                {leftRatio.toFixed(0)}%
              </span>
            </div>
            <div className={`text-[9px] sm:text-[10px] font-mono font-extrabold tracking-tight ${leftTheme.textStrongClass}`}>
              {(teamScoreBLG ?? 0).toLocaleString()} DMG
            </div>
          </div>

          {/* Left Team Combo Badge (Inline on same score row to prevent vertical layout shifts) */}
          <div className="shrink-0 ml-0.5 sm:ml-1 pointer-events-none">
            <TeamComboBadge team={TEAM_KEY.BLG} combo={blgCombo} />
          </div>
        </div>

        {/* Center Series Format & VS Crest */}
        <div className="flex flex-col items-center px-1 sm:px-1.5 shrink-0 z-10">
          <div className="text-[8px] font-black tracking-widest text-slate-300 uppercase bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded-full mb-1 shadow flex items-center space-x-1">
            <Swords className="w-2.5 h-2.5 text-amber-400" />
            <span>{t('Game.roundLabel', 'VÁN {{round}} / {{format}}', { round: currentRound, format: seriesFormat })}</span>
          </div>

          {/* Win Pips + Score */}
          <div className="flex items-center space-x-1.5 bg-slate-950/90 border border-slate-800 px-2 py-0.5 rounded-md shadow-inner">
            {/* Left Win Pips */}
            <div
              className="flex items-center space-x-1"
              title={`${leftTeam.shortTag} thắng ${bo5Score.BLG} ván`}
            >
              {Array.from({ length: bo5TargetWins }).map((_, i) => (
                <span
                  key={`left-pip-${i}`}
                  className={`w-2 h-2 rotate-45 border transition-all ${
                    i < bo5Score.BLG
                      ? leftTheme.winPipActiveClass
                      : 'bg-slate-900 border-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Score */}
            <span className="font-mono text-xs font-black text-white px-0.5">
              {bo5Score.BLG} - {bo5Score.GENG}
            </span>

            {/* Right Win Pips */}
            <div
              className="flex items-center space-x-1"
              title={`${rightTeam.shortTag} thắng ${bo5Score.GENG} ván`}
            >
              {Array.from({ length: bo5TargetWins }).map((_, i) => (
                <span
                  key={`right-pip-${i}`}
                  className={`w-2 h-2 rotate-45 border transition-all ${
                    i < bo5Score.GENG
                      ? rightTheme.winPipActiveClass
                      : 'bg-slate-900 border-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Team Block */}
        <div className={`relative flex items-center space-x-1.5 sm:space-x-2 text-right flex-row-reverse space-x-reverse min-w-0 flex-1 justify-start ${rightTheme.textStrongClass}`}>
          {/* Summon Notification Mini-Pill right above Right Team Logo */}
          <div className="absolute -top-6 right-0 z-40 pointer-events-none">
            <SummonSpotlight side="right" />
          </div>

          <div
            style={{ boxShadow: rightTheme.glowStyle }}
            className={`relative shrink-0 p-0.5 rounded-md border ${rightTheme.bgSoftClass} ${rightTheme.borderSoftClass}`}
          >
            <TeamLogo teamProfile={rightTeam} className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 shrink-0">
            <div className="flex items-center space-x-1.5 justify-end">
              <span
                className={`text-[9px] sm:text-[10px] font-mono font-extrabold px-1 rounded border shrink-0 ${rightTheme.textMutedClass} ${rightTheme.bgSoftClass} ${rightTheme.borderSoftClass}`}
              >
                {rightRatio.toFixed(0)}%
              </span>
              <span
                className={`text-xs sm:text-sm font-black uppercase tracking-wider truncate ${rightTheme.textClass}`}
              >
                {rightTeam.shortTag}
              </span>
            </div>
            <div className={`text-[9px] sm:text-[10px] font-mono font-extrabold tracking-tight ${rightTheme.textStrongClass}`}>
              {(teamScoreGENG ?? 0).toLocaleString()} DMG
            </div>
          </div>

          {/* Right Team Combo Badge (Inline on same score row to prevent vertical layout shifts) */}
          <div className="shrink-0 mr-0.5 sm:ml-1 pointer-events-none">
            <TeamComboBadge team={TEAM_KEY.GENG} combo={gengCombo} />
          </div>
        </div>
      </div>

      {/* Cyberpunk Battle Tug-of-War Bar */}
      <div className="relative w-full h-3.5 sm:h-4 bg-slate-950/95 rounded-lg border border-slate-700/90 p-0.5 shadow-[0_0_16px_rgba(0,0,0,0.9)] overflow-hidden flex">
        {/* Left Territory Bar */}
        <div
          className={`h-full transition-all duration-300 relative ${leftTheme.tugBarLeftClass}`}
          style={{ width: `${leftRatio}%` }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#ffffff]" />
        </div>

        {/* Right Territory Bar */}
        <div
          className={`h-full transition-all duration-300 relative ${rightTheme.tugBarRightClass}`}
          style={{ width: `${rightRatio}%` }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#ffffff]" />
        </div>

        {/* Center Tension Divider */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white shadow-[0_0_6px_#ffffff] z-10" />
      </div>
    </div>
  );
};
