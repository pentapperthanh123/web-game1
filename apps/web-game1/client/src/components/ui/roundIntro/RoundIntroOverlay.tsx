import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Gift, Pause, Play, Swords, Timer, Trophy, Volume2 } from 'lucide-react';
import { ROUND_INTRO_CONSTANTS, TEAM_KEY, getBossThemeForRound, getThemeConfig } from '../../../constants/game';
import { useGameStore } from '../../../store/gameStore';
import {
  ROUND_HOLD_REASON,
  cancelAutoStart,
  endIntroCinematic,
  isCompactRoundIntro,
  isRoundIntroActive,
  playIntroCinematic,
  playRoundIntroCinematic,
  resolveRoundIntroDurationMs,
  showRoundIntro,
  startIntroNarration,
  useRoundIntroStore,
} from '../../../store/roundIntroStore';
import { gameSocket } from '../../../services/socket';
import { playSound } from '../../../services/soundManager';
import { audioService } from '../../../services/audioService';
import { VoiceManager } from '../../../services/caster/VoiceManager';
import { casterSpeechEngine } from '../../../services/caster/speechEngine';
import { casterQueue } from '../../../services/caster/presentationQueue';
import { getPhoneticTeamName, ROUND_NUMBER_WORDS } from '../../../services/caster/CommentaryDirector';
import { SFX_EVENT } from '../../../constants/sfx';
import { stopAllBossVoices } from '../../../services/bossVoice';
import { requestRoundStart, triggerStartRoundCombat } from '../../../services/roundIntroActions';
import { GiftsPage, MatchupPage, RulesPage } from './RoundIntroPages';
import { CinematicEsportsIntro } from './CinematicEsportsIntro';
import { preloadCinematicIntroScore } from '../../../services/audio/cinematicIntroScore';
import { workerSetInterval, workerSetTimeout } from '../../../services/workerScheduler';

type IntroTab = 'MATCHUP' | 'RULES' | 'GIFTS';
const TICK_MS = 200;

/** Elapsed ms since the intro narration started, ticking only while it is visible and not in manual hold. */
const useIntroElapsed = (
  shownAt: number,
  totalMs: number,
  isManualHold: boolean,
  onComplete: () => void
): number => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (shownAt <= 0 || isManualHold) {
      setElapsed(0);
      return undefined;
    }
    setElapsed(Date.now() - shownAt);

    return workerSetInterval(() => {
      const now = Date.now();
      const nextElapsed = now - shownAt;
      setElapsed(nextElapsed);

      if (nextElapsed >= totalMs || !isRoundIntroActive(shownAt, now, isManualHold, totalMs)) {
        onComplete();
      }
    }, TICK_MS);
  }, [shownAt, totalMs, isManualHold, onComplete]);

  return isManualHold ? 0 : elapsed;
};

