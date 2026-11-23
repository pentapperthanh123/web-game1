import { StoreApi } from 'zustand';
import { CHAMPION_DEFAULT_MAX_HP } from '../constants/bossSkills';
import { BOSS_ULTIMATE_WAVES } from '../constants/bossSkillBalance';
import { STATUS_EFFECT_PRESENTATION } from '../constants/bossStatusEffects';
import { CHAMPION_HIT_FEEDBACK } from '../constants/bossSkillVfx';
import { COMBAT_VFX_CONSTANTS, TEAM_KEY } from '../constants/game';
import { emitChampionHit } from '../services/championHitFeedback';
import { getLiveMinionPositionSnapshot, getLiveMinionScreenPos } from '../services/minionPositionRegistry';
import { BOSS_STATUS_EFFECT, BOSS_SKILL_VFX, BossSkillDefinition } from '../types/bossSkill';
import { ActiveStatusEffect, DefeatedChampionEntity, GameState, MinionEntity } from '../types/game';
import { audioService } from '../services/audioService';
import { upsertStatusEffect } from '../utils/statusEffects';
import { buildDefeatedChampion } from './bossSkillResolver';
import { announceChampionDeaths } from './combatMomentStore';
import { rebuildMinionCollections } from './minionMapHelpers';
import { isCurrentRoundIntroActive } from './roundIntroStore';
import { isBattleHalted } from './storeHelpers';
import { deployQueuedMinions, resolveSummonTurnLimits } from './summonQueueHelper';

type SetGameState = StoreApi<GameState>['setState'];
type GetGameState = StoreApi<GameState>['getState'];

/** Boss HP a cast may still restore through lifesteal; shared by every wave of that cast. */
export interface LifestealBudget {
  remainingHp: number;
}

/** Everything decided at cast time that the impact needs once the effect reaches the champions. */
export interface PendingBossSkillImpact {
  skill: BossSkillDefinition;
  /** Damage of this wave (the whole skill's damage for a skill that hurts once). */
  damage: number;
  targetedMinionIds: ReadonlySet<string>;
  /** Only the first wave of a cast carries the debuff. */
  championDebuff: ActiveStatusEffect | null;
  /** The first wave also plays the one-off impact sound. */
  isFirstWave: boolean;
  lifestealBudget: LifestealBudget;
  bossName: string;
}

interface ScreenPoint {
  x: number;
  y: number;
}

const FALLBACK_X_RATIO_BY_TEAM: Readonly<Record<string, number>> = {
  [TEAM_KEY.BLG]: CHAMPION_HIT_FEEDBACK.FALLBACK_LEFT_X_RATIO,
  [TEAM_KEY.GENG]: CHAMPION_HIT_FEEDBACK.FALLBACK_RIGHT_X_RATIO,
};

/** Live on-screen position of a champion token; falls back to its team's wing when it has none yet. */
export const resolveChampionScreenPoint = (minion: MinionEntity): ScreenPoint => {
  const livePoint = getLiveMinionScreenPos(minion.id);
  if (livePoint) return livePoint;
  const hasWindow = typeof window !== 'undefined';
  const viewportWidth = hasWindow ? window.innerWidth : CHAMPION_HIT_FEEDBACK.FALLBACK_VIEWPORT_WIDTH;
  const viewportHeight = hasWindow ? window.innerHeight : CHAMPION_HIT_FEEDBACK.FALLBACK_VIEWPORT_HEIGHT;
  const xRatio = FALLBACK_X_RATIO_BY_TEAM[minion.team] ?? CHAMPION_HIT_FEEDBACK.FALLBACK_CENTER_X_RATIO;
  return { x: viewportWidth * xRatio, y: viewportHeight * CHAMPION_HIT_FEEDBACK.FALLBACK_Y_RATIO };
};

export const resolveChampionWorldPosition = (minion: MinionEntity): [number, number, number] =>
  getLiveMinionPositionSnapshot(minion.id) || minion.spawnPosition;

/** Shows the damage number on the champion and makes its token flinch. */
export const showChampionDamage = (
  minion: MinionEntity,
  amount: number,
  isLethal: boolean,
  color: string,
  now: number
): ScreenPoint => {
  const screenPoint = resolveChampionScreenPoint(minion);
  emitChampionHit({
    minionId: minion.id,
    screenX: screenPoint.x,
    screenY: screenPoint.y,
    amount,
    color,
    isLethal,
    createdAt: now,
  });
  return screenPoint;
};

interface ImpactOutcome {
  remainingMinions: MinionEntity[];
  defeatedChampions: DefeatedChampionEntity[];
  totalDamageDealt: number;
  hitCount: number;
}

