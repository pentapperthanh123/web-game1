import { readChampionHitAt } from '../../../services/championHitFeedback';
import * as THREE from 'three';
import { DAMAGE_SOURCE, SQUAD_ENTRANCE_CONSTANTS } from '../../../constants/game';
import {
  CHAMPION_LEVEL_THRESHOLDS,
  getChampionLevelConfig,
} from '../../../constants/championLevel';
import { useGameStore } from '../../../store/gameStore';
import {
  GAME_CONSTANTS,
  COMBAT_VFX_CONSTANTS,
  TEAM_KEY,
  DAMAGE_TYPE,
  DamageType,
  isEliteMinion,
} from '../../../constants/game';
import { DamageBossOptions, MinionEntity } from '../../../types/game';
import { getMinionDamageMultiplier, isMinionStunned } from '../../../utils/statusEffects';
import {
  setLiveMinionPositions,
} from '../../../services/minionPositionRegistry';
import {
  CachedChampionVfxRefs,
  ChampionAIState,
  FURY_COLOR_FULL,
  getMinionAttackSpeedFactor,
  project3DToScreen,
  projectToScreenInto,
  randomInRange,
  tempProjVec,
} from './summonShared';
import { ENTRANCE_AURA, updateChampionEntranceAura } from './championEntranceAura';
import { SIGNATURE_HALO_OPACITY } from './ChampionToken';
import { pickSpreadTargetInWing } from './championSpread';
import { isCurrentRoundIntroActive } from '../../../store/roundIntroStore';
import { resolveChampionAttackSpeedMultiplier } from '../../../store/summonQueueHelper';


const resolveCachedVfxRefs = (
  ai: ChampionAIState,
  tokenSubgroup: THREE.Group | undefined
): CachedChampionVfxRefs => {
  if (!tokenSubgroup) return {};
  if (ai.cachedVfxRefs && ai.cachedVfxGroupId === tokenSubgroup.uuid) return ai.cachedVfxRefs;

  const flyAvatarGroup = tokenSubgroup.getObjectByName('fly-avatar-group') as THREE.Group | undefined;
  const refs: CachedChampionVfxRefs = {
    tokenBodyMesh: tokenSubgroup.getObjectByName('token-body') as THREE.Mesh | undefined,
    flyAvatarGroup,
    flyAvatarHaloMesh: flyAvatarGroup?.getObjectByName('vip-avatar-halo') as THREE.Mesh | undefined,
    impactShardsMesh: tokenSubgroup.getObjectByName('impact-shards') as THREE.Mesh | undefined,
    sigHaloMesh: tokenSubgroup.getObjectByName('signature-synergy-halo') as THREE.Mesh | undefined,
    haloMesh: tokenSubgroup.getObjectByName('celestial-halo') as THREE.Mesh | undefined,
    beamMesh: tokenSubgroup.getObjectByName('sky-beam') as THREE.Mesh | undefined,
    beamCoreMesh: tokenSubgroup.getObjectByName('sky-beam-core') as THREE.Mesh | undefined,
    runeSealMesh: tokenSubgroup.getObjectByName('rune-seal') as THREE.Mesh | undefined,
    landingMesh: tokenSubgroup.getObjectByName('landing-ring') as THREE.Mesh | undefined,
    landingFlashMesh: tokenSubgroup.getObjectByName('landing-flash') as THREE.Mesh | undefined,
    shieldMesh: tokenSubgroup.getObjectByName('invuln-shield') as THREE.Mesh | undefined,
    eliteAuraMesh: tokenSubgroup.getObjectByName('elite-vip-aura') as THREE.Mesh | undefined,
  };
  ai.cachedVfxRefs = refs;
  ai.cachedVfxGroupId = tokenSubgroup.uuid;
  return refs;
};

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const computeChampionImpactPopScale = (impactAgeMs: number, popDurationMs: number): number => {
  const cfg = COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON;
  if (impactAgeMs <= 0) return cfg.CHAMPION_HIDDEN_SCALE;
  if (impactAgeMs >= popDurationMs) return 1.0;

  const progress = impactAgeMs / popDurationMs;
  if (progress < 0.6) {
    const upProgress = easeOutCubic(progress / 0.6);
    return THREE.MathUtils.lerp(cfg.CHAMPION_HIDDEN_SCALE, cfg.CHAMPION_OVERSHOOT_SCALE, upProgress);
  }
  const settleProgress = (progress - 0.6) / 0.4;
  return THREE.MathUtils.lerp(cfg.CHAMPION_OVERSHOOT_SCALE, 1.0, settleProgress);
};

