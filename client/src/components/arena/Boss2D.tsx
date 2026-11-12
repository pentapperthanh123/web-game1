import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_STATUS,
  TEAM_KEY,
  DAMAGE_TYPE,
  BOSS_ANIMATION_CONSTANTS,
  BOSS_IDLE_CONSTANTS,
  TeamType,
  DamageType,
  getThemeConfig,
  BossThemeConfig,
} from '../../constants/game';
import { bossSpeechManager, BossSpeechItem, resolveBossSpeechItem } from '../../constants/bossSpeech';
import { BossHitMarks2D } from './BossHitMarks2D';
import { BossAlertBanner } from './BossAlertBanner';
import { GroundShockwaveRing } from './GroundShockwaveRing';
import { ElementalEmbers } from './ElementalEmbers';
import { BossSpeechBubble } from './BossSpeechBubble';
import { BossGlowingEyes } from './BossGlowingEyes';
import { WingGustVFX } from './WingGustVFX';
import { BossDeathVFX2D } from './BossDeathVFX2D';
import { BossEnragedAura } from './BossEnragedAura';
import { BossDefeatedCrest2D } from './BossDefeatedCrest2D';
import { BossArmorCracks, BossPhaseVisuals } from './BossPhaseVisuals';
import { audioService } from '../../services/audioService';
import { playSound } from '../../services/soundManager';
import { SFX_EVENT } from '../../constants/sfx';
import { BossSkillVfxType } from '../../types/bossSkill';
import { BOSS_SKILL_VFX_ANIMATION_CLASS } from '../../constants/bossSkillVfx';
import { BossSkillVfx2D } from './skillVfx/BossSkillVfx2D';

