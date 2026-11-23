import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_IMPACT_RATIO, BOSS_SKILL_VFX_STYLE } from '../../../constants/bossSkillVfx';
import { BOSS_SKILL_VFX } from '../../../types/bossSkill';
import {
  BOSS_3D_ANCHORS,
  BossSkillImpactPoint,
  SkillVfx3DProps,
  computeProgress,
  easeInOutSine,
  envelope,
  phaseProgress,
  pickSpreadPoints,
  seededValues,
  setMaterialOpacity,
  useDisposeOnUnmount,
} from './bossSkill3DShared';
import { GlowSprite, ImpactBurst } from './VfxPrimitives3D';
import {
  GlowParticleWriter,
  commitGlowParticle,
  createGlowParticleMesh,
  createGlowParticleWriter,
  flushGlowParticles,
  hideGlowParticle,
} from './glowParticles';
import { followTrackedAnchor, useTrackedBossAnchor } from './useTrackedBossAnchor';
import { BOSS_ANCHOR_ELEMENT_ID } from '../../../constants/bossSpriteAnchors';

/** Particle budget: one instanced draw call for the jet, the pool flames and the sparks together. */
const JET_PUFF_COUNT = 56;
const MAX_FIRE_POOLS = 5;
const FLAMES_PER_POOL = 5;
const SPARKS_PER_POOL = 4;
const PARTICLES_PER_POOL = FLAMES_PER_POOL + SPARKS_PER_POOL;
const RANDOMS_PER_PARTICLE = 4;

/** Timeline (fraction of the clip). The first puffs reach the floor at the skill's impact ratio. */
const IMPACT_AT = BOSS_SKILL_VFX_IMPACT_RATIO[BOSS_SKILL_VFX.FIRE_BREATH];
/** The jaw charges first: the boss turns toward its target (Boss2D flip, ~0.5 s) before the jet leaves. */
const EMIT_START = 0.2;
const EMIT_END = 0.8;
const POOL_STAGGER_SPAN = 0.3;
const POOL_RELEASE_START = 0.82;
const MOUTH_ATTACK_END = EMIT_START;
const POOL_ATTACK_END = 0.12;
const MOUTH_RELEASE_START = 0.7;

/** Jet puffs: travel from the jaw to the aim point, then billow and rise as they cool. */
const PUFF_LIFE_MS = 560;
const PUFF_REACH_AGE = 0.62;
const PUFF_START_SIZE = 0.14;
const PUFF_GROW = 0.55;
const PUFF_SIZE_JITTER = 0.45;
const PUFF_SPREAD = 0.4;
const PUFF_ARC_HEIGHT = 0.22;
const PUFF_BILLOW_RISE = 0.55;
const PUFF_FADE_POWER = 1.4;
/** In flight a puff only dims this much, so the stream reads as one continuous jet. */
const PUFF_FLIGHT_DIM = 0.3;
/** Close to linear so the stream stays continuous from jaw to floor instead of piling up at the end. */
const PUFF_TRAVEL_EASE_POWER = 1.35;
/** Puffs that already landed only smoulder; full brightness there piles up into one white blob. */
const PUFF_LANDED_BRIGHTNESS = 0.45;

/** Pool flames lick upward on each hurt champion; sparks pop out of them. */
const FLAME_LIFE_MS = 420;
const FLAME_RISE = 0.75;
const FLAME_SIZE = 0.38;
const FLAME_SHRINK = 0.6;
const FLAME_JITTER_RADIUS = 0.22;
const SPARK_LIFE_MS = 620;
const SPARK_RISE = 1.3;
const SPARK_DRIFT = 0.4;
const SPARK_SIZE = 0.07;
const POOL_BURST_SIZE = 1.05;
const FLOOR_CLEARANCE = 0.08;

/** Colour ramp of a cooling flame: white-hot → secondary → primary → dark ember. */
const RAMP_HOT_END = 0.14;
const RAMP_MID_END = 0.5;
const EMBER_COLOR = '#3f0d02';
const MAX_PARTICLE_BRIGHTNESS = 0.8;

