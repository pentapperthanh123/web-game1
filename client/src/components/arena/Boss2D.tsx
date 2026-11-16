import React, { useState, useEffect, useRef, useCallback } from 'react';

import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_STATUS,
  TEAM_KEY,
  DAMAGE_TYPE,
  BOSS_ANIMATION_CONSTANTS,
  BOSS_IDLE_CONSTANTS,
  FINISHER_BANNER_CONSTANTS,
  isDonorFinisherCheck,
  getBossHealthBarAnchorClass,
  getBossNameAnchorClass,
  TeamType,
  DamageType,
  getThemeConfig,
  BossThemeConfig,
} from '../../constants/game';
import { bossSpeechManager, BossSpeechItem, resolveBossSpeechItem } from '../../constants/bossSpeech';
import { BossHitMarks2D } from './BossHitMarks2D';
import { BossAlertBanner } from './BossAlertBanner';
import { BossSpeechBubble } from './BossSpeechBubble';
import { BossHealthBar, BossNameTag } from '../ui/BossHealthBar';
import { useRoundIntroStore, isRoundIntroActive, isCurrentRoundIntroActive } from '../../store/roundIntroStore';
import { BossDeathVFX2D } from './BossDeathVFX2D';
import { BossDefeatedCrest2D } from './BossDefeatedCrest2D';
import { BossArmorCracks, BossPhaseVisuals } from './BossPhaseVisuals';
import { audioService } from '../../services/audioService';
import { playBossVoice } from '../../services/bossVoice';
import { BOSS_VOICE_KIND } from '../../constants/sfx';
import { ActiveBossSkillBanner, BOSS_SKILL_VFX, BossSkillVfxType } from '../../types/bossSkill';
import {
  BOSS_CHARGE_ANIMATION_CLASS,
  BOSS_SKILL_VFX_ANIMATION_CLASS,
  getSkillVfxWindowMs,
} from '../../constants/bossSkillVfx';
import { BossSkillVfx2D } from './skillVfx/BossSkillVfx2D';
import { BossEntranceBreathVFX } from './BossEntranceBreathVFX';
import { BossSpriteAnchorMarkers } from './BossSpriteAnchorMarkers';
import '../ui/gift/gift.css';
import { getBossSpriteAnchors } from '../../constants/bossSpriteAnchors';