const resolveAutoTab = (elapsedMs: number, isCompact: boolean): IntroTab => {
  if (isCompact || elapsedMs < ROUND_INTRO_CONSTANTS.TAB_MATCHUP_MS) {
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

/** Esports broadcast full-screen takeover shown as a new round starts:
 * In initial manual hold: showcases both pro teams & rosters in silence until operator clicks Start.
 * Once started: triggers automated AI Caster narration across Matchup → Rules → Gifts and counts down.
 */
export const RoundIntroOverlay = () => {
  const { t } = useTranslation();
  const shownAt = useRoundIntroStore((state) => state.shownAt);
  const currentRound = useGameStore((state) => state.currentRound);
  const activeRound = Number(currentRound) || 1;
  const isManualHold = useRoundIntroStore((state) => state.isManualHold);
  const autoStartAt = useRoundIntroStore((state) => state.autoStartAt);
  const introDurationMs = useRoundIntroStore((state) => state.durationMs);
  const backgroundImageUrl = useRoundIntroStore((state) => state.backgroundImageUrl);
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const seriesFormat = useGameStore((state) => state.seriesFormat);
  const targetWins = useGameStore((state) => state.bo5TargetWins);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  const isSilverScrapesActive = useGameStore((state) => state.silverScrapesState.isActive);

  const holdReason = useRoundIntroStore((state) => state.holdReason);
  const isNewSeries = holdReason === ROUND_HOLD_REASON.NEW_SERIES;

  const worldsTitleText = (
    isNewSeries
      ? t('RoundIntro.newSeriesOpeningTitle', {
          defaultValue: '🔥 CẶP ĐẤU MỚI: {{left}} VS {{right}} • VÁN 1',
          left: leftTeam.shortTag,
          right: rightTeam.shortTag,
        })
      : isManualHold
      ? t('RoundIntro.worldsOpeningTitle', {
          defaultValue: 'KỲ CHUNG KẾT THẾ GIỚI • VÁN {{round}}',
          round: activeRound,
        })
      : t('RoundIntro.roundLabel', {
          defaultValue: 'Ván {{round}} sắp bắt đầu',
          round: activeRound,
        })
  ).replace(/\{\{\s*round\s*\}\}/gi, String(activeRound));

  const startWorldsText = t('RoundIntro.startWorldsButton', {
    defaultValue: 'Bắt đầu ván {{round}}',
    round: activeRound,
  }).replace(/\{\{\s*round\s*\}\}/gi, String(activeRound));

  const [manualTab, setManualTab] = useState<IntroTab | null>(null);
  // In the store so the admin portal's "Bắt đầu ván đấu" (socket) starts the same cinematic as this card
  const isPlayingCinematic = useRoundIntroStore((state) => state.isCinematicPlaying);
  const prevRemainingSecRef = useRef<number>(ROUND_INTRO_CONSTANTS.TOTAL_MS / 1000);
  const hasPlayedMatchFoundRef = useRef<boolean>(false);
  const lastSpokenTabRef = useRef<IntroTab | null>(null);
  /** Bumped whenever a narration must stop, so a multi-part line never continues after it. */
  const narrationIdRef = useRef(0);

  const bossThemeConfig = getThemeConfig(gameTheme);
  const bossName = bossThemeConfig.bossName;
  const bossImage = bossThemeConfig.bossImagePng || bossThemeConfig.bossImageWebp;

  const handleCinematicComplete = useCallback(() => {
    endIntroCinematic();
    startIntroNarration(Date.now(), resolveRoundIntroDurationMs(useGameStore.getState().currentRound));
    playSound(SFX_EVENT.ROUND_START);
  }, []);

  const handleStartIntro = useCallback(() => {
    setManualTab(null);
    playIntroCinematic();
  }, []);

  const handleStartCombatNow = useCallback(() => {
    triggerStartRoundCombat();
  }, []);

  const handleHoldAutoStart = useCallback(() => {
    cancelAutoStart();
    gameSocket.sendBO5Control('holdRound');
  }, []);

  const [autoStartRemainingSec, setAutoStartRemainingSec] = useState<number>(0);

  // Auto-start countdown for new series
  useEffect(() => {
    if (!isManualHold || autoStartAt <= 0) {
      setAutoStartRemainingSec(0);
      return undefined;
    }

    const checkAutoStart = () => {
      const remainingMs = autoStartAt - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setAutoStartRemainingSec(sec);
      if (remainingMs <= 0) {
        requestRoundStart();
      }
    };

    checkAutoStart();
    return workerSetInterval(checkAutoStart, 250);
  }, [isManualHold, autoStartAt]);

  // Decode the VS cinematic files while the intro card waits, so its first cue plays on time
  useEffect(() => {
    preloadCinematicIntroScore();
  }, []);

  // Clean up ongoing intro speech when intro overlay is unmounted
  useEffect(() => {
    return () => {
      narrationIdRef.current += 1;
      VoiceManager.stopAll();
      audioService.setCombatMuted(false);
    };
  }, []);

  // Silence background combat sounds and boss roars while the intro is shown
  useEffect(() => {
    if (shownAt > 0) {
      stopAllBossVoices();
      audioService.setCombatMuted(true);
    }
    return () => {
      audioService.setCombatMuted(false);
    };
  }, [shownAt]);

  // First load of the overlay counts as the start of the current round.
  // Round 1 (0-0) waits for the host/admin to press start; later rounds open with the cinematic at once.
  useEffect(() => {
    const state = useGameStore.getState();
    const isRound1Initial =
      state.currentRound === 1 &&
      (state.bo5Score[TEAM_KEY.BLG] ?? 0) === 0 &&
      (state.bo5Score[TEAM_KEY.GENG] ?? 0) === 0;

    // Ensure round 1 always initiates with the correct starting boss theme according to the series format
    if (isRound1Initial) {
      const correctTheme = getBossThemeForRound(1, state.seriesFormat);
      if (state.gameTheme !== correctTheme) {
        state.setGameTheme(correctTheme);
      }
    }

    const introDurationMs = resolveRoundIntroDurationMs(state.currentRound);
    if (isRound1Initial) {
      showRoundIntro(Date.now(), true, introDurationMs, ROUND_HOLD_REASON.STREAM_OPENING);
      return;
    }
    playRoundIntroCinematic(Date.now(), introDurationMs);
  }, []);

  // Reset intro states when a new round intro is shown
  useEffect(() => {
    hasPlayedMatchFoundRef.current = false;
    lastSpokenTabRef.current = null;
    setManualTab(null);
  }, [shownAt]);

  // Silence the intro when Silver Scrapes starts; useSilverScrapesDuel hides the card and brings it back after the duel
  useEffect(() => {
    if (isSilverScrapesActive) {
      narrationIdRef.current += 1;
      audioService.cancelSpeech();
      casterSpeechEngine.interrupt();
      casterQueue.clear();
    }
  }, [isSilverScrapesActive]);

  // Keyboard shortcut: Space or Enter starts intro if waiting, or deploys combat if active
  useEffect(() => {
    if (shownAt <= 0 || isSilverScrapesActive || isPlayingCinematic) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setManualTab(null);
        requestRoundStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shownAt, isSilverScrapesActive, isPlayingCinematic]);

  const totalMs = introDurationMs;
  // Compact card (later rounds): matchup only; rules and gifts stay in the participation guide panel
  const isCompact = !isManualHold && isCompactRoundIntro(totalMs);
  const elapsed = useIntroElapsed(shownAt, totalMs, isManualHold, handleStartCombatNow);

  // Determine current active tab (auto-rotation unless manually clicked)
  const autoTab = resolveAutoTab(elapsed, isCompact);
  const activeTab = manualTab ?? autoTab;

  // Trigger narration speech when intro starts or when user clicks a tab
  useEffect(() => {
    // Silence when closed, during Silver Scrapes duel, during VS cinematic, or waiting in manual hold
    if (
      shownAt <= 0 ||
      isSilverScrapesActive ||
      isPlayingCinematic ||
      (isManualHold && manualTab === null)
    ) {
      narrationIdRef.current += 1;
      lastSpokenTabRef.current = null;
      audioService.cancelSpeech();
      casterSpeechEngine.interrupt();
      VoiceManager.stopAll();
      return;
    }

    if (lastSpokenTabRef.current === activeTab) {
      return;
    }
    lastSpokenTabRef.current = activeTab;

    narrationIdRef.current += 1;
    const currentNarrationId = narrationIdRef.current;
    audioService.cancelSpeech();
    casterSpeechEngine.interrupt();
    casterQueue.clear();
    VoiceManager.stopAll();

    if (activeTab === 'MATCHUP') {
      const leftPhonetic = getPhoneticTeamName(leftTeam.name || leftTeam.shortTag);
      const rightPhonetic = getPhoneticTeamName(rightTeam.name || rightTeam.shortTag);
      const roundWord = ROUND_NUMBER_WORDS[activeRound] || String(activeRound);

      const speechText = t(
        'RoundIntro.speechMatchup',
        'Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván {{round}}: {{left}} đại chiến {{right}}. Mục tiêu tiêu diệt Boss {{boss}}!',
        {
          round: roundWord,
          left: leftPhonetic,
          right: rightPhonetic,
          boss: bossName,
        }
      ).replace(/\{\{\s*round\s*\}\}/gi, roundWord);

      return workerSetTimeout(() => {
        if (narrationIdRef.current === currentNarrationId) {
          VoiceManager.speakDynamic(speechText, undefined, true);
        }
      }, 500);
    }

    if (activeTab === 'RULES') {
      const rulePart1 = t(
        'RoundIntro.speechRulesPart1',
        'Luật chơi cực kỳ đơn giản! Khán giả gõ một hoặc hai để triệu hồi tướng vào sân, hoặc gõ tên tướng kèm số một hoặc hai để chọn tướng riêng!'
      );
      const rulePart2 = t(
        'RoundIntro.speechRulesPart2',
        'Bấm tim liên tục nạp Nộ tung Tuyệt Kỹ tối thượng. Hết giờ hoặc khi Boss gục ngã, đội nào dồn nhiều sát thương hơn sẽ giành chiến thắng!'
      );

      return workerSetTimeout(() => {
        if (narrationIdRef.current === currentNarrationId) {
          VoiceManager.speakDynamic(rulePart1, undefined, true);
          VoiceManager.speakDynamic(rulePart2, undefined, true);
        }
      }, 300);
    }

    if (activeTab === 'GIFTS') {
      const giftPart1 = t(
        'RoundIntro.speechGiftsPart1',
        'Tặng quà để tiếp lửa cho đội tuyển của bạn và kích hoạt các hiệu ứng chi viện đặc biệt!'
      );
      const giftPart2 = t(
        'RoundIntro.speechGiftsPart2',
        'Mỗi món quà sẽ triệu hồi mưa thiên thạch, pháo hoa và trợ lực mạnh mẽ giúp tuyển thủ hạ gục Boss!'
      );

      return workerSetTimeout(() => {
        if (narrationIdRef.current === currentNarrationId) {
          VoiceManager.speakDynamic(giftPart1, undefined, true);
          VoiceManager.speakDynamic(giftPart2, undefined, true);
        }
      }, 300);
    }
  }, [
    shownAt,
    activeTab,
    manualTab,
    isManualHold,
    isSilverScrapesActive,
    isPlayingCinematic,
    activeRound,
    leftTeam.name,
    rightTeam.name,
    leftTeam.shortTag,
    rightTeam.shortTag,
    bossName,
    t,
  ]);

  if (isSilverScrapesActive || shownAt <= 0 || (!isManualHold && elapsed >= totalMs)) return null;

  const isFadingOut = !isManualHold && elapsed > totalMs - ROUND_INTRO_CONSTANTS.FADE_OUT_MS;
  const remainingSec = Math.max(1, Math.ceil((totalMs - elapsed) / 1000));

  // Calculate story-style segmented progress percentages
  const matchupProgressMs = isCompact ? totalMs : ROUND_INTRO_CONSTANTS.TAB_MATCHUP_MS;
  const progressMatchup = calcTabProgress(elapsed, 0, matchupProgressMs);
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

  // Play League of Legends audio cues during the final countdown (non-manual mode only):
  if (!isManualHold && remainingSec !== prevRemainingSecRef.current) {
    if (remainingSec <= ROUND_INTRO_CONSTANTS.HYPE_COUNTDOWN_SEC && remainingSec > 0) {
      if (!hasPlayedMatchFoundRef.current) {
        hasPlayedMatchFoundRef.current = true;
        playSound(SFX_EVENT.MATCH_FOUND);
      } else {
        playSound(SFX_EVENT.CHAT_POP);
      }
    }
    prevRemainingSecRef.current = remainingSec;
  }

  const handleTabClick = (tab: IntroTab) => {
    setManualTab(tab);
  };

  if (isPlayingCinematic) {
    return (
      <CinematicEsportsIntro
        leftTeam={leftTeam}
        rightTeam={rightTeam}
        currentRound={activeRound}
        seriesFormat={seriesFormat}
        backgroundImageUrl={backgroundImageUrl}
        onComplete={handleCinematicComplete}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[65] pointer-events-auto flex flex-col items-center justify-center p-2 sm:p-4 select-none bg-slate-950/98 transition-opacity duration-300 overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Dynamic Themed Arena Ambient Backdrop */}
      {backgroundImageUrl ? (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-25">
          <img
            src={backgroundImageUrl}
            alt="Esports Arena Ambient Backdrop"
            className="w-full h-full object-cover object-center filter brightness-75 contrast-125 animate-intro-ken-burns-ambient"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/90 pointer-events-none" />
        </div>
      ) : null}

      {/* Background Cyber Ambient Lights & Stage Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Stage Glows */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[400px] bg-gradient-to-b from-amber-500/25 via-yellow-500/15 to-transparent blur-3xl opacity-90" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[680px] h-[380px] bg-gradient-to-t from-blue-600/25 via-cyan-500/15 to-transparent blur-3xl opacity-80" />
      </div>

      <div className="relative z-10 w-full max-w-xl md:max-w-2xl h-[95vh] max-h-[850px] flex flex-col justify-between rounded-3xl border-2 border-amber-400/70 bg-slate-950/95 p-3.5 sm:p-5 shadow-[0_20px_70px_rgba(0,0,0,0.95),0_0_55px_rgba(245,158,11,0.4)] animate-round-intro-in animate-hextech-glow select-none overflow-hidden">
        {/* Top Header */}
        <div className="shrink-0 mb-2 border-b border-white/10 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0 animate-bounce" />
              <p className="text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-wider bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow leading-snug break-words">
                {worldsTitleText}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span
                className={`rounded-full px-2 py-0.5 text-[8.5px] sm:text-[9px] font-black uppercase border shadow-sm ${
                  isManualHold
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 flex items-center gap-1'
                }`}
              >
                {!isManualHold && <Volume2 className="w-2.5 h-2.5" />}
                {isManualHold
                  ? t('RoundIntro.readyBadge', 'CHỜ BẮT ĐẦU')
                  : t('RoundIntro.statusIntro', 'ĐANG GIỚI THIỆU')}
              </span>
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-mono font-black text-amber-300 border border-amber-400/40 shadow-sm whitespace-nowrap">
                {seriesFormat}
              </span>
            </div>
          </div>

          {/* Segmented Auto-Progress Bar */}
          <div className={`mt-2.5 grid ${isCompact ? 'grid-cols-1' : 'grid-cols-3'} gap-1.5 px-0.5`}>
            <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                style={{
                  width: isManualHold
                    ? activeTab === 'MATCHUP'
                      ? '100%'
                      : '0%'
                    : `${progressMatchup}%`,
                }}
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_6px_rgba(245,158,11,0.8)] transition-all duration-200"
              />
            </div>
            {!isCompact && (
            <>
            <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                style={{
                  width: isManualHold
                    ? activeTab === 'RULES'
                      ? '100%'
                      : '0%'
                    : `${progressRules}%`,
                }}
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_6px_rgba(245,158,11,0.8)] transition-all duration-200"
              />
            </div>
            <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                style={{
                  width: isManualHold
                    ? activeTab === 'GIFTS'
                      ? '100%'
                      : '0%'
                    : `${progressGifts}%`,
                }}
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_6px_rgba(245,158,11,0.8)] transition-all duration-200"
              />
            </div>
            </>
            )}
          </div>
        </div>

        {/* Tab Switcher (hidden on the compact card: it shows the matchup only) */}
        <div className={`shrink-0 mb-2 items-center justify-center gap-1.5 ${isCompact ? 'hidden' : 'flex'}`}>
          <button
            type="button"
            onClick={() => handleTabClick('MATCHUP')}
            className={`pointer-events-auto flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-1.5 px-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition cursor-pointer border whitespace-nowrap shrink-0 ${
              activeTab === 'MATCHUP'
                ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/25 to-amber-600/10 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/30'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Swords className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">{t('RoundIntro.titleMatchup', 'Đối đầu')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('RULES')}
            className={`pointer-events-auto flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-1.5 px-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition cursor-pointer border whitespace-nowrap shrink-0 ${
              activeTab === 'RULES'
                ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/25 to-amber-600/10 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/30'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">{t('RoundIntro.titleRules', 'Luật chơi')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('GIFTS')}
            className={`pointer-events-auto flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-1.5 px-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition cursor-pointer border whitespace-nowrap shrink-0 ${
              activeTab === 'GIFTS'
                ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/25 to-amber-600/10 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/30'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Gift className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">{t('RoundIntro.titleGifts', 'Quà tặng')}</span>
          </button>
        </div>

        {/* Tab Body (Full Height Scrollable) */}
        <div
          key={activeTab}
          className="animate-round-intro-page flex-1 min-h-0 overflow-y-auto py-1 pr-1 custom-scrollbar"
        >
          {activeTab === 'MATCHUP' && (
            <MatchupPage
              leftTeam={leftTeam}
              rightTeam={rightTeam}
              bossName={bossName}
              bossMaxHp={bossMaxHp}
              bossImage={bossImage}
              seriesFormat={seriesFormat}
            />
          )}
          {activeTab === 'RULES' && (
            <RulesPage
              targetWins={targetWins}
              seriesFormat={seriesFormat}
              leftTeam={leftTeam}
              rightTeam={rightTeam}
            />
          )}
          {activeTab === 'GIFTS' && <GiftsPage />}
        </div>

        {/* Action Controls & Countdown Bar */}
        <div className="shrink-0 mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2">
          {/* Animated Countdown or Ready Badge Box */}
          <div
            className={`flex h-11 ${isManualHold ? (autoStartRemainingSec > 0 ? 'w-28' : 'w-24') : 'w-16'} shrink-0 items-center justify-center rounded-xl border font-black transition-all shadow-md ${
              isManualHold
                ? 'border-amber-400 bg-amber-950/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : remainingSec <= ROUND_INTRO_CONSTANTS.HYPE_COUNTDOWN_SEC
                ? 'border-rose-400 bg-rose-950/80 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.6)] animate-pulse'
                : 'border-amber-400/50 bg-slate-900/90 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
            }`}
          >
            {isManualHold ? (
              autoStartRemainingSec > 0 ? (
                <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300">
                  <Timer className="w-3.5 h-3.5 animate-pulse text-amber-300 shrink-0" />
                  <span>{autoStartRemainingSec}s</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300">
                  <Pause className="w-3.5 h-3.5 fill-amber-300" />
                  {t('RoundIntro.readyBox', 'SẴN SÀNG')}
                </span>
              )
            ) : remainingSec <= ROUND_INTRO_CONSTANTS.HYPE_COUNTDOWN_SEC ? (
              <span className="font-mono text-base font-black tracking-tight">{remainingSec}!</span>
            ) : (
              <span className="font-mono text-xs sm:text-sm font-black">{remainingSec}s</span>
            )}
          </div>

          {/* Primary Action Button */}
          {isManualHold ? (
            <div className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={handleStartIntro}
                className="relative overflow-hidden pointer-events-auto flex flex-1 h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_28px_rgba(245,158,11,0.7)] transition-all active:scale-95 cursor-pointer whitespace-nowrap group"
              >
                {/* Shimmer light beam */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-gold-shimmer" />
                </div>
                <Play className="h-4 w-4 fill-current shrink-0 group-hover:scale-110 transition-transform" />
                <span className="whitespace-nowrap font-black">
                  {startWorldsText}
                </span>
                <kbd className="hidden sm:inline-block rounded bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-400/40 shrink-0">
                  Space
                </kbd>
              </button>
              {autoStartRemainingSec > 0 && (
                <button
                  type="button"
                  onClick={handleHoldAutoStart}
                  className="pointer-events-auto flex h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-500/60 bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 hover:text-white px-3 sm:px-4 font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-md shrink-0"
                >
                  <Pause className="h-3.5 w-3.5 shrink-0" />
                  <span>{t('RoundIntro.holdButton', 'Giữ lại')}</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartCombatNow}
              className="relative overflow-hidden pointer-events-auto flex flex-1 h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-yellow-400 hover:from-rose-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_28px_rgba(245,158,11,0.7)] transition-all active:scale-95 cursor-pointer whitespace-nowrap group"
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-gold-shimmer" />
              </div>
              <Swords className="h-4 w-4 shrink-0 group-hover:rotate-12 transition-transform" />
              <span className="whitespace-nowrap font-black">
                {t('RoundIntro.skipButton', 'Xung trận ngay')}
              </span>
              <kbd className="hidden sm:inline-block rounded bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-400/40 shrink-0">
                Space
              </kbd>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
