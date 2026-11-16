import React from 'react';
import { useGameStore } from '../../../store/gameStore';
import { BOSS_SKILL_VFX, BossSkillVfxType } from '../../../types/bossSkill';
import { SkillVfx2DProps, buildSkillVfxProps, useSkillVfxWindow } from './skillVfxShared';
import { CrescentSweep2D } from './CrescentSweep2D';
import { MeteorRain2D } from './MeteorRain2D';
import { Beam2D } from './Beam2D';
import { Vortex2D } from './Vortex2D';
import { ChargeDash2D } from './ChargeDash2D';
import { SeismicSlam2D } from './SeismicSlam2D';
import { Nova2D } from './Nova2D';

/**
 * Archetypes whose 3D effect lands exactly on the hurt champions (bolts, orbs, spikes, chain lightning)
 * have no 2D copy: the 2D layer cannot follow champion positions and would show hits where nobody is hurt.
 */
const VFX_COMPONENT_MAP: Readonly<Partial<Record<BossSkillVfxType, React.FC<SkillVfx2DProps>>>> = {
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: CrescentSweep2D,
  [BOSS_SKILL_VFX.METEOR_RAIN]: MeteorRain2D,
  [BOSS_SKILL_VFX.BEAM]: Beam2D,
  [BOSS_SKILL_VFX.VORTEX]: Vortex2D,
  [BOSS_SKILL_VFX.CHARGE_DASH]: ChargeDash2D,
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: SeismicSlam2D,
  [BOSS_SKILL_VFX.NOVA]: Nova2D,
};

/** Renders the 2D overlay matching the archetype of the skill the boss just cast. */
export const BossSkillVfx2D: React.FC = () => {
  const isSilverScrapesActive = useGameStore((state) => state.silverScrapesState.isActive);
  const activeBossSkillBanner = useGameStore((state) => state.activeBossSkillBanner);
  const isActive = useSkillVfxWindow(activeBossSkillBanner);

  if (isSilverScrapesActive || !isActive || !activeBossSkillBanner) return null;

  const VfxComponent = VFX_COMPONENT_MAP[activeBossSkillBanner.vfxType];
  if (!VfxComponent) return null;
  const vfxProps = buildSkillVfxProps(activeBossSkillBanner, activeBossSkillBanner.vfxType);

  return <VfxComponent key={activeBossSkillBanner.timestamp} {...vfxProps} />;
};
