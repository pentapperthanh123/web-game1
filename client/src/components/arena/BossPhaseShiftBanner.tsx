import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_PHASE, BOSS_PHASE_SHIFT_BANNER_MS } from '../../constants/bossPhases';
import { BOSS_STATUS, BossThemeConfig } from '../../constants/game';

interface BossPhaseShiftBannerProps {
  themeConfig: BossThemeConfig;
}

/** Clean esports callout when the boss escalates to phase 2 / 3 without blocking the arena. */
export const BossPhaseShiftBanner: React.FC<BossPhaseShiftBannerProps> = React.memo(({ themeConfig }) => {
  const { t } = useTranslation();
  const bossPhase = useGameStore((state) => state.bossPhase);
  const bossPhaseChangedAt = useGameStore((state) => state.bossPhaseChangedAt);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If the boss is enraged or in phase 1, do not show phase shift banner to avoid overlapping with enraged alert
    if (bossPhaseChangedAt === 0 || bossPhase === BOSS_PHASE.ONE || bossStatus === BOSS_STATUS.ENRAGED) {
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
  }, [bossPhaseChangedAt, bossPhase, bossStatus]);

  if (!isVisible || bossStatus === BOSS_STATUS.ENRAGED) return null;

  const accentColor =
    bossPhase === BOSS_PHASE.THREE ? themeConfig.colors.enragedHex : themeConfig.colors.secondaryHex;
  const isPhase3 = bossPhase === BOSS_PHASE.THREE;

  return (
    <div
      key={bossPhaseChangedAt}
      className="w-full max-w-sm pointer-events-none select-none animate-in fade-in slide-in-from-top-2 duration-200 px-2 mx-auto flex justify-center"
    >
      {/* Slim Esports Ribbon Ticker: Only 28px height, never blocks the 3D Boss */}
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border bg-slate-950/95 backdrop-blur-md shadow-lg"
        style={{
          borderColor: accentColor,
          boxShadow: `0 0 16px ${accentColor}66`,
        }}
      >
        <span
          className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-900/90 border tracking-wider shrink-0"
          style={{ borderColor: `${accentColor}88`, color: accentColor }}
        >
          {isPhase3
            ? t('BossPhase.phase3Badge', 'GIAI ĐOẠN 3')
            : t('BossPhase.phase2Badge', 'GIAI ĐOẠN 2')}
        </span>

        <span className="text-[10.5px] sm:text-[11px] font-black text-white uppercase tracking-wider drop-shadow truncate flex items-center gap-1">
          {isPhase3 ? (
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
          ) : (
            <Zap className="w-3 h-3 text-cyan-300 shrink-0" />
          )}
          <span>
            {isPhase3
              ? t('BossPhase.titlePhase3Short', 'QUÁI VẬT TẬN THẾ')
              : t('BossPhase.titlePhase2Short', 'QUÁI VẬT THỨC TỈNH')}
          </span>
        </span>

        <span className="text-[9px] font-bold text-slate-300 shrink-0">
          • {isPhase3 ? '+20% SÁT THƯƠNG' : 'MỞ KHÓA CHIÊU CUỐI!'}
        </span>
      </div>
    </div>
  );
});

BossPhaseShiftBanner.displayName = 'BossPhaseShiftBanner';
