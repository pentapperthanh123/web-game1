import { ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { ROUND_INTRO_CONSTANTS, TEAM_KEY } from '../../../constants/game';
import { useGameStore } from '../../../store/gameStore';
import { hideRoundIntro, isRoundIntroActive, showRoundIntro, useRoundIntroStore } from '../../../store/roundIntroStore';
import { GiftsPage, JoinPage, RulesPage } from './RoundIntroPages';

const ALL_PAGE_TITLES: readonly { key: string; fallback: string }[] = [
  { key: 'RoundIntro.titleRules', fallback: '📜 Luật chơi' },
  { key: 'RoundIntro.titleJoin', fallback: '🎮 Cách tham gia' },
  { key: 'RoundIntro.titleGifts', fallback: '🎁 Quà tặng' },
];
const TICK_MS = 250;

/** Elapsed ms since the intro opened, ticking only while it is visible. */
const useIntroElapsed = (shownAt: number, totalMs: number): number => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (shownAt <= 0) return undefined;
    setElapsed(Date.now() - shownAt);
    const timer = window.setInterval(() => {
      const now = Date.now();
      const nextElapsed = now - shownAt;
      setElapsed(nextElapsed);
      if (nextElapsed >= totalMs || !isRoundIntroActive(shownAt, now)) {
        hideRoundIntro();
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [shownAt, totalMs]);
  return elapsed;
};

/** Full-width card shown as a new round starts: rules → how to join → gift tiers. */
export const RoundIntroOverlay = () => {
  const { t } = useTranslation();
  const shownAt = useRoundIntroStore((state) => state.shownAt);
  const round = useRoundIntroStore((state) => state.round);
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);
  const seriesFormat = useGameStore((state) => state.seriesFormat);
  const targetWins = useGameStore((state) => state.bo5TargetWins);
  const isGuideEnabled = useGameStore((state) => state.overlayVisibility.howToPlay);

  // First load of the overlay counts as the start of the current round
  useEffect(() => {
    showRoundIntro(useGameStore.getState().currentRound);
  }, []);

  // Quick keyboard shortcut (Space or Enter) to start combat immediately when intro is active
  useEffect(() => {
    if (shownAt <= 0) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        hideRoundIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shownAt]);

  // "How to play & rewards" off in the admin -> the intro keeps only the rules page (and is shorter)
  const pageCount = isGuideEnabled ? ROUND_INTRO_CONSTANTS.PAGE_COUNT : 1;
  const totalMs = pageCount * ROUND_INTRO_CONSTANTS.PAGE_MS;
  const elapsed = useIntroElapsed(shownAt, totalMs);
  if (shownAt <= 0 || elapsed >= totalMs) return null;

  const pageIndex = Math.min(pageCount - 1, Math.floor(elapsed / ROUND_INTRO_CONSTANTS.PAGE_MS));
  const isFadingOut = elapsed > totalMs - ROUND_INTRO_CONSTANTS.FADE_OUT_MS;
  const remainingSec = Math.max(1, Math.ceil((totalMs - elapsed) / 1000));
  const PAGE_TITLES = ALL_PAGE_TITLES.slice(0, pageCount);
  const pages: readonly ReactElement[] = [
    <RulesPage key="rules" targetWins={targetWins} seriesFormat={seriesFormat} />,
    <JoinPage key="join" leftTeam={leftTeam} rightTeam={rightTeam} />,
    <GiftsPage key="gifts" />,
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[30%] z-50 flex justify-center px-4">
      <div
        className={`w-full max-w-[340px] rounded-2xl border border-amber-300/40 bg-slate-900/85 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-opacity duration-300 animate-round-intro-in ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
      >
        <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
          {t('RoundIntro.roundLabel', 'Ván {{round}} sắp bắt đầu', { round })}
        </p>
        <h2 className="mb-2 text-center text-base font-black text-white">{t(PAGE_TITLES[pageIndex].key, PAGE_TITLES[pageIndex].fallback)}</h2>
        <div key={pageIndex} className="animate-round-intro-page">
          {pages[pageIndex]}
        </div>
        <div className="mt-2 flex justify-center gap-1.5">
          {PAGE_TITLES.map((title, index) => (
            <span key={title.key} className={`h-1.5 rounded-full transition-all ${index === pageIndex ? 'w-5 bg-amber-300' : 'w-1.5 bg-white/30'}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={hideRoundIntro}
          className="pointer-events-auto mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-amber-600/30 to-amber-500/20 py-1 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30 active:scale-95 cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{t('RoundIntro.skipButton', 'Bắt đầu ngay ({{sec}}s)', { sec: remainingSec })}</span>
        </button>
      </div>
    </div>
  );
};
