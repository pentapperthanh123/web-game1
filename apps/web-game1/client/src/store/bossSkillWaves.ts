import { BOSS_ULTIMATE_WAVES } from '../constants/bossSkillBalance';
import {
  BOSS_SKILL_VFX_DURATION_MS,
  BOSS_SKILL_VFX_IMPACT_RATIO,
  getSkillImpactDelayMs,
} from '../constants/bossSkillVfx';
import { BossSkillDefinition } from '../types/bossSkill';

export interface SkillImpactWave {
  /** Time after the cast at which the wave reaches the champions. */
  delayMs: number;
  /** Share of the skill's total damage this wave deals. */
  damageShare: number;
  /** The earliest wave also carries the debuff and the one-off sound. */
  isFirst: boolean;
}

const SINGLE_WAVE_SHARE = 1;

const buildSingleWave = (skill: BossSkillDefinition): SkillImpactWave[] => [
  { delayMs: getSkillImpactDelayMs(skill.vfxType, skill.vfxParams), damageShare: SINGLE_WAVE_SHARE, isFirst: true },
];

/**
 * When and how hard each part of a skill hurts. Regular skills hurt once, when the effect reaches the
 * champions. An ultimate built from several layers (meteors, bolts, a closing nova...) hurts once per
 * layer, at the moment that layer lands: the main layer takes MAIN_WAVE_SHARE, the others split the rest.
 * The total stays the skill's damage, so ultimates are not stronger, only delivered with their visuals.
 */
export const buildSkillImpactWaves = (skill: BossSkillDefinition): SkillImpactWave[] => {
  const layers = skill.isUltimate ? (skill.vfxParams?.layers ?? []) : [];
  if (layers.length === 0) return buildSingleWave(skill);

  const layerShare = (SINGLE_WAVE_SHARE - BOSS_ULTIMATE_WAVES.MAIN_WAVE_SHARE) / layers.length;
  const layerWaves = layers.map((layer) => ({
    delayMs:
      (layer.delayMs ?? 0) +
      Math.round(BOSS_SKILL_VFX_DURATION_MS[layer.vfxType] * BOSS_SKILL_VFX_IMPACT_RATIO[layer.vfxType]),
    damageShare: layerShare,
    isFirst: false,
  }));
  const mainWave: SkillImpactWave = { ...buildSingleWave(skill)[0], damageShare: BOSS_ULTIMATE_WAVES.MAIN_WAVE_SHARE };
  return [mainWave, ...layerWaves]
    .sort((a, b) => a.delayMs - b.delayMs)
    .map((wave, index) => ({ ...wave, isFirst: index === 0 }));
};
