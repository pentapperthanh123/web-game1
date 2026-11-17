import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Swords, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { DuelHeader } from './silverScrapes/DuelHeader';
import { DuelFighterCard } from './silverScrapes/DuelFighterCard';
import { DuelTugBar } from './silverScrapes/DuelTugBar';
import { DuelPushGuide } from './silverScrapes/DuelPushGuide';
import { DuelFooter } from './silverScrapes/DuelFooter';
import { SilverScrapesIntroStage } from './silverScrapes/SilverScrapesIntroStage';
import { useSilverScrapesDuel } from './silverScrapes/useSilverScrapesDuel';
import { DUEL_DRAW, DUEL_SIDE, clampDuelPercent, resolveHighlightedSide } from './silverScrapes/silverScrapesShared';
import { gameSocket } from '../../services/socket';

const AMBIENT_ALPHA = '26';

/**
 * Full-screen 1v1 "Silver Scrapes" championship duel overlay.
 * Portaled to document.body at z-[9999] so that no 3D elements, boss callouts,
 * or background HUD layers can ever overlay or interfere with the duel stage.
 */
export const SilverScrapesDuelOverlay: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const duel = useGameStore((state) => state.silverScrapesState);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const { shouldRender, isFadingOut, isClashFlashing, dismiss } = useSilverScrapesDuel();

  if (!shouldRender || typeof document === 'undefined') return null;

  const leftTeam = activeTeams[TEAM_KEY.BLG];
  const rightTeam = activeTeams[TEAM_KEY.GENG];
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);
  const leftPercent = clampDuelPercent(duel.tugOfWarPercent);
  const leadingSide = resolveHighlightedSide(duel.winner, leftPercent);
  const isDecided = duel.winner !== null;

  const resolveWinnerTag = (): string | null => {
    if (!duel.winner || duel.winner === DUEL_DRAW) return null;
    return activeTeams[duel.winner]?.shortTag ?? null;
  };
  const winnerTag = resolveWinnerTag();

  const resolveEventColor = (): string | null => {
    if (!duel.lastEvent) return null;
    return getTeamTheme(activeTeams[duel.lastEvent.team]?.colorTheme).primaryHex;
  };
  const eventColor = resolveEventColor();
  const isIntro = Boolean(duel.isIntroActive);

  const handleSkipIntro = () => {
    gameSocket.sendSilverScrapesControl('skipIntro');
    useGameStore.getState().setSilverScrapesState({ isIntroActive: false });
  };

  const overlayContent = (
    <div
      className={clsx(
        'fixed inset-0 z-[9999] pointer-events-auto flex flex-col items-center justify-center p-3 sm:p-4 select-none bg-slate-950/96 backdrop-blur-2xl transition-opacity duration-700 overflow-y-auto overflow-x-hidden',
        isFadingOut ? 'opacity-0' : 'animate-in fade-in zoom-in-95 duration-300'
      )}
    >
      {/* Dynamic Team-Themed Arena Ambient Spotlights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          style={{
            background: `radial-gradient(circle at 10% 45%, ${leftTheme.primaryHex}${AMBIENT_ALPHA}, transparent 65%)`,
          }}
          className="absolute inset-0"
        />
        <div
          style={{
            background: `radial-gradient(circle at 90% 45%, ${rightTheme.primaryHex}${AMBIENT_ALPHA}, transparent 65%)`,
          }}
          className="absolute inset-0"
        />
        {/* Subtle Decider Stage Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,6,23,0.85)_100%)]" />
      </div>

      {/* Top Right Exit / Dismiss Button */}
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/50 transition-colors duration-200 shadow-xl z-20 active:scale-95 cursor-pointer"
        title={t('SilverScrapes.close', 'Đóng')}
        aria-label={t('SilverScrapes.close', 'Đóng')}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Stage Content: Intro Announcement Stage vs Active 1v1 Tug-of-War Stage */}
      {isIntro ? (
        <SilverScrapesIntroStage
          leftFighter={duel.leftFighter}
          rightFighter={duel.rightFighter}
          leftTeamTag={leftTeam.shortTag}
          rightTeamTag={rightTeam.shortTag}
          leftTheme={leftTheme}
          rightTheme={rightTheme}
          introRemaining={duel.introRemaining ?? 5}
          onSkip={handleSkipIntro}
        />
      ) : (
        <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-3 sm:gap-3.5 my-auto px-1 sm:px-2 animate-in fade-in zoom-in-95 duration-300">
          {/* 1. Championship Title & Stadium Countdown Header */}
          <DuelHeader
            timeRemaining={duel.timeRemaining}
            totalDuration={duel.totalDuration}
            isLastStandActive={duel.isLastStandActive && duel.winner === null}
          />

          {/* 2. Duelists Facing Off (Left Card vs Right Card) */}
          <div className="w-full flex items-center gap-2 sm:gap-3">
            <DuelFighterCard
              fighter={duel.leftFighter}
              teamTag={leftTeam.shortTag}
              theme={leftTheme}
              isLeading={leadingSide === DUEL_SIDE.LEFT}
              isWinner={isDecided && leadingSide === DUEL_SIDE.LEFT}
            />

            {/* Central Animated Swords Clash Emblem */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div className="p-2.5 sm:p-3 rounded-full bg-gradient-to-b from-amber-400/25 via-slate-900 to-slate-950 border-2 border-amber-400/80 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                <Swords className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[11px] sm:text-xs font-black italic text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300 tracking-widest drop-shadow">
                {t('SilverScrapes.versus', 'VS')}
              </span>
            </div>

            <DuelFighterCard
              fighter={duel.rightFighter}
              teamTag={rightTeam.shortTag}
              theme={rightTheme}
              isLeading={leadingSide === DUEL_SIDE.RIGHT}
              isWinner={isDecided && leadingSide === DUEL_SIDE.RIGHT}
            />
          </div>

          {/* 3. Dual Energy Beam Tug-of-War Bar */}
          <DuelTugBar
            leftPercent={leftPercent}
            leftTag={leftTeam.shortTag}
            rightTag={rightTeam.shortTag}
            leftColor={leftTheme.primaryHex}
            rightColor={rightTheme.primaryHex}
            isClashFlashing={isClashFlashing}
          />

          {/* 4. Viewer Push Action Guide */}
          {duel.winner === null && <DuelPushGuide />}

          {/* 5. Live Donation Ticker / Winner Reward Banner */}
          <DuelFooter
            winner={duel.winner}
            winnerTag={winnerTag}
            lastEvent={duel.lastEvent}
            eventColor={eventColor}
          />
        </div>
      )}
    </div>
  );

  return createPortal(overlayContent, document.body);
});

SilverScrapesDuelOverlay.displayName = 'SilverScrapesDuelOverlay';