/**
 * Drives the 3-stage Fly Avatar Summon sequence:
 *  1. Fly-in (0 .. FLY_IN_DURATION_MS): Avatar drops from sky along a curved arc to ground (Y=0) while champion body stays hidden.
 *  2. Impact (at FLY_IN_DURATION_MS): Champion body pops out at Y=0; Avatar shrinks and rises to pin above champion's head.
 *  3. Floating Tag (after rise): Avatar bobs gently above the champion with an active VIP glow ring when applicable.
 */
const updateFlyAvatarSummon = (
  refs: CachedChampionVfxRefs,
  minion: MinionEntity,
  entranceAgeMs: number,
  elapsedTime: number,
  bobPhase: number
): void => {
  const cfg = COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON;
  const flyDurationMs = cfg.FLY_IN_DURATION_MS;
  const isVip = isEliteMinion(minion) || Boolean(minion.isSignatureSynergy);
  const pinnedScale = isVip ? cfg.FLOATING_TAG_VIP_SCALE : cfg.FLOATING_TAG_SCALE;

  if (refs.flyAvatarHaloMesh) {
    refs.flyAvatarHaloMesh.rotation.z = elapsedTime * cfg.VIP_HALO_ROTATION_SPEED;
    const haloPulse = 1.0 + Math.sin(elapsedTime * cfg.VIP_HALO_PULSE_SPEED) * cfg.VIP_HALO_PULSE_AMPLITUDE;
    refs.flyAvatarHaloMesh.scale.setScalar(haloPulse);
  }

  // Stage 1: Avatar Fly-in drop to ground (0 .. flyDurationMs)
  if (entranceAgeMs >= 0 && entranceAgeMs < flyDurationMs) {
    if (refs.tokenBodyMesh) {
      refs.tokenBodyMesh.visible = false;
      refs.tokenBodyMesh.scale.setScalar(cfg.CHAMPION_HIDDEN_SCALE);
    }
    if (refs.flyAvatarGroup) {
      const flyProgress = Math.min(1.0, entranceAgeMs / flyDurationMs);
      const gravityDrop = flyProgress * flyProgress;
      const arcSign = minion.team === TEAM_KEY.BLG ? -1 : 1;
      const arcX = arcSign * (1 - flyProgress) * Math.sin(flyProgress * Math.PI * 0.85) * cfg.ARC_OFFSET_X;
      const dropY = (1 - gravityDrop) * cfg.START_Y;
      const dropScale = THREE.MathUtils.lerp(cfg.FLYING_START_SCALE, cfg.TOUCHDOWN_SCALE, flyProgress);

      refs.flyAvatarGroup.position.set(arcX, dropY, cfg.FLOATING_TAG_POS_Z);
      refs.flyAvatarGroup.scale.setScalar(dropScale);
    }
    return;
  }

  // Stage 2 & 3: Touchdown impact pop + transition to floating tag above champion
  const impactAgeMs = Math.max(0, entranceAgeMs - flyDurationMs);
  if (refs.tokenBodyMesh) {
    refs.tokenBodyMesh.visible = true;
    const bodyScale = computeChampionImpactPopScale(impactAgeMs, cfg.CHAMPION_POP_DURATION_MS);
    refs.tokenBodyMesh.scale.setScalar(bodyScale);
  }

  if (!refs.flyAvatarGroup) return;

  const bobY = Math.sin(elapsedTime * cfg.FLOATING_BOB_SPEED + bobPhase) * cfg.FLOATING_BOB_AMPLITUDE;
  if (impactAgeMs < cfg.PIN_RISE_DURATION_MS) {
    const riseProgress = easeOutCubic(impactAgeMs / cfg.PIN_RISE_DURATION_MS);
    const currentY = THREE.MathUtils.lerp(0, cfg.FLOATING_TAG_POS_Y + bobY, riseProgress);
    const currentScale = THREE.MathUtils.lerp(cfg.TOUCHDOWN_SCALE, pinnedScale, riseProgress);
    refs.flyAvatarGroup.position.set(0, currentY, cfg.FLOATING_TAG_POS_Z);
    refs.flyAvatarGroup.scale.setScalar(currentScale);
    return;
  }

  refs.flyAvatarGroup.position.set(0, cfg.FLOATING_TAG_POS_Y + bobY, cfg.FLOATING_TAG_POS_Z);
  refs.flyAvatarGroup.scale.setScalar(pinnedScale);
};

