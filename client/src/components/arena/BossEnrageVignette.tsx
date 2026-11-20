import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, getThemeConfig } from '../../constants/game';

const ENRAGE_VIGNETTE_STYLE = {
  BLUR_PX: 42,
  SPREAD_PX: 8,
} as const;

/**
 * Slim, unobtrusive 9:16 danger vignette that pulses around the screen edges
 * while the Boss is in ENRAGED status (HP < 35%).
 */
export const BossEnrageVignette: React.FC = React.memo(() => {
  const bossStatus = useGameStore((state) => state.bossStatus);
  const isBossHpAlive = useGameStore((state) => state.bossHp > 0);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);

  const isEnraged = bossStatus === BOSS_STATUS.ENRAGED && isBossHpAlive && !isRoundIntermission;
  if (!isEnraged) return null;

  const enragedColor = getThemeConfig(gameTheme).colors.enragedHex;

  return (
    <div
      style={{
        boxShadow: `inset 0 0 ${ENRAGE_VIGNETTE_STYLE.BLUR_PX}px ${ENRAGE_VIGNETTE_STYLE.SPREAD_PX}px ${enragedColor}`,
      }}
      className="fixed inset-0 pointer-events-none z-[18] animate-enrage-vignette"
      aria-hidden="true"
    />
  );
});

BossEnrageVignette.displayName = 'BossEnrageVignette';
