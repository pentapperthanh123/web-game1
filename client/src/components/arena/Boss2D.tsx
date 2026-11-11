import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_STATUS,
  THEME_CONFIGS,
  GAME_THEME,
  TEAM_KEY,
  DAMAGE_TYPE,
  BOSS_ANIMATION_CONSTANTS,
  BOSS_IDLE_CONSTANTS,
  TeamType,
  DamageType,
} from '../../constants/game';
import { bossSpeechManager, BossSpeechItem } from '../../constants/bossSpeech';
import { BossHitMarks2D } from './BossHitMarks2D';
import { BossAlertBanner } from './BossAlertBanner';
import { GroundShockwaveRing } from './GroundShockwaveRing';
import { ElementalEmbers } from './ElementalEmbers';
import { BossSpeechBubble } from './BossSpeechBubble';
import { BossGlowingEyes } from './BossGlowingEyes';
import { WingGustVFX } from './WingGustVFX';
import { BossDeathVFX2D } from './BossDeathVFX2D';
import { audioService } from '../../services/audioService';

const getAnimationClass = (
  isDefeated: boolean,
  isPoked: boolean,
  isRoarActive: boolean,
  isRecentlyHit: boolean,
  isEnraged: boolean,
  isRestless: boolean,
  isElderDragon: boolean,
  attackTargetTeam: 'BLG' | 'GENG' | 'ALL' | null,
  isUltimateAttack: boolean,
  lastHitTeam: TeamType | null,
  lastHitDamageType: DamageType | null,
  hitNonce: number
): string => {
  if (isDefeated) {
    return 'animate-boss-defeat pointer-events-none';
  }

  // 1. Direct User Poke Reaction (Click / Tap)
  if (isPoked) {
    return 'animate-boss-poke cursor-pointer';
  }

  // 2. Directional Attack Lunges & Earth-Shattering Slams
  if (isRoarActive) {
    const shadowColor = isElderDragon ? 'rgba(245,158,11,1)' : 'rgba(168,85,247,1)';
    if (isUltimateAttack || attackTargetTeam === 'ALL') {
      return `animate-boss-slam-center drop-shadow-[0_0_75px_${shadowColor}] cursor-pointer`;
    }
    if (attackTargetTeam === TEAM_KEY.BLG) {
      return `animate-boss-lunge-left drop-shadow-[0_0_60px_${shadowColor}] cursor-pointer`;
    }
    if (attackTargetTeam === TEAM_KEY.GENG) {
      return `animate-boss-lunge-right drop-shadow-[0_0_60px_${shadowColor}] cursor-pointer`;
    }
    return `animate-boss-slam-center drop-shadow-[0_0_60px_${shadowColor}] cursor-pointer`;
  }

  // 3. Directional Damage Recoil & Stagger with alternating keyframes to prevent freezing
  if (isRecentlyHit) {
    const isHeavy =
      lastHitDamageType === DAMAGE_TYPE.CRIT || lastHitDamageType === DAMAGE_TYPE.ULTIMATE;
    const suffix = hitNonce % 2 === 0 ? '-1' : '-2';

    if (lastHitTeam === TEAM_KEY.BLG) {
      if (isHeavy) {
        return `animate-boss-hit-left-heavy${suffix} cursor-pointer`;
      }
      return `animate-boss-hit-left${suffix} cursor-pointer`;
    }
    if (lastHitTeam === TEAM_KEY.GENG) {
      if (isHeavy) {
        return `animate-boss-hit-right-heavy${suffix} cursor-pointer`;
      }
      return `animate-boss-hit-right${suffix} cursor-pointer`;
    }
    if (isHeavy) {
      return `animate-boss-hit-center-heavy${suffix} cursor-pointer`;
    }
    return `animate-boss-hit-center${suffix} cursor-pointer`;
  }

  // 4. Enraged Stance
  if (isEnraged) {
    return isElderDragon
      ? 'animate-boss-enraged drop-shadow-[0_0_45px_rgba(245,158,11,0.95)] cursor-pointer'
      : 'animate-boss-enraged drop-shadow-[0_0_40px_rgba(239,68,68,0.9)] cursor-pointer';
  }

  // 5. Restless Impatient Stance (Prolonged idle with 0 active champions)
  if (isRestless) {
    return isElderDragon
      ? 'animate-boss-restless drop-shadow-[0_0_55px_rgba(239,68,68,0.95)] cursor-pointer'
      : 'animate-boss-restless drop-shadow-[0_0_50px_rgba(239,68,68,0.9)] cursor-pointer';
  }

  // 6. Natural Living Breathing Idle: Hovering Floating Dragon / Void Serpent Slither
  return isElderDragon
    ? 'animate-dragon-hover drop-shadow-[0_0_32px_rgba(6,182,212,0.7)] cursor-pointer hover:drop-shadow-[0_0_48px_rgba(245,158,11,0.9)] transition-all'
    : 'animate-baron-idle drop-shadow-[0_0_28px_rgba(168,85,247,0.6)] cursor-pointer hover:drop-shadow-[0_0_45px_rgba(168,85,247,0.9)] transition-all';
};