export const createInitialChampionAI = (minion: MinionEntity, elapsedTime: number): ChampionAIState => {
  // The spawn point is already chosen in open space, so the champion lands right on its portal
  const [sx, sy, sz] = minion.spawnPosition;
  const [tx, ty, tz] = minion.spawnPosition;
  return {
    currentX: sx,
    currentY: sy,
    currentZ: sz,
    targetX: tx,
    targetY: ty,
    targetZ: tz,
    nextWanderTime:
      elapsedTime +
      randomInRange(
        COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.WANDER_INTERVAL_MIN_S,
        COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.WANDER_INTERVAL_MAX_S
      ),
    moveSpeed: randomInRange(
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.MIN_SPEED,
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.MAX_SPEED
    ),
    nextAttackTime:
      elapsedTime +
      GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS / 1000 +
      randomInRange(0, COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.INITIAL_ATTACK_JITTER_MAX_S) +
      randomInRange(
        COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_INTERVAL_MIN_S,
        COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_INTERVAL_MAX_S
      ),
    attackStartTime: 0,
    isAttacking: false,
    bobPhase: Math.random() * Math.PI * 2,
  };
};

/**
 * Keeps this champion's world/screen position in the shared registry.
 * The tuple and screen object are registered once and mutated in place afterwards, so the
 * per-frame cost is a few number writes instead of 4 Map writes + string work + 2 allocations.
 */
const publishLivePosition = (
  ai: ChampionAIState,
  minion: MinionEntity,
  worldX: number,
  worldY: number,
  worldZ: number,
  camera: THREE.Camera,
  viewportW: number,
  viewportH: number
): void => {
  if (!ai.liveWorld || !ai.liveScreen) {
    ai.liveWorld = [worldX, worldY, worldZ];
    ai.liveScreen = { x: 0, y: 0 };
    projectToScreenInto(ai.liveScreen, worldX, worldY, worldZ, camera, viewportW, viewportH);
    setLiveMinionPositions(minion.id, minion.championName, ai.liveWorld, ai.liveScreen);
    return;
  }
  ai.liveWorld[0] = worldX;
  ai.liveWorld[1] = worldY;
  ai.liveWorld[2] = worldZ;
  projectToScreenInto(ai.liveScreen, worldX, worldY, worldZ, camera, viewportW, viewportH);
};

/** Token reaction to a boss hit (see championHitFeedback). */
const HIT_FLINCH = {
  DURATION_MS: 320,
  SHAKE_AMPLITUDE: 0.07,
  SHAKE_FREQUENCY: 0.07,
  SQUASH: 0.16,
} as const;

/** Shared, never mutated: no per-hit allocation in the frame loop. */
const CHAMPION_HIT_OPTIONS: DamageBossOptions = { source: DAMAGE_SOURCE.CHAMPION };

const updateChampionShieldMesh = (
  refs: CachedChampionVfxRefs,
  entranceAgeMs: number,
  elapsedTime: number,
  isGraceActive: boolean
): void => {
  const shieldMesh = refs.shieldMesh;
  if (!(shieldMesh?.material instanceof THREE.MeshBasicMaterial)) return;

  if (!isGraceActive) {
    if (shieldMesh.visible) shieldMesh.visible = false;
    if (entranceAgeMs >= GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS) {
      refs.shieldMesh = undefined;
    }
    return;
  }

  const shieldProg = entranceAgeMs / GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS;
  shieldMesh.scale.setScalar(1.0 + Math.sin(elapsedTime * 12) * 0.08);
  shieldMesh.rotation.z = -elapsedTime * 4.0;
  shieldMesh.material.opacity = Math.max(0.2, (1.0 - shieldProg * 0.35) * 0.9);
  shieldMesh.visible = true;
};

