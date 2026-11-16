import { StoreApi } from 'zustand';
import { CHAMPION_DEFAULT_MAX_HP } from '../constants/bossSkills';
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

/** Everything decided at cast time that the impact needs once the effect reaches the champions. */
export interface PendingBossSkillImpact {
  skill: BossSkillDefinition;
  damage: number;
  targetedMinionIds: ReadonlySet<string>;
  championDebuff: ActiveStatusEffect | null;
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
    const screenPoint = showChampionDamage(minion, damage, isLethal, hitColor, now);
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
  if (
    skill.vfxType === BOSS_SKILL_VFX.CHARGE_DASH ||
    skill.vfxType === BOSS_SKILL_VFX.SEISMIC_SLAM ||
    skill.vfxType === BOSS_SKILL_VFX.NOVA ||
    skill.isUltimate
  ) {
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

  const isLifesteal = skill.statusEffect?.type === BOSS_STATUS_EFFECT.LIFESTEAL;
  if (!isLifesteal || outcome.totalDamageDealt <= 0) return;
  get().healBoss(Math.round(outcome.totalDamageDealt * (skill.statusEffect?.ratio ?? 0)), skill.vietnameseName);
};