const getElderDragonAura = (isRoarActive: boolean, isEnraged: boolean): string => {
  if (isRoarActive) {
    return 'bg-gradient-to-tr from-cyan-500/60 via-amber-400/60 to-yellow-300/50 blur-3xl scale-125';
  }
  if (isEnraged) {
    return 'bg-gradient-to-tr from-amber-600/55 via-orange-500/45 to-yellow-500/35 blur-3xl';
  }
  return 'bg-gradient-to-tr from-cyan-500/35 via-blue-600/25 to-indigo-700/25 blur-2xl';
};

const getBaronSkillAura = (skillId?: string): string => {
  if (skillId === 'baron_acid_spit') {
    return 'bg-gradient-to-tr from-emerald-500/70 via-green-400/60 to-lime-300/50 blur-3xl scale-125 drop-shadow-[0_0_35px_#22c55e]';
  }
  if (skillId === 'baron_void_spikes') {
    return 'bg-gradient-to-tr from-purple-600/75 via-violet-500/65 to-indigo-400/55 blur-3xl scale-125 drop-shadow-[0_0_35px_#a855f7]';
  }
  if (skillId === 'baron_tail_sweep') {
    return 'bg-gradient-to-tr from-fuchsia-600/75 via-pink-500/65 to-purple-400/55 blur-3xl scale-125 drop-shadow-[0_0_35px_#d946ef]';
  }
  if (skillId === 'baron_void_cataclysm') {
    return 'bg-gradient-to-tr from-rose-600/85 via-purple-600/75 to-red-500/65 blur-3xl scale-135 drop-shadow-[0_0_50px_#ef4444] animate-pulse';
  }
  return 'bg-gradient-to-tr from-purple-500/60 via-fuchsia-500/50 to-pink-500/40 blur-3xl scale-125';
};

const getAuraColorClass = (
  isDefeated: boolean,
  isRoarActive: boolean,
  isEnraged: boolean,
  isRestless: boolean,
  isElderDragon: boolean,
  skillId?: string
): string => {
  if (isDefeated) {
    return 'opacity-0';
  }
  if (isRestless) {
    return isElderDragon
      ? 'bg-gradient-to-tr from-amber-600/70 via-rose-600/60 to-red-500/50 blur-3xl animate-restless-aura'
      : 'bg-gradient-to-tr from-purple-700/75 via-rose-600/65 to-red-600/55 blur-3xl animate-restless-aura';
  }
  if (isElderDragon) {
    return getElderDragonAura(isRoarActive, isEnraged);
  }
  if (isRoarActive) {
    return getBaronSkillAura(skillId);
  }
  if (isEnraged) {
    return 'bg-gradient-to-tr from-rose-600/50 via-red-500/40 to-amber-500/30 blur-3xl';
  }
  return 'bg-gradient-to-tr from-purple-600/35 via-fuchsia-500/25 to-cyan-500/25 blur-2xl';
};