/** Applies the damage to every targeted champion that is still on the field and reports each hit. */
const resolveImpactOutcome = (get: GetGameState, impact: PendingBossSkillImpact, now: number): ImpactOutcome => {
  const { skill, damage, targetedMinionIds, championDebuff, bossName } = impact;
  const outcome: ImpactOutcome = { remainingMinions: [], defeatedChampions: [], totalDamageDealt: 0, hitCount: 0 };
  const burstIntensity = skill.isUltimate
    ? CHAMPION_HIT_FEEDBACK.ULTIMATE_BURST_INTENSITY
    : CHAMPION_HIT_FEEDBACK.BURST_INTENSITY;
  let shownHitNumbers = 0;

  get().minions.forEach((minion) => {
    if (!targetedMinionIds.has(minion.id)) {
      outcome.remainingMinions.push(minion);
      return;
    }

    const currentHp = minion.hp ?? minion.maxHp ?? CHAMPION_DEFAULT_MAX_HP;
    const nextHp = currentHp - damage;
    const isLethal = nextHp <= 0;
    outcome.totalDamageDealt += Math.min(currentHp, damage);
    outcome.hitCount += 1;

    const worldPosition = resolveChampionWorldPosition(minion);
    const hitColor = isLethal ? CHAMPION_HIT_FEEDBACK.LETHAL_COLOR : CHAMPION_HIT_FEEDBACK.DAMAGE_COLOR;
    // A wave over a crowd shows numbers on the first champions only; the rest still lose HP and flinch
    const isNumberShown = shownHitNumbers < BOSS_ULTIMATE_WAVES.MAX_HIT_NUMBERS_PER_WAVE;
    shownHitNumbers += 1;
    const screenPoint = isNumberShown
      ? showChampionDamage(minion, damage, isLethal, hitColor, now)
      : resolveChampionScreenPoint(minion);
    if (outcome.hitCount <= CHAMPION_HIT_FEEDBACK.MAX_BURSTS_PER_IMPACT) {
      get().spawnParticleBurst(worldPosition, skill.color, burstIntensity);
    }

    if (!isLethal) {
      const statusEffects = championDebuff
        ? upsertStatusEffect(minion.statusEffects, championDebuff)
        : minion.statusEffects;
      outcome.remainingMinions.push({ ...minion, hp: nextHp, statusEffects });
      return;
    }

    outcome.defeatedChampions.push(
      buildDefeatedChampion(minion, worldPosition, screenPoint.x, screenPoint.y, bossName, now)
    );
    get().addLog(
      'BOSS',
      `💀 [${bossName}] dùng [${skill.vietnameseName}] hạ gục ${minion.championName} của ${minion.summonerName}!`,
      minion.team
    );
  });
  return outcome;
};

/**
 * Second half of a boss skill: runs when the effect reaches the champions.
 * Targets were picked at cast time; champions that left the field in between are simply skipped,
 * and nothing happens if the round ended while the effect was in flight.
 */
export const applyBossSkillImpact = (set: SetGameState, get: GetGameState, impact: PendingBossSkillImpact): void => {
  const state = get();
  if (isBattleHalted(state) || isCurrentRoundIntroActive()) return;

  const now = Date.now();
  const outcome = resolveImpactOutcome(get, impact, now);
  if (outcome.hitCount === 0) return;

  const { skill, championDebuff } = impact;
  const isShockwaveSkill =
    skill.vfxType === BOSS_SKILL_VFX.CHARGE_DASH ||
    skill.vfxType === BOSS_SKILL_VFX.SEISMIC_SLAM ||
    skill.vfxType === BOSS_SKILL_VFX.NOVA ||
    skill.isUltimate;
  if (impact.isFirstWave && isShockwaveSkill) {
    audioService.playShockwaveExplosion(skill.isUltimate ? 1.25 : 0.95, 1.0, true);
  }

  if (championDebuff) {
    const presentation = STATUS_EFFECT_PRESENTATION[championDebuff.type];
    get().addLog('BOSS', `${presentation.icon} [${skill.vietnameseName}] gây ${presentation.labelVi} lên ${outcome.hitCount} tướng!`);
  }

  // Reinforcements waiting in the queue take the place of the fallen champions
  announceChampionDeaths(outcome.defeatedChampions.length, now, outcome.remainingMinions.length);
  const deployed = deployQueuedMinions(
    outcome.remainingMinions,
    state.summonQueue,
    state.lastSummonTurnTimestamps,
    now,
    state.activeTeams,
    resolveSummonTurnLimits(state.participationRuleConfig)
  );

  set((prev) => ({
    minions: deployed.nextMinions,
    ...rebuildMinionCollections(deployed.nextMinions),
    summonQueue: deployed.nextQueue,
    lastSummonTurnTimestamps: deployed.nextLastTurnTimestamps,
    activeSummonPortals: [...prev.activeSummonPortals, ...deployed.newPortals],
    activeDefeatedChampions: [...prev.activeDefeatedChampions, ...outcome.defeatedChampions].slice(
      -COMBAT_VFX_CONSTANTS.SUMMON.MAX_ACTIVE_DEFEATED
    ),
  }));

  healBossFromLifesteal(get, impact, outcome.totalDamageDealt);
};

/** Lifesteal heals a share of the damage dealt, but one cast never restores more than its budget. */
const healBossFromLifesteal = (get: GetGameState, impact: PendingBossSkillImpact, damageDealt: number): void => {
  const { skill, lifestealBudget } = impact;
  const isLifesteal = skill.statusEffect?.type === BOSS_STATUS_EFFECT.LIFESTEAL;
  if (!isLifesteal || damageDealt <= 0 || lifestealBudget.remainingHp <= 0) return;
  const wantedHeal = Math.round(damageDealt * (skill.statusEffect?.ratio ?? 0));
  const heal = Math.min(wantedHeal, lifestealBudget.remainingHp);
  if (heal <= 0) return;
  lifestealBudget.remainingHp -= heal;
  get().healBoss(heal, skill.vietnameseName);
};
