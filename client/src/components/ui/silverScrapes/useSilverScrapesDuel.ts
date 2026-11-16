import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { audioService } from '../../../services/audioService';
import {
  hideRoundIntro,
  isCurrentRoundIntroActive,
  resolveRoundIntroDurationMs,
  playRoundIntroCinematic,
} from '../../../store/roundIntroStore';
import { playSound, stopSound } from '../../../services/soundManager';
import { stopAllBossVoices } from '../../../services/bossVoice';
import { SFX_EVENT } from '../../../constants/sfx';
import { GAME_CONSTANTS } from '../../../constants/game';
import { SilverScrapesDuelEvent } from '../../../types/game';

const ULTIMATE_EVENT_TYPES: ReadonlySet<SilverScrapesDuelEvent['type']> = new Set(['ULTIMATE', 'MYTHIC']);

export interface SilverScrapesDuelView {
  shouldRender: boolean;
  isFadingOut: boolean;
  isClashFlashing: boolean;
  dismiss: () => void;
}

/**
 * Lifecycle of the duel overlay: BGM + silencing other voices while it runs, a clash flash per
 * contribution, and the result narration + auto-dismiss once a winner is decided.
 * A finished duel only shows if it was witnessed live in this session (not after a reload).
 */
export const useSilverScrapesDuel = (): SilverScrapesDuelView => {
  const isActive = useGameStore((state) => state.silverScrapesState.isActive);
  const winner = useGameStore((state) => state.silverScrapesState.winner);
  const lastEvent = useGameStore((state) => state.silverScrapesState.lastEvent);

  const [isClashFlashing, setIsClashFlashing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const wasActiveInSessionRef = useRef<boolean>(isActive);
  const hasSpokenSummaryRef = useRef(false);
  /** The duel opened a decider round on top of its intro card; the card comes back once the duel is gone. */
  const isIntroPendingRef = useRef(false);
  const wasRenderedRef = useRef(false);
  const hasWinner = winner !== null;

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    wasActiveInSessionRef.current = false;
  }, []);

  useEffect(() => {
    if (!isActive) return;
    wasActiveInSessionRef.current = true;
    hasSpokenSummaryRef.current = false;
    setIsDismissed(false);
    setIsFadingOut(false);
  }, [isActive]);

  useEffect(() => {
    if (!hasWinner || !wasActiveInSessionRef.current) return undefined;
    if (!hasSpokenSummaryRef.current) {
      hasSpokenSummaryRef.current = true;
      // The result is read by the caster (casterBattleMoments → DUEL_WIN / DUEL_DRAW)
      playSound(SFX_EVENT.VICTORY);
    }
    const fadeTimer = setTimeout(() => setIsFadingOut(true), GAME_CONSTANTS.SILVER_SCRAPES.RESULT_FADE_DELAY_MS);
    const dismissTimer = setTimeout(dismiss, GAME_CONSTANTS.SILVER_SCRAPES.RESULT_DISPLAY_DURATION_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [hasWinner, winner, dismiss]);

  useEffect(() => {
    if (isActive && !isDismissed) {
      if (isCurrentRoundIntroActive()) isIntroPendingRef.current = true;
      stopAllBossVoices();
      // Stray browser speech only; the caster queue is cleared by the director, which then says the duel opening
      audioService.cancelSpeech();
      hideRoundIntro();
      playSound(SFX_EVENT.SILVER_SCRAPES, { loop: true });
    } else {
      stopSound(SFX_EVENT.SILVER_SCRAPES);
    }
    return () => stopSound(SFX_EVENT.SILVER_SCRAPES);
  }, [isActive, isDismissed]);

  useEffect(() => {
    if (!lastEvent) return undefined;
    audioService.playBeamBurstSound(ULTIMATE_EVENT_TYPES.has(lastEvent.type));
    setIsClashFlashing(true);
    const timer = setTimeout(() => setIsClashFlashing(false), GAME_CONSTANTS.SILVER_SCRAPES.CLASH_FLASH_MS);
    return () => clearTimeout(timer);
  }, [lastEvent]);

  const shouldRender = !isDismissed && (isActive || (wasActiveInSessionRef.current && hasWinner));

  useEffect(() => {
    const wasRendered = wasRenderedRef.current;
    wasRenderedRef.current = shouldRender;
    if (shouldRender || !wasRendered || !isIntroPendingRef.current) return;
    isIntroPendingRef.current = false;
    const { roundWinner, currentRound } = useGameStore.getState();
    // The decider opens like every other round: cinematic, then the narrated card
    if (roundWinner === null) playRoundIntroCinematic(Date.now(), resolveRoundIntroDurationMs(currentRound));
  }, [shouldRender]);

  return { shouldRender, isFadingOut, isClashFlashing, dismiss };
};
