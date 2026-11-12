import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { BOSS_PHASE, BOSS_PHASE_SHIFT_BANNER_MS } from '../../constants/bossPhases';
import { BossThemeConfig } from '../../constants/game';

interface BossPhaseShiftBannerProps {
  themeConfig: BossThemeConfig;
}

/** Clean esports callout when the boss escalates to phase 2 / 3 without blocking lineups. */
export const BossPhaseShiftBanner: React.FC<BossPhaseShiftBannerProps> = React.memo(({ themeConfig }) => {
  const { t } = useTranslation();
  const bossPhase = useGameStore((state) => state.bossPhase);
  const bossPhaseChangedAt = useGameStore((state) => state.bossPhaseChangedAt);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (bossPhaseChangedAt === 0 || bossPhase === BOSS_PHASE.ONE) {
      setIsVisible(false);
      return;
    }
    const remainingMs = BOSS_PHASE_SHIFT_BANNER_MS - (Date.now() - bossPhaseChangedAt);
    if (remainingMs <= 0) {
      setIsVisible(false);
      return;
    }
    setIsVisible(true);
    const timer = setTimeout(() => setIsVisible(false), remainingMs);
    return () => clearTimeout(timer);
  }, [bossPhaseChangedAt, bossPhase]);

  if (!isVisible) return null;

  const accentColor =
    bossPhase === BOSS_PHASE.THREE ? themeConfig.colors.enragedHex : themeConfig.colors.secondaryHex;
  const isPhase3 = bossPhase === BOSS_PHASE.THREE;

  return (
    <div
      key={bossPhaseChangedAt}
      className="w-full max-w-xs sm:max-w-sm pointer-events-none select-none animate-phase-shift-banner px-2 mx-auto flex flex-col items-center"
    >
      <div
        className="w-full px-4 py-2 rounded-xl border bg-slate-950/92 backdrop-blur-md text-center shadow-2xl transition-all"
        style={{
          borderColor: accentColor,
          boxShadow: `0 0 24px ${accentColor}55`,
        }}
      >
        <div className="flex items-center justify-center space-x-1.5 mb-0.5">
          <span
            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-900/90 border tracking-wider"
            style={{ borderColor: `${accentColor}88`, color: accentColor }}
          >
            {isPhase3
              ? t('BossPhase.phase3Badge', 'GIAI ĐOẠN 3')
              : t('BossPhase.phase2Badge', 'GIAI ĐOẠN 2')}
          </span>
        </div>

        <div className="text-sm sm:text-base font-black text-white uppercase tracking-wider drop-shadow-md">
          {isPhase3
            ? t('BossPhase.titlePhase3', '🔥 QUÁI VẬT TẬN THẾ 🔥')
            : t('BossPhase.titlePhase2', '⚡ QUÁI VẬT THỨC TỈNH ⚡')}
        </div>

        <div className="text-[10px] sm:text-xs font-semibold text-slate-300 mt-0.5">
          {isPhase3
            ? t('BossPhase.hintPhase3', 'Sát thương +20% · Ra chiêu nhanh hơn · Hiệu ứng kéo dài')
            : t('BossPhase.hintPhase2', 'Chiêu cuối đã được mở khóa!')}
        </div>
      </div>
    </div>
  );
});

BossPhaseShiftBanner.displayName = 'BossPhaseShiftBanner';
