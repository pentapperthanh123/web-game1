import { useCallback, useEffect, useRef, useState } from 'react';
import { GUIDE_AUTO_REVEAL_CONSTANTS } from '../../constants/game';
import { useGameStore } from '../../store/gameStore';

const isInRevealWindow = (now: number): boolean =>
  now % GUIDE_AUTO_REVEAL_CONSTANTS.PERIOD_MS < GUIDE_AUTO_REVEAL_CONSTANTS.SHOW_MS;

/**
 * Collapsed while champions are fighting; opens when the arena is empty (nobody is playing)
 * or for a short window every minute. A manual toggle overrides the rule for a while.
 */
export const useGuideAutoReveal = (): { isExpanded: boolean; toggleExpanded: () => void } => {
  const isArenaEmpty = useGameStore((state) => state.minions.length === 0);
  const [isPeriodicOpen, setIsPeriodicOpen] = useState(() => isInRevealWindow(Date.now()));
  const [manualState, setManualState] = useState<{ isExpanded: boolean; until: number } | null>(null);
  const autoExpandedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setIsPeriodicOpen(isInRevealWindow(now));
      setManualState((prev) => (prev && now >= prev.until ? null : prev));
    }, GUIDE_AUTO_REVEAL_CONSTANTS.CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const isAutoExpanded = isArenaEmpty || isPeriodicOpen;
  autoExpandedRef.current = isAutoExpanded;

  const toggleExpanded = useCallback(() => {
    setManualState((prev) => {
      const currentlyExpanded = prev ? prev.isExpanded : autoExpandedRef.current;
      return { isExpanded: !currentlyExpanded, until: Date.now() + GUIDE_AUTO_REVEAL_CONSTANTS.MANUAL_OVERRIDE_MS };
    });
  }, []);

  return { isExpanded: manualState ? manualState.isExpanded : isAutoExpanded, toggleExpanded };
};
