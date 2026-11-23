import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOSS_SKILL_VFX_STYLE } from '../../../../constants/bossSkillVfx';
import {
  BOSS_3D_ANCHORS,
  BossSkillImpactPoint,
  computeProgress,
  easeOutExpo,
  fadeOut,
  phaseProgress,
  seededValues,
  useDisposeOnUnmount,
} from '../bossSkill3DShared';
import {
  GlowParticleWriter,
  commitGlowParticle,
  createGlowParticleMesh,
  createGlowParticleWriter,
  flushGlowParticles,
  hideGlowParticle,
} from '../glowParticles';
import {
  MAELSTROM_BURST,
  MAELSTROM_CORE_POSITION,
  MAELSTROM_DISK,
  MAELSTROM_DRAIN,
  MAELSTROM_RAMP,
  MAELSTROM_TIMELINE,
  MS_PER_SECOND,
  RANDOMS_PER_PARTICLE,
} from './maelstromConstants';

interface MaelstromColors {
  hot: THREE.Color;
  mid: THREE.Color;
  base: THREE.Color;
}

interface ParticleFrame {
  writer: GlowParticleWriter;
  colors: MaelstromColors;
  randoms: readonly number[];
  progress: number;
  seconds: number;
  size: number;
}

const [CORE_X, CORE_Y, CORE_Z] = MAELSTROM_CORE_POSITION;
const DRAIN_START_Y = BOSS_3D_ANCHORS.GROUND_Y + MAELSTROM_DRAIN.START_HEIGHT;
const TILT_SIN = Math.sin(MAELSTROM_DISK.TILT);
const TILT_COS = Math.cos(MAELSTROM_DISK.TILT);
const FULL_TURN = Math.PI * 2;

const fract = (value: number): number => value - Math.floor(value);

/** `heat` 1 = white-hot core, 0 = outer edge in the skill colour. */
const writeHeatColor = (target: THREE.Color, colors: MaelstromColors, heat: number, brightness: number): void => {
  const coolness = 1 - heat;
  if (coolness < MAELSTROM_RAMP.HOT_END) {
    target.lerpColors(colors.hot, colors.mid, coolness / MAELSTROM_RAMP.HOT_END);
  } else if (coolness < MAELSTROM_RAMP.MID_END) {
    target.lerpColors(colors.mid, colors.base, (coolness - MAELSTROM_RAMP.HOT_END) / (MAELSTROM_RAMP.MID_END - MAELSTROM_RAMP.HOT_END));
  } else {
    target.copy(colors.base);
  }
  target.multiplyScalar(brightness * MAELSTROM_RAMP.MAX_BRIGHTNESS);
};

/** Disk strength: forms, holds, then is gone once it has fallen in and detonated. */
const resolveDiskLevel = (progress: number): number => {
  if (progress >= MAELSTROM_TIMELINE.EXPLODE_AT) return 0;
  return easeOutExpo(phaseProgress(progress, 0, MAELSTROM_TIMELINE.FORM_END));
};

/** Disk radius factor: 1 until the collapse, then accelerating into the core. */
const resolveDiskRadiusRatio = (progress: number): number => {
  const collapse = phaseProgress(progress, MAELSTROM_TIMELINE.COLLAPSE_START, MAELSTROM_TIMELINE.EXPLODE_AT);
  return 1 - (1 - MAELSTROM_DISK.COLLAPSED_RADIUS_RATIO) * collapse * collapse;
};

