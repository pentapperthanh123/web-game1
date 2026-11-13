import * as THREE from 'three';
import { SQUAD_ENTRANCE_CONSTANTS } from '../../../constants/game';
import { useGameStore } from '../../../store/gameStore';
import {
  GAME_CONSTANTS,
  COMBAT_VFX_CONSTANTS,
  TEAM_KEY,
  DAMAGE_TYPE,
  DamageType,
} from '../../../constants/game';
import { MinionEntity } from '../../../types/game';
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
import { updateChampionEntranceAura } from './championEntranceAura';
import { pickSpreadTargetInWing } from './championSpread';


const resolveCachedVfxRefs = (
  ai: ChampionAIState,
  tokenSubgroup: THREE.Group | undefined
): CachedChampionVfxRefs => {
  if (!tokenSubgroup) return {};
  if (ai.cachedVfxRefs && ai.cachedVfxGroupId === tokenSubgroup.uuid) return ai.cachedVfxRefs;

  const refs: CachedChampionVfxRefs = {
    ring: tokenSubgroup.getObjectByName('runic-ring') as THREE.Mesh | undefined,
    sigHaloMesh: tokenSubgroup.getObjectByName('signature-synergy-halo') as THREE.Mesh | undefined,
    haloMesh: tokenSubgroup.getObjectByName('celestial-halo') as THREE.Mesh | undefined,
    beamMesh: tokenSubgroup.getObjectByName('sky-beam') as THREE.Mesh | undefined,
    beamCoreMesh: tokenSubgroup.getObjectByName('sky-beam-core') as THREE.Mesh | undefined,
    runeSealMesh: tokenSubgroup.getObjectByName('rune-seal') as THREE.Mesh | undefined,
    landingMesh: tokenSubgroup.getObjectByName('landing-ring') as THREE.Mesh | undefined,
    landingFlashMesh: tokenSubgroup.getObjectByName('landing-flash') as THREE.Mesh | undefined,
    shieldMesh: tokenSubgroup.getObjectByName('invuln-shield') as THREE.Mesh | undefined,
  };
  ai.cachedVfxRefs = refs;
  ai.cachedVfxGroupId = tokenSubgroup.uuid;
  return refs;
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
  if (isBossAlive && !isGraceActive && elapsedTime >= ai.nextAttackTime && !ai.isAttacking) {
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
    const attackSpeedFactor = teamMomentum
      ? getMinionAttackSpeedFactor(teamMomentum.multiplier, teamMomentum.lastTapAt, now)
      : 1;
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

  const entranceMs = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ENTRANCE_DURATION_MS;
  let swoopY = 0;
  let entranceScale = 1.0;
  if (entranceAgeMs < entranceMs) {
    const prog = Math.min(1.0, entranceAgeMs / entranceMs);
    const easeOut = 1 - Math.pow(1 - prog, 3);
    swoopY = (1 - easeOut) * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ENTRANCE_SWOOP_Y;
    entranceScale = prog < 0.6 ? 0.75 + (prog / 0.6) * 0.32 : 1.07 - ((prog - 0.6) * 0.07) / 0.4;
  }

  if (isBossAlive && !isGraceActive && !ai.hasLanded) {
    ai.hasLanded = true;
    const scrStart = project3DToScreen(ai.currentX, ai.currentY, ai.currentZ, camera, viewportW, viewportH);
    const openingDamage = Math.round(minion.dps * COMBAT_VFX_CONSTANTS.SUMMON.NORMAL_MULTIPLIER);
    const openingActor = minion.signaturePlayerName
      ? `${minion.summonerName} (${minion.signaturePlayerName})`
      : minion.summonerName;
    const openingDamageType = minion.isSignatureSynergy ? DAMAGE_TYPE.CRIT : DAMAGE_TYPE.NORMAL;
    store.consumeMinionAttackFury(minion.id);
    store.damageBoss(openingDamage, minion.team, openingActor, openingDamageType);
    store.spawnFlyingArrow(minion.championName, minion.team, false, scrStart);
  }

  const bobOffset =
    Math.sin(elapsedTime * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.BOB_SPEED + ai.bobPhase) *
    COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.BOB_AMPLITUDE;

  let posX = ai.currentX + castRecoilX;
  let posY = ai.currentY + castLiftY + bobOffset + swoopY;
  let posZ = ai.currentZ;
  const finalScale = scalePulse * entranceScale;

  tempProjVec.set(posX, posY, posZ).project(camera);
  let isClamped = false;
  const safeNdcX = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_X;
  const safeNdcYMin = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_Y_MIN;
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
  if (isBossAlive && wasAttackingThisFrame && !ai.hasFiredInThisAttack && !isGraceActive && !isStunned) {
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
      store.damageBoss(damage, minion.team, `${minion.summonerName} (${minion.championName})`, attackDamageType);
    }
  }

  champGroup.position.set(posX, posY, posZ);
  champGroup.scale.setScalar(finalScale * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.TOKEN_SCALE);
  champGroup.quaternion.copy(camera.quaternion);

  publishLivePosition(ai, minion, posX, posY, posZ, camera, viewportW, viewportH);

  const vfxRefs = resolveCachedVfxRefs(ai, champGroup.children[0] as THREE.Group | undefined);
  if (vfxRefs.ring) {
    const spinSpeed = ai.isAttacking ? 0.9 : 0.45;
    vfxRefs.ring.rotation.z = elapsedTime * (minion.team === TEAM_KEY.BLG ? spinSpeed : -spinSpeed);
  }

  if (vfxRefs.sigHaloMesh) {
    vfxRefs.sigHaloMesh.rotation.z = -elapsedTime * 2.1;
    vfxRefs.sigHaloMesh.scale.setScalar(1.05 + Math.sin(elapsedTime * 4.5) * 0.08);
  }

  const isSquadMember = (minion.entranceSquadSize ?? 1) >= SQUAD_ENTRANCE_CONSTANTS.MIN_SIZE;
  updateChampionEntranceAura(vfxRefs, entranceAgeMs, elapsedTime, minion.team, isSquadMember);

  if (vfxRefs.shieldMesh?.material instanceof THREE.MeshBasicMaterial) {
    if (isGraceActive) {
      const shieldProg = entranceAgeMs / GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS;
      vfxRefs.shieldMesh.scale.setScalar(1.0 + Math.sin(elapsedTime * 12) * 0.08);
      vfxRefs.shieldMesh.rotation.z = -elapsedTime * 4.0;
      vfxRefs.shieldMesh.material.opacity = Math.max(0.2, (1.0 - shieldProg * 0.35) * 0.9);
      vfxRefs.shieldMesh.visible = true;
    } else if (vfxRefs.shieldMesh.visible) {
      vfxRefs.shieldMesh.visible = false;
    }
  }
};