export const Boss2D = () => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossHp = useGameStore((state) => state.bossHp);
  const minions = useGameStore((state) => state.minions);
  const bossHitTimestamp = useGameStore((state) => state.bossHitTimestamp);
  const bossAttackTimestamp = useGameStore((state) => state.bossAttackTimestamp);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const activeBossSkillBanner = useGameStore((state) => state.activeBossSkillBanner);
  const lastHitTeam = useGameStore((state) => state.lastHitTeam);
  const lastHitDamageType = useGameStore((state) => state.lastHitDamageType);
  const bossAttackTargetTeam = useGameStore((state) => state.bossAttackTargetTeam);
  const spawnParticleBurst = useGameStore((state) => state.spawnParticleBurst);

  const themeConfig = THEME_CONFIGS[gameTheme] || THEME_CONFIGS[GAME_THEME.BARON];
  const isElderDragon = gameTheme === GAME_THEME.ELDER_DRAGON;

  // Combat Animation States
  const [isHitActive, setIsHitActive] = useState(false);
  const [hitNonce, setHitNonce] = useState(0);
  const [isRoarActive, setIsRoarActive] = useState(false);

  // Interactive & Ambient Idle States
  const [isPoked, setIsPoked] = useState(false);
  const [isEyesSurging, setIsEyesSurging] = useState(false);
  const [isWingGustActive, setIsWingGustActive] = useState(false);
  const [isRestless, setIsRestless] = useState(false);
  const [activeSpeech, setActiveSpeech] = useState<BossSpeechItem | null>(null);

  const lastActivityTimestampRef = useRef(Date.now());
  const lastSpeechTimestampRef = useRef<number>(0);
  const pokeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark activity whenever combat events fire
  useEffect(() => {
    if (bossHitTimestamp > 0 || bossAttackTimestamp > 0 || minions.length > 0) {
      lastActivityTimestampRef.current = Date.now();
      setIsRestless(false);
    }
  }, [bossHitTimestamp, bossAttackTimestamp, minions.length]);

  // Dynamic hit animation timer
  useEffect(() => {
    if (bossHitTimestamp === 0) return;

    setHitNonce((prev) => (prev + 1) % 1000);
    setIsHitActive(true);
    const isHeavy =
      lastHitDamageType === DAMAGE_TYPE.CRIT || lastHitDamageType === DAMAGE_TYPE.ULTIMATE;
    const duration = isHeavy
      ? BOSS_ANIMATION_CONSTANTS.HEAVY_HIT_DURATION_MS
      : BOSS_ANIMATION_CONSTANTS.HIT_DURATION_MS;

    const timer = setTimeout(() => {
      setIsHitActive(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [bossHitTimestamp, lastHitDamageType]);

  // Dynamic attack animation timer
  useEffect(() => {
    if (bossAttackTimestamp === 0) return;

    setIsRoarActive(true);
    const duration = activeBossSkillBanner?.isUltimate
      ? BOSS_ANIMATION_CONSTANTS.ULTIMATE_ATTACK_DURATION_MS
      : BOSS_ANIMATION_CONSTANTS.ATTACK_DURATION_MS;

    const timer = setTimeout(() => {
      setIsRoarActive(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [bossAttackTimestamp, activeBossSkillBanner?.isUltimate]);

  // Periodic Ambient Idle Lifecycle Loop with non-repeating speech queue and cooldown
  useEffect(() => {
    const idleInterval = setInterval(() => {
      const isDefeatedState = bossStatus === BOSS_STATUS.DEFEATED || bossHp <= 0;
      if (isDefeatedState || isHitActive || isRoarActive || isPoked) {
        return;
      }

      const now = Date.now();
      const idleDuration = now - lastActivityTimestampRef.current;
      const isNoMinionsOnField = minions.length === 0;
      const canSpeak = now - lastSpeechTimestampRef.current >= BOSS_IDLE_CONSTANTS.SPEECH_COOLDOWN_MS;

      // Check Restless Impatient Threshold (> 9.0s with zero active champions)
      if (isNoMinionsOnField && idleDuration >= BOSS_IDLE_CONSTANTS.RESTLESS_THRESHOLD_MS) {
        setIsRestless(true);
        setIsEyesSurging(true);
        audioService.playBossIdleBreath(isElderDragon);

        if (canSpeak) {
          lastSpeechTimestampRef.current = now;
          const nextRestlessSpeech = bossSpeechManager.getNextSpeech(gameTheme, 'RESTLESS');
          setActiveSpeech(nextRestlessSpeech);

          if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
          speechTimerRef.current = setTimeout(() => {
            setActiveSpeech(null);
          }, BOSS_IDLE_CONSTANTS.SPEECH_BUBBLE_DURATION_MS);
        }
        return;
      }

      // Normal Ambient Actions when relaxing
      setIsRestless(false);
      const actionRoll = Math.random();

      if (actionRoll < 0.4) {
        // Ambient 1: Glowing Eye Flare Surge + Breath
        setIsEyesSurging(true);
        audioService.playBossIdleBreath(isElderDragon);
        setTimeout(() => setIsEyesSurging(false), BOSS_IDLE_CONSTANTS.EYE_SURGE_DURATION_MS);
      } else if (actionRoll < 0.75 || !canSpeak) {
        // Ambient 2: Wing Gust (Dragon) or Acid Sputter (Baron)
        setIsWingGustActive(true);
        audioService.playBossIdleBreath(isElderDragon);
        setTimeout(() => setIsWingGustActive(false), BOSS_IDLE_CONSTANTS.WING_GUST_DURATION_MS);
      } else {
        // Ambient 3: Menacing Non-Repeating Speech Taunt (when cooldown allows)
        lastSpeechTimestampRef.current = now;
        const nextAmbientSpeech = bossSpeechManager.getNextSpeech(gameTheme, 'AMBIENT');
        setActiveSpeech(nextAmbientSpeech);

        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        speechTimerRef.current = setTimeout(() => {
          setActiveSpeech(null);
        }, BOSS_IDLE_CONSTANTS.SPEECH_BUBBLE_DURATION_MS);
      }
    }, BOSS_IDLE_CONSTANTS.AMBIENT_ACTION_INTERVAL_MS);

    return () => clearInterval(idleInterval);
  }, [bossStatus, bossHp, isHitActive, isRoarActive, isPoked, minions.length, gameTheme, isElderDragon]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pokeTimerRef.current) clearTimeout(pokeTimerRef.current);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  // Direct User Tap / Click Interaction (Poke & Roar with non-repeating poke quotes)
  const handleBossClick = useCallback(() => {
    if (bossStatus === BOSS_STATUS.DEFEATED || bossHp <= 0) return;

    const now = Date.now();
    lastActivityTimestampRef.current = now;
    lastSpeechTimestampRef.current = now;
    setIsRestless(false);
    setIsPoked(true);
    setIsEyesSurging(true);

    audioService.playBossPokeSound(isElderDragon);

    const burstColor = isElderDragon ? '#f59e0b' : '#c084fc';
    spawnParticleBurst([0, 0.4, 0.5], burstColor, 1.2);

    const nextPokeSpeech = bossSpeechManager.getNextSpeech(gameTheme, 'POKE');
    setActiveSpeech(nextPokeSpeech);

    if (pokeTimerRef.current) clearTimeout(pokeTimerRef.current);
    pokeTimerRef.current = setTimeout(() => {
      setIsPoked(false);
      setIsEyesSurging(false);
    }, BOSS_IDLE_CONSTANTS.POKE_DURATION_MS);

    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => {
      setActiveSpeech(null);
    }, BOSS_IDLE_CONSTANTS.SPEECH_BUBBLE_DURATION_MS);
  }, [bossStatus, bossHp, isElderDragon, gameTheme, spawnParticleBurst]);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED;
  const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;
  const isUltimateAttack = activeBossSkillBanner?.isUltimate ?? false;

  const animationClass = getAnimationClass(
    isDefeated,
    isPoked,
    isRoarActive,
    isHitActive,
    isEnraged,
    isRestless,
    isElderDragon,
    bossAttackTargetTeam,
    isUltimateAttack,
    lastHitTeam,
    lastHitDamageType,
    hitNonce
  );

  const auraColorClass = getAuraColorClass(
    isDefeated,
    isRoarActive,
    isEnraged,
    isRestless,
    isElderDragon,
    activeBossSkillBanner?.skillId
  );

  const isGroundShockActive =
    isRoarActive ||
    (isHitActive &&
      (lastHitDamageType === DAMAGE_TYPE.CRIT || lastHitDamageType === DAMAGE_TYPE.ULTIMATE));

  const shockwaveColor = isElderDragon
    ? '#f59e0b'
    : activeBossSkillBanner?.color || (isEnraged ? '#ef4444' : '#a855f7');

  const wingGustColor = isElderDragon ? '#38bdf8' : '#a855f7';

  return (
    <div
      className={`absolute left-1/2 ${themeConfig.containerPosition} -translate-x-1/2 -translate-y-1/2 select-none z-10 flex items-center justify-center`}
    >
      {/* 1. Skill Combat Alert Banner */}
      <BossAlertBanner
        isRoarActive={isRoarActive}
        isElderDragon={isElderDragon}
        activeBossSkillBanner={activeBossSkillBanner}
        gameTheme={gameTheme}
        defaultRoarTextVi={themeConfig.roarTextVi}
      />

      {/* 2. Living Elemental Portal Aura Glow */}
      <div
        className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full transition-all duration-300 pointer-events-none animate-aura-pulse ${auraColorClass}`}
      />

      {/* 3. Runic Ground Reflection */}
      <div
        className={`absolute ${themeConfig.groundAuraClass} rounded-full blur-xl pointer-events-none`}
      />

      {/* 4. Realistic Ground Contact Shadow under Monster */}
      <div
        className={`absolute top-[82%] left-1/2 -translate-x-1/2 w-52 sm:w-68 h-9 sm:h-12 bg-black/60 rounded-[50%] blur-md pointer-events-none ${
          isElderDragon ? 'animate-dragon-shadow' : ''
        }`}
      />

      {/* 5. Dynamic Ground Shockwave Ripples during Slam & Heavy Hit */}
      <GroundShockwaveRing
        isActive={isGroundShockActive}
        color={shockwaveColor}
        isUltimate={isUltimateAttack || lastHitDamageType === DAMAGE_TYPE.ULTIMATE}
      />

      {/* 6. Wing Flap / Acid Sputter Shockwave Gust */}
      <WingGustVFX isActive={isWingGustActive} color={wingGustColor} />

      {/* 7. Elemental Floating Embers & Sparks */}
      <ElementalEmbers
        isElderDragon={isElderDragon}
        isEnraged={isEnraged}
        isDefeated={isDefeated}
      />

      {/* 8. High-Definition Boss 2D Monster Sprite with Interactive Poke */}
      <div
        onClick={handleBossClick}
        title={t('BossInteractive.pokeTooltip', 'Click để tương tác với Boss!')}
        className={`relative ${themeConfig.spriteSize} ${animationClass} pointer-events-auto group`}
      >
        {/* Dynamic Non-Repeating Comic Speech Bubble Anchored directly over monster head */}
        <BossSpeechBubble
          speech={isRoarActive || isDefeated ? null : activeSpeech}
          isElderDragon={isElderDragon}
          isRestless={isRestless}
        />

        <picture className="w-full h-full block">
          <source srcSet={themeConfig.bossImageWebp} type="image/webp" />
          <img
            src={themeConfig.bossImagePng}
            alt={themeConfig.bossName}
            className="w-full h-full object-contain filter contrast-110 brightness-105 group-hover:scale-105 transition-transform duration-200"
            loading="eager"
            draggable={false}
          />
        </picture>

        {/* 9. Glowing Eyes Surge during Idle / Restless / Poke */}
        <BossGlowingEyes
          isActive={isEyesSurging || isRestless}
          isElderDragon={isElderDragon}
          isRestless={isRestless}
        />

        {/* Crisp Impact Flares aligned directly over Boss */}
        <BossHitMarks2D />
      </div>

      {/* 10. Cinematic Shatter & Execution Callout outside fading sprite */}
      {isDefeated && <BossDeathVFX2D />}
    </div>
  );
};