const writeDiskParticles = (frame: ParticleFrame): void => {
  const { writer, randoms, seconds, size } = frame;
  const level = resolveDiskLevel(frame.progress);
  const radiusRatio = resolveDiskRadiusRatio(frame.progress);
  const span = MAELSTROM_DISK.OUTER_RADIUS - MAELSTROM_DISK.INNER_RADIUS;
  for (let index = 0; index < MAELSTROM_DISK.PARTICLE_COUNT; index += 1) {
    const randomBase = index * RANDOMS_PER_PARTICLE;
    if (level <= 0) {
      hideGlowParticle(writer, index);
      continue;
    }
    const drift = fract(randoms[randomBase] + seconds * MAELSTROM_DISK.DRIFT_PER_SECOND);
    const radius = (MAELSTROM_DISK.OUTER_RADIUS - span * drift) * size * radiusRatio;
    const closeness = MAELSTROM_DISK.INNER_RADIUS / (MAELSTROM_DISK.OUTER_RADIUS - span * drift);
    const armAngle = ((index % MAELSTROM_DISK.ARM_COUNT) / MAELSTROM_DISK.ARM_COUNT) * FULL_TURN + (randoms[randomBase + 1] - 0.5) * MAELSTROM_DISK.ARM_JITTER;
    const angle =
      armAngle +
      drift * MAELSTROM_DISK.SPIRAL_TWIST +
      seconds * MAELSTROM_DISK.ORBIT_SPEED * Math.pow(closeness, MAELSTROM_DISK.ORBIT_FALLOFF_POWER);
    const localX = Math.cos(angle) * radius;
    const localZ = Math.sin(angle) * radius;
    const lift = (randoms[randomBase + 2] - 0.5) * MAELSTROM_DISK.HEIGHT_JITTER * size;
    writer.position.set(CORE_X + localX, CORE_Y + lift - localZ * TILT_SIN, CORE_Z + localZ * TILT_COS);
    const fadeIn = Math.min(1, drift / MAELSTROM_DISK.FADE_IN_SPAN);
    const fadeAway = drift > MAELSTROM_DISK.FADE_OUT_START ? (1 - drift) / (1 - MAELSTROM_DISK.FADE_OUT_START) : 1;
    const brightness = level * fadeIn * fadeAway * (MAELSTROM_DISK.MIN_BRIGHTNESS + (1 - MAELSTROM_DISK.MIN_BRIGHTNESS) * closeness);
    writeHeatColor(writer.color, frame.colors, closeness, brightness);
    commitGlowParticle(writer, index, (MAELSTROM_DISK.MIN_SIZE + randoms[randomBase + 3] * MAELSTROM_DISK.SIZE_RANGE) * size);
  }
};

const writeDrainParticles = (frame: ParticleFrame, points: readonly BossSkillImpactPoint[], firstIndex: number): void => {
  const { writer, randoms, seconds, progress, size } = frame;
  const isDraining = progress >= MAELSTROM_TIMELINE.DRAIN_START && progress < MAELSTROM_TIMELINE.DRAIN_END;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    const [startX, startZ] = points[pointIndex];
    for (let slot = 0; slot < MAELSTROM_DRAIN.PER_POINT; slot += 1) {
      const index = firstIndex + pointIndex * MAELSTROM_DRAIN.PER_POINT + slot;
      const randomBase = index * RANDOMS_PER_PARTICLE;
      if (!isDraining) {
        hideGlowParticle(writer, index);
        continue;
      }
      const age = fract((seconds * MS_PER_SECOND) / MAELSTROM_DRAIN.LIFE_MS + slot / MAELSTROM_DRAIN.PER_POINT + randoms[randomBase]);
      const pull = Math.pow(age, MAELSTROM_DRAIN.ACCELERATION_POWER);
      const curlAngle = randoms[randomBase + 1] * FULL_TURN + pull * MAELSTROM_DRAIN.CURL_TURNS * FULL_TURN;
      const curl = Math.sin(pull * Math.PI) * MAELSTROM_DRAIN.CURL_RADIUS * size;
      writer.position.set(
        startX + (CORE_X - startX) * pull + Math.cos(curlAngle) * curl,
        DRAIN_START_Y + (CORE_Y - DRAIN_START_Y) * pull + Math.sin(curlAngle) * curl * MAELSTROM_DRAIN.CURL_VERTICAL_RATIO,
        startZ + (CORE_Z - startZ) * pull + Math.sin(curlAngle) * curl,
      );
      writeHeatColor(writer.color, frame.colors, pull, Math.sin(age * Math.PI));
      commitGlowParticle(writer, index, (MAELSTROM_DRAIN.MIN_SIZE + MAELSTROM_DRAIN.SIZE_GROW * pull) * size);
    }
  }
};

