import {
  BossPhase,
  BossSkillConfig,
  BossSkillDefinition,
  BossSkillImpactPoint,
  BossSkillStatusEffect,
} from '../types/bossSkill';
import {
  BOSS_SKILL_HIT_AREA,
  BOSS_SKILL_HIT_RULES,
  BOSS_SKILL_VFX_HIT_AREA,
  BossSkillHitArea,
} from '../constants/bossSkillVfx';
import { ActiveStatusEffect, DefeatedChampionEntity, MinionEntity } from '../types/game';
import { BOSS_SKILL_MODES } from '../constants/bossSkills';
import { BOSS_SKILL_BASE_WEIGHTS, getBossPhaseRule } from '../constants/bossPhases';
import {
  CHAMPION_BOUND_STATUS_EFFECTS,
  STATUS_EFFECT_PRESENTATION,
} from '../constants/bossStatusEffects';
import { COMBAT_VFX_CONSTANTS, TEAM_KEY, TeamType } from '../constants/game';
import { resolveDotTickDamage, resolveSkillTargetCount } from '../constants/bossSkillBalance';


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

export type SkillTargetTeam = TeamType | 'ALL';

export interface SkillHit {
  targetedMinionIds: Set<string>;
  /** Side the boss attacks (drives its facing, its lunge and the VFX direction). */
  targetTeam: SkillTargetTeam;
  impactPoints: BossSkillImpactPoint[];
}

type MinionPositionReader = (minion: MinionEntity) => readonly [number, number, number];

const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

/** The wing under attack: the one that has champions, or a coin flip when both (or neither) do. */
const pickAttackedSide = (vulnerableMinions: readonly MinionEntity[]): TeamType => {
  const hasLeft = vulnerableMinions.some((minion) => minion.team === TEAM_KEY.BLG);
  const hasRight = vulnerableMinions.some((minion) => minion.team === TEAM_KEY.GENG);
  if (hasLeft && !hasRight) return TEAM_KEY.BLG;
  if (hasRight && !hasLeft) return TEAM_KEY.GENG;
  return Math.random() < 0.5 ? TEAM_KEY.BLG : TEAM_KEY.GENG;
};

const [BOSS_FLOOR_X, , BOSS_FLOOR_Z] = COMBAT_VFX_CONSTANTS.BOSS_TARGET;

/** Distance to the boss on the floor plane: depth counts too, a champion far behind is not "near". */
const distanceFromBoss = (position: readonly [number, number, number]): number =>
  Math.hypot(position[0] - BOSS_FLOOR_X, position[2] - BOSS_FLOOR_Z);

const byDistanceFromBoss =
  (readPosition: MinionPositionReader) =>
  (a: MinionEntity, b: MinionEntity): number =>
    distanceFromBoss(readPosition(a)) - distanceFromBoss(readPosition(b));

/** The champions inside a sweep's horizontal reach (before the target count is applied). */
const getMinionsInSweepReach = (
  minions: readonly MinionEntity[],
  readPosition: MinionPositionReader
): MinionEntity[] =>
  minions.filter((minion) => Math.abs(readPosition(minion)[0]) <= BOSS_SKILL_HIT_RULES.SWEEP_REACH_X);

interface AreaPickInput {
  minions: readonly MinionEntity[];
  skill: BossSkillDefinition;
  readPosition: MinionPositionReader;
}

const pickNearest = ({ minions, skill, readPosition }: AreaPickInput): MinionEntity[] =>
  [...minions].sort(byDistanceFromBoss(readPosition)).slice(0, resolveSkillTargetCount(skill, minions.length));

const pickRandom = ({ minions, skill }: AreaPickInput): MinionEntity[] =>
  shuffle(minions).slice(0, resolveSkillTargetCount(skill, minions.length));

/**
 * Who gets hit inside the attacked area, per hit-area kind. The count follows the skill's target count
 * and the crowd (see resolveSkillTargetCount); a sweep only counts the champions it can reach.
 */
const AREA_PICKERS: Readonly<Record<BossSkillHitArea, (input: AreaPickInput) => MinionEntity[]>> = {
  [BOSS_SKILL_HIT_AREA.SIDE]: pickRandom,
  [BOSS_SKILL_HIT_AREA.SIDE_REACH]: ({ minions, skill, readPosition }) =>
    pickNearest({ minions: getMinionsInSweepReach(minions, readPosition), skill, readPosition }),
  [BOSS_SKILL_HIT_AREA.SIDE_NEAREST]: pickNearest,
  [BOSS_SKILL_HIT_AREA.CENTER]: pickNearest,
  [BOSS_SKILL_HIT_AREA.ARENA]: pickRandom,
};

const ONE_SIDED_AREAS: ReadonlySet<BossSkillHitArea> = new Set([
  BOSS_SKILL_HIT_AREA.SIDE,
  BOSS_SKILL_HIT_AREA.SIDE_REACH,
  BOSS_SKILL_HIT_AREA.SIDE_NEAREST,
]);

/**
 * Picks who a skill hurts so damage always matches where its effect is drawn (see BOSS_SKILL_VFX_HIT_AREA):
 * one-sided skills only hurt the attacked wing, centre skills the champions nearest the boss,
 * ultimates everyone. Newly summoned champions are excluded upstream.
 */
export const pickSkillHit = (
  vulnerableMinions: readonly MinionEntity[],
  skill: BossSkillDefinition,
  readPosition: MinionPositionReader
): SkillHit => {
  const area = skill.isUltimate ? BOSS_SKILL_HIT_AREA.ARENA : BOSS_SKILL_VFX_HIT_AREA[skill.vfxType];
  const isOneSided = ONE_SIDED_AREAS.has(area);
  const attackedSide = isOneSided ? pickAttackedSide(vulnerableMinions) : null;
  const minionsInArea = attackedSide
    ? vulnerableMinions.filter((minion) => minion.team === attackedSide)
    : vulnerableMinions;
  const targets = AREA_PICKERS[area]({ minions: minionsInArea, skill, readPosition });

  return {
    targetedMinionIds: new Set(targets.map((minion) => minion.id)),
    targetTeam: attackedSide ?? 'ALL',
    impactPoints: targets.slice(0, BOSS_SKILL_HIT_RULES.MAX_IMPACT_POINTS).map((minion) => {
      const position = readPosition(minion);
      return [position[0], position[2]] as const;
    }),
  };
};

/**
 * Builds the champion-side debuff instance, or null for boss-side effects such as LIFESTEAL.
 * Burn / poison damage is a share of `hitDamage` (the full hit, before any wave split), so it follows
 * the same multipliers as the hit; a longer phase-3 effect spreads the same total over more ticks.
 */
export const buildChampionStatusEffect = (
  effect: BossSkillStatusEffect | undefined,
  sourceSkillId: string,
  phase: BossPhase,
  now: number,
  hitDamage: number
): ActiveStatusEffect | null => {
  if (!effect || !CHAMPION_BOUND_STATUS_EFFECTS.includes(effect.type)) return null;
  const durationMs = Math.round(effect.durationMs * getBossPhaseRule(phase).statusDurationMultiplier);
  const tickDamage = effect.dotRatio ? resolveDotTickDamage(hitDamage, effect.dotRatio, durationMs) : undefined;
  return {
    type: effect.type,
    sourceSkillId,
    color: STATUS_EFFECT_PRESENTATION[effect.type].color,
    appliedAt: now,
    expiresAt: now + durationMs,
    tickDamage,
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
