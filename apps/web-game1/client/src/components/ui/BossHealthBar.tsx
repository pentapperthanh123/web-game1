import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_HEALTH_BAR_LAYOUT,
  BOSS_STATUS,
  UI_CONSTANTS,
  getThemeConfig,
  BossThemeConfig,
} from '../../constants/game';

const getStatusBadgeConfig = (
  bossStatus: string,
  themeConfig: BossThemeConfig,
  t: (key: string, fallback: string) => string
) => {
  if (bossStatus === BOSS_STATUS.DEFEATED) {
    return {
      text: t('Game.defeated', 'ĐÃ BỊ HẠ GỤC!'),
      className: 'bg-rose-700/95 text-white border-rose-500 shadow-[0_0_14px_#f43f5e]',
      isAlert: true,
      isFlame: false,
    };
  }
  if (bossStatus === BOSS_STATUS.ENRAGED) {
    return {
      text: t('Game.rageModeDetailed', 'CUỒNG NỘ (+50% TỐC ĐÁNH)'),
      className: `bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white font-black border-red-400 shadow-[0_0_20px_#ef4444] animate-pulse ${themeConfig.colors.badgeClass}`,
      isAlert: false,
      isFlame: true,
    };
  }
  return { text: '', className: '', isAlert: false, isFlame: false };
};

const getHpBarGradient = (bossStatus: string, themeConfig: BossThemeConfig): string => {
  if (bossStatus === BOSS_STATUS.ENRAGED) {
    return `${themeConfig.colors.hpBarEnragedClass} animate-lava-flow-shimmer shadow-[0_0_24px_rgba(239,68,68,0.7)]`;
  }
  return `${themeConfig.colors.hpBarClass} shadow-[0_0_16px_rgba(0,0,0,0.5)]`;
};

const getContainerBorderClass = (bossStatus: string, themeConfig: BossThemeConfig): string => {
  if (bossStatus === BOSS_STATUS.ENRAGED) {
    return `${themeConfig.colors.borderClass} shadow-[0_0_25px_rgba(239,68,68,0.85)] animate-pulse`;
  }
  if (bossStatus === BOSS_STATUS.DEFEATED) {
    return 'border-rose-900/80 shadow-[0_0_15px_rgba(244,63,94,0.4)] opacity-75';
  }
  return themeConfig.colors.borderClass;
};

/** Boss name (and enraged / defeated badge), shown right above the boss head. */
export const BossNameTag = React.memo(() => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const themeConfig = getThemeConfig(gameTheme);
  const badgeConfig = getStatusBadgeConfig(bossStatus, themeConfig, t);

  return (
    <div className="flex items-center justify-center gap-1 pointer-events-none select-none whitespace-nowrap">
      <span className="tracking-wide uppercase text-white font-black text-[11px] sm:text-[12px] drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
        {t(themeConfig.i18nKey, themeConfig.bossName)}
      </span>
      {badgeConfig.isFlame && <Flame className="w-3 h-3 text-amber-300 animate-bounce shrink-0" />}
      {badgeConfig.isAlert && <ShieldAlert className="w-3 h-3 text-rose-400 animate-bounce shrink-0" />}
      {badgeConfig.text && (
        <span className={`px-1.5 py-px rounded-full text-[8px] font-black tracking-wider border ${badgeConfig.className}`}>
          {badgeConfig.text}
        </span>
      )}
    </div>
  );
});

BossNameTag.displayName = 'BossNameTag';

/** Short HP bar shown right under the boss. */
export const BossHealthBar = React.memo(() => {
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const themeConfig = getThemeConfig(gameTheme);

  const safeMaxHp = Math.max(1, bossMaxHp);
  const hpPercentage = Math.max(0, Math.min(100, (bossHp / safeMaxHp) * 100));
  const [ghostHpPercent, setGhostHpPercent] = useState(hpPercentage);

  // Trailing ghost damage bar effect
  useEffect(() => {
    const timer = setTimeout(() => setGhostHpPercent(hpPercentage), UI_CONSTANTS.GHOST_HP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hpPercentage]);

  const barGradient = getHpBarGradient(bossStatus, themeConfig);
  const containerBorderClass = getContainerBorderClass(bossStatus, themeConfig);

  return (
    <div
      className={`relative ${BOSS_HEALTH_BAR_LAYOUT.WIDTH_CLASS} h-4 bg-slate-950/95 rounded-md border p-px shadow-[0_0_12px_rgba(0,0,0,0.9)] overflow-hidden pointer-events-none select-none transition-[border-color,opacity] duration-500 ${containerBorderClass}`}
    >
      {/* Trailing Ghost Damage Bar - uses GPU composited scaleX to prevent layout reflows */}
      <div
        className="absolute inset-y-px left-px right-px bg-rose-500/40 transition-transform duration-500 rounded-sm origin-left will-change-transform"
        style={{ transform: `scaleX(${ghostHpPercent / 100})` }}
      />

      {/* Active Dynamic HP Bar - uses GPU composited scaleX to maintain 60 FPS in OBS */}
      <div
        className={`h-full w-full rounded-sm transition-transform duration-200 relative origin-left will-change-transform ${barGradient}`}
        style={{ transform: `scaleX(${hpPercentage / 100})` }}
      >
        {bossStatus === BOSS_STATUS.ENRAGED && (
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] animate-shimmer pointer-events-none" />
        )}
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_#ffffff]" />
      </div>

      {/* HP Numeric Overlay */}
      <div className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[9.5px] font-mono font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,1)] tracking-wide">
        <span>{bossHp.toLocaleString()}</span>
        <span className="ml-1 text-cyan-300">({hpPercentage.toFixed(1)}%)</span>
      </div>
    </div>
  );
});

BossHealthBar.displayName = 'BossHealthBar';