export const stepChampionFrame = (
  champGroup: THREE.Group,
  minion: MinionEntity,
  ai: ChampionAIState,
  now: number,
  elapsedTime: number,
  clampedDelta: number,
  camera: THREE.Camera,
  viewportW: number,
  viewportH: number,
  isBossAlive: boolean
): void => {
  const store = useGameStore.getState();
  const entranceAgeMs = now - (minion.createdAt || 0);

  if (elapsedTime >= ai.nextWanderTime) {
    const [tx, ty, tz] = pickSpreadTargetInWing(minion.team, camera, viewportW, viewportH, minion.id);
    ai.targetX = tx;
    ai.targetY = ty;
    ai.targetZ = tz;
    ai.nextWanderTime =
      elapsedTime +
      randomInRange(
        COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.WANDER_INTERVAL_MIN_S,
        COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.WANDER_INTERVAL_MAX_S
      );
    ai.moveSpeed = randomInRange(
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.MIN_SPEED,
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.MAX_SPEED
    );
  }

  const lerpFactor = Math.min(1.0, clampedDelta * ai.moveSpeed * 0.75);
  ai.currentX = THREE.MathUtils.lerp(ai.currentX, ai.targetX, lerpFactor);
  ai.currentY = THREE.MathUtils.lerp(ai.currentY, ai.targetY, lerpFactor);
  ai.currentZ = THREE.MathUtils.lerp(ai.currentZ, ai.targetZ, lerpFactor);

  const isGraceActive = entranceAgeMs < GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS;
  const isIntroActive = isCurrentRoundIntroActive(now);

  if (isIntroActive) {
    ai.isAttacking = false;
    ai.nextAttackTime = Math.max(ai.nextAttackTime, elapsedTime + 0.5);
  } else if (isBossAlive && !isGraceActive && elapsedTime >= ai.nextAttackTime && !ai.isAttacking) {
    ai.isAttacking = true;
    ai.hasFiredInThisAttack = false;
    ai.attackStartTime = elapsedTime;
    const sideOffset = minion.team === TEAM_KEY.BLG ? -0.32 : 0.32;
    ai.targetBossZone = [
      COMBAT_VFX_CONSTANTS.BOSS_TARGET[0] + sideOffset + randomInRange(-0.25, 0.25),
      COMBAT_VFX_CONSTANTS.BOSS_TARGET[1] + randomInRange(-0.25, 0.35),
      COMBAT_VFX_CONSTANTS.BOSS_TARGET[2] + randomInRange(-0.15, 0.2),
    ];
    const teamMomentum = store.teamHeartMomentum[minion.team];
    const heartTapSpeedFactor = teamMomentum
      ? getMinionAttackSpeedFactor(teamMomentum.multiplier, teamMomentum.lastTapAt, now, teamMomentum.frenzyUntil)
      : 1;
    const attackSpeedFactor =
      heartTapSpeedFactor * resolveChampionAttackSpeedMultiplier(store.participationRuleConfig);
    const baseCooldown = randomInRange(
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_INTERVAL_MIN_S,
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_INTERVAL_MAX_S
    );
    ai.nextAttackTime = elapsedTime + baseCooldown / attackSpeedFactor;
  }

  // Captured before the animation block below can end the attack on this same frame
  const wasAttackingThisFrame = ai.isAttacking;
  let castRecoilX = 0;
  let castLiftY = 0;
  let scalePulse = 1.0;

  if (ai.isAttacking) {
    const attackProgress =
      (elapsedTime - ai.attackStartTime) / COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_DURATION_S;
    if (attackProgress >= 1.0 || !isBossAlive) {
      ai.isAttacking = false;
    } else {
      const castCurve = Math.sin(attackProgress * Math.PI);
      const teamAwaySign = minion.team === TEAM_KEY.BLG ? -1 : 1;
      castRecoilX = teamAwaySign * castCurve * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.CAST_RECOIL_DISTANCE;
      castLiftY = castCurve * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.CAST_LIFT_HEIGHT;
      scalePulse = 1.0 + castCurve * 0.16;
    }
  }

  if (isBossAlive && !isGraceActive && !isIntroActive && !ai.hasLanded) {
    ai.hasLanded = true;
    const scrStart = project3DToScreen(ai.currentX, ai.currentY, ai.currentZ, camera, viewportW, viewportH);
    const openingDamage = Math.round(minion.dps * COMBAT_VFX_CONSTANTS.SUMMON.NORMAL_MULTIPLIER);
    const openingActor = minion.signaturePlayerName
      ? `${minion.summonerName} (${minion.signaturePlayerName})`
      : minion.summonerName;
    const openingDamageType = minion.isSignatureSynergy ? DAMAGE_TYPE.CRIT : DAMAGE_TYPE.NORMAL;
    store.consumeMinionAttackFury(minion.id);
    store.damageBoss(openingDamage, minion.team, openingActor, openingDamageType, CHAMPION_HIT_OPTIONS);
    store.spawnFlyingArrow(minion.championName, minion.team, false, scrStart);
  }

  const isFlyInActive = entranceAgeMs < COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.FLY_IN_DURATION_MS;
  const bobOffset = isFlyInActive
    ? 0
    : Math.sin(elapsedTime * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.BOB_SPEED + ai.bobPhase) *
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.BOB_AMPLITUDE;

  // Flinch when the boss hits this champion: a short decaying shake plus a squash
  const hitAgeMs = now - readChampionHitAt(minion.id);
  const isFlinching = hitAgeMs >= 0 && hitAgeMs < HIT_FLINCH.DURATION_MS;
  const flinchLevel = isFlinching ? 1 - hitAgeMs / HIT_FLINCH.DURATION_MS : 0;
  const flinchShakeX = Math.sin(hitAgeMs * HIT_FLINCH.SHAKE_FREQUENCY) * HIT_FLINCH.SHAKE_AMPLITUDE * flinchLevel;

  let posX = ai.currentX + castRecoilX + flinchShakeX;
  let posY = ai.currentY + castLiftY + bobOffset;
  let posZ = ai.currentZ;
  const finalScale = scalePulse * (1 - HIT_FLINCH.SQUASH * flinchLevel);

  tempProjVec.set(posX, posY, posZ).project(camera);
  let isClamped = false;
  const safeNdcX = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_X;
  const isRightSide = minion.team === TEAM_KEY.GENG;
  const safeNdcYMin = isRightSide
    ? COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_Y_MIN_RIGHT
    : COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_Y_MIN;
  const safeNdcYMax = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_Y_MAX;

  if (tempProjVec.x < -safeNdcX) {
    tempProjVec.x = -safeNdcX;
    isClamped = true;
  } else if (tempProjVec.x > safeNdcX) {
    tempProjVec.x = safeNdcX;
    isClamped = true;
  }

  if (tempProjVec.y < safeNdcYMin) {
    tempProjVec.y = safeNdcYMin;
    isClamped = true;
  } else if (tempProjVec.y > safeNdcYMax) {
    tempProjVec.y = safeNdcYMax;
    isClamped = true;
  }

  if (isClamped) {
    tempProjVec.unproject(camera);
    posX = tempProjVec.x;
    posY = tempProjVec.y;
    posZ = tempProjVec.z;
  }

  const isStunned = isMinionStunned(minion, Date.now());
  if (isBossAlive && wasAttackingThisFrame && !ai.hasFiredInThisAttack && !isGraceActive && !isStunned && !isIntroActive) {
    const attackProgress =
      (elapsedTime - ai.attackStartTime) / COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_DURATION_S;
    // `>=` with no upper bound: on a slow frame the attack may already be over, but it must still land
    if (attackProgress >= COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_FIRE_PROGRESS) {
      ai.hasFiredInThisAttack = true;
      const { isFullFury } = store.consumeMinionAttackFury(minion.id);
      const screenStart = project3DToScreen(posX, posY, posZ, camera, viewportW, viewportH);
      // Strictly unleash flashy signature skill VFX only when at 100% Full Fury (Bạo Nộ)
      const isEmpoweredStrike = isFullFury;

      store.spawnFlyingArrow(minion.championName, minion.team, isEmpoweredStrike, screenStart);

      if (isFullFury) {
        const targetPos: [number, number, number] = ai.targetBossZone || [
          COMBAT_VFX_CONSTANTS.BOSS_TARGET[0],
          COMBAT_VFX_CONSTANTS.BOSS_TARGET[1],
          COMBAT_VFX_CONSTANTS.BOSS_TARGET[2],
        ];
        store.spawnProjectile([posX, posY, posZ], FURY_COLOR_FULL, true, targetPos);
        store.spawnSlash(targetPos, FURY_COLOR_FULL, true);
        store.spawnParticleBurst(targetPos, FURY_COLOR_FULL, COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE);
      } else if ((minion.level ?? 1) >= CHAMPION_LEVEL_THRESHOLDS.WARLORD_MIN || minion.isSignatureSynergy) {
        const targetPos: [number, number, number] = ai.targetBossZone || [
          COMBAT_VFX_CONSTANTS.BOSS_TARGET[0],
          COMBAT_VFX_CONSTANTS.BOSS_TARGET[1],
          COMBAT_VFX_CONSTANTS.BOSS_TARGET[2],
        ];
        const minionLevel = minion.level ?? 1;
        const slashColor =
          minionLevel >= CHAMPION_LEVEL_THRESHOLDS.WARLORD_MIN
            ? getChampionLevelConfig(minionLevel).auraColor
            : FURY_COLOR_FULL;
        store.spawnSlash(targetPos, slashColor, false);
      }

      const baseDamage = isFullFury
        ? minion.dps * GAME_CONSTANTS.MINION_FURY.ULTIMATE_DAMAGE_MULTIPLIER
        : minion.dps;
      const damage = Math.round(baseDamage * getMinionDamageMultiplier(minion, Date.now()));
      let attackDamageType: DamageType = DAMAGE_TYPE.NORMAL;
      if (isFullFury) {
        attackDamageType = DAMAGE_TYPE.ULTIMATE;
      } else if (minion.isSignatureSynergy) {
        attackDamageType = DAMAGE_TYPE.CRIT;
      }
      store.damageBoss(damage, minion.team, `${minion.summonerName} (${minion.championName})`, attackDamageType, CHAMPION_HIT_OPTIONS);
    }
  }

  champGroup.position.set(posX, posY, posZ);
  const levelScaleMultiplier = minion.levelScale ?? 1.0;
  champGroup.scale.setScalar(finalScale * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.TOKEN_SCALE * levelScaleMultiplier);
  champGroup.quaternion.copy(camera.quaternion);

  publishLivePosition(ai, minion, posX, posY, posZ, camera, viewportW, viewportH);

  const vfxRefs = resolveCachedVfxRefs(ai, champGroup.children[0] as THREE.Group | undefined);
  updateFlyAvatarSummon(vfxRefs, minion, entranceAgeMs, elapsedTime, ai.bobPhase);

  if (vfxRefs.sigHaloMesh) {
    if (entranceAgeMs >= 0 && entranceAgeMs < ENTRANCE_AURA.TOTAL_MS) {
      const haloFade = Math.pow(1 - entranceAgeMs / ENTRANCE_AURA.TOTAL_MS, 1.5);
      vfxRefs.sigHaloMesh.rotation.z = -elapsedTime * 2.1;
      vfxRefs.sigHaloMesh.scale.setScalar(1.05 + Math.sin(elapsedTime * 4.5) * 0.08);
      if (vfxRefs.sigHaloMesh.material instanceof THREE.MeshBasicMaterial) {
        vfxRefs.sigHaloMesh.material.opacity = SIGNATURE_HALO_OPACITY * haloFade;
      }
      vfxRefs.sigHaloMesh.visible = true;
    } else if (vfxRefs.sigHaloMesh.visible) {
      vfxRefs.sigHaloMesh.visible = false;
    }
  }

  if (vfxRefs.eliteAuraMesh) {
    vfxRefs.eliteAuraMesh.rotation.z = -elapsedTime * COMBAT_VFX_CONSTANTS.ELITE_AURA.ROTATION_SPEED;
    const auraPulse =
      COMBAT_VFX_CONSTANTS.ELITE_AURA.PULSE_BASE_SCALE +
      Math.sin(elapsedTime * COMBAT_VFX_CONSTANTS.ELITE_AURA.PULSE_FREQUENCY) *
        COMBAT_VFX_CONSTANTS.ELITE_AURA.PULSE_AMPLITUDE;
    vfxRefs.eliteAuraMesh.scale.set(auraPulse, auraPulse, 1);
  }

  const isSquadMember = (minion.entranceSquadSize ?? 1) >= SQUAD_ENTRANCE_CONSTANTS.MIN_SIZE;
  updateChampionEntranceAura(vfxRefs, entranceAgeMs, elapsedTime, minion.team, isSquadMember);
  updateChampionShieldMesh(vfxRefs, entranceAgeMs, elapsedTime, isGraceActive);
};