const getAnimationClass = (
  isDefeated: boolean,
  isPoked: boolean,
  isRoarActive: boolean,
  isRecentlyHit: boolean,
  isEnraged: boolean,
  isRestless: boolean,
  themeConfig: BossThemeConfig,
  attackTargetTeam: 'BLG' | 'GENG' | 'ALL' | null,
  isUltimateAttack: boolean,
  lastHitTeam: TeamType | null,
  lastHitDamageType: DamageType | null,
  hitNonce: number,
  skillId?: string,
  vfxType?: BossSkillVfxType
): string => {
  if (isDefeated) {
    return 'animate-boss-defeat pointer-events-none';
  }
  const archetypeClass = vfxType ? BOSS_SKILL_VFX_ANIMATION_CLASS[vfxType] : null;

  // 1. Direct User Poke Reaction (Click / Tap)
  if (isPoked) {
    return 'animate-boss-poke cursor-pointer';
  }

  // 2. Directional Attack Lunges & Earth-Shattering Slams
  if (isRoarActive) {
    if (themeConfig.archetype === 'HERALD') {
      if (isUltimateAttack || skillId === 'herald_seismic_slam') {
        return 'animate-boss-slam-center drop-shadow-[0_0_80px_rgba(236,72,153,1)] cursor-pointer';
      }
      if (skillId === 'herald_charge') {
        return 'animate-herald-charge drop-shadow-[0_0_75px_rgba(16,185,129,1)] cursor-pointer';
      }
      if (archetypeClass) {
        return `${archetypeClass} drop-shadow-[0_0_70px_rgba(16,185,129,1)] cursor-pointer`;
      }
      if (attackTargetTeam === TEAM_KEY.BLG) {
        return 'animate-boss-lunge-left drop-shadow-[0_0_60px_rgba(16,185,129,1)] cursor-pointer';
      }
      if (attackTargetTeam === TEAM_KEY.GENG) {
        return 'animate-boss-lunge-right drop-shadow-[0_0_60px_rgba(16,185,129,1)] cursor-pointer';
      }
      return 'animate-herald-charge drop-shadow-[0_0_65px_rgba(16,185,129,1)] cursor-pointer';
    }

    const shadowColor = themeConfig.colors.glowHex || themeConfig.colors.primaryHex;
    if (archetypeClass) {
      return `${archetypeClass} drop-shadow-[0_0_70px_${shadowColor}] cursor-pointer`;
    }
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

  // 4. Enraged Stance with violent fury tremor
  if (isEnraged) {
    return `animate-boss-enraged-tremor drop-shadow-[0_0_55px_${themeConfig.colors.enragedHex}] cursor-pointer`;
  }

  // 5. Restless Impatient Stance (Prolonged idle with 0 active champions)
  if (isRestless) {
    return `animate-boss-restless drop-shadow-[0_0_50px_${themeConfig.colors.enragedHex}] cursor-pointer`;
  }

  // 6. Natural Living Breathing Idle: Hovering / Crouching / Slithering
  return `${themeConfig.idleAnimationClass} drop-shadow-[0_0_32px_${themeConfig.colors.primaryHex}b3] cursor-pointer hover:drop-shadow-[0_0_48px_${themeConfig.colors.primaryHex}] transition-all`;
};

const getHeraldSkillAura = (skillId?: string): string => {
  if (skillId === 'herald_charge') {
    return 'bg-gradient-to-tr from-emerald-500/80 via-teal-400/70 to-lime-300/60 blur-3xl scale-130 drop-shadow-[0_0_40px_#10b981]';
  }
  if (skillId === 'herald_void_cleave') {
    return 'bg-gradient-to-tr from-teal-600/75 via-emerald-500/65 to-green-400/55 blur-3xl scale-125 drop-shadow-[0_0_35px_#059669]';
  }
  if (skillId === 'herald_eye_gaze') {
    return 'bg-gradient-to-tr from-lime-500/85 via-fuchsia-500/75 to-purple-600/65 blur-3xl scale-135 drop-shadow-[0_0_45px_#84cc16]';
  }
  if (skillId === 'herald_seismic_slam') {
    return 'bg-gradient-to-tr from-pink-600/90 via-purple-600/80 to-rose-500/70 blur-3xl scale-140 drop-shadow-[0_0_55px_#ec4899] animate-pulse';
  }
  return 'bg-gradient-to-tr from-emerald-500/60 via-teal-500/50 to-lime-500/40 blur-3xl scale-125';
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
  themeConfig: BossThemeConfig,
  skillId?: string
): string => {
  if (isDefeated) {
    return 'opacity-0';
  }
  if (isRestless) {
    return 'bg-gradient-to-tr from-rose-700/75 via-rose-600/65 to-red-600/55 blur-3xl animate-restless-aura';
  }
  if (isRoarActive) {
    if (themeConfig.archetype === 'HERALD') {
      return getHeraldSkillAura(skillId);
    }
    if (themeConfig.archetype === 'BARON') {
      return getBaronSkillAura(skillId);
    }
    return themeConfig.auraColorClass.roar;
  }
  if (isEnraged) {
    return themeConfig.auraColorClass.enraged;
  }
  return themeConfig.auraColorClass.idle;
};

export const Boss2D = () => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  const minions = useGameStore((state) => state.minions);
  const bossHitTimestamp = useGameStore((state) => state.bossHitTimestamp);
  const bossAttackTimestamp = useGameStore((state) => state.bossAttackTimestamp);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const activeBossSkillBanner = useGameStore((state) => state.activeBossSkillBanner);
  const lastHitTeam = useGameStore((state) => state.lastHitTeam);
  const lastHitDamageType = useGameStore((state) => state.lastHitDamageType);
  const bossAttackTargetTeam = useGameStore((state) => state.bossAttackTargetTeam);
  const spawnParticleBurst = useGameStore((state) => state.spawnParticleBurst);

  const bossWeakPoint = useGameStore((state) => state.bossWeakPoint);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);

  const themeConfig = getThemeConfig(gameTheme);
  const isHerald = themeConfig.archetype === 'HERALD';
  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED || bossHp <= 0 || isRoundIntermission || roundWinner !== null;
  const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;

  // Combat Animation States
  const [isHitActive, setIsHitActive] = useState(false);
  const [hitNonce, setHitNonce] = useState(0);
  const [isRoarActive, setIsRoarActive] = useState(false);

  // Interactive & Ambient Idle States
  const [isPoked, setIsPoked] = useState(false);
  const [isEyesSurging, setIsEyesSurging] = useState(false);
  const [isWingGustActive, setIsWingGustActive] = useState(false);
  const [isRestless, setIsRestless] = useState(false);
  const [isFacingRight, setIsFacingRight] = useState(false);
  const [verticalTierIndex, setVerticalTierIndex] = useState<number>(1);
  const [activeSpeech, setActiveSpeech] = useState<BossSpeechItem | null>(null);

  const verticalTiers = themeConfig.verticalTiersPx;

  const lastActivityTimestampRef = useRef(Date.now());
  const lastSpeechTimestampRef = useRef<number>(0);
  const lastFlipTimestampRef = useRef<number>(0);
  const pokeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shiftVerticalPatrolTier = useCallback(
    (preferredTier?: number) => {
      setVerticalTierIndex((prev) => {
        if (preferredTier !== undefined && preferredTier !== prev) {
          return preferredTier;
        }
        const candidateTiers: number[] = [];
        for (let idx = 0; idx < verticalTiers.length; idx += 1) {
          if (idx !== prev) {
            candidateTiers.push(idx);
          }
        }
        if (candidateTiers.length === 0) return prev;
        const pickedIndex = Math.floor(Math.random() * candidateTiers.length);
        return candidateTiers[pickedIndex] ?? prev;
      });
    },
    [verticalTiers.length]
  );

  const updateFacingSide = useCallback((targetFacingRight: boolean | 'TOGGLE') => {
    const now = Date.now();
    if (now - lastFlipTimestampRef.current < BOSS_IDLE_CONSTANTS.FLIP_COOLDOWN_MS) {
      return;
    }
    setIsFacingRight((prev) => {
      const next = targetFacingRight === 'TOGGLE' ? !prev : targetFacingRight;
      if (next !== prev) {
        lastFlipTimestampRef.current = now;
      }
      return next;
    });
  }, []);

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

    // Turn toward attacker on heavy Crit or Ultimate hits (guarded by flip cooldown)
    if (isHeavy) {
      if (lastHitTeam === TEAM_KEY.BLG) {
        updateFacingSide(false);
      } else if (lastHitTeam === TEAM_KEY.GENG) {
        updateFacingSide(true);
      }
    }

    return () => clearTimeout(timer);
  }, [bossHitTimestamp, lastHitDamageType, lastHitTeam, updateFacingSide]);

  // Dynamic attack animation timer (faster recovery when enraged)
  useEffect(() => {
    if (bossAttackTimestamp === 0) return;

    if (bossAttackTargetTeam === TEAM_KEY.BLG) {
      updateFacingSide(false);
    } else if (bossAttackTargetTeam === TEAM_KEY.GENG) {
      updateFacingSide(true);
    } else if (bossAttackTargetTeam === 'ALL') {
      updateFacingSide('TOGGLE');
    }

    setIsRoarActive(true);
    shiftVerticalPatrolTier(0);
    const baseDuration = activeBossSkillBanner?.isUltimate
      ? BOSS_ANIMATION_CONSTANTS.ULTIMATE_ATTACK_DURATION_MS
      : BOSS_ANIMATION_CONSTANTS.ATTACK_DURATION_MS;
    const duration = isEnraged ? Math.round(baseDuration * 0.7) : baseDuration;

    const timer = setTimeout(() => {
      setIsRoarActive(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [
    bossAttackTimestamp,
    bossAttackTargetTeam,
    activeBossSkillBanner?.isUltimate,
    isEnraged,
    updateFacingSide,
    shiftVerticalPatrolTier,
  ]);

  // Periodic Ambient Idle Lifecycle Loop with non-repeating speech queue and cooldown
  useEffect(() => {
    const idleInterval = setInterval(() => {
      if (isDefeated || isHitActive || isRoarActive || isPoked) {
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
        audioService.playBossIdleBreath(themeConfig.audioPitchRate);

        if (canSpeak) {
          lastSpeechTimestampRef.current = now;
          const nextRestlessSpeech = resolveBossSpeechItem(
            bossSpeechManager.getNextSpeech(gameTheme, 'RESTLESS'),
            useGameStore.getState().activeTeams
          );
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
        audioService.playBossIdleBreath(themeConfig.audioPitchRate);
        setTimeout(() => setIsEyesSurging(false), BOSS_IDLE_CONSTANTS.EYE_SURGE_DURATION_MS);
      } else if (actionRoll < 0.75 || !canSpeak) {
        // Ambient 2: Wing Gust (Dragon) or Acid Sputter (Baron) or Chitin Tremor (Herald)
        setIsWingGustActive(true);
        audioService.playBossIdleBreath(themeConfig.audioPitchRate);
        setTimeout(() => setIsWingGustActive(false), BOSS_IDLE_CONSTANTS.WING_GUST_DURATION_MS);
      } else {
        // Ambient 3: Menacing Non-Repeating Speech Taunt (when cooldown allows)
        lastSpeechTimestampRef.current = now;
        const nextAmbientSpeech = resolveBossSpeechItem(
          bossSpeechManager.getNextSpeech(gameTheme, 'AMBIENT'),
          useGameStore.getState().activeTeams
        );
        setActiveSpeech(nextAmbientSpeech);

        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        speechTimerRef.current = setTimeout(() => {
          setActiveSpeech(null);
        }, BOSS_IDLE_CONSTANTS.SPEECH_BUBBLE_DURATION_MS);
      }
    }, BOSS_IDLE_CONSTANTS.AMBIENT_ACTION_INTERVAL_MS);

    return () => clearInterval(idleInterval);
  }, [isDefeated, isHitActive, isRoarActive, isPoked, minions.length, gameTheme, themeConfig.audioPitchRate]);

  // Periodic Living Boss Roar Loop (roars every 12-20s even during ongoing pro pokes)
  const isBossAlive = !isDefeated && bossHp > 0;
  useEffect(() => {
    if (!isBossAlive) return;

    let roarTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextRoar = () => {
      const span =
        BOSS_IDLE_CONSTANTS.AMBIENT_ROAR_MAX_MS - BOSS_IDLE_CONSTANTS.AMBIENT_ROAR_MIN_MS;
      const delay = BOSS_IDLE_CONSTANTS.AMBIENT_ROAR_MIN_MS + Math.round(Math.random() * span);

      roarTimer = setTimeout(() => {
        const latestState = useGameStore.getState();
        if (
          latestState.bossStatus !== BOSS_STATUS.DEFEATED &&
          latestState.bossHp > 0 &&
          !latestState.isRoundIntermission &&
          latestState.roundWinner === null
        ) {
          const enragedNow = latestState.bossStatus === BOSS_STATUS.ENRAGED;
          playSound(enragedNow ? SFX_EVENT.BOSS_ENRAGE : SFX_EVENT.BOSS_ROAR, {
            rateScale: themeConfig.audioPitchRate,
          });
          setIsEyesSurging(true);
          setIsWingGustActive(true);
          setIsRoarActive(true);
          updateFacingSide('TOGGLE');
          shiftVerticalPatrolTier(0);

          if (settleTimer) clearTimeout(settleTimer);
          settleTimer = setTimeout(() => {
            setIsRoarActive(false);
            setIsEyesSurging(false);
            setIsWingGustActive(false);
          }, BOSS_IDLE_CONSTANTS.AMBIENT_ROAR_DURATION_MS);
        }
        scheduleNextRoar();
      }, delay);
    };

    scheduleNextRoar();

    return () => {
      if (roarTimer) clearTimeout(roarTimer);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [isBossAlive, themeConfig.audioPitchRate, updateFacingSide, shiftVerticalPatrolTier]);

  // Periodic Vertical Altitude Patrol (smooth glide across High / Mid / Low tiers)
  useEffect(() => {
    if (!isBossAlive) return;

    let patrolTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextPatrol = () => {
      const span =
        BOSS_IDLE_CONSTANTS.VERTICAL_PATROL_MAX_INTERVAL_MS -
        BOSS_IDLE_CONSTANTS.VERTICAL_PATROL_MIN_INTERVAL_MS;
      const delay =
        BOSS_IDLE_CONSTANTS.VERTICAL_PATROL_MIN_INTERVAL_MS + Math.round(Math.random() * span);

      patrolTimer = setTimeout(() => {
        shiftVerticalPatrolTier();
        scheduleNextPatrol();
      }, delay);
    };

    scheduleNextPatrol();

    return () => {
      if (patrolTimer) clearTimeout(patrolTimer);
    };
  }, [isBossAlive, shiftVerticalPatrolTier]);

  // Periodic Natural Side Flip so Boss scans left/right across both teams
  useEffect(() => {
    if (!isBossAlive) return;

    let flipTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextFlip = () => {
      const span = BOSS_IDLE_CONSTANTS.FLIP_MAX_INTERVAL_MS - BOSS_IDLE_CONSTANTS.FLIP_MIN_INTERVAL_MS;
      const delay = BOSS_IDLE_CONSTANTS.FLIP_MIN_INTERVAL_MS + Math.round(Math.random() * span);

      flipTimer = setTimeout(() => {
        updateFacingSide('TOGGLE');
        scheduleNextFlip();
      }, delay);
    };

    scheduleNextFlip();

    return () => {
      if (flipTimer) clearTimeout(flipTimer);
    };
  }, [isBossAlive, updateFacingSide]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pokeTimerRef.current) clearTimeout(pokeTimerRef.current);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  // Direct User Tap / Click Interaction (Poke & Roar with non-repeating poke quotes)
  const handleBossClick = useCallback(() => {
    if (isDefeated) return;

    const now = Date.now();
    lastActivityTimestampRef.current = now;
    lastSpeechTimestampRef.current = now;
    setIsRestless(false);
    setIsPoked(true);
    setIsEyesSurging(true);

    audioService.playBossPokeSound(themeConfig.audioPitchRate);

    const burstColor = themeConfig.colors.primaryHex;
    spawnParticleBurst([0, 0.4, 0.5], burstColor, 1.2);

    const nextPokeSpeech = resolveBossSpeechItem(
      bossSpeechManager.getNextSpeech(gameTheme, 'POKE'),
      useGameStore.getState().activeTeams
    );
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
  }, [isDefeated, themeConfig.audioPitchRate, themeConfig.colors.primaryHex, gameTheme, spawnParticleBurst]);

  const isUltimateAttack = activeBossSkillBanner?.isUltimate ?? false;

  const animationClass = getAnimationClass(
    isDefeated,
    isPoked,
    isRoarActive,
    isHitActive,
    isEnraged,
    isRestless,
    themeConfig,
    bossAttackTargetTeam,
    isUltimateAttack,
    lastHitTeam,
    lastHitDamageType,
    hitNonce,
    activeBossSkillBanner?.skillId,
    activeBossSkillBanner?.vfxType
  );

  const auraColorClass = getAuraColorClass(
    isDefeated,
    isRoarActive,
    isEnraged,
    isRestless,
    themeConfig,
    activeBossSkillBanner?.skillId
  );

  const isGroundShockActive =
    isRoarActive ||
    (isHitActive &&
      (lastHitDamageType === DAMAGE_TYPE.CRIT || lastHitDamageType === DAMAGE_TYPE.ULTIMATE));

  const shockwaveColor =
    themeConfig.colors.enragedHex ||
    activeBossSkillBanner?.color ||
    (isEnraged ? '#ef4444' : themeConfig.colors.primaryHex);

  const wingGustColor = themeConfig.colors.primaryHex;

  // Dynamic 2.5D perspective tilt reacting to hit side & pokes
  let tiltYDeg = 0;
  let tiltXDeg = 0;
  if (isHitActive && !isDefeated) {
    const isHeavyHit =
      lastHitDamageType === DAMAGE_TYPE.CRIT || lastHitDamageType === DAMAGE_TYPE.ULTIMATE;
    const hitStrength = isHeavyHit ? 11 : 6;
    if (lastHitTeam === TEAM_KEY.BLG) {
      tiltYDeg = hitStrength;
    } else if (lastHitTeam === TEAM_KEY.GENG) {
      tiltYDeg = -hitStrength;
    }
    tiltXDeg = isHeavyHit ? -8 : -4;
  } else if (isPoked && !isDefeated) {
    tiltXDeg = -10;
  }

  const verticalOffsetPx = isDefeated ? 0 : (verticalTiers[verticalTierIndex] ?? 0);
  const verticalMotionClass = isDefeated ? '' : themeConfig.verticalMotionClass;
  const groundShadowAnimationClass = isDefeated ? '' : themeConfig.groundShadowClass;

  return (
    <div
      style={{ perspective: '900px' }}
      className={`absolute left-1/2 ${themeConfig.containerPosition} -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none z-10 flex items-center justify-center`}
    >
      {/* 1. Skill Combat Alert Banner */}
      <BossAlertBanner
        isRoarActive={isRoarActive}
        themeConfig={themeConfig}
        activeBossSkillBanner={activeBossSkillBanner}
        gameTheme={gameTheme}
        defaultRoarTextVi={themeConfig.roarTextVi}
      />

      {/* 1c. Per-archetype skill VFX overlay (projectiles, beams, spikes…) */}
      {!isDefeated && <BossSkillVfx2D />}

      {/* 2. Living Elemental Portal Aura Glow */}
      <div
        className={`absolute w-52 h-52 sm:w-72 sm:h-72 rounded-full transition-all duration-300 pointer-events-none animate-aura-pulse ${auraColorClass}`}
      />

      {/* 2b. Violent Enraged Fiery Void Aura */}
      {isEnraged && !isDefeated && <BossEnragedAura themeConfig={themeConfig} />}

      {/* 3. Runic Ground Reflection */}
      <div
        className={`absolute ${themeConfig.groundAuraClass} rounded-full blur-xl pointer-events-none`}
      />

      {/* 4. Realistic Ground Contact Shadow under Monster */}
      <div
        className={`absolute top-[82%] left-1/2 -translate-x-1/2 w-44 sm:w-60 h-7 sm:h-10 bg-black/60 rounded-[50%] blur-md pointer-events-none ${groundShadowAnimationClass}`}
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
        color={themeConfig.colors.glowHex || themeConfig.colors.primaryHex}
        enragedColor={themeConfig.colors.enragedHex}
        isEnraged={isEnraged}
        isDefeated={isDefeated}
      />

      {/* 8. Vertical Altitude Patrol + Uninterrupted Hover/Coil Wrapper around Interactive Boss */}
      <div
        className="relative pointer-events-none"
        style={{
          transform: `translate3d(0, ${verticalOffsetPx}px, 0)`,
          transition: `transform ${BOSS_IDLE_CONSTANTS.VERTICAL_PATROL_TRANSITION_MS}ms cubic-bezier(0.37, 0, 0.63, 1)`,
        }}
      >
        <div className={verticalMotionClass}>
          <div
            id="boss-monster-target"
            onClick={handleBossClick}
            title={t('BossInteractive.pokeTooltip', 'Click để tương tác với Boss!')}
            className={`relative ${themeConfig.spriteSize} ${animationClass} pointer-events-auto group`}
          >
            {/* Dynamic Non-Repeating Comic Speech Bubble Anchored directly over monster head */}
            <BossSpeechBubble
              speech={isRoarActive || isDefeated ? null : activeSpeech}
              themeConfig={themeConfig}
              isRestless={isRestless}
            />

            <div
              className="w-full h-full relative"
              style={{
                transform: `perspective(900px) rotateX(${tiltXDeg}deg) rotateY(${tiltYDeg}deg)`,
                transformStyle: 'preserve-3d',
                transition: 'transform 160ms ease-out',
              }}
            >
              {/* Body Flip Wrapper: flips artwork, eyes, and armor cracks smoothly without mirroring HUD text */}
              <div
                className="w-full h-full relative"
                style={{
                  transform: `rotateY(${isFacingRight ? 180 : 0}deg)`,
                  transformStyle: 'preserve-3d',
                  transition: `transform ${BOSS_IDLE_CONSTANTS.FLIP_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
              >
                <picture className="w-full h-full block">
                  <source srcSet={themeConfig.bossImageWebp} type="image/webp" />
                  <img
                    src={themeConfig.bossImagePng}
                    alt={themeConfig.bossName}
                    className={`w-full h-full object-contain filter contrast-110 brightness-105 group-hover:scale-105 transition-all duration-300 ${themeConfig.spriteFilterClass} ${themeConfig.bossScale}`}
                    loading="eager"
                    draggable={false}
                  />
                </picture>

                {themeConfig.hasVoidOverlay && !isDefeated && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-[-12%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(147,51,234,0.45)_0%,_rgba(88,28,135,0.35)_40%,_transparent_75%)] animate-pulse mix-blend-screen pointer-events-none blur-xl"
                  />
                )}

                {/* 8c. Iconic Eye of the Herald on Carapace Back */}
                {isHerald && !isDefeated && (
                  <div
                    className={`absolute top-[28%] left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-300 z-20 ${
                      bossWeakPoint ? 'scale-125 opacity-100' : 'scale-90 opacity-75'
                    }`}
                  >
                    {/* Glowing Eye of the Herald Core */}
                    <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-fuchsia-600 via-purple-500 to-pink-400 p-0.5 animate-herald-eye shadow-[0_0_20px_#ec4899] border-2 border-white/90 flex items-center justify-center">
                      <div className="w-2 h-4 sm:w-2.5 sm:h-5 rounded-full bg-slate-950 rotate-12 shadow-inner" />
                      <div className="absolute inset-0 rounded-full bg-pink-400/40 blur-sm animate-pulse" />
                    </div>
                    {/* Herald Eye Open Pulse waves when weak point is exposed */}
                    {bossWeakPoint && (
                      <div className="absolute inset-[-8px] rounded-full border-2 border-pink-400 animate-ping opacity-80 pointer-events-none" />
                    )}
                  </div>
                )}

                {/* Phase 2 & 3 Glowing Armor Cracks flipped in sync with Boss body */}
                <BossArmorCracks
                  bossHp={bossHp}
                  bossMaxHp={bossMaxHp}
                  crackColor={themeConfig.crackStrokeHex}
                  isDefeated={isDefeated}
                />

                {/* 9. Glowing Eyes Surge during Idle / Restless / Poke / Enraged */}
                <BossGlowingEyes
                  isActive={isEyesSurging || isRestless}
                  themeConfig={themeConfig}
                  isRestless={isRestless}
                  isEnraged={isEnraged}
                />
              </div>

              {/* 8b. Upright Energy Shield HUD Card & Clickable Weak Point Reticle */}
              <BossPhaseVisuals
                bossHp={bossHp}
                bossMaxHp={bossMaxHp}
                isDefeated={isDefeated}
              />
            </div>

            {/* Crisp Impact Flares aligned directly over Boss */}
            <BossHitMarks2D />
          </div>
        </div>
      </div>

      {/* 10. Cinematic Shatter & Execution Callout outside fading sprite */}
      {isDefeated && <BossDeathVFX2D />}

      {/* 11. Mythical Floating Buff Relic Crest Claimed by Winning Team */}
      {isDefeated && <BossDefeatedCrest2D themeConfig={themeConfig} />}
    </div>
  );
};
