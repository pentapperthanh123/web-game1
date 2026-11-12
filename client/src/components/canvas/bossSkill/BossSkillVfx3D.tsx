import { useEffect, useState, type ReactElement } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { BOSS_SKILL_VFX, BossSkillVfxType } from '../../../types/bossSkill';
import { BOSS_STATUS } from '../../../constants/game';
import { SkillVfx3DProps, buildSkillVfx3DProps } from './bossSkill3DShared';
import { ProjectileArc3D } from './ProjectileArc3D';
import { GroundSpikes3D } from './GroundSpikes3D';
import { CrescentSweep3D } from './CrescentSweep3D';
import { LightningStrike3D } from './LightningStrike3D';
import { Beam3D } from './Beam3D';
import { Vortex3D } from './Vortex3D';
import { ChargeDash3D } from './ChargeDash3D';
import { SeismicSlam3D } from './SeismicSlam3D';
import { Nova3D } from './Nova3D';

type SkillVfx3DComponent = (props: SkillVfx3DProps) => ReactElement;

/** METEOR_RAIN has no entry: the store spawns `activeMeteors`, which `MeteorShower3D` renders. */
const VFX_COMPONENT_MAP: Readonly<Partial<Record<BossSkillVfxType, SkillVfx3DComponent>>> = {
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: ProjectileArc3D,
  [BOSS_SKILL_VFX.GROUND_SPIKES]: GroundSpikes3D,
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: CrescentSweep3D,
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: LightningStrike3D,
  [BOSS_SKILL_VFX.BEAM]: Beam3D,
  [BOSS_SKILL_VFX.VORTEX]: Vortex3D,
  [BOSS_SKILL_VFX.CHARGE_DASH]: ChargeDash3D,
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: SeismicSlam3D,
  [BOSS_SKILL_VFX.NOVA]: Nova3D,
};

/** Mounts only the archetype of the skill just cast, and unmounts it once its window closes. */
export const BossSkillVfx3D = () => {
  const activeBossSkillBanner = useGameStore((state) => state.activeBossSkillBanner);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  useEffect(() => {
    if (!activeBossSkillBanner) {
      setIsWindowOpen(false);
      return;
    }
    const vfxProps = buildSkillVfx3DProps(activeBossSkillBanner, activeBossSkillBanner.vfxType);
    const remainingMs = vfxProps.durationMs - (Date.now() - vfxProps.startedAt);
    if (remainingMs <= 0) {
      setIsWindowOpen(false);
      return;
    }
    setIsWindowOpen(true);
    const timer = setTimeout(() => setIsWindowOpen(false), remainingMs);
    return () => clearTimeout(timer);
  }, [activeBossSkillBanner]);

  if (!isWindowOpen || !activeBossSkillBanner || bossStatus === BOSS_STATUS.DEFEATED) return null;

  const VfxComponent = VFX_COMPONENT_MAP[activeBossSkillBanner.vfxType];
  if (!VfxComponent) return null;

  return (
    <VfxComponent
      key={activeBossSkillBanner.timestamp}
      {...buildSkillVfx3DProps(activeBossSkillBanner, activeBossSkillBanner.vfxType)}
    />
  );
};
