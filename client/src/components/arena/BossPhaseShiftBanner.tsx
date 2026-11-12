import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { BOSS_PHASE, BOSS_PHASE_RULES, BOSS_PHASE_SHIFT_BANNER_MS } from '../../constants/bossPhases';
import { BossThemeConfig } from '../../constants/game';

interface BossPhaseShiftBannerProps {
  themeConfig: BossThemeConfig;
}

/** Short cinematic callout when the boss escalates to phase 2 / 3. */
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

  const rule = BOSS_PHASE_RULES[bossPhase];
  const accentColor = bossPhase === BOSS_PHASE.THREE ? themeConfig.colors.enragedHex : themeConfig.colors.secondaryHex;
  const phaseLabel = t(`BossPhase.label.${bossPhase}`, rule.labelVi);

  return (
    <div
      key={bossPhaseChangedAt}
      className="absolute top-[-14%] left-1/2 -translate-x-1/2 pointer-events-none z-40 animate-phase-shift-banner whitespace-nowrap"
    >
      <div
        className="px-6 py-2 rounded-2xl border-2 bg-slate-950/85 backdrop-blur-sm text-center shadow-2xl"
        style={{ borderColor: accentColor, boxShadow: `0 0 40px ${accentColor}` }}
      >
        <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.35em]" style={{ color: accentColor }}>
          {t('BossPhase.shiftTitle', 'BOSS THỨC TỈNH')}
        </div>
        <div className="text-lg sm:text-2xl font-black text-white uppercase tracking-wide drop-shadow-lg">
          {phaseLabel}
        </div>
        <div className="text-[10px] sm:text-xs font-bold text-slate-300">
          {bossPhase === BOSS_PHASE.THREE
            ? t('BossPhase.hintPhase3', 'Sát thương +20% · Ra chiêu nhanh hơn · Hiệu ứng kéo dài')
            : t('BossPhase.hintPhase2', 'Chiêu cuối đã được mở khóa!')}
        </div>
      </div>
    </div>
  );
});

BossPhaseShiftBanner.displayName = 'BossPhaseShiftBanner';