const writeBurstParticles = (frame: ParticleFrame, firstIndex: number): void => {
  const { writer, randoms, progress, size } = frame;
  const local = phaseProgress(progress, MAELSTROM_TIMELINE.EXPLODE_AT, 1);
  for (let slot = 0; slot < MAELSTROM_BURST.PARTICLE_COUNT; slot += 1) {
    const index = firstIndex + slot;
    const randomBase = index * RANDOMS_PER_PARTICLE;
    if (local <= 0 || local >= 1) {
      hideGlowParticle(writer, index);
      continue;
    }
    const angle = (slot / MAELSTROM_BURST.PARTICLE_COUNT) * FULL_TURN + randoms[randomBase];
    const distance = easeOutExpo(local) * (MAELSTROM_BURST.MIN_SPEED + randoms[randomBase + 1] * MAELSTROM_BURST.SPEED_RANGE) * size;
    const vertical = (randoms[randomBase + 2] - 0.5) * 2 * MAELSTROM_BURST.VERTICAL_RATIO;
    writer.position.set(CORE_X + Math.cos(angle) * distance, CORE_Y + vertical * distance, CORE_Z + Math.sin(angle) * distance * TILT_COS);
    writeHeatColor(writer.color, frame.colors, 1 - local, fadeOut(local));
    commitGlowParticle(writer, index, MAELSTROM_BURST.SIZE * size * (1 - local * MAELSTROM_BURST.SHRINK));
  }
};

interface MaelstromParticlesProps {
  color: string;
  secondaryColor: string;
  size: number;
  startedAt: number;
  durationMs: number;
  drainPoints: readonly BossSkillImpactPoint[];
}

/** Accretion disk + drain streams + detonation sparks: one instanced draw call. */
export const MaelstromParticles = ({ color, secondaryColor, size, startedAt, durationMs, drainPoints }: MaelstromParticlesProps) => {
  const drainCount = drainPoints.length * MAELSTROM_DRAIN.PER_POINT;
  const burstStart = MAELSTROM_DISK.PARTICLE_COUNT + drainCount;
  const particleCount = burstStart + MAELSTROM_BURST.PARTICLE_COUNT;

  const glowMesh = useMemo(() => createGlowParticleMesh(particleCount), [particleCount]);
  const disposables = useMemo(() => [glowMesh.mesh, glowMesh.material], [glowMesh]);
  useDisposeOnUnmount(disposables);

  const frame = useMemo<ParticleFrame>(
    () => ({
      writer: createGlowParticleWriter(glowMesh.mesh),
      colors: {
        hot: new THREE.Color(BOSS_SKILL_VFX_STYLE.CORE_COLOR),
        mid: new THREE.Color(secondaryColor),
        base: new THREE.Color(color),
      },
      randoms: seededValues(startedAt, particleCount * RANDOMS_PER_PARTICLE),
      progress: 0,
      seconds: 0,
      size,
    }),
    [glowMesh, color, secondaryColor, startedAt, particleCount, size],
  );

  useFrame(({ camera }) => {
    const progress = computeProgress(startedAt, durationMs);
    glowMesh.mesh.visible = progress > 0 && progress < 1;
    if (!glowMesh.mesh.visible) return;
    frame.progress = progress;
    frame.seconds = (progress * durationMs) / MS_PER_SECOND;
    frame.writer.facing.copy(camera.quaternion);
    writeDiskParticles(frame);
    writeDrainParticles(frame, drainPoints, MAELSTROM_DISK.PARTICLE_COUNT);
    writeBurstParticles(frame, burstStart);
    flushGlowParticles(glowMesh.mesh);
  });

  return <primitive object={glowMesh.mesh} />;
};
