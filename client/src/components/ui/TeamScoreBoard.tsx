import React from 'react';
import { useTranslation } from 'react-i18next';
import { Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY, TeamType } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamColorPalette } from '../../types/team';
import { TeamLogo } from '../icons/TeamLogos';
import { TeamComboBadge, MIN_COMBO_DISPLAY_COUNT } from './TeamComboBadge';
import { SummonSpotlight } from './SummonShowcase';
import { MatchupTitleTally } from './MatchupTitleTally';
import { TeamLiveStatusRow } from './TeamLiveStatusRow';
import { isComebackBuffActive } from '../../store/comebackRules';

/**
 * Isolated continuous damage number & ratio display.
 * Re-renders in real-time at 60 FPS on every single hit without
 * triggering re-renders for the rest of the TeamScoreBoard.
 */
const TeamDmgDisplay = React.memo(
  ({
    team,
    shortTag,
    leftTheme,
    rightTheme,
  }: {
    team: TeamType;
    shortTag: string;
    leftTheme: TeamColorPalette;
    rightTheme: TeamColorPalette;
  }) => {
    const leftScore = useGameStore(
      (state) => state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG
    );
    const rightScore = useGameStore(
      (state) => state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG
    );

    const isLeft = team === TEAM_KEY.BLG;
    const currentScore = isLeft ? leftScore : rightScore;
    const theme = isLeft ? leftTheme : rightTheme;

    const totalScore = leftScore + rightScore;
    const ratio = totalScore > 0 ? (currentScore / totalScore) * 100 : 50;
    const hasComebackBuff = isComebackBuffActive(team);
    const { t } = useTranslation();

    return (
      <div className="min-w-0 shrink-0">
        <div className={`flex items-center space-x-1.5 ${isLeft ? '' : 'justify-end'}`}>
          {!isLeft && hasComebackBuff && (
            <span className="flex items-center gap-0.5 text-[8.5px] sm:text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse shrink-0">
              ⚡ {t('Game.comebackBuffBadge', 'LẬT KÈO +15%')}
            </span>
          )}
          {!isLeft && (
            <span
              className={`text-[9px] sm:text-[10px] font-mono font-extrabold px-1 rounded border shrink-0 ${theme.textMutedClass} ${theme.bgSoftClass} ${theme.borderSoftClass}`}
            >
              {ratio.toFixed(0)}%
            </span>
          )}
          <span
            className={`text-xs sm:text-sm font-black uppercase tracking-wider truncate ${theme.textClass}`}
          >
            {shortTag}
          </span>
          {isLeft && (
            <span
              className={`text-[9px] sm:text-[10px] font-mono font-extrabold px-1 rounded border shrink-0 ${theme.textMutedClass} ${theme.bgSoftClass} ${theme.borderSoftClass}`}
            >
              {ratio.toFixed(0)}%
            </span>
          )}
          {isLeft && hasComebackBuff && (
            <span className="flex items-center gap-0.5 text-[8.5px] sm:text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse shrink-0">
              ⚡ {t('Game.comebackBuffBadge', 'LẬT KÈO +15%')}
            </span>
          )}
        </div>
        <div
          className={`text-[9px] sm:text-[10px] font-mono font-extrabold tracking-tight ${theme.textStrongClass}`}
        >
          {(currentScore ?? 0).toLocaleString()} DMG
        </div>
      </div>
    );
  }
);

TeamDmgDisplay.displayName = 'TeamDmgDisplay';

/**
 * Isolated Tug of War bar.
 * Updates dynamically in real-time 60 FPS via GPU transitions
 * without causing any overhead to the team logos or series score.
 */
