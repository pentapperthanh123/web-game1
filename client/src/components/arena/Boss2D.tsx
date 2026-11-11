import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, ASSET_PATHS, UI_CONSTANTS } from '../../constants/game';

const getAnimationClass = (
  isDefeated: boolean,
  isRoarActive: boolean,
  isRecentlyHit: boolean,
  isEnraged: boolean
): string => {
  if (isDefeated) {
    return 'opacity-25 scale-90 blur-sm transition-all duration-1000 grayscale';
  }
  if (isRoarActive) {
    return 'animate-boss-roar drop-shadow-[0_0_50px_rgba(168,85,247,1)]';
  }
  if (isRecentlyHit) {
    return 'animate-boss-hit';
  }
  if (isEnraged) {
    return 'animate-boss-enraged drop-shadow-[0_0_40px_rgba(239,68,68,0.9)]';
  }
  return 'animate-boss-breath drop-shadow-[0_0_28px_rgba(168,85,247,0.6)]';
};

const getAuraColorClass = (
  isDefeated: boolean,
  isRoarActive: boolean,
  isEnraged: boolean
): string => {
  if (isDefeated) {
    return 'opacity-0';
  }
  if (isRoarActive) {
    return 'bg-gradient-to-tr from-purple-500/60 via-fuchsia-500/50 to-pink-500/40 blur-3xl scale-125';
  }
  if (isEnraged) {
    return 'bg-gradient-to-tr from-rose-600/50 via-red-500/40 to-amber-500/30 blur-3xl';
  }
  return 'bg-gradient-to-tr from-purple-600/35 via-fuchsia-500/25 to-cyan-500/25 blur-2xl';
};

export const Boss2D = () => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossHitTimestamp = useGameStore((state) => state.bossHitTimestamp);
  const bossAttackTimestamp = useGameStore((state) => state.bossAttackTimestamp);

  const [isHitActive, setIsHitActive] = useState(false);
  const [isRoarActive, setIsRoarActive] = useState(false);

  // Trigger hit animation state for clean CSS playback without re-renders loop
  useEffect(() => {
    if (bossHitTimestamp === 0) return;

    setIsHitActive(true);
    const timer = setTimeout(() => {
      setIsHitActive(false);
    }, UI_CONSTANTS.HIT_ANIMATION_DURATION_MS);

    return () => clearTimeout(timer);
  }, [bossHitTimestamp]);

  // Trigger roar animation when Boss retaliates
  useEffect(() => {
    if (bossAttackTimestamp === 0) return;

    setIsRoarActive(true);
    const timer = setTimeout(() => {
      setIsRoarActive(false);
    }, 700);

    return () => clearTimeout(timer);
  }, [bossAttackTimestamp]);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED;
  const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;
  const animationClass = getAnimationClass(isDefeated, isRoarActive, isHitActive, isEnraged);
  const auraColorClass = getAuraColorClass(isDefeated, isRoarActive, isEnraged);

  return (
    <div className="absolute left-1/2 top-[41%] sm:top-[43%] -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 flex items-center justify-center">
      {/* Roar Combat Alert Banner */}
      {isRoarActive && (
        <div className="absolute -top-10 sm:-top-12 px-3 py-1 rounded-full bg-purple-950/95 border-2 border-purple-400 text-purple-200 text-[10px] sm:text-xs font-black tracking-widest flex items-center space-x-1.5 shadow-[0_0_20px_#9333ea] animate-bounce z-20">
          <Zap className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
          <span>{t('Game.voidRoar', 'BARON GẦM RÚ HƯ KHÔNG!')}</span>
        </div>
      )}

      {/* 1. Living Void Portal Aura Glow */}
      <div
        className={`absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full transition-all duration-300 pointer-events-none animate-aura-pulse ${auraColorClass}`}
      />

      {/* 2. Runic Ground Reflection */}
      <div className="absolute top-[68%] w-56 h-14 bg-purple-500/15 rounded-full blur-xl pointer-events-none" />

      {/* 3. High-Definition Baron Nashor 2D Monster Sprite */}
      <div className={`relative w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96 ${animationClass}`}>
        <picture className="w-full h-full block">
          <source srcSet={ASSET_PATHS.BOSS_BARON_WEBP} type="image/webp" />
          <img
            src={ASSET_PATHS.BOSS_BARON_PNG}
            alt="Baron Nashor Boss"
            className="w-full h-full object-contain filter contrast-110 brightness-105"
            loading="eager"
            draggable={false}
          />
        </picture>
      </div>
    </div>
  );
};