const MOUTH_FLARE_SIZE = 0.7;
const MOUTH_CORE_RATIO = 0.45;
const MOUTH_FLICKER_RATE = 0.05;
const MOUTH_FLICKER_AMPLITUDE = 0.12;

/** Aim when the cast has no hurt champions to target (wing centre, sweeping a little). */
const FALLBACK_AIM_Z = 0.4;
const FALLBACK_SWEEP_HALF = 0.7;

interface FireSweep {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
}

interface FireColors {
  hot: THREE.Color;
  mid: THREE.Color;
  base: THREE.Color;
  ember: THREE.Color;
}

const groundY = BOSS_3D_ANCHORS.GROUND_Y + FLOOR_CLEARANCE;
const fract = (value: number): number => value - Math.floor(value);

/** The jet sweeps the attacked wing from the champion closest to the boss to the farthest one. */
const resolveFireSweep = (points: readonly BossSkillImpactPoint[], originX: number, direction: number): FireSweep => {
  if (points.length === 0) {
    const centerX = direction * BOSS_3D_ANCHORS.WING_X;
    const halfSweep = direction === 0 ? BOSS_3D_ANCHORS.WING_X : FALLBACK_SWEEP_HALF;
    return { fromX: centerX - halfSweep, fromZ: FALLBACK_AIM_Z, toX: centerX + halfSweep, toZ: FALLBACK_AIM_Z };
  }
  const byDistance = [...points].sort((first, second) => Math.abs(first[0] - originX) - Math.abs(second[0] - originX));
  const nearest = byDistance[0];
  const farthest = byDistance[byDistance.length - 1];
  return { fromX: nearest[0], fromZ: nearest[1], toX: farthest[0], toZ: farthest[1] };
};

/** Fire pools on the hurt champions, or at both ends of the sweep when nobody is hit. */
const pickPoolSpots = (points: readonly BossSkillImpactPoint[], sweep: FireSweep): BossSkillImpactPoint[] => {
  if (points.length === 0) return [[sweep.fromX, sweep.fromZ], [sweep.toX, sweep.toZ]];
  return pickSpreadPoints(points, MAX_FIRE_POOLS);
};

/** Bright while the puff flies, then a smouldering fade once it has landed. */
const resolvePuffBrightness = (age: number): number => {
  if (age < PUFF_REACH_AGE) return 1 - PUFF_FLIGHT_DIM * (age / PUFF_REACH_AGE);
  const landedAge = (age - PUFF_REACH_AGE) / (1 - PUFF_REACH_AGE);
  return (1 - PUFF_FLIGHT_DIM) * PUFF_LANDED_BRIGHTNESS * Math.pow(1 - landedAge, PUFF_FADE_POWER);
};

const writeRampColor = (target: THREE.Color, colors: FireColors, age: number, brightness: number): void => {
  if (age < RAMP_HOT_END) {
    target.lerpColors(colors.hot, colors.mid, age / RAMP_HOT_END);
  } else if (age < RAMP_MID_END) {
    target.lerpColors(colors.mid, colors.base, (age - RAMP_HOT_END) / (RAMP_MID_END - RAMP_HOT_END));
  } else {
    target.lerpColors(colors.base, colors.ember, (age - RAMP_MID_END) / (1 - RAMP_MID_END));
  }
  // Additive blending: a darker colour is a more transparent particle
  target.multiplyScalar(brightness * MAX_PARTICLE_BRIGHTNESS);
};

/** Colours particle `index` along the cooling ramp, then writes it at `writer.position`. */
const writeFireParticle = (
  writer: GlowParticleWriter,
  colors: FireColors,
  index: number,
  size: number,
  age: number,
  brightness: number,
): void => {
  writeRampColor(writer.color, colors, age, brightness);
  commitGlowParticle(writer, index, size);
};

