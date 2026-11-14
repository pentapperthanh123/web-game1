import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Gift, Play, Swords } from 'lucide-react';
import { ROUND_INTRO_CONSTANTS, TEAM_KEY, getThemeConfig } from '../../../constants/game';
import { useGameStore } from '../../../store/gameStore';
import { hideRoundIntro, isRoundIntroActive, showRoundIntro, useRoundIntroStore } from '../../../store/roundIntroStore';
import { playSound } from '../../../services/soundManager';
import { SFX_EVENT } from '../../../constants/sfx';
import { GiftsPage, MatchupPage, RulesPage } from './RoundIntroPages';

type IntroTab = 'MATCHUP' | 'RULES' | 'GIFTS';
const TICK_MS = 200;

/** Elapsed ms since the intro opened, ticking only while it is visible. */
const useIntroElapsed = (shownAt: number, totalMs: number, onComplete: () => void): number => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (shownAt <= 0) return undefined;
    setElapsed(Date.now() - shownAt);

    const timer = window.setInterval(() => {
      const now = Date.now();
      const nextElapsed = now - shownAt;
      setElapsed(nextElapsed);

      if (nextElapsed >= totalMs || !isRoundIntroActive(shownAt, now)) {
        onComplete();
      }
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [shownAt, totalMs, onComplete]);

  return elapsed;
};

const resolveAutoTab = (elapsedMs: number): IntroTab => {
  if (elapsedMs < ROUND_INTRO_CONSTANTS.TAB_MATCHUP_MS) {
    return 'MATCHUP';
  }
  if (elapsedMs < ROUND_INTRO_CONSTANTS.TAB_MATCHUP_MS + ROUND_INTRO_CONSTANTS.TAB_RULES_MS) {
    return 'RULES';
  }
  return 'GIFTS';
};

const calcTabProgress = (elapsedMs: number, startMs: number, durationMs: number): number => {
  if (elapsedMs <= startMs) return 0;
  if (elapsedMs >= startMs + durationMs) return 100;
  return Math.min(100, Math.max(0, ((elapsedMs - startMs) / durationMs) * 100));
};

