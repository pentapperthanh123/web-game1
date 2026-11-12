import {
  BossPhase,
  BossSkillConfig,
  BossSkillDefinition,
  BossSkillStatusEffect,
} from '../types/bossSkill';
import { ActiveStatusEffect, DefeatedChampionEntity, MinionEntity } from '../types/game';
import { BOSS_SKILL_MODES } from '../constants/bossSkills';
import { BOSS_SKILL_BASE_WEIGHTS, getBossPhaseRule } from '../constants/bossPhases';
import {
  CHAMPION_BOUND_STATUS_EFFECTS,
  STATUS_EFFECT_PRESENTATION,
} from '../constants/bossStatusEffects';
import { COMBAT_VFX_CONSTANTS, TEAM_KEY, TeamType } from '../constants/game';

const ALL_TARGETS_COUNT = 999;

interface PickSkillInput {
  skills: BossSkillDefinition[];
  config: BossSkillConfig;
  phase: BossPhase;
  rotationIndex: number;
  requestedIndex?: number;
}

/** Skills the boss may use now: ultimate (and anything with `minPhase`) gated by phase lock. */
export const getCastableSkillIndexes = (
  skills: BossSkillDefinition[],
  phase: BossPhase,
  isPhaseLockEnabled: boolean
): number[] => {
  const indexes = skills.map((_, index) => index);
  if (!isPhaseLockEnabled) return indexes;
  return indexes.filter((index) => (skills[index].minPhase ?? 1) <= phase);
};

const pickWeightedIndex = (castable: number[], skills: BossSkillDefinition[], phase: BossPhase): number => {
  const ultimateIndexes = castable.filter((index) => skills[index].isUltimate);
  const regularIndexes = castable.filter((index) => !skills[index].isUltimate);
  const ultimateChance = ultimateIndexes.length > 0 ? getBossPhaseRule(phase).ultimateChance : 0;

  if (Math.random() < ultimateChance) {
    return ultimateIndexes[Math.floor(Math.random() * ultimateIndexes.length)];
  }
  if (regularIndexes.length === 0) return castable[0];

  const weights = regularIndexes.map((_, order) => BOSS_SKILL_BASE_WEIGHTS[order] ?? 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * totalWeight;
  for (let order = 0; order < regularIndexes.length; order += 1) {
    roll -= weights[order];
    if (roll <= 0) return regularIndexes[order];
  }
  return regularIndexes[regularIndexes.length - 1];
};

/** Resolves which skill index to cast, honouring an explicit admin request, the mode and the phase. */
export const pickBossSkillIndex = ({
  skills,
  config,
  phase,
  rotationIndex,
  requestedIndex,
}: PickSkillInput): number => {
  const castable = getCastableSkillIndexes(skills, phase, config.phaseLockEnabled);
  if (castable.length === 0) return 0;

  const isExplicitRequest =
    requestedIndex !== undefined && requestedIndex >= 0 && requestedIndex < skills.length;
  if (isExplicitRequest) return requestedIndex;

  if (config.mode === BOSS_SKILL_MODES.ROTATION) {
    return castable[rotationIndex % castable.length];
  }
  if (config.mode === BOSS_SKILL_MODES.RANDOM_EQUAL) {
    return castable[Math.floor(Math.random() * castable.length)];
  }
  return pickWeightedIndex(castable, skills, phase);
};

/** Picks the champion ids a skill will hit (newly summoned champions are excluded upstream). */
export const pickSkillTargets = (vulnerableMinions: MinionEntity[], targetCount: number): Set<string> => {
  if (targetCount >= ALL_TARGETS_COUNT) {
    return new Set(vulnerableMinions.map((minion) => minion.id));
  }
  const shuffled = [...vulnerableMinions].sort(() => Math.random() - 0.5);
  return new Set(shuffled.slice(0, targetCount).map((minion) => minion.id));
};

export type SkillTargetTeam = TeamType | 'ALL';

/** Which side the boss turns toward: the team holding most of the targeted champions. */
export const resolveSkillTargetTeam = (
  minions: MinionEntity[],
  targetedMinionIds: Set<string>,
  isUltimate: boolean
): SkillTargetTeam => {
  if (isUltimate || targetedMinionIds.size === 0) return 'ALL';
  const targeted = minions.filter((minion) => targetedMinionIds.has(minion.id));
  const blgCount = targeted.filter((minion) => minion.team === TEAM_KEY.BLG).length;
  const gengCount = targeted.filter((minion) => minion.team === TEAM_KEY.GENG).length;
  if (blgCount > gengCount) return TEAM_KEY.BLG;
  if (gengCount > blgCount) return TEAM_KEY.GENG;
  return 'ALL';
};

/** Builds the champion-side debuff instance, or null for boss-side effects such as LIFESTEAL. */
export const buildChampionStatusEffect = (
  effect: BossSkillStatusEffect | undefined,
  sourceSkillId: string,
  phase: BossPhase,
  now: number
): ActiveStatusEffect | null => {
  if (!effect || !CHAMPION_BOUND_STATUS_EFFECTS.includes(effect.type)) return null;
  const durationMs = Math.round(effect.durationMs * getBossPhaseRule(phase).statusDurationMultiplier);
  return {
    type: effect.type,
    sourceSkillId,
    color: STATUS_EFFECT_PRESENTATION[effect.type].color,
    appliedAt: now,
    expiresAt: now + durationMs,
    tickDamage: effect.tickDamage,
    lastTickAt: now,
  };
};

export const buildDefeatedChampion = (
  minion: MinionEntity,
  worldPosition: [number, number, number],
  screenX: number,
  screenY: number,
  killerName: string,
  now: number
): DefeatedChampionEntity => ({
  id: `defeat-${now}-${Math.random().toString(36).substring(2, 6)}`,
  championName: minion.championName,
  summonerName: minion.summonerName,
  avatarUrl: minion.avatarUrl,
  team: minion.team,
  position: worldPosition,
  screenX,
  screenY,
  killerName,
  createdAt: now,
  durationMs: COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.DEFEAT_DURATION_MS,
});
