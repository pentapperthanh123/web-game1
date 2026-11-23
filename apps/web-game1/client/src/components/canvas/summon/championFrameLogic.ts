import { readChampionHitAt } from '../../../services/championHitFeedback';
import * as THREE from 'three';
import { DAMAGE_SOURCE } from '../../../constants/game';
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
} from '../../../constants/game';
import { DamageBossOptions, MinionEntity } from '../../../types/game';
import { getMinionDamageMultiplier, isMinionStunned } from '../../../utils/statusEffects';
import {
  setLiveMinionPositions,
  setLiveChampionNameplateAnchor,
} from '../../../services/minionPositionRegistry';
import {
  CachedChampionVfxRefs,
  ChampionAIState,
  FURY_COLOR_FULL,
  getMinionAttackSpeedFactor,
  project3DToScreen,
  projectToScreenFloatInto,
  projectToScreenInto,
  randomInRange,
} from './summonShared';
import { ENTRANCE_AURA, updateChampionEntranceAura } from './championEntranceAura';
import { SIGNATURE_HALO_OPACITY } from './ChampionToken';
import {
  clampWorldTargetToSafeArena,
  computeScreenSeparationNudge,
  pickSpreadTargetInWing,
} from './championSpread';
import { isCurrentRoundIntroActive } from '../../../store/roundIntroStore';
import { resolveChampionAttackSpeedMultiplier } from '../../../store/summonQueueHelper';