/**
 * Dragon fire breath: a flowing stream of fire puffs pours from the jaw and sweeps across the hurt
 * champions, setting a fire pool (flames + sparks + scorch) under each of them as the stream arrives.
 * The stream stays attached to the jaw while the 2D boss moves (see useTrackedBossAnchor).
 */
export const FireBreath3D = ({
  color,
  secondaryColor,
  scale,
  direction,
  startedAt,
  durationMs,
  mouthOrigin,
  coreOrigin,
  impactPoints,
}: SkillVfx3DProps) => {
  const jawAnchor = useTrackedBossAnchor(BOSS_ANCHOR_ELEMENT_ID.MOUTH, mouthOrigin);
  const jaw = jawAnchor.current;
  // Order by distance from the body: the jaw may still be on the far side while the boss turns
  const sweep = useMemo(() => resolveFireSweep(impactPoints, coreOrigin[0], direction), [impactPoints, coreOrigin, direction]);
  const poolSpots = useMemo(() => pickPoolSpots(impactPoints, sweep), [impactPoints, sweep]);
  const particleCount = JET_PUFF_COUNT + poolSpots.length * PARTICLES_PER_POOL;

  const fireMesh = useMemo(() => createGlowParticleMesh(particleCount), [particleCount]);
  const { mesh } = fireMesh;
  const disposables = useMemo(() => [fireMesh.mesh, fireMesh.material], [fireMesh]);
  useDisposeOnUnmount(disposables);

  const randoms = useMemo(() => seededValues(startedAt, particleCount * RANDOMS_PER_PARTICLE), [startedAt, particleCount]);
  const colors = useMemo<FireColors>(
    () => ({
      hot: new THREE.Color(BOSS_SKILL_VFX_STYLE.CORE_COLOR),
      mid: new THREE.Color(secondaryColor),
      base: new THREE.Color(color),
      ember: new THREE.Color(EMBER_COLOR),
    }),
    [color, secondaryColor],
  );
  const writer = useMemo(() => createGlowParticleWriter(mesh), [mesh]);
  const mouthRef = useRef<THREE.Group>(null);
  const { position } = writer;

  const poolStartAt = (poolIndex: number): number =>
    IMPACT_AT + (poolIndex / Math.max(1, poolSpots.length)) * POOL_STAGGER_SPAN;

  useFrame(({ camera }, deltaSeconds) => {
    followTrackedAnchor(jawAnchor, deltaSeconds);
    const progress = computeProgress(startedAt, durationMs);
    const elapsedMs = progress * durationMs;
    const isAlive = progress > 0 && progress < 1;
    mesh.visible = isAlive;

    if (mouthRef.current) {
      const flicker = 1 + Math.sin(elapsedMs * MOUTH_FLICKER_RATE) * MOUTH_FLICKER_AMPLITUDE;
      mouthRef.current.visible = isAlive;
      mouthRef.current.position.copy(jaw);
      mouthRef.current.scale.setScalar(MOUTH_FLARE_SIZE * scale * flicker);
      setMaterialOpacity(mouthRef.current, envelope(progress, MOUTH_ATTACK_END, MOUTH_RELEASE_START) * BOSS_SKILL_VFX_STYLE.MAX_CORE_OPACITY);
    }
    if (!isAlive) return;

    writer.facing.copy(camera.quaternion);
    const emitStartMs = EMIT_START * durationMs;
    const emitEndMs = EMIT_END * durationMs;

    for (let index = 0; index < JET_PUFF_COUNT; index += 1) {
      const randomBase = index * RANDOMS_PER_PARTICLE;
      const age = fract(elapsedMs / PUFF_LIFE_MS + index / JET_PUFF_COUNT);
      const spawnMs = elapsedMs - age * PUFF_LIFE_MS;
      if (spawnMs < emitStartMs || spawnMs > emitEndMs) {
        hideGlowParticle(writer, index);
        continue;
      }
      const sweepAt = easeInOutSine((spawnMs - emitStartMs) / (emitEndMs - emitStartMs));
      const aimX = sweep.fromX + (sweep.toX - sweep.fromX) * sweepAt;
      const aimZ = sweep.fromZ + (sweep.toZ - sweep.fromZ) * sweepAt;
      const travel = 1 - Math.pow(1 - Math.min(1, age / PUFF_REACH_AGE), PUFF_TRAVEL_EASE_POWER);
      const billow = Math.max(0, age - PUFF_REACH_AGE);
      const spread = age * PUFF_SPREAD * scale;
      position.set(
        jaw.x + (aimX - jaw.x) * travel + (randoms[randomBase] - 0.5) * spread,
        Math.max(
          groundY,
          jaw.y + (groundY - jaw.y) * travel + Math.sin(travel * Math.PI) * PUFF_ARC_HEIGHT + billow * PUFF_BILLOW_RISE,
        ),
        jaw.z + (aimZ - jaw.z) * travel + (randoms[randomBase + 1] - 0.5) * spread,
      );
      const size = scale * (PUFF_START_SIZE + PUFF_GROW * age) * (1 - PUFF_SIZE_JITTER / 2 + randoms[randomBase + 2] * PUFF_SIZE_JITTER);
      writeFireParticle(writer, colors, index, size, age, resolvePuffBrightness(age));
    }

    for (let poolIndex = 0; poolIndex < poolSpots.length; poolIndex += 1) {
      const spot = poolSpots[poolIndex];
      const poolLevel = envelope(phaseProgress(progress, poolStartAt(poolIndex), 1), POOL_ATTACK_END, POOL_RELEASE_START);
      for (let slot = 0; slot < PARTICLES_PER_POOL; slot += 1) {
        const index = JET_PUFF_COUNT + poolIndex * PARTICLES_PER_POOL + slot;
        const randomBase = index * RANDOMS_PER_PARTICLE;
        if (poolLevel <= 0) {
          hideGlowParticle(writer, index);
          continue;
        }
        const isSpark = slot >= FLAMES_PER_POOL;
        const lifeMs = isSpark ? SPARK_LIFE_MS : FLAME_LIFE_MS;
        const age = fract(elapsedMs / lifeMs + randoms[randomBase + 3]);
        const offsetX = (randoms[randomBase] - 0.5) * 2 * FLAME_JITTER_RADIUS * scale;
        const offsetZ = (randoms[randomBase + 1] - 0.5) * 2 * FLAME_JITTER_RADIUS * scale;
        const drift = isSpark ? (randoms[randomBase + 2] - 0.5) * SPARK_DRIFT * age : 0;
        const rise = (isSpark ? SPARK_RISE : FLAME_RISE) * scale * age;
        position.set(spot[0] + offsetX + drift, groundY + rise, spot[1] + offsetZ);
        const size = isSpark ? SPARK_SIZE * scale : FLAME_SIZE * scale * (1 - age * FLAME_SHRINK);
        // Sparks stay white-hot, flames cool along the ramp
        const rampAge = isSpark ? age * RAMP_HOT_END : age;
        writeFireParticle(writer, colors, index, size, rampAge, poolLevel * (1 - age));
      }
    }

    flushGlowParticles(mesh);
  });

  return (
    <group>
      <group ref={mouthRef} position={mouthOrigin} visible={false}>
        <GlowSprite color={color} opacityScale={BOSS_SKILL_VFX_STYLE.LAYER_OPACITY.GLOW} />
        <group scale={MOUTH_CORE_RATIO}>
          <GlowSprite color={BOSS_SKILL_VFX_STYLE.CORE_COLOR} />
        </group>
      </group>
      <primitive object={mesh} />
      {poolSpots.map((spot, poolIndex) => (
        <ImpactBurst
          key={`fire-pool-${poolIndex}`}
          color={color}
          secondaryColor={secondaryColor}
          position={[spot[0], BOSS_3D_ANCHORS.GROUND_Y, spot[1]]}
          size={POOL_BURST_SIZE * scale}
          startedAt={startedAt}
          durationMs={durationMs}
          start={poolStartAt(poolIndex)}
          end={1}
        />
      ))}
    </group>
  );
};
