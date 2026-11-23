import * as THREE from 'three';
import { METEOR_VFX } from './meteorVfxConstants';
import { METEOR_LAYER, MeteorLayers, pushMeteorInstance } from './meteorLayers';
import { MeteorImpactSlot } from './meteorImpactPool';
import { clamp01, easeOutCubic, fadeOut } from '../bossSkill/bossSkill3DShared';

const MS_PER_SECOND = 1000;
const HALF = 0.5;
const FULL_TURN = Math.PI * 2;
const GOLDEN_RATIO_FRACTION = 0.6180339887;
const UP_AXIS = new THREE.Vector3(0, 1, 0);
const IDENTITY_QUATERNION = new THREE.Quaternion();

interface SparkDirection {
  angle: number;
  horizontalSpeed: number;
  verticalSpeed: number;
}

/** Deterministic spark fan (low-discrepancy spread), built once at module load. */
const SPARK_DIRECTIONS: readonly SparkDirection[] = Array.from({ length: METEOR_VFX.SPARKS_PER_IMPACT }, (_, index) => {
  const spread = (index * GOLDEN_RATIO_FRACTION) % 1;
  const jitter = (spread - HALF) * METEOR_VFX.SPARK_ANGLE_JITTER;
  const angle = (index / METEOR_VFX.SPARKS_PER_IMPACT) * FULL_TURN + jitter;
  const elevation = THREE.MathUtils.lerp(METEOR_VFX.SPARK_MIN_ELEVATION, METEOR_VFX.SPARK_MAX_ELEVATION, spread);
  const speed = THREE.MathUtils.lerp(METEOR_VFX.SPARK_MAX_SPEED, METEOR_VFX.SPARK_MIN_SPEED, spread);
  return { angle, horizontalSpeed: Math.cos(elevation) * speed, verticalSpeed: Math.sin(elevation) * speed };
});

/* Scratch objects reused every frame. */
const effectPoint = new THREE.Vector3();
const sparkVelocity = new THREE.Vector3();
const scaleVector = new THREE.Vector3();
const sparkRotation = new THREE.Quaternion();

const writeFlash = (layers: MeteorLayers, slot: MeteorImpactSlot, age: number, cameraQuaternion: THREE.Quaternion): void => {
  if (age >= METEOR_VFX.IMPACT_FLASH_MS) return;
  const progress = age / METEOR_VFX.IMPACT_FLASH_MS;
  const size = THREE.MathUtils.lerp(METEOR_VFX.IMPACT_FLASH_MIN_SCALE, METEOR_VFX.IMPACT_FLASH_MAX_SCALE, easeOutCubic(progress));
  effectPoint.copy(slot.position).setY(slot.position.y + METEOR_VFX.IMPACT_FLASH_LIFT);
  scaleVector.setScalar(size);
  pushMeteorInstance(layers.byKey[METEOR_LAYER.FLASH], effectPoint, cameraQuaternion, scaleVector, slot.hotColor, fadeOut(progress));
};

const writeShockwave = (layers: MeteorLayers, slot: MeteorImpactSlot, age: number): void => {
  if (age >= METEOR_VFX.IMPACT_SHOCKWAVE_MS) return;
  const progress = age / METEOR_VFX.IMPACT_SHOCKWAVE_MS;
  const size = THREE.MathUtils.lerp(
    METEOR_VFX.IMPACT_SHOCKWAVE_MIN_SCALE,
    METEOR_VFX.IMPACT_SHOCKWAVE_MAX_SCALE,
    easeOutCubic(progress),
  );
  effectPoint.copy(slot.position).setY(slot.position.y + METEOR_VFX.MARKER_LIFT);
  scaleVector.set(size, 1, size);
  pushMeteorInstance(layers.byKey[METEOR_LAYER.SHOCKWAVE], effectPoint, IDENTITY_QUATERNION, scaleVector, slot.hotColor, fadeOut(progress));
};

const writeScorch = (layers: MeteorLayers, slot: MeteorImpactSlot, age: number): void => {
  const progress = age / METEOR_VFX.IMPACT_LIFETIME_MS;
  const attack = clamp01(age / METEOR_VFX.IMPACT_SCORCH_ATTACK_MS);
  const size = METEOR_VFX.IMPACT_SCORCH_SCALE * (1 + METEOR_VFX.IMPACT_SCORCH_GROWTH * easeOutCubic(progress));
  effectPoint.copy(slot.position).setY(slot.position.y + METEOR_VFX.MARKER_LIFT);
  scaleVector.set(size, 1, size);
  pushMeteorInstance(layers.byKey[METEOR_LAYER.SCORCH], effectPoint, IDENTITY_QUATERNION, scaleVector, slot.baseColor, attack * fadeOut(progress));
};

const writeSparks = (layers: MeteorLayers, slot: MeteorImpactSlot, slotIndex: number, age: number): void => {
  if (age >= METEOR_VFX.SPARK_MS) return;
  const intensity = fadeOut(age / METEOR_VFX.SPARK_MS);
  const seconds = age / MS_PER_SECOND;
  const fanOffset = slotIndex * METEOR_VFX.SPARK_FAN_OFFSET;
  scaleVector.set(METEOR_VFX.SPARK_THICKNESS, METEOR_VFX.SPARK_LENGTH, METEOR_VFX.SPARK_THICKNESS);

  for (let index = 0; index < SPARK_DIRECTIONS.length; index += 1) {
    const spark = SPARK_DIRECTIONS[index];
    const angle = spark.angle + fanOffset;
    const velocityX = Math.cos(angle) * spark.horizontalSpeed;
    const velocityZ = Math.sin(angle) * spark.horizontalSpeed;
    const velocityY = spark.verticalSpeed + METEOR_VFX.SPARK_GRAVITY * seconds;
    const riseY = spark.verticalSpeed * seconds + HALF * METEOR_VFX.SPARK_GRAVITY * seconds * seconds;
    effectPoint.set(
      slot.position.x + velocityX * seconds,
      slot.position.y + riseY,
      slot.position.z + velocityZ * seconds,
    );
    sparkVelocity.set(velocityX, velocityY, velocityZ).normalize();
    sparkRotation.setFromUnitVectors(UP_AXIS, sparkVelocity);
    pushMeteorInstance(layers.byKey[METEOR_LAYER.SPARK], effectPoint, sparkRotation, scaleVector, slot.hotColor, intensity);
  }
};

/** Flash → shockwave ring → lingering scorch glow + sparks for one landed meteor. Retires the slot when done. */
export const writeMeteorImpact = (
  layers: MeteorLayers,
  slot: MeteorImpactSlot,
  slotIndex: number,
  now: number,
  cameraQuaternion: THREE.Quaternion,
): void => {
  if (!slot.isActive) return;
  const age = now - slot.landedAt;
  if (age < 0) return;
  if (age >= METEOR_VFX.IMPACT_LIFETIME_MS) {
    slot.isActive = false;
    return;
  }
  writeScorch(layers, slot, age);
  writeShockwave(layers, slot, age);
  writeSparks(layers, slot, slotIndex, age);
  writeFlash(layers, slot, age, cameraQuaternion);
};
