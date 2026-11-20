import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { BOSS_SKILL_VFX, BossSkillVfxType } from '../../../types/bossSkill';
import { BOSS_STATUS } from '../../../constants/game';
import { getSkillVfxWindowMs } from '../../../constants/bossSkillVfx';
import {
  CancelTimer,
  isRenderThrottled,
  workerSetTimeout,
} from '../../../services/workerScheduler';
import { SkillVfx3DProps, buildSkillVfx3DProps, buildSkillVfxLayerProps } from './bossSkill3DShared';
import { ProjectileArc3D } from './ProjectileArc3D';
import { GroundSpikes3D } from './GroundSpikes3D';
import { CrescentSweep3D } from './CrescentSweep3D';
import { LightningStrike3D } from './LightningStrike3D';
import { Beam3D } from './Beam3D';
import { Vortex3D } from './Vortex3D';
import { ChargeDash3D } from './ChargeDash3D';
import { SeismicSlam3D } from './SeismicSlam3D';
import { Nova3D } from './Nova3D';
import { ChainLightning3D } from './ChainLightning3D';
import { FireBreath3D } from './FireBreath3D';
import { VoidMaelstrom3D } from './VoidMaelstrom3D';

type SkillVfx3DComponent = (props: SkillVfx3DProps) => ReactElement;

/** METEOR_RAIN has no entry: the store spawns `activeMeteors`, which `MeteorShower3D` renders. */
const VFX_COMPONENT_MAP: Readonly<Partial<Record<BossSkillVfxType, SkillVfx3DComponent>>> = {
  [BOSS_SKILL_VFX.FIRE_BREATH]: FireBreath3D,
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: ProjectileArc3D,
  [BOSS_SKILL_VFX.GROUND_SPIKES]: GroundSpikes3D,
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: CrescentSweep3D,
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: LightningStrike3D,
  [BOSS_SKILL_VFX.BEAM]: Beam3D,
  [BOSS_SKILL_VFX.VORTEX]: Vortex3D,
  [BOSS_SKILL_VFX.VOID_MAELSTROM]: VoidMaelstrom3D,
  [BOSS_SKILL_VFX.CHARGE_DASH]: ChargeDash3D,
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: SeismicSlam3D,
  [BOSS_SKILL_VFX.NOVA]: Nova3D,
  [BOSS_SKILL_VFX.CHAIN_LIGHTNING]: ChainLightning3D,
};

interface SkillVfxLayerMountProps {
  vfxProps: SkillVfx3DProps;
  Component: SkillVfx3DComponent;
}

/**
 * Frames the page paints before a cast's 3D effects mount. The first WebGL frame of a heavy ultimate
 * (shader compiles, many meshes) can block the main thread for a long time; the DOM callout
 * ("CHIÊU CUỐI!" + skill name) must reach the compositor first so its transform/opacity animation
 * keeps playing through that stall instead of being skipped.
 */
const PAINT_FRAMES_BEFORE_MOUNT = 2;

/** Runs `callback` after `frameCount` animation frames (or immediately via Worker when throttled); returns a cancel function. */
const runAfterFrames = (frameCount: number, callback: () => void): (() => void) => {
  if (isRenderThrottled() || typeof requestAnimationFrame !== 'function') {
    return workerSetTimeout(callback, 0);
  }

  let frameId = 0;
  let isCancelled = false;
  const waitFrames = (framesLeft: number): void => {
    frameId = requestAnimationFrame(() => {
      if (isCancelled) return;
      if (framesLeft <= 1) {
        callback();
        return;
      }
      waitFrames(framesLeft - 1);
    });
  };
  waitFrames(frameCount);
  return () => {
    isCancelled = true;
    cancelAnimationFrame(frameId);
  };
};

/** Mounts one archetype (main VFX or extra layer) only while its own clip plays. */
const SkillVfxLayerMount = ({ vfxProps, Component }: SkillVfxLayerMountProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Compute timing inside the effect so it is stable across renders and never triggers re-runs
    const now = Date.now();
    const startDelayMs = Math.max(0, vfxProps.startedAt - now);
    const elapsedMs = Math.max(0, now - vfxProps.startedAt);
    const remainingDurationMs = Math.max(0, vfxProps.durationMs - elapsedMs);

    // Already expired — do not mount at all
    if (remainingDurationMs <= 0) {
      setIsPlaying(false);
      return;
    }

    let cancelFrames: (() => void) | null = null;
    let cancelStartTimer: CancelTimer | null = null;

    if (startDelayMs > 0) {
      cancelStartTimer = workerSetTimeout(() => {
        cancelFrames = runAfterFrames(PAINT_FRAMES_BEFORE_MOUNT, () => setIsPlaying(true));
      }, startDelayMs);
    } else {
      // Effect should already be playing — mount instantly (no RAF wait)
      setIsPlaying(true);
    }

    const cancelEndTimer = workerSetTimeout(() => setIsPlaying(false), remainingDurationMs);

    return () => {
      cancelStartTimer?.();
      cancelEndTimer();
      cancelFrames?.();
    };
  }, [vfxProps.startedAt, vfxProps.durationMs]);

  return isPlaying ? <Component {...vfxProps} /> : null;
};

/** Mounts the archetype of the skill just cast plus its extra layers, and unmounts them once the cast is over. */
export const BossSkillVfx3D = () => {
  const isSilverScrapesActive = useGameStore((state) => state.silverScrapesState.isActive);
  const activeBossSkillBanner = useGameStore((state) => state.activeBossSkillBanner);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  useEffect(() => {
    if (!activeBossSkillBanner) {
      setIsWindowOpen(false);
      return;
    }
    const windowMs = getSkillVfxWindowMs(activeBossSkillBanner.vfxType, activeBossSkillBanner.vfxParams);
    const remainingMs = windowMs - (Date.now() - activeBossSkillBanner.timestamp);
    if (remainingMs <= 0) {
      setIsWindowOpen(false);
      return;
    }
    setIsWindowOpen(true);
    return workerSetTimeout(() => setIsWindowOpen(false), remainingMs);
  }, [activeBossSkillBanner]);

  // Anchors are read once per cast: the boss keeps patrolling, but the attack leaves from where it was
  const castVfxProps = useMemo(() => {
    if (!activeBossSkillBanner) return null;
    return buildSkillVfx3DProps(activeBossSkillBanner, activeBossSkillBanner.vfxType);
  }, [activeBossSkillBanner]);

  if (
    isSilverScrapesActive ||
    !isWindowOpen ||
    !activeBossSkillBanner ||
    !castVfxProps ||
    bossStatus === BOSS_STATUS.DEFEATED
  )
    return null;

  const MainComponent = VFX_COMPONENT_MAP[activeBossSkillBanner.vfxType];
  const layers = activeBossSkillBanner.vfxParams?.layers ?? [];

  return (
    <group key={activeBossSkillBanner.timestamp}>
      {MainComponent && <SkillVfxLayerMount vfxProps={castVfxProps} Component={MainComponent} />}
      {layers.map((layer, index) => {
        const LayerComponent = VFX_COMPONENT_MAP[layer.vfxType];
        if (!LayerComponent) return null;
        return (
          <SkillVfxLayerMount
            key={`${layer.vfxType}-${index}`}
            vfxProps={buildSkillVfxLayerProps(castVfxProps, layer)}
            Component={LayerComponent}
          />
        );
      })}
    </group>
  );
};
