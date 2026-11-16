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
import { useSilverScrapesDuel } from './silverScrapes/useSilverScrapesDuel';
import { DUEL_DRAW, DUEL_SIDE, clampDuelPercent, resolveHighlightedSide } from './silverScrapes/silverScrapesShared';

const AMBIENT_ALPHA = '33';

/** Full-screen 1v1 "Silver Scrapes" duel: two pros, a tug-of-war beam, and how viewers push it. */
export function SilverScrapesDuelOverlay() {
  const { t } = useTranslation();
  const duel = useGameStore((state) => state.silverScrapesState);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const { shouldRender, isFadingOut, isClashFlashing, dismiss } = useSilverScrapesDuel();

  if (!shouldRender) return null;

  const leftTeam = activeTeams[TEAM_KEY.BLG];
  const rightTeam = activeTeams[TEAM_KEY.GENG];
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);
  const leftPercent = clampDuelPercent(duel.tugOfWarPercent);
  const leadingSide = resolveHighlightedSide(duel.winner, leftPercent);
  const isDecided = duel.winner !== null;
  const winnerTag = duel.winner && duel.winner !== DUEL_DRAW ? activeTeams[duel.winner]?.shortTag ?? null : null;
  const eventColor = duel.lastEvent ? getTeamTheme(activeTeams[duel.lastEvent.team]?.colorTheme).primaryHex : null;

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[60] pointer-events-auto flex flex-col items-center justify-between gap-3 px-4 pt-3 pb-3 select-none bg-slate-950/94 backdrop-blur-xl transition-opacity duration-1000 overflow-hidden',
        isFadingOut ? 'opacity-0' : 'animate-in fade-in zoom-in-95 duration-300'
      )}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ background: `radial-gradient(circle at 0% 45%, ${leftTheme.primaryHex}${AMBIENT_ALPHA}, transparent 60%)` }} className="absolute inset-0" />
        <div style={{ background: `radial-gradient(circle at 100% 45%, ${rightTheme.primaryHex}${AMBIENT_ALPHA}, transparent 60%)` }} className="absolute inset-0" />
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/50 transition-colors duration-200 shadow-xl z-20 active:scale-95 cursor-pointer"
        title={t('SilverScrapes.close', 'Đóng')}
        aria-label={t('SilverScrapes.close', 'Đóng')}
      >
        <X className="w-4 h-4" />
      </button>

      <DuelHeader timeRemaining={duel.timeRemaining} totalDuration={duel.totalDuration} isLastStandActive={duel.isLastStandActive && duel.winner === null} />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-4">
        <div className="w-full flex items-center gap-2">
          <DuelFighterCard fighter={duel.leftFighter} teamTag={leftTeam.shortTag} theme={leftTheme} isLeading={leadingSide === DUEL_SIDE.LEFT} isWinner={isDecided && leadingSide === DUEL_SIDE.LEFT} />
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="p-2.5 rounded-full bg-gradient-to-b from-slate-800 to-slate-950 border border-amber-400/60 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.4)]">
              <Swords className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-black italic text-amber-300 tracking-widest">{t('SilverScrapes.versus', 'VS')}</span>
          </div>
          <DuelFighterCard fighter={duel.rightFighter} teamTag={rightTeam.shortTag} theme={rightTheme} isLeading={leadingSide === DUEL_SIDE.RIGHT} isWinner={isDecided && leadingSide === DUEL_SIDE.RIGHT} />
        </div>

        <DuelTugBar
          leftPercent={leftPercent}
          leftTag={leftTeam.shortTag}
          rightTag={rightTeam.shortTag}
          leftColor={leftTheme.primaryHex}
          rightColor={rightTheme.primaryHex}
          isClashFlashing={isClashFlashing}
        />

        {duel.winner === null && <DuelPushGuide />}
      </div>

      <DuelFooter winner={duel.winner} winnerTag={winnerTag} lastEvent={duel.lastEvent} eventColor={eventColor} />
    </div>
  );
}