const getAnimationClass = (
  isDefeated: boolean,
  isAwaitingStrike: boolean,
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
    if (isAwaitingStrike) {
      return 'animate-boss-critical-stun pointer-events-none';
    }
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
      if (vfxType === BOSS_SKILL_VFX.CHARGE_DASH) {
        const chargeClass =
          attackTargetTeam === TEAM_KEY.GENG ? BOSS_CHARGE_ANIMATION_CLASS.RIGHT : BOSS_CHARGE_ANIMATION_CLASS.LEFT;
        return `${chargeClass} drop-shadow-[0_0_75px_rgba(16,185,129,1)] cursor-pointer`;
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

const BOSS_KNOCKBACK_CLASS = 'animate-boss-knockback';

/** Skills whose fire leaves the jaw (FireBreath3D tracks it), so the boss must keep facing its target. */
const isMouthBreathBanner = (banner: ActiveBossSkillBanner | null | undefined): banner is ActiveBossSkillBanner =>
  banner?.vfxType === BOSS_SKILL_VFX.FIRE_BREATH || Boolean(banner?.vfxParams?.isMouthBreath);

/** True until `deadline` passes; re-renders once when it does. */
const useIsBeforeDeadline = (deadline: number): boolean => {
  const [isBefore, setIsBefore] = useState(() => Date.now() < deadline);
  useEffect(() => {
    const remainingMs = deadline - Date.now();
    setIsBefore(remainingMs > 0);
    if (remainingMs <= 0) return;
    const timer = setTimeout(() => setIsBefore(false), remainingMs);
    return () => clearTimeout(timer);
  }, [deadline]);
  return isBefore;
};

export const Boss2D = React.memo(() => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  // Subscribe only to length to avoid re-renders on every minion position tick
  const minionCount = useGameStore((state) => state.minions.length);
  const bossHitTimestamp = useGameStore((state) => state.bossHitTimestamp);
  const bossAttackTimestamp = useGameStore((state) => state.bossAttackTimestamp);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const isHealthBarVisible = useGameStore((state) => state.overlayVisibility.bossHealth);
  const activeBossSkillBanner = useGameStore((state) => state.activeBossSkillBanner);
  const lastHitTeam = useGameStore((state) => state.lastHitTeam);
  const lastHitDamageType = useGameStore((state) => state.lastHitDamageType);
  const bossAttackTargetTeam = useGameStore((state) => state.bossAttackTargetTeam);
  const spawnParticleBurst = useGameStore((state) => state.spawnParticleBurst);

  const bossWeakPoint = useGameStore((state) => state.bossWeakPoint);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const finisherGiftName = useGameStore((state) => state.finisherGiftName);
  const finisherCoins = useGameStore((state) => state.finisherCoins);
  const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);

  const themeConfig = getThemeConfig(gameTheme);
  const isHerald = themeConfig.archetype === 'HERALD';
  const isDragon = themeConfig.archetype === 'DRAGON';
  const isSilverScrapesActive = useGameStore((state) => state.silverScrapesState.isActive);
  const isRoundIntroShown = useRoundIntroStore(
    (state) => state.isActive && isRoundIntroActive(state.shownAt, Date.now(), state.isManualHold, state.durationMs)
  );
  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED || bossHp <= 0 || isRoundIntermission || roundWinner !== null;
  const isDonorFinisher = isDonorFinisherCheck(finisherGiftName, finisherCoins);

  const [hasStrikeImpacted, setHasStrikeImpacted] = useState<boolean>(() => {
    if (!isDefeated || !isDonorFinisher) return true;
    return Date.now() - bossDefeatedTimestamp >= FINISHER_BANNER_CONSTANTS.AVATAR_STRIKE_DURATION_MS;
  });

  useEffect(() => {
    if (!isDefeated || !isDonorFinisher) {
      setHasStrikeImpacted(true);
      return;
    }
    const elapsed = Date.now() - bossDefeatedTimestamp;
    const remaining = FINISHER_BANNER_CONSTANTS.AVATAR_STRIKE_DURATION_MS - elapsed;
    if (remaining <= 0) {
      setHasStrikeImpacted(true);
      return;
    }
    setHasStrikeImpacted(false);
    const timer = setTimeout(() => {
      setHasStrikeImpacted(true);
    }, remaining);
    return () => clearTimeout(timer);
  }, [isDefeated, isDonorFinisher, bossDefeatedTimestamp]);

  const isAwaitingStrike = isDefeated && isDonorFinisher && !hasStrikeImpacted;
  const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;
  const bossStaggerUntil = useGameStore((state) => state.bossStaggerUntil);
  const isKnockedBack = useIsBeforeDeadline(bossStaggerUntil);
  const isEnragedArtShown = isEnraged && Boolean(themeConfig.bossEnragedImagePng);
  const spriteAnchors = getBossSpriteAnchors(gameTheme, isEnragedArtShown);

  // Combat Animation States
  const [isHitActive, setIsHitActive] = useState(false);
  const [hitNonce, setHitNonce] = useState(0);
  const [isRoarActive, setIsRoarActive] = useState(false);
  const [isEntranceActive, setIsEntranceActive] = useState(false);
  const [isEntranceBreathActive, setIsEntranceBreathActive] = useState(false);

  // Interactive & Ambient Idle States
  const [isPoked, setIsPoked] = useState(false);
  const [isRestless, setIsRestless] = useState(false);
  const [isFacingRight, setIsFacingRight] = useState(false);
  const [verticalTierIndex, setVerticalTierIndex] = useState<number>(1);
  const [activeSpeech, setActiveSpeech] = useState<BossSpeechItem | null>(null);
  const [notificationPortalEl, setNotificationPortalEl] = useState<HTMLElement | null>(null);

  // Clear speech immediately when Silver Scrapes 1v1 duel starts
  useEffect(() => {
    if (isSilverScrapesActive && activeSpeech !== null) {
      setActiveSpeech(null);
    }
  }, [isSilverScrapesActive, activeSpeech]);

  // Skill breaths are drawn in 3D (FireBreath3D, tracking the jaw); the 2D jaw flame is only the entrance roar
  const isDragonMouthFireActive = isDragon && !isDefeated && isEntranceBreathActive;

  useEffect(() => {
    setNotificationPortalEl(document.getElementById('boss-notification-layer'));
  }, []);

  const verticalTiers = themeConfig.verticalTiersPx;

  const lastActivityTimestampRef = useRef(Date.now());
  const lastSpeechTimestampRef = useRef<number>(0);
  const lastFlipTimestampRef = useRef<number>(0);
  /** While a breath plays the boss keeps facing its target: the 3D jet follows the jaw. */
  const facingLockedUntilRef = useRef<number>(0);
  const pokeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger dramatic cave-to-arena swoop & mouth fire breath on spawn / theme change
  useEffect(() => {
    if (isDefeated) {
      setIsEntranceActive(false);
      setIsEntranceBreathActive(false);
      return;
    }

    setIsEntranceActive(true);
    setIsEntranceBreathActive(false);

    const breathTimer = isDragon
      ? setTimeout(() => {
          if (isCurrentRoundIntroActive()) return;
          setIsEntranceBreathActive(true);
          playBossVoice(gameTheme, BOSS_VOICE_KIND.ROAR);
        }, BOSS_ANIMATION_CONSTANTS.ENTRANCE_BREATH_DELAY_MS)
      : null;

    const endTimer = setTimeout(() => {
      setIsEntranceActive(false);
      setIsEntranceBreathActive(false);
    }, BOSS_ANIMATION_CONSTANTS.ENTRANCE_DURATION_MS);

    return () => {
      if (breathTimer) clearTimeout(breathTimer);
      clearTimeout(endTimer);
    };
  }, [gameTheme, isDefeated, isDragon]);

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
            // Ưu tiên các tier bay/trồi lên vùng trống phía trên để quái vật di chuyển linh hoạt
            if (verticalTiers[idx] < 0) {
              candidateTiers.push(idx);
            }
          }
        }
        if (candidateTiers.length === 0) return prev;
        const pickedIndex = Math.floor(Math.random() * candidateTiers.length);
        return candidateTiers[pickedIndex] ?? prev;
      });
    },
    [verticalTiers]
  );

  const updateFacingSide = useCallback((targetFacingRight: boolean | 'TOGGLE', bypassCooldown = false) => {
    const now = Date.now();
    if (now < facingLockedUntilRef.current) return;
    if (!bypassCooldown && now - lastFlipTimestampRef.current < BOSS_IDLE_CONSTANTS.FLIP_COOLDOWN_MS) {
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
    if (bossHitTimestamp > 0 || bossAttackTimestamp > 0 || minionCount > 0) {
      lastActivityTimestampRef.current = Date.now();
      setIsRestless(false);
    }
  }, [bossHitTimestamp, bossAttackTimestamp, minionCount]);

  // Dynamic hit animation timer
  const hitEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHitReactionAtRef = useRef(0);
  useEffect(() => () => {
    if (hitEndTimerRef.current) clearTimeout(hitEndTimerRef.current);
  }, []);

  useEffect(() => {
    if (bossHitTimestamp === 0 || isDefeated) return;

    // Super Armor: normal attacks deal damage and sparks without shaking the boss body
    const isHeavy =
      lastHitDamageType === DAMAGE_TYPE.CRIT || lastHitDamageType === DAMAGE_TYPE.ULTIMATE;
    if (!isHeavy) return;

    // Heavy Hit Cooldown: prevent jitter spasms when multiple ultimates land together
    const now = Date.now();
    if (now - lastHitReactionAtRef.current < BOSS_ANIMATION_CONSTANTS.HEAVY_HIT_COOLDOWN_MS) {
      return;
    }
    lastHitReactionAtRef.current = now;

    setHitNonce((prev) => (prev + 1) % 1000);
    setIsHitActive(true);

    if (hitEndTimerRef.current) clearTimeout(hitEndTimerRef.current);
    hitEndTimerRef.current = setTimeout(() => {
      setIsHitActive(false);
    }, BOSS_ANIMATION_CONSTANTS.HEAVY_HIT_DURATION_MS);

    // Turn toward attacker on heavy Crit or Ultimate hits (guarded by flip cooldown)
    if (lastHitTeam === TEAM_KEY.BLG) {
      updateFacingSide(false);
    } else if (lastHitTeam === TEAM_KEY.GENG) {
      updateFacingSide(true);
    }
  }, [bossHitTimestamp, lastHitDamageType, lastHitTeam, isDefeated, updateFacingSide]);

  // Dynamic attack animation timer (faster recovery when enraged)
  useEffect(() => {
    if (bossAttackTimestamp === 0) return;

    // The cast and its banner share a timestamp; later basic attacks during the breath do not
    const breathBanner =
      activeBossSkillBanner?.timestamp === bossAttackTimestamp && isMouthBreathBanner(activeBossSkillBanner)
        ? activeBossSkillBanner
        : null;
    if (breathBanner) facingLockedUntilRef.current = 0;
    const shouldBypassFlipCooldown = breathBanner !== null;
    if (bossAttackTargetTeam === TEAM_KEY.BLG) {
      updateFacingSide(false, shouldBypassFlipCooldown);
    } else if (bossAttackTargetTeam === TEAM_KEY.GENG) {
      updateFacingSide(true, shouldBypassFlipCooldown);
    } else if (bossAttackTargetTeam === 'ALL') {
      updateFacingSide('TOGGLE');
    }
    if (breathBanner) {
      facingLockedUntilRef.current = Date.now() + getSkillVfxWindowMs(breathBanner.vfxType, breathBanner.vfxParams);
    }

    setIsRoarActive(true);

    if (themeConfig.archetype === 'HERALD' && !activeBossSkillBanner) {
      audioService.playShockwaveExplosion(1.0, themeConfig.audioPitchRate, true);
      playBossVoice(gameTheme, BOSS_VOICE_KIND.ROAR);
    }

    // Cho phép quái vật tấn công từ độ cao hiện tại mà không bị ép đè sát đáy sàn đấu
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
    activeBossSkillBanner,
    gameTheme,
    themeConfig.archetype,
    themeConfig.audioPitchRate,
    isEnraged,
    updateFacingSide,
    shiftVerticalPatrolTier,
  ]);

  // Periodic Ambient Idle Lifecycle Loop with non-repeating speech queue and cooldown
  useEffect(() => {
    const idleInterval = setInterval(() => {
      if (isDefeated || isHitActive || isRoarActive || isPoked || useGameStore.getState().silverScrapesState.isActive) {
        return;
      }

      const now = Date.now();
      const idleDuration = now - lastActivityTimestampRef.current;
      const isNoMinionsOnField = minionCount === 0;
      const canSpeak = now - lastSpeechTimestampRef.current >= BOSS_IDLE_CONSTANTS.SPEECH_COOLDOWN_MS;

      // Check Restless Impatient Threshold (> 9.0s with zero active champions)
      if (isNoMinionsOnField && idleDuration >= BOSS_IDLE_CONSTANTS.RESTLESS_THRESHOLD_MS) {
        setIsRestless(true);
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
        // Ambient 1: Idle Breath
        audioService.playBossIdleBreath(themeConfig.audioPitchRate);
      } else if (actionRoll < 0.75 || !canSpeak) {
        // Ambient 2: Idle Breath
        audioService.playBossIdleBreath(themeConfig.audioPitchRate);
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
  }, [isDefeated, isHitActive, isRoarActive, isPoked, minionCount, gameTheme, themeConfig.audioPitchRate]);

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
          latestState.roundWinner === null &&
          !latestState.silverScrapesState.isActive &&
          !isCurrentRoundIntroActive()
        ) {
          const enragedNow = latestState.bossStatus === BOSS_STATUS.ENRAGED;
          const voiceKind = enragedNow ? BOSS_VOICE_KIND.ENRAGE : BOSS_VOICE_KIND.ROAR;
          playBossVoice(latestState.gameTheme, voiceKind);
          setIsRoarActive(true);
          updateFacingSide('TOGGLE');
          shiftVerticalPatrolTier();

          if (settleTimer) clearTimeout(settleTimer);
          settleTimer = setTimeout(() => {
            setIsRoarActive(false);
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
  }, [isBossAlive, updateFacingSide, shiftVerticalPatrolTier]);

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
    }, BOSS_IDLE_CONSTANTS.POKE_DURATION_MS);

    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => {
      setActiveSpeech(null);
    }, BOSS_IDLE_CONSTANTS.SPEECH_BUBBLE_DURATION_MS);
  }, [isDefeated, themeConfig.audioPitchRate, themeConfig.colors.primaryHex, gameTheme, spawnParticleBurst]);

  const isUltimateAttack = activeBossSkillBanner?.isUltimate ?? false;

  const baseAnimationClass = getAnimationClass(
    isDefeated,
    isAwaitingStrike,
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
  // MEGA gift knock-back overrides the idle/attack animation while the boss is staggered
  const animationClass = isKnockedBack ? BOSS_KNOCKBACK_CLASS : baseAnimationClass;

  // Dynamic 2.5D perspective tilt reacting to heavy impact recoil & user pokes
  let tiltYDeg = 0;
  let tiltXDeg = 0;
  if (isHitActive && !isDefeated) {
    const isHeavyHit =
      lastHitDamageType === DAMAGE_TYPE.CRIT || lastHitDamageType === DAMAGE_TYPE.ULTIMATE;
    const hitStrength = isHeavyHit ? 5 : 0;
    if (lastHitTeam === TEAM_KEY.BLG) {
      tiltYDeg = hitStrength;
    } else if (lastHitTeam === TEAM_KEY.GENG) {
      tiltYDeg = -hitStrength;
    }
    tiltXDeg = isHeavyHit ? -3 : 0;
  } else if (isPoked && !isDefeated) {
    tiltXDeg = -6;
  }

  const verticalOffsetPx = isDefeated ? 0 : (verticalTiers[verticalTierIndex] ?? 0);
  const verticalMotionClass = isDefeated ? '' : themeConfig.verticalMotionClass;
  const groundShadowAnimationClass = isDefeated ? '' : themeConfig.groundShadowClass;
  const shouldMirrorBody = spriteAnchors.isNativeFacingRight ? !isFacingRight : isFacingRight;

  // Ground shadow dynamically contracts and diffuses as monster ascends, expands and sharpens as it descends
  const shadowHeightFactor = Math.max(0, Math.min(1, (-verticalOffsetPx) / 160));
  const dynamicShadowScale = (1 - shadowHeightFactor * 0.35).toFixed(3);
  const dynamicShadowOpacity = isDefeated ? 0 : Number((0.68 - shadowHeightFactor * 0.35).toFixed(3));
  const dynamicShadowBlurPx = (6 + shadowHeightFactor * 12).toFixed(1);

  const bossNotificationOverlay = isSilverScrapesActive ? null : (
    <div
      className={`absolute left-1/2 ${themeConfig.containerPosition} -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none flex items-center justify-center`}
    >
      <BossAlertBanner
        isRoarActive={isRoarActive && !isSilverScrapesActive}
        themeConfig={themeConfig}
        activeBossSkillBanner={activeBossSkillBanner}
        gameTheme={gameTheme}
        defaultRoarTextVi={themeConfig.roarTextVi}
        isAboveHealthBar={isHealthBarVisible}
      />

      <div
        className={`relative pointer-events-none ${isEntranceActive ? 'animate-boss-cave-entrance' : ''}`}
        style={
          isEntranceActive
            ? undefined
            : {
                transform: `translate3d(0, ${verticalOffsetPx}px, 0)`,
                transition: `transform ${BOSS_IDLE_CONSTANTS.VERTICAL_PATROL_TRANSITION_MS}ms cubic-bezier(0.37, 0, 0.63, 1)`,
              }
        }
      >
        <div className={verticalMotionClass}>
          {/* Follows the sprite's motion only; the filter keyframes would add a second filtered layer */}
          <div className={`relative ${themeConfig.spriteSize} ${animationClass} boss-motion-only pointer-events-none`}>
            {/* Inside the boss motion layer: name (above) and HP bar (below) follow lunges, hits and hovering */}
            {isHealthBarVisible && (
              <>
                <div className={getBossNameAnchorClass(gameTheme)}>
                  <BossNameTag />
                </div>
                <div className={getBossHealthBarAnchorClass(gameTheme)}>
                  <BossHealthBar />
                </div>
              </>
            )}
            <BossSpeechBubble
              speech={isRoarActive || isDefeated || isSilverScrapesActive || isRoundIntroShown ? null : activeSpeech}
              themeConfig={themeConfig}
              gameTheme={gameTheme}
              isRestless={isRestless}
              isAboveHealthBar={isHealthBarVisible}
            />
          </div>
        </div>
      </div>

      {isDefeated && <BossDeathVFX2D />}
    </div>
  );

  return (
    <>
      <div
        style={{ perspective: '900px' }}
        className={`absolute left-1/2 ${themeConfig.containerPosition} -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none z-10 flex items-center justify-center`}
      >
        {/* 1c. Per-archetype skill VFX overlay (projectiles, beams, spikes…) */}
        {!isDefeated && <BossSkillVfx2D />}

        {/* 2. Realistic Ground Contact Shadow under Monster */}
        <div
          style={{
            transform: `translate3d(0, 0, 0) scale(${dynamicShadowScale})`,
            opacity: dynamicShadowOpacity,
            filter: `blur(${dynamicShadowBlurPx}px)`,
            transition: `transform ${BOSS_IDLE_CONSTANTS.VERTICAL_PATROL_TRANSITION_MS}ms cubic-bezier(0.37, 0, 0.63, 1), opacity ${BOSS_IDLE_CONSTANTS.VERTICAL_PATROL_TRANSITION_MS}ms ease, filter ${BOSS_IDLE_CONSTANTS.VERTICAL_PATROL_TRANSITION_MS}ms ease`,
          }}
          className={`absolute top-[82%] left-1/2 -translate-x-1/2 w-44 sm:w-60 h-7 sm:h-10 bg-black/60 rounded-[50%] pointer-events-none ${groundShadowAnimationClass}`}
        />

        {/* 8. Vertical Altitude Patrol + Cave Entrance Swoop + Uninterrupted Hover/Coil Wrapper */}
        <div
          className={`relative pointer-events-none ${isEntranceActive ? 'animate-boss-cave-entrance' : ''}`}
          style={
            isEntranceActive
              ? undefined
              : {
                  transform: `translate3d(0, ${verticalOffsetPx}px, 0)`,
                  transition: `transform ${BOSS_IDLE_CONSTANTS.VERTICAL_PATROL_TRANSITION_MS}ms cubic-bezier(0.37, 0, 0.63, 1)`,
                }
          }
        >
          <div className={verticalMotionClass}>
            <div
              id="boss-monster-target"
              onClick={handleBossClick}
              title={t('BossInteractive.pokeTooltip', 'Click để tương tác với Boss!')}
              className={`relative ${themeConfig.spriteSize} ${animationClass} pointer-events-auto group`}
            >
              <div
                className="w-full h-full relative"
                style={{
                  transform: `perspective(900px) rotateX(${tiltXDeg}deg) rotateY(${tiltYDeg}deg)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 160ms ease-out',
                }}
              >
                {/* Body Flip Wrapper: flips artwork, jaw fire, eyes, and armor cracks smoothly without mirroring HUD text */}
                <div
                  className="w-full h-full relative"
                  style={{
                    transform: `rotateY(${shouldMirrorBody ? 180 : 0}deg)`,
                    transformStyle: 'preserve-3d',
                    transition: `transform ${BOSS_IDLE_CONSTANTS.FLIP_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  }}
                >
                  {/* Exact Model Scale Wrapper: locks jaw fire & armor cracks directly onto sprite pixels */}
                  <div
                    className={`w-full h-full relative ${themeConfig.bossScale} group-hover:scale-105 transition-transform duration-300`}
                  >
                    {/* Normal Form Sprite */}
                    <picture
                      className={`w-full h-full block transition-opacity duration-700 ${
                        isEnraged && themeConfig.bossEnragedImagePng
                          ? 'opacity-0'
                          : 'opacity-100'
                      }`}
                    >
                      <source srcSet={themeConfig.bossImageWebp} type="image/webp" />
                      <img
                        src={themeConfig.bossImagePng}
                        alt={themeConfig.bossName}
                        className={`w-full h-full object-contain filter contrast-110 brightness-105 ${themeConfig.spriteFilterClass}`}
                        style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                        loading="eager"
                        draggable={false}
                      />
                    </picture>

                    {/* Enraged / Molten Form Sprite (Triggered when Boss enters Enraged state) */}
                    {themeConfig.bossEnragedImagePng && (
                      <picture
                        className={`w-full h-full absolute inset-0 block transition-opacity duration-700 pointer-events-none ${
                          isEnraged ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        {themeConfig.bossEnragedImageWebp && (
                          <source
                            srcSet={themeConfig.bossEnragedImageWebp}
                            type="image/webp"
                          />
                        )}
                        <img
                          src={themeConfig.bossEnragedImagePng}
                          alt={`${themeConfig.bossName} (Nộ)`}
                          className={`w-full h-full object-contain filter contrast-125 brightness-110 drop-shadow-[0_0_32px_${themeConfig.colors.enragedHex}]`}
                          style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                          loading="eager"
                          draggable={false}
                        />
                      </picture>
                    )}

                    <BossSpriteAnchorMarkers anchors={spriteAnchors} />

                    {isDragon && (
                      <BossEntranceBreathVFX
                        isActive={isDragonMouthFireActive}
                        gameTheme={gameTheme}
                        isEnragedArtShown={isEnragedArtShown}
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
                  </div>
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

        {/* 11. Mythical Floating Buff Relic Crest Claimed by Winning Team */}
        {isDefeated && <BossDefeatedCrest2D themeConfig={themeConfig} />}
      </div>

      {notificationPortalEl ? createPortal(bossNotificationOverlay, notificationPortalEl) : bossNotificationOverlay}
    </>
  );
});

Boss2D.displayName = 'Boss2D';