const TugOfWarBar = React.memo(
  ({
    leftTheme,
    rightTheme,
  }: {
    leftTheme: TeamColorPalette;
    rightTheme: TeamColorPalette;
  }) => {
    const leftScore = useGameStore(
      (state) => state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG
    );
    const rightScore = useGameStore(
      (state) => state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG
    );

    const totalScore = leftScore + rightScore;
    const leftRatio = totalScore > 0 ? (leftScore / totalScore) * 100 : 50;
    const rightRatio = 100 - leftRatio;

    return (
      <div className="relative w-full h-3.5 sm:h-4 bg-slate-950/95 rounded-lg border border-slate-700/90 p-0.5 shadow-[0_0_16px_rgba(0,0,0,0.9)] overflow-hidden flex">
        {/* Left Territory Bar */}
        <div
          className={`h-full transition-all duration-200 relative ${leftTheme.tugBarLeftClass}`}
          style={{ width: `${leftRatio}%` }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#ffffff]" />
        </div>

        {/* Right Territory Bar */}
        <div
          className={`h-full transition-all duration-200 relative ${rightTheme.tugBarRightClass}`}
          style={{ width: `${rightRatio}%` }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#ffffff]" />
        </div>

        {/* Center Tension Divider */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white shadow-[0_0_6px_#ffffff] z-10" />
      </div>
    );
  }
);

TugOfWarBar.displayName = 'TugOfWarBar';

/**
 * Isolated Left Team Combo Slot.
 * Only re-renders when BLG combo changes.
 */
const LeftTeamComboSlot = React.memo(() => {
  const combo = useGameStore((state) => state.teamCombos[TEAM_KEY.BLG]);
  if (!combo || combo.count < MIN_COMBO_DISPLAY_COUNT) {
    return null;
  }
  return (
    <div className="mt-1 flex items-center min-h-[18px]">
      <TeamComboBadge team={TEAM_KEY.BLG} combo={combo} />
    </div>
  );
});

LeftTeamComboSlot.displayName = 'LeftTeamComboSlot';

/**
 * Isolated Right Team Combo Slot.
 * Only re-renders when GENG combo changes.
 */
const RightTeamComboSlot = React.memo(() => {
  const combo = useGameStore((state) => state.teamCombos[TEAM_KEY.GENG]);
  if (!combo || combo.count < MIN_COMBO_DISPLAY_COUNT) {
    return null;
  }
  return (
    <div className="mt-1 flex items-center justify-end min-h-[18px]">
      <TeamComboBadge team={TEAM_KEY.GENG} combo={combo} />
    </div>
  );
});

RightTeamComboSlot.displayName = 'RightTeamComboSlot';

export const TeamScoreBoard = React.memo(() => {
  const { t } = useTranslation();
  const bo5Score = useGameStore((state) => state.bo5Score);
  const currentRound = useGameStore((state) => state.currentRound);
  const seriesFormat = useGameStore((state) => state.seriesFormat);
  const bo5TargetWins = useGameStore((state) => state.bo5TargetWins);
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);

  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  return (
    <div className="relative w-full max-w-lg mx-auto px-2 sm:px-3 mt-1.5 sm:mt-2 pointer-events-auto select-none">
      {/* Dynamic Team Headers */}
      <div className="flex items-stretch justify-between min-h-[36px] sm:min-h-[40px]">
        {/* Left Team Block */}
        <div
          className={`relative z-40 flex flex-col justify-between items-start min-w-0 flex-1 self-stretch ${leftTheme.textStrongClass}`}
        >
          {/* Top row: Logo & Damage info */}
          <div className="relative flex items-center space-x-1.5 sm:space-x-2">
            <div
              className={`relative shrink-0 p-0.5 rounded-md border ${leftTheme.bgSoftClass} ${leftTheme.borderSoftClass}`}
            >
              <TeamLogo teamProfile={leftTeam} className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <TeamDmgDisplay
              team={TEAM_KEY.BLG}
              shortTag={leftTeam.shortTag}
              leftTheme={leftTheme}
              rightTheme={rightTheme}
            />
          </div>

          {/* Bottom row: Combo Badge */}
          <LeftTeamComboSlot />
        </div>

        {/* Center Series Format & VS Crest */}
        <div className="flex flex-col items-center justify-between px-1 sm:px-1.5 shrink-0 z-10 self-stretch">
          <div className="flex flex-col items-center">
            <div className="text-[8px] font-black tracking-widest text-slate-300 uppercase bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded-full mb-1 shadow flex items-center space-x-1">
              <Swords className="w-2.5 h-2.5 text-amber-400" />
              <span>
                {t('Game.roundLabel', 'VÁN {{round}} / {{format}}', {
                  round: currentRound,
                  format: seriesFormat,
                })}
              </span>
            </div>

            {/* Win Pips + Score */}
            <div className="flex items-center space-x-1.5 bg-slate-950/90 border border-slate-800 px-2 py-0.5 rounded-md shadow-inner">
              {/* Left Win Pips */}
              <div
                className="flex items-center space-x-1"
                title={`${leftTeam.shortTag} thắng ${bo5Score[TEAM_KEY.BLG]} ván`}
              >
                {Array.from({ length: bo5TargetWins }).map((_, i) => (
                  <span
                    key={`left-pip-${i}`}
                    className={`w-2 h-2 rotate-45 border transition-all ${
                      i < bo5Score[TEAM_KEY.BLG]
                        ? leftTheme.winPipActiveClass
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Score */}
              <span className="font-mono text-xs font-black text-white px-0.5">
                {bo5Score[TEAM_KEY.BLG]} - {bo5Score[TEAM_KEY.GENG]}
              </span>

              {/* Right Win Pips */}
              <div
                className="flex items-center space-x-1"
                title={`${rightTeam.shortTag} thắng ${bo5Score[TEAM_KEY.GENG]} ván`}
              >
                {Array.from({ length: bo5TargetWins }).map((_, i) => (
                  <span
                    key={`right-pip-${i}`}
                    className={`w-2 h-2 rotate-45 border transition-all ${
                      i < bo5Score[TEAM_KEY.GENG]
                        ? rightTheme.winPipActiveClass
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <MatchupTitleTally />
        </div>

        {/* Right Team Block */}
        <div
          className={`relative z-40 flex flex-col justify-between items-end min-w-0 flex-1 self-stretch ${rightTheme.textStrongClass}`}
        >
          {/* Top row: Logo & Damage info */}
          <div className="relative flex items-center space-x-1.5 sm:space-x-2 text-right flex-row-reverse space-x-reverse">
            <div
              className={`relative shrink-0 p-0.5 rounded-md border ${rightTheme.bgSoftClass} ${rightTheme.borderSoftClass}`}
            >
              <TeamLogo teamProfile={rightTeam} className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <TeamDmgDisplay
              team={TEAM_KEY.GENG}
              shortTag={rightTeam.shortTag}
              leftTheme={leftTheme}
              rightTheme={rightTheme}
            />
          </div>

          {/* Bottom row: Combo Badge */}
          <RightTeamComboSlot />
        </div>
      </div>

      {/* Cyberpunk Battle Tug-of-War Bar */}
      <div className="relative w-full mt-1 sm:mt-1.5">
        <TugOfWarBar leftTheme={leftTheme} rightTheme={rightTheme} />
      </div>

      <TeamLiveStatusRow />

      {/* Dynamic Summon Spotlight on Left & Right wings right below the scoreboard */}
      <div className="absolute top-full mt-1.5 inset-x-1 sm:inset-x-2 flex items-start justify-between pointer-events-none z-40">
        <div className="flex-1 flex justify-start items-start">
          <SummonSpotlight side="left" />
        </div>
        <div className="flex-1 flex justify-end items-start">
          <SummonSpotlight side="right" />
        </div>
      </div>
    </div>
  );
});

TeamScoreBoard.displayName = 'TeamScoreBoard';