/** Esports broadcast matchup card shown as a new round starts: signature duel → quick rules → gifts countdown. */
export const RoundIntroOverlay = () => {
  const { t } = useTranslation();
  const shownAt = useRoundIntroStore((state) => state.shownAt);
  const round = useRoundIntroStore((state) => state.round);
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const seriesFormat = useGameStore((state) => state.seriesFormat);
  const targetWins = useGameStore((state) => state.bo5TargetWins);

  const [manualTab, setManualTab] = useState<IntroTab | null>(null);
  const prevRemainingSecRef = useRef<number>(ROUND_INTRO_CONSTANTS.TOTAL_MS / 1000);

  const bossThemeConfig = getThemeConfig(gameTheme);
  const bossName = bossThemeConfig.bossName;

  const handleStartCombatNow = useCallback(() => {
    hideRoundIntro();
    playSound(SFX_EVENT.ROUND_START);
    const store = useGameStore.getState();
    store.triggerScreenFlash('#f59e0b');
    store.triggerScreenShake(0.8);
  }, []);

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
        handleStartCombatNow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shownAt, handleStartCombatNow]);

  const totalMs = ROUND_INTRO_CONSTANTS.TOTAL_MS;
  const elapsed = useIntroElapsed(shownAt, totalMs, handleStartCombatNow);

  if (shownAt <= 0 || elapsed >= totalMs) return null;

  const isFadingOut = elapsed > totalMs - ROUND_INTRO_CONSTANTS.FADE_OUT_MS;
  const remainingSec = Math.max(1, Math.ceil((totalMs - elapsed) / 1000));

  // Determine current active tab (auto-rotation unless manually clicked)
  const autoTab = resolveAutoTab(elapsed);
  const activeTab = manualTab ?? autoTab;

  // Calculate story-style segmented progress percentages
  const progressMatchup = calcTabProgress(elapsed, 0, ROUND_INTRO_CONSTANTS.TAB_MATCHUP_MS);
  const progressRules = calcTabProgress(
    elapsed,
    ROUND_INTRO_CONSTANTS.TAB_MATCHUP_MS,
    ROUND_INTRO_CONSTANTS.TAB_RULES_MS
  );
  const progressGifts = calcTabProgress(
    elapsed,
    ROUND_INTRO_CONSTANTS.TAB_MATCHUP_MS + ROUND_INTRO_CONSTANTS.TAB_RULES_MS,
    ROUND_INTRO_CONSTANTS.TAB_GIFTS_MS
  );

  // Play audio tick during the final countdown (3, 2, 1)
  if (remainingSec !== prevRemainingSecRef.current) {
    if (remainingSec <= ROUND_INTRO_CONSTANTS.HYPE_COUNTDOWN_SEC && remainingSec > 0) {
      playSound(SFX_EVENT.CHAT_POP);
    }
    prevRemainingSecRef.current = remainingSec;
  }

  const handleTabClick = (tab: IntroTab) => {
    setManualTab(tab);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[24%] z-50 flex justify-center px-3 sm:px-4">
      <div
        className={`w-full max-w-[400px] sm:max-w-[440px] rounded-3xl border-2 border-amber-400/40 bg-slate-950/95 p-3.5 sm:p-4 shadow-[0_16px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.2)] backdrop-blur-2xl transition-opacity duration-300 animate-round-intro-in select-none ${
          isFadingOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Matchup Header */}
        <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5">
          <p className="text-xs sm:text-[13px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow whitespace-nowrap">
            {t('RoundIntro.roundLabel', 'Ván {{round}} sắp bắt đầu', { round })}
          </p>
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-mono font-black text-amber-300 border border-amber-400/40 shadow-sm whitespace-nowrap shrink-0">
            {seriesFormat}
          </span>
        </div>

        {/* Story-style Segmented Auto-Progress Bar */}
        <div className="mb-2.5 grid grid-cols-3 gap-1.5 px-0.5">
          <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              style={{ width: `${progressMatchup}%` }}
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_6px_rgba(245,158,11,0.8)] transition-all duration-200"
            />
          </div>
          <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              style={{ width: `${progressRules}%` }}
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_6px_rgba(245,158,11,0.8)] transition-all duration-200"
            />
          </div>
          <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              style={{ width: `${progressGifts}%` }}
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_6px_rgba(245,158,11,0.8)] transition-all duration-200"
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-2.5 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => handleTabClick('MATCHUP')}
            className={`pointer-events-auto flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-1.5 px-1 text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer border whitespace-nowrap shrink-0 ${
              activeTab === 'MATCHUP'
                ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/25 to-amber-600/10 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/30'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Swords className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">{t('RoundIntro.titleMatchup', 'Đối đầu')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('RULES')}
            className={`pointer-events-auto flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-1.5 px-1 text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer border whitespace-nowrap shrink-0 ${
              activeTab === 'RULES'
                ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/25 to-amber-600/10 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/30'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">{t('RoundIntro.titleRules', 'Luật chơi')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('GIFTS')}
            className={`pointer-events-auto flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-1.5 px-1 text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer border whitespace-nowrap shrink-0 ${
              activeTab === 'GIFTS'
                ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/25 to-amber-600/10 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/30'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Gift className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">{t('RoundIntro.titleGifts', 'Quà tặng')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div key={activeTab} className="animate-round-intro-page min-h-[160px] flex flex-col justify-center">
          {activeTab === 'MATCHUP' && (
            <MatchupPage leftTeam={leftTeam} rightTeam={rightTeam} bossName={bossName} />
          )}
          {activeTab === 'RULES' && (
            <RulesPage targetWins={targetWins} seriesFormat={seriesFormat} />
          )}
          {activeTab === 'GIFTS' && <GiftsPage />}
        </div>

        {/* Action Controls & Countdown */}
        <div className="mt-3 flex items-center gap-2">
          {/* Animated Countdown Box */}
          <div
            className={`flex h-10 w-14 shrink-0 items-center justify-center rounded-xl border font-black transition-all shadow-md ${
              remainingSec <= ROUND_INTRO_CONSTANTS.HYPE_COUNTDOWN_SEC
                ? 'border-rose-400 bg-rose-950/80 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.6)] animate-pulse'
                : 'border-amber-400/50 bg-slate-900/90 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
            }`}
          >
            {remainingSec <= ROUND_INTRO_CONSTANTS.HYPE_COUNTDOWN_SEC ? (
              <span className="font-mono text-base font-black tracking-tight">{remainingSec}!</span>
            ) : (
              <span className="font-mono text-xs font-black">{remainingSec}s</span>
            )}
          </div>

          {/* Instant Deploy Button */}
          <button
            type="button"
            onClick={handleStartCombatNow}
            className="pointer-events-auto flex flex-1 h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.55)] transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5 fill-current shrink-0" />
            <span className="whitespace-nowrap">{t('RoundIntro.skipButton', 'Xung trận ngay')}</span>
            <kbd className="hidden sm:inline-block rounded bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-400/40 shrink-0">
              Space
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
