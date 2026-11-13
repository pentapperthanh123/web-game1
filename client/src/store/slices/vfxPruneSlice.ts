import { StateCreator } from 'zustand';
import { GameState } from '../../types/game';
import { BOSS_ATTACK_BANNER_DURATION_MS } from '../../constants/bossSkills';
import {
  AUTO_PRO_BATTLE_CONSTANTS,
  COMBAT_VFX_CONSTANTS,
  GAME_CONSTANTS,
  TEAM_KEY,
} from '../../constants/game';
import { createEmptyTeamCombo, createEmptyTeamHeartMomentum } from '../storeHelpers';
import { deployQueuedMinions, resolveSummonTurnLimits } from '../summonQueueHelper';
import { rebuildMinionCollections } from '../minionMapHelpers';

export type VfxPruneSlice = Pick<GameState, 'pruneEntities'>;

/** Creates the periodic VFX & expired-entity pruning slice. */
export const createVfxPruneSlice: StateCreator<GameState, [], [], VfxPruneSlice> = (set, get) => ({
  pruneEntities: () => {
    const now = Date.now();
    const state = get();
    const slashMaxAgeMs = COMBAT_VFX_CONSTANTS.DAMAGE.SLASH_DURATION_S * 1000 + 80;
    const portalMaxAgeMs = Math.max(
      COMBAT_VFX_CONSTANTS.SUMMON.PORTAL_DURATION_MS,
      COMBAT_VFX_CONSTANTS.SUMMON.SPOTLIGHT_DURATION_MS
    );

    const activeMinions = state.minions.filter((m) => now - m.createdAt < m.lifetimeMs);
    const activeHearts = state.activeHearts.filter((h) => now - h.createdAt < 3200);
    const activeProj = state.activeProjectiles.filter(
      (p) => now - p.createdAt < COMBAT_VFX_CONSTANTS.DAMAGE.PROJECTILE_DURATION_MS + 180
    );
    const activeFloats = state.floatingDamages.filter(
      (f) => now - f.createdAt < COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_DURATION_MS
    );
    const activeSlashes = state.activeSlashes.filter((s) => now - s.createdAt < slashMaxAgeMs);
    const activeWaves = state.activeShockwaves.filter((w) => now - w.timestamp < 850);
    const activeMeteors = state.activeMeteors.filter(
      (m) => now - m.createdAt < m.duration * 1000 + 300
    );
    const activeSummonPortals = state.activeSummonPortals.filter(
      (p) => now - p.createdAt < portalMaxAgeMs
    );
    const activeHitImpacts = state.activeHitImpacts.filter(
      (impact) => now - impact.createdAt < COMBAT_VFX_CONSTANTS.DAMAGE.HIT_IMPACT_DURATION_MS
    );
    const activeBursts = state.activeBursts.filter((b) => now - b.timestamp < 1500);
    const activeArrows = state.activeFlyingArrows.filter(
      (a) => now - a.createdAt < a.durationMs + 100
    );
    const activeDefeated = state.activeDefeatedChampions.filter(
      (d) => now - d.createdAt < d.durationMs
    );

    const isFlashActive = state.screenFlashColor !== null && now - state.screenFlashTimestamp < 450;
    const isBannerActive =
      state.activeBossSkillBanner !== null &&
      now - state.activeBossSkillBanner.timestamp <= BOSS_ATTACK_BANNER_DURATION_MS;
    const isHeartMilestoneBannerActive =
      state.activeHeartMilestoneBanner !== null &&
      now - state.activeHeartMilestoneBanner.timestamp <= GAME_CONSTANTS.HEART_MILESTONE.BANNER_DURATION_MS;

    const isBLGComboExpired =
      state.teamCombos[TEAM_KEY.BLG].count > 0 &&
      now - state.teamCombos[TEAM_KEY.BLG].lastTimestamp > COMBAT_VFX_CONSTANTS.DAMAGE.COMBO_WINDOW_MS;
    const isGENGComboExpired =
      state.teamCombos[TEAM_KEY.GENG].count > 0 &&
      now - state.teamCombos[TEAM_KEY.GENG].lastTimestamp > COMBAT_VFX_CONSTANTS.DAMAGE.COMBO_WINDOW_MS;
    const hasComboChanged = isBLGComboExpired || isGENGComboExpired;

    const isBLGMomentumExpired =
      state.teamHeartMomentum[TEAM_KEY.BLG].multiplier > 1 &&
      now - state.teamHeartMomentum[TEAM_KEY.BLG].lastTapAt > GAME_CONSTANTS.MINION_FURY.HEART_TAP_SPEED_WINDOW_MS;
    const isGENGMomentumExpired =
      state.teamHeartMomentum[TEAM_KEY.GENG].multiplier > 1 &&
      now - state.teamHeartMomentum[TEAM_KEY.GENG].lastTapAt > GAME_CONSTANTS.MINION_FURY.HEART_TAP_SPEED_WINDOW_MS;
    const hasMomentumChanged = isBLGMomentumExpired || isGENGMomentumExpired;

    const nextRosterTimestamps: Record<string, number> = {};
    let hasRosterAttackChanged = false;
    for (const [rosterId, firedAt] of Object.entries(state.rosterAttackTimestamps)) {
      if (now - firedAt <= AUTO_PRO_BATTLE_CONSTANTS.ROSTER_ATTACK_GLOW_MS) {
        nextRosterTimestamps[rosterId] = firedAt;
      } else {
        hasRosterAttackChanged = true;
      }
    }

    const hasMinionsChanged = activeMinions.length !== state.minions.length;
    const hasQueueItems =
      (state.summonQueue?.[TEAM_KEY.BLG]?.length ?? 0) > 0 ||
      (state.summonQueue?.[TEAM_KEY.GENG]?.length ?? 0) > 0;

    let finalMinions = activeMinions;
    let nextSummonQueue = state.summonQueue;
    let nextSummonPortals = activeSummonPortals;
    let nextLastTurnTimestamps = state.lastSummonTurnTimestamps;

    if (hasMinionsChanged || hasQueueItems) {
      const deployed = deployQueuedMinions(
        activeMinions,
        state.summonQueue,
        state.lastSummonTurnTimestamps,
        now,
        state.activeTeams,
        resolveSummonTurnLimits(state.participationRuleConfig)
      );
      if (deployed.nextMinions.length !== activeMinions.length || deployed.newPortals.length > 0) {
        finalMinions = deployed.nextMinions;
        nextSummonQueue = deployed.nextQueue;
        nextLastTurnTimestamps = deployed.nextLastTurnTimestamps;
        nextSummonPortals = [...activeSummonPortals, ...deployed.newPortals];
      }
    }
    const hasHeartsChanged = activeHearts.length !== state.activeHearts.length;
    const hasProjChanged = activeProj.length !== state.activeProjectiles.length;
    const hasFloatsChanged = activeFloats.length !== state.floatingDamages.length;
    const hasSlashesChanged = activeSlashes.length !== state.activeSlashes.length;
    const hasWavesChanged = activeWaves.length !== state.activeShockwaves.length;
    const hasMeteorsChanged = activeMeteors.length !== state.activeMeteors.length;
    const hasPortalsChanged = activeSummonPortals.length !== state.activeSummonPortals.length;
    const hasImpactsChanged = activeHitImpacts.length !== state.activeHitImpacts.length;
    const hasBurstsChanged = activeBursts.length !== state.activeBursts.length;
    const hasArrowsChanged = activeArrows.length !== state.activeFlyingArrows.length;
    const hasDefeatedChanged = activeDefeated.length !== state.activeDefeatedChampions.length;
    const hasFlashChanged = (state.screenFlashColor !== null) !== isFlashActive;
    const hasBannerChanged = (state.activeBossSkillBanner !== null) !== isBannerActive;
    const hasHeartBannerChanged =
      (state.activeHeartMilestoneBanner !== null) !== isHeartMilestoneBannerActive;

    const hasAnyChange =
      hasMinionsChanged ||
      hasHeartsChanged ||
      hasProjChanged ||
      hasFloatsChanged ||
      hasSlashesChanged ||
      hasWavesChanged ||
      hasMeteorsChanged ||
      hasPortalsChanged ||
      hasImpactsChanged ||
      hasBurstsChanged ||
      hasArrowsChanged ||
      hasDefeatedChanged ||
      hasFlashChanged ||
      hasBannerChanged ||
      hasHeartBannerChanged ||
      hasComboChanged ||
      hasMomentumChanged ||
      hasRosterAttackChanged;

    if (!hasAnyChange) return;

    let nextTeamCombos = state.teamCombos;
    if (hasComboChanged) {
      nextTeamCombos = {
        [TEAM_KEY.BLG]: isBLGComboExpired
          ? createEmptyTeamCombo()
          : state.teamCombos[TEAM_KEY.BLG],
        [TEAM_KEY.GENG]: isGENGComboExpired
          ? createEmptyTeamCombo()
          : state.teamCombos[TEAM_KEY.GENG],
      };
    }

    let nextTeamHeartMomentum = state.teamHeartMomentum;
    if (hasMomentumChanged) {
      nextTeamHeartMomentum = {
        [TEAM_KEY.BLG]: isBLGMomentumExpired
          ? createEmptyTeamHeartMomentum()
          : state.teamHeartMomentum[TEAM_KEY.BLG],
        [TEAM_KEY.GENG]: isGENGMomentumExpired
          ? createEmptyTeamHeartMomentum()
          : state.teamHeartMomentum[TEAM_KEY.GENG],
      };
    }

    const collections = hasMinionsChanged || finalMinions.length !== state.minions.length
      ? rebuildMinionCollections(finalMinions, now)
      : null;

    set({
      minions: finalMinions,
      ...(collections
        ? {
            minionMap: collections.minionMap,
            minionIdsByTeam: collections.minionIdsByTeam,
            livingCountByTeam: collections.livingCountByTeam,
          }
        : {}),
      summonQueue: nextSummonQueue,
      lastSummonTurnTimestamps: nextLastTurnTimestamps,
      activeHearts: hasHeartsChanged ? activeHearts : state.activeHearts,
      activeProjectiles: hasProjChanged ? activeProj : state.activeProjectiles,
      floatingDamages: hasFloatsChanged ? activeFloats : state.floatingDamages,
      activeSlashes: hasSlashesChanged ? activeSlashes : state.activeSlashes,
      activeShockwaves: hasWavesChanged ? activeWaves : state.activeShockwaves,
      activeMeteors: hasMeteorsChanged ? activeMeteors : state.activeMeteors,
      activeSummonPortals: nextSummonPortals,
      activeHitImpacts: hasImpactsChanged ? activeHitImpacts : state.activeHitImpacts,
      activeBursts: hasBurstsChanged ? activeBursts : state.activeBursts,
      activeFlyingArrows: hasArrowsChanged ? activeArrows : state.activeFlyingArrows,
      activeDefeatedChampions: hasDefeatedChanged ? activeDefeated : state.activeDefeatedChampions,
      teamCombos: nextTeamCombos,
      teamHeartMomentum: nextTeamHeartMomentum,
      screenFlashColor: isFlashActive ? state.screenFlashColor : null,
      activeBossSkillBanner: isBannerActive ? state.activeBossSkillBanner : null,
      activeHeartMilestoneBanner: isHeartMilestoneBannerActive
        ? state.activeHeartMilestoneBanner
        : null,
      rosterAttackTimestamps: hasRosterAttackChanged
        ? nextRosterTimestamps
        : state.rosterAttackTimestamps,
    });
  },
});