const resolveCachedVfxRefs = (
  ai: ChampionAIState,
  tokenSubgroup: THREE.Group | undefined
): CachedChampionVfxRefs => {
  if (!tokenSubgroup) return {};
  if (ai.cachedVfxRefs && ai.cachedVfxGroupId === tokenSubgroup.uuid) return ai.cachedVfxRefs;

  const refs: CachedChampionVfxRefs = {
    tokenUnitGroup: tokenSubgroup.getObjectByName('token-unit') as THREE.Group | undefined,
    impactShardsMesh: tokenSubgroup.getObjectByName('impact-shards') as THREE.Mesh | undefined,
    sigHaloMesh: tokenSubgroup.getObjectByName('signature-synergy-halo') as THREE.Mesh | undefined,
    haloMesh: tokenSubgroup.getObjectByName('celestial-halo') as THREE.Mesh | undefined,
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
 * Drives the champion body spawn pop-in after the entrance sky-beam & rune seal touch down:
 *  1. Before touchdown (0 .. FLY_IN_DURATION_MS): champion body stays hidden while the portal charges.
 *  2. Touchdown (after FLY_IN_DURATION_MS): champion body pops out with an overshoot bounce.
 */
const updateChampionSpawnPop = (
  refs: CachedChampionVfxRefs,
  entranceAgeMs: number
): void => {
  const tokenUnit = refs.tokenUnitGroup;
  if (!tokenUnit) return;

  const cfg = COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON;
  const flyDurationMs = cfg.FLY_IN_DURATION_MS;

  if (entranceAgeMs >= 0 && entranceAgeMs < flyDurationMs) {
    tokenUnit.visible = false;
    tokenUnit.scale.setScalar(cfg.CHAMPION_HIDDEN_SCALE);
    return;
  }

  const impactAgeMs = Math.max(0, entranceAgeMs - flyDurationMs);
  tokenUnit.visible = true;
  tokenUnit.scale.setScalar(computeChampionImpactPopScale(impactAgeMs, cfg.CHAMPION_POP_DURATION_MS));
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

const tempNameplateOffset = new THREE.Vector3();
const tempSepNudge = { dx: 0, dy: 0 };
const tempClampedTarget = { x: 0, y: 0 };
const SEPARATION_WORLD_SPEED = 0.28;
const SEPARATION_Y_RATIO = 0.72;
const UPPER_FLANK_WORLD_Y_CUTOFF = -0.35;
const TEAM_FLANK_MIN_UPPER_X = 0.25;
const TEAM_FLANK_MIN_LOWER_X = 0.15;
const SHIELD_PULSE_BASE = 1.0;
const SHIELD_PULSE_AMPLITUDE = 0.035;
const SHIELD_PULSE_SPEED = 6;
const ATTACK_SCALE_PULSE_AMPLITUDE = 0.12;
const SMOOTH_FOLLOW_RATE = 0.85;
const NAMEPLATE_DEPTH_BASE_Z_INDEX = 40;
const NAMEPLATE_Z_INDEX_MIN = 10;
const NAMEPLATE_Z_INDEX_MAX = 80;
const NAMEPLATE_Z_DEPTH_FACTOR = 10;

const publishNameplateAnchor = (
  ai: ChampionAIState,
  minionId: string,
  posX: number,
  posY: number,
  posZ: number,
  groupScale: number,
  isVisible: boolean,
  camera: THREE.Camera,
  viewportW: number,
  viewportH: number
): void => {
  tempNameplateOffset
    .set(
      0,
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_POS_Y * groupScale,
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_POS_Z * groupScale
    )
    .applyQuaternion(camera.quaternion);

  if (!ai.liveNameplateAnchor) {
    ai.liveNameplateAnchor = { x: 0, y: 0, visible: isVisible, zIndex: NAMEPLATE_DEPTH_BASE_Z_INDEX };
    setLiveChampionNameplateAnchor(minionId, ai.liveNameplateAnchor);
  }

  projectToScreenFloatInto(
    ai.liveNameplateAnchor,
    posX + tempNameplateOffset.x,
    posY + tempNameplateOffset.y,
    posZ + tempNameplateOffset.z,
    camera,
    viewportW,
    viewportH
  );
  ai.liveNameplateAnchor.visible = isVisible;
  ai.liveNameplateAnchor.zIndex = Math.max(
    NAMEPLATE_Z_INDEX_MIN,
    Math.min(NAMEPLATE_Z_INDEX_MAX, Math.round(NAMEPLATE_DEPTH_BASE_Z_INDEX + posZ * NAMEPLATE_Z_DEPTH_FACTOR))
  );
};

/** Token reaction to a boss hit (see championHitFeedback). */
const HIT_FLINCH = {
  DURATION_MS: 260,
  SHAKE_AMPLITUDE: 0.035,
  SHAKE_FREQUENCY: 0.032,
  SQUASH: 0.08,
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
  shieldMesh.scale.setScalar(
    SHIELD_PULSE_BASE + Math.sin(elapsedTime * SHIELD_PULSE_SPEED) * SHIELD_PULSE_AMPLITUDE
  );
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
  isBossAlive: boolean,
  isCameraStable: boolean
): void => {
  const store = useGameStore.getState();
  const entranceAgeMs = now - (minion.createdAt || 0);
  const isFlyInActive = entranceAgeMs < COMBAT_VFX_CONSTANTS.FLY_AVATAR_SUMMON.FLY_IN_DURATION_MS;

  if (elapsedTime >= ai.nextWanderTime) {
    const [tx, ty, tz] = pickSpreadTargetInWing(
      minion.team,
      camera,
      viewportW,
      viewportH,
      minion.id,
      ai.liveScreen
    );
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

  if (isCameraStable && !isFlyInActive) {
    if (
      ai.liveScreen &&
      computeScreenSeparationNudge(
        tempSepNudge,
        minion.id,
        ai.liveScreen.x,
        ai.liveScreen.y,
        viewportW,
        viewportH
      )
    ) {
      const pushX = tempSepNudge.dx * clampedDelta * SEPARATION_WORLD_SPEED;
      const pushY = tempSepNudge.dy * clampedDelta * SEPARATION_WORLD_SPEED * SEPARATION_Y_RATIO;
      ai.targetX += pushX;
      ai.targetY += pushY;

      const minSideX =
        ai.targetY > UPPER_FLANK_WORLD_Y_CUTOFF ? TEAM_FLANK_MIN_UPPER_X : TEAM_FLANK_MIN_LOWER_X;
      if (minion.team === TEAM_KEY.BLG) {
        ai.targetX = Math.min(ai.targetX, -minSideX);
      } else {
        ai.targetX = Math.max(ai.targetX, minSideX);
      }
    }

    if (
      clampWorldTargetToSafeArena(
        tempClampedTarget,
        ai.targetX,
        ai.targetY,
        ai.targetZ,
        minion.team,
        camera,
        viewportW,
        viewportH
      )
    ) {
      ai.targetX = tempClampedTarget.x;
      ai.targetY = tempClampedTarget.y;
    }
  }

  const lerpFactor = 1 - Math.exp(-ai.moveSpeed * SMOOTH_FOLLOW_RATE * clampedDelta);
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
      scalePulse = 1.0 + castCurve * ATTACK_SCALE_PULSE_AMPLITUDE;
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

  const bobOffset = isFlyInActive
    ? 0
    : Math.sin(elapsedTime * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.BOB_SPEED + ai.bobPhase) *
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.BOB_AMPLITUDE;

  // Flinch when the boss hits this champion: a short decaying shake plus a squash
  const hitAgeMs = now - readChampionHitAt(minion.id);
  const isFlinching = hitAgeMs >= 0 && hitAgeMs < HIT_FLINCH.DURATION_MS;
  const flinchLevel = isFlinching ? 1 - hitAgeMs / HIT_FLINCH.DURATION_MS : 0;
  const flinchShakeX = Math.sin(hitAgeMs * HIT_FLINCH.SHAKE_FREQUENCY) * HIT_FLINCH.SHAKE_AMPLITUDE * flinchLevel;

  const posX = ai.currentX + castRecoilX + flinchShakeX;
  const posY = ai.currentY + castLiftY + bobOffset;
  const posZ = ai.currentZ;
  const finalScale = scalePulse * (1 - HIT_FLINCH.SQUASH * flinchLevel);

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
  const groupScale = finalScale * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.TOKEN_SCALE * levelScaleMultiplier;
  champGroup.scale.setScalar(groupScale);
  champGroup.quaternion.copy(camera.quaternion);

  publishLivePosition(ai, minion, posX, posY, posZ, camera, viewportW, viewportH);
  publishNameplateAnchor(
    ai,
    minion.id,
    posX,
    posY,
    posZ,
    groupScale,
    !isFlyInActive,
    camera,
    viewportW,
    viewportH
  );

  const vfxRefs = resolveCachedVfxRefs(ai, champGroup.children[0] as THREE.Group | undefined);
  updateChampionSpawnPop(vfxRefs, entranceAgeMs);

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

  updateChampionEntranceAura(vfxRefs, entranceAgeMs, elapsedTime, minion.team);
  updateChampionShieldMesh(vfxRefs, entranceAgeMs, elapsedTime, isGraceActive);
};
