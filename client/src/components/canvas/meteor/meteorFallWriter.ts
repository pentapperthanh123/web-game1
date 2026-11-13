import * as THREE from 'three';
import { MeteorEntity } from '../../../types/game';
import { METEOR_VFX } from './meteorVfxConstants';
import { METEOR_LAYER, MeteorLayers, pushMeteorInstance, resolveCachedColor } from './meteorLayers';
import { clamp01 } from '../bossSkill/bossSkill3DShared';

const MS_PER_SECOND = 1000;
const HALF = 0.5;
const MIN_TRAIL_LENGTH = 0.02;
const MIN_TRAVEL_DISTANCE = 1e-4;
const HEAD_TUMBLE_RATIO = 0.7;
const INNER_TRAIL_GLOW_MIX = 0.5;
const UP_AXIS = new THREE.Vector3(0, 1, 0);
const IDENTITY_QUATERNION = new THREE.Quaternion();

/* Scratch objects reused every frame — the render loop never allocates. */
const startPoint = new THREE.Vector3();
const targetPoint = new THREE.Vector3();
const headPoint = new THREE.Vector3();
const backward = new THREE.Vector3();
const markerPoint = new THREE.Vector3();
const scaleVector = new THREE.Vector3();
const trailRotation = new THREE.Quaternion();
const headRotation = new THREE.Quaternion();
const headEuler = new THREE.Euler();
const rockColor = new THREE.Color();
const innerTrailColor = new THREE.Color();

interface FallFrame {
  progress: number;
  headFade: number;
  travelled: number;
  time: number;
  seed: number;
}

const writeWarningMarker = (layers: MeteorLayers, frame: FallFrame, color: THREE.Color): void => {
  const { progress, time } = frame;
  const pulse = 1 - METEOR_VFX.MARKER_PULSE_DEPTH * (HALF + HALF * Math.sin(time * METEOR_VFX.MARKER_PULSE_SPEED));
  const intensity = THREE.MathUtils.lerp(METEOR_VFX.MARKER_MIN_INTENSITY, 1, progress) * pulse;
  const size = THREE.MathUtils.lerp(METEOR_VFX.MARKER_MIN_SCALE, METEOR_VFX.MARKER_MAX_SCALE, progress);
  markerPoint.copy(targetPoint).setY(targetPoint.y + METEOR_VFX.MARKER_LIFT);

  scaleVector.set(size, 1, size);
  pushMeteorInstance(layers.byKey[METEOR_LAYER.MARKER_RING], markerPoint, IDENTITY_QUATERNION, scaleVector, color, intensity);
  const fillSize = size * METEOR_VFX.MARKER_FILL_SCALE_RATIO;
  scaleVector.set(fillSize, 1, fillSize);
  pushMeteorInstance(layers.byKey[METEOR_LAYER.MARKER_FILL], markerPoint, IDENTITY_QUATERNION, scaleVector, color, intensity);
};

const writeHead = (layers: MeteorLayers, frame: FallFrame, cameraQuaternion: THREE.Quaternion, glow: THREE.Color): void => {
  const spin = frame.time * METEOR_VFX.HEAD_SPIN_SPEED + frame.seed;
  headEuler.set(spin * HEAD_TUMBLE_RATIO, spin, 0);
  headRotation.setFromEuler(headEuler);
  scaleVector.setScalar(1);
  pushMeteorInstance(layers.byKey[METEOR_LAYER.HEAD_CORE], headPoint, headRotation, scaleVector, rockColor, frame.headFade);

  const flicker = 1 + Math.sin(frame.time * METEOR_VFX.HEAD_GLOW_FLICKER_SPEED + frame.seed) * METEOR_VFX.HEAD_GLOW_FLICKER_DEPTH;
  scaleVector.setScalar(METEOR_VFX.HEAD_GLOW_SIZE * flicker);
  pushMeteorInstance(layers.byKey[METEOR_LAYER.HEAD_GLOW], headPoint, cameraQuaternion, scaleVector, glow, frame.headFade);
};

const writeTrail = (layers: MeteorLayers, frame: FallFrame, base: THREE.Color): void => {
  const maxLength = frame.travelled * METEOR_VFX.TRAIL_TRAVEL_RATIO;
  const flicker = 1 + Math.sin(frame.time * METEOR_VFX.TRAIL_FLICKER_SPEED + frame.seed) * METEOR_VFX.TRAIL_FLICKER_DEPTH;

  const outerLength = Math.min(METEOR_VFX.TRAIL_OUTER_LENGTH, maxLength);
  if (outerLength < MIN_TRAIL_LENGTH) return;
  const outerRadius = METEOR_VFX.TRAIL_OUTER_RADIUS * flicker;
  scaleVector.set(outerRadius, outerLength, outerRadius);
  pushMeteorInstance(layers.byKey[METEOR_LAYER.TRAIL_OUTER], headPoint, trailRotation, scaleVector, base, frame.headFade);

  const innerLength = Math.min(METEOR_VFX.TRAIL_INNER_LENGTH, maxLength);
  const innerRadius = METEOR_VFX.TRAIL_INNER_RADIUS * flicker;
  scaleVector.set(innerRadius, innerLength, innerRadius);
  pushMeteorInstance(layers.byKey[METEOR_LAYER.TRAIL_INNER], headPoint, trailRotation, scaleVector, innerTrailColor, frame.headFade);
};

const fallFrame: FallFrame = { progress: 0, headFade: 0, travelled: 0, time: 0, seed: 0 };

/** Warning marker + burning head + tapered trail for one meteor still in the air. */
export const writeFallingMeteor = (
  layers: MeteorLayers,
  meteor: MeteorEntity,
  now: number,
  time: number,
  seed: number,
  cameraQuaternion: THREE.Quaternion,
): void => {
  const progress = (now - meteor.createdAt) / (meteor.duration * MS_PER_SECOND);
  if (progress < 0 || progress >= 1) return;

  const fallProgress = Math.pow(progress, METEOR_VFX.FALL_EASE_POWER);
  startPoint.fromArray(meteor.start);
  targetPoint.fromArray(meteor.target);
  headPoint.lerpVectors(startPoint, targetPoint, fallProgress);
  backward.subVectors(startPoint, targetPoint);
  const distance = backward.length();
  if (distance > MIN_TRAVEL_DISTANCE) backward.divideScalar(distance);
  else backward.copy(UP_AXIS);
  trailRotation.setFromUnitVectors(UP_AXIS, backward);

  const base = resolveCachedColor(meteor.color);
  const glow = resolveCachedColor(meteor.glowColor ?? meteor.color);
  const core = resolveCachedColor(meteor.coreColor ?? METEOR_VFX.DEFAULT_CORE_COLOR);
  rockColor.copy(core).lerp(glow, METEOR_VFX.HEAD_CORE_TINT);
  innerTrailColor.copy(core).lerp(glow, INNER_TRAIL_GLOW_MIX);

  fallFrame.progress = progress;
  fallFrame.headFade = clamp01(progress / METEOR_VFX.HEAD_FADE_IN_PORTION);
  fallFrame.travelled = distance * fallProgress;
  fallFrame.time = time;
  fallFrame.seed = seed;

  writeWarningMarker(layers, fallFrame, base);
  writeTrail(layers, fallFrame, base);
  writeHead(layers, fallFrame, cameraQuaternion, glow);
};
