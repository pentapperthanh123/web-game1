import { StateCreator } from 'zustand';
import {
  ActiveStatusEffect,
  DefeatedChampionEntity,
  FloatingDamageText,
  GameState,
  HeartMilestoneBanner,
  MeteorEntity,
  MinionEntity,
} from '../../types/game';
import {
  ActiveBossSkillBanner,
  BOSS_SKILL_VFX,
  BOSS_STATUS_EFFECT,
} from '../../types/bossSkill';
import {
  BOSS_DIFFICULTY_SCALE,
  BOSS_ENRAGED_CONSTANTS,
  BOSS_MECHANICS_CONSTANTS,
  BOSS_STATUS,
  BossStatusType,
  COMBAT_VFX_CONSTANTS,
  DAMAGE_TYPE,
  GAME_CONSTANTS,
  GAME_THEME,
  getThemeConfig,
  TEAM_KEY,
} from '../../constants/game';
import {
  BOSS_SKILL_STORAGE_KEY,
  CHAMPION_DEFAULT_MAX_HP,
  getBossSkillsByTheme,
} from '../../constants/bossSkills';
import { BOSS_PHASE, BOSS_PHASE_RULES, getBossPhaseRule, resolveBossPhase } from '../../constants/bossPhases';
import {
  BOSS_METEOR_RAIN_CONSTANTS,
  BOSS_PHASE_SHIFT_SHAKE_INTENSITY,
} from '../../constants/bossSkillVfx';
import {
  DAMAGE_OVER_TIME_EFFECTS,
  STATUS_EFFECT_CONSTANTS,
  STATUS_EFFECT_PRESENTATION,
} from '../../constants/bossStatusEffects';
import { BOSS_SKILL_VFX_SFX, SFX_EVENT } from '../../constants/sfx';
import { audioService } from '../../services/audioService';
import { soundManager, playSound } from '../../services/soundManager';
import { getLiveMinionPosition, getLiveMinionScreenPos } from '../../services/minionPositionRegistry';
import { upsertStatusEffect } from '../../utils/statusEffects';
import {
  buildChampionStatusEffect,
  buildDefeatedChampion,
  pickBossSkillIndex,
  pickSkillTargets,
  pickZoneBreathTargets,
  resolveSkillTargetTeam,
} from '../bossSkillResolver';
import {
  createInitialRosterFury,
  createInitialTeamCombos,
  createInitialTeamHeartMomentum,
  isBattleHalted,
} from '../storeHelpers';
import { deployQueuedMinions } from '../summonQueueHelper';

export type BossSlice = Pick<
  GameState,
  | 'setBossSkillConfig'
  | 'clearBossSkillBanner'
  | 'hitWeakPoint'
  | 'tickBossMechanics'
  | 'healTeamChampions'
  | 'triggerHeartMilestoneHeal'
  | 'clearHeartMilestoneBanner'
  | 'castBossSkill'
  | 'spawnBossMeteorRain'
  | 'healBoss'
  | 'syncBossPhase'
  | 'tickStatusEffects'
  | 'resetBoss'
  | 'setBossHp'
  | 'setBossStatus'
>;

const resolveBossStatusFromHp = (isDefeated: boolean, isEnraged: boolean): BossStatusType => {
  if (isDefeated) return BOSS_STATUS.DEFEATED;
  if (isEnraged) return BOSS_STATUS.ENRAGED;
  return BOSS_STATUS.IDLE;
};

const resolveEnragedEntranceTimestamp = (
  isJustEnraged: boolean,
  isDefeated: boolean,
  previousTimestamp: number
): number => {
  if (isJustEnraged) return Date.now();
  if (isDefeated) return 0;
  return previousTimestamp;
};

/** Creates the boss skills, phases, status effects, healing, and HP control slice. */
export const createBossSlice: StateCreator<GameState, [], [], BossSlice> = (set, get) => ({
  setBossSkillConfig: (config) => {
    set((state) => {
      const next = { ...state.bossSkillConfig, ...config };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(BOSS_SKILL_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return { bossSkillConfig: next };
    });
  },

  clearBossSkillBanner: () => set({ activeBossSkillBanner: null }),

  hitWeakPoint: (playerName = 'Viewer') => {
    const state = get();
    const now = Date.now();
    if (!state.bossWeakPoint || now >= state.bossWeakPoint.expiresAt || state.bossHp <= 0) {
      return;
    }

    const dominantTeam =
      state.teamScoreBLG >= state.teamScoreGENG ? TEAM_KEY.BLG : TEAM_KEY.GENG;
    const baseDamage = BOSS_MECHANICS_CONSTANTS.WEAK_POINT.POKE_BASE_DAMAGE;
    set({ bossWeakPoint: null });
    get().damageBoss(baseDamage, dominantTeam, playerName, DAMAGE_TYPE.CRIT);
  },

  tickBossMechanics: () => {
    const state = get();
    const now = Date.now();
    if (isBattleHalted(state)) {
      return;
    }

    if (state.bossShield && now >= state.bossShield.expiresAt) {
      const healAmount = BOSS_MECHANICS_CONSTANTS.SHIELD.HEAL_PENALTY_AMOUNT;
      const healedHp = Math.min(state.bossMaxHp, state.bossHp + healAmount);
      const nextStatus =
        healedHp <= state.bossMaxHp * BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT
          ? BOSS_STATUS.ENRAGED
          : BOSS_STATUS.IDLE;

      playSound(SFX_EVENT.BOSS_ROAR, { rateScale: getThemeConfig(state.gameTheme).audioPitchRate });
      get().spawnParticleBurst([0, 0.5, 0.5], '#22c55e', 1.6);
      get().addLog(
        'BOSS',
        `💚 [HẤP THỤ KHIÊN] Không phá kịp khiên! Boss hồi +${healAmount.toLocaleString()} HP!`
      );

      set({
        bossHp: healedHp,
        bossStatus: nextStatus,
        bossShield: null,
      });
      return;
    }

    if (state.bossWeakPoint) {
      set({ bossWeakPoint: null });
    }
  },

  healTeamChampions: (targetTeam, amount) => {
    const state = get();
    if (state.minions.length === 0 || isBattleHalted(state)) {
      return;
    }

    const normalizedTarget = targetTeam === 'GEN' ? TEAM_KEY.GENG : targetTeam;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 720;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1280;
    const now = Date.now();
    const newFloats: FloatingDamageText[] = [];

    const updatedMinions = state.minions.map((minion) => {
      if (normalizedTarget !== 'ALL' && minion.team !== normalizedTarget) {
        return minion;
      }
      const curHp = minion.hp ?? CHAMPION_DEFAULT_MAX_HP;
      const nextHp = Math.min(minion.maxHp ?? CHAMPION_DEFAULT_MAX_HP, curHp + amount);

      const livePos = getLiveMinionScreenPos(minion.championName);
      const posX = livePos ? livePos.x : (minion.team === TEAM_KEY.BLG ? screenW * 0.25 : screenW * 0.75);
      const posY = livePos ? livePos.y : screenH * 0.65;

      newFloats.push({
        id: `heal-${now}-${Math.random()}`,
        amount,
        text: `+${amount} HP`,
        damageType: DAMAGE_TYPE.NORMAL,
        team: minion.team,
        playerName: minion.championName,
        x: posX - screenW * 0.5,
        y: posY - screenH * 0.5,
        color: '#22c55e',
        scale: 1.1,
        createdAt: now,
      });

      return { ...minion, hp: nextHp };
    });

    audioService.playHeartChime();
    set((prev) => ({
      minions: updatedMinions,
      floatingDamages: [
        ...prev.floatingDamages.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - 1)),
        ...newFloats,
      ],
    }));
  },

  triggerHeartMilestoneHeal: (milestoneCount: number) => {
    const state = get();
    if (isBattleHalted(state)) {
      return;
    }

    const healAmount = GAME_CONSTANTS.HEART_MILESTONE.HEAL_AMOUNT;
    const now = Date.now();

    get().healTeamChampions('ALL', healAmount);
    playSound(SFX_EVENT.TEAM_HEAL);
    get().triggerScreenFlash('#10b981');
    get().triggerScreenShake(0.6);

    get().spawnParticleBurst([-2.5, 0.5, 0], '#10b981', 2.0);
    get().spawnParticleBurst([2.5, 0.5, 0], '#10b981', 2.0);
    get().spawnParticleBurst([0, 1.0, 1.5], '#facc15', 2.0);

    const banner: HeartMilestoneBanner = {
      id: `heart-milestone-${now}`,
      milestoneCount,
      healAmount,
      timestamp: now,
    };

    get().addLog(
      'GIFT',
      `💖 [ĐẠI HỒI PHỤC] Đạt mốc ${milestoneCount.toLocaleString()} tim: Hồi phục +${healAmount} HP toàn bản đồ!`
    );
    get().addChatMessage(
      'Hệ Thống',
      `💖 Mốc ${milestoneCount.toLocaleString()} TIM đạt được! Mưa hồi phục toàn bản đồ (+${healAmount} HP)`
    );

    set({
      activeHeartMilestoneBanner: banner,
    });
  },

  clearHeartMilestoneBanner: () => set({ activeHeartMilestoneBanner: null }),

  castBossSkill: (skillIndex) => {
    const state = get();
    if (isBattleHalted(state)) {
      return;
    }

    const skills = getBossSkillsByTheme(state.gameTheme);
    if (!skills || skills.length === 0) return;

    const phase = resolveBossPhase(state.bossHp, state.bossMaxHp);
    const phaseRule = getBossPhaseRule(phase);
    const nextIndex = pickBossSkillIndex({
      skills,
      config: state.bossSkillConfig,
      phase,
      rotationIndex: state.bossSkillRotationIndex,
      requestedIndex: skillIndex,
    });

    const skill = skills[nextIndex];
    const isEnraged = state.bossStatus === BOSS_STATUS.ENRAGED;
    const difficulty = BOSS_DIFFICULTY_SCALE[state.gameTheme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
    const baseMultiplier =
      (state.bossSkillConfig.damageMultiplier || 1.0) * (difficulty.skillDamageMultiplier || 1.0);
    const rageBoost = isEnraged ? BOSS_ENRAGED_CONSTANTS.DAMAGE_BOOST_MULTIPLIER : 1.0;
    const actualDamage = Math.max(
      1,
      Math.round(skill.baseDamage * baseMultiplier * rageBoost * phaseRule.skillDamageMultiplier)
    );
    const now = Date.now();
    const themeConfig = getThemeConfig(state.gameTheme);
    const bossName = themeConfig.bossName;

    const currentMinions = state.minions;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 720;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1280;

    const gracePeriodMs = GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS;
    const vulnerableMinions = currentMinions.filter(
      (m) => now - (m.createdAt || 0) >= gracePeriodMs
    );
    const isZoneBreath = skill.vfxType === BOSS_SKILL_VFX.FIRE_BREATH;
    const zoneBreathSelection = isZoneBreath
      ? pickZoneBreathTargets(vulnerableMinions)
      : null;
    const targetedMinionIds = zoneBreathSelection
      ? zoneBreathSelection.targetedMinionIds
      : pickSkillTargets(vulnerableMinions, skill.targetCount);
    const targetTeam = zoneBreathSelection
      ? zoneBreathSelection.targetTeam
      : resolveSkillTargetTeam(currentMinions, targetedMinionIds, skill.isUltimate);
    const championDebuff = buildChampionStatusEffect(skill.statusEffect, skill.id, phase, now);
    const isLifesteal = skill.statusEffect?.type === BOSS_STATUS_EFFECT.LIFESTEAL;

    const banner: ActiveBossSkillBanner = {
      skillId: skill.id,
      skillName: skill.name,
      vietnameseName: skill.vietnameseName,
      damage: actualDamage,
      color: skill.color,
      isUltimate: skill.isUltimate,
      bossName,
      timestamp: now,
      targetTeam,
      vfxType: skill.vfxType,
      vfxParams: skill.vfxParams,
      statusEffectType: skill.statusEffect?.type,
    };

    if (skill.isUltimate) {
      get().triggerScreenShake(1.6);
      get().triggerScreenFlash(skill.color);
      playSound(SFX_EVENT.BOSS_ULTIMATE, { rateScale: themeConfig.audioPitchRate });
    } else {
      get().triggerScreenShake(0.5);
      playSound(SFX_EVENT.BOSS_SKILL, { rateScale: themeConfig.audioPitchRate });
    }
    const archetypeSound = BOSS_SKILL_VFX_SFX[skill.vfxType];
    if (archetypeSound) {
      playSound(archetypeSound, { rateScale: themeConfig.audioPitchRate });
    }

    if (skill.vfxType === BOSS_SKILL_VFX.METEOR_RAIN) {
      get().spawnBossMeteorRain(skill, now);
    }

    const remainingMinions: MinionEntity[] = [];
    const newFloats: FloatingDamageText[] = [];
    const newDefeatedChampions: DefeatedChampionEntity[] = [];
    let totalDamageDealt = 0;

    currentMinions.forEach((minion) => {
      if (now - (minion.createdAt || 0) < gracePeriodMs) {
        remainingMinions.push(minion);
        return;
      }

      if (!targetedMinionIds.has(minion.id)) {
        remainingMinions.push(minion);
        return;
      }

      const curHp = minion.hp ?? minion.maxHp ?? CHAMPION_DEFAULT_MAX_HP;
      const nextHp = curHp - actualDamage;
      totalDamageDealt += Math.min(curHp, actualDamage);

      const livePos = getLiveMinionScreenPos(minion.id) || getLiveMinionScreenPos(minion.championName);
      const posX = livePos ? livePos.x : (minion.team === TEAM_KEY.BLG ? screenW * 0.25 : screenW * 0.75);
      const posY = livePos ? livePos.y : screenH * 0.65;

      newFloats.push({
        id: `boss-dmg-${now}-${Math.random()}`,
        amount: actualDamage,
        text: `-${actualDamage} HP`,
        damageType: skill.isUltimate ? DAMAGE_TYPE.ULTIMATE : DAMAGE_TYPE.CRIT,
        team: minion.team,
        playerName: minion.championName,
        x: posX - screenW * 0.5,
        y: posY - screenH * 0.5,
        color: '#ef4444',
        scale: skill.isUltimate
          ? COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_ULTIMATE
          : COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_CRIT,
        createdAt: now,
      });

      const liveWorldPos = getLiveMinionPosition(minion.id) || minion.spawnPosition;
      get().spawnParticleBurst(liveWorldPos, skill.color, skill.isUltimate ? 2.0 : 1.0);

      if (nextHp > 0) {
        const statusEffects = championDebuff
          ? upsertStatusEffect(minion.statusEffects, championDebuff)
          : minion.statusEffects;
        remainingMinions.push({ ...minion, hp: nextHp, statusEffects });
        return;
      }

      newDefeatedChampions.push(
        buildDefeatedChampion(minion, liveWorldPos, posX, posY, bossName, now)
      );
      playSound(SFX_EVENT.CHAMPION_DEATH);
      get().addLog(
        'BOSS',
        `💀 [${bossName}] dùng [${skill.vietnameseName}] hạ gục ${minion.championName} của ${minion.summonerName}!`,
        minion.team
      );
    });

    if (championDebuff && targetedMinionIds.size > 0) {
      const presentation = STATUS_EFFECT_PRESENTATION[championDebuff.type];
      get().addLog(
        'BOSS',
        `${presentation.icon} [${skill.vietnameseName}] gây ${presentation.labelVi} lên ${targetedMinionIds.size} tướng!`
      );
    }

    set((prev) => ({
      bossAttackTimestamp: now,
      bossAttackTargetTeam: targetTeam,
      activeBossSkillBanner: banner,
      bossSkillRotationIndex: (state.bossSkillRotationIndex + 1) % skills.length,
      minions: remainingMinions,
      activeDefeatedChampions: [
        ...prev.activeDefeatedChampions.slice(-8),
        ...newDefeatedChampions,
      ],
      floatingDamages: [
        ...prev.floatingDamages.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - 1)),
        ...newFloats,
      ],
    }));

    if (isLifesteal && totalDamageDealt > 0) {
      const healAmount = Math.round(totalDamageDealt * (skill.statusEffect?.ratio ?? 0));
      get().healBoss(healAmount, skill.vietnameseName);
    }
  },

  spawnBossMeteorRain: (skill, now) => {
    const count = skill.vfxParams?.count ?? BOSS_METEOR_RAIN_CONSTANTS.DEFAULT_COUNT;
    const newMeteors: MeteorEntity[] = Array.from({ length: count }, (_, index) => {
      const targetX = (Math.random() - 0.5) * BOSS_METEOR_RAIN_CONSTANTS.SPREAD_X;
      const targetZ = (Math.random() - 0.5) * BOSS_METEOR_RAIN_CONSTANTS.SPREAD_Z;
      return {
        id: `boss-meteor-${now}-${index}`,
        start: [
          targetX + (Math.random() - 0.5) * 2,
          BOSS_METEOR_RAIN_CONSTANTS.START_HEIGHT,
          targetZ - 2,
        ],
        target: [targetX, BOSS_METEOR_RAIN_CONSTANTS.GROUND_Y, targetZ],
        color: skill.color,
        glowColor: skill.vfxParams?.secondaryColor,
        coreColor: '#ffffff',
        createdAt: now + index * BOSS_METEOR_RAIN_CONSTANTS.STAGGER_MS,
        duration: BOSS_METEOR_RAIN_CONSTANTS.FALL_DURATION_S,
      };
    });
    set((prev) => ({
      activeMeteors: [
        ...prev.activeMeteors.slice(-BOSS_METEOR_RAIN_CONSTANTS.POOL_KEEP),
        ...newMeteors,
      ],
    }));
  },

  healBoss: (amount, sourceLabel) => {
    const state = get();
    if (amount <= 0 || state.bossHp <= 0 || state.bossStatus === BOSS_STATUS.DEFEATED) return;
    const healedHp = Math.min(state.bossMaxHp, state.bossHp + amount);
    if (healedHp === state.bossHp) return;

    const presentation = STATUS_EFFECT_PRESENTATION[BOSS_STATUS_EFFECT.LIFESTEAL];
    get().spawnParticleBurst([0, 0.6, 0.5], presentation.color, 1.4);
    get().addLog(
      'BOSS',
      `${presentation.icon} [${sourceLabel}] hút máu: Boss hồi +${amount.toLocaleString()} HP!`
    );
    const isStillEnraged = healedHp <= state.bossMaxHp * BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT;
    const nextStatus = isStillEnraged ? state.bossStatus : BOSS_STATUS.IDLE;
    set({ bossHp: healedHp, bossStatus: nextStatus });
  },

  syncBossPhase: () => {
    const state = get();
    if (state.bossHp <= 0 || state.bossStatus === BOSS_STATUS.DEFEATED) return;
    const nextPhase = resolveBossPhase(state.bossHp, state.bossMaxHp);
    if (nextPhase === state.bossPhase) return;

    const isEscalating = nextPhase > state.bossPhase;
    set({ bossPhase: nextPhase, bossPhaseChangedAt: Date.now() });
    if (!isEscalating) return;

    const themeConfig = getThemeConfig(state.gameTheme);
    playSound(SFX_EVENT.BOSS_PHASE_SHIFT, { rateScale: themeConfig.audioPitchRate });
    get().triggerScreenShake(BOSS_PHASE_SHIFT_SHAKE_INTENSITY);
    get().triggerScreenFlash(
      nextPhase === BOSS_PHASE.THREE
        ? themeConfig.colors.enragedHex
        : themeConfig.colors.secondaryHex
    );
    get().addLog(
      'BOSS',
      `⚠️ [${themeConfig.bossName}] bước vào ${BOSS_PHASE_RULES[nextPhase].labelVi}!`
    );
  },

  tickStatusEffects: () => {
    const state = get();
    if (state.minions.length === 0) return;
    const now = Date.now();
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 720;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1280;
    const bossName = getThemeConfig(state.gameTheme).bossName;

    const remainingMinions: MinionEntity[] = [];
    const newFloats: FloatingDamageText[] = [];
    const newDefeatedChampions: DefeatedChampionEntity[] = [];
    let hasChanges = false;

    state.minions.forEach((minion) => {
      const effects = minion.statusEffects;
      if (!effects || effects.length === 0) {
        remainingMinions.push(minion);
        return;
      }

      let nextHp = minion.hp ?? minion.maxHp ?? CHAMPION_DEFAULT_MAX_HP;
      const nextEffects: ActiveStatusEffect[] = [];

      effects.forEach((effect) => {
        if (effect.expiresAt <= now) {
          hasChanges = true;
          return;
        }
        const isDot = DAMAGE_OVER_TIME_EFFECTS.includes(effect.type) && (effect.tickDamage ?? 0) > 0;
        const isTickDue = now - effect.lastTickAt >= STATUS_EFFECT_CONSTANTS.DOT_TICK_INTERVAL_MS;
        if (!isDot || !isTickDue) {
          nextEffects.push(effect);
          return;
        }

        hasChanges = true;
        const tickDamage = effect.tickDamage ?? 0;
        nextHp -= tickDamage;
        nextEffects.push({ ...effect, lastTickAt: now });

        const livePos = getLiveMinionScreenPos(minion.id);
        const posX = livePos ? livePos.x : screenW * 0.5;
        const posY = livePos ? livePos.y : screenH * 0.65;
        const presentation = STATUS_EFFECT_PRESENTATION[effect.type];
        newFloats.push({
          id: `dot-${now}-${minion.id}-${effect.type}`,
          amount: tickDamage,
          text: `${presentation.icon} -${tickDamage}`,
          damageType: DAMAGE_TYPE.NORMAL,
          team: minion.team,
          playerName: minion.championName,
          x: posX - screenW * 0.5,
          y: posY - screenH * 0.5,
          color: presentation.color,
          scale: STATUS_EFFECT_CONSTANTS.FLOATING_TEXT_SCALE,
          createdAt: now,
        });
      });

      if (nextHp > 0) {
        remainingMinions.push({ ...minion, hp: nextHp, statusEffects: nextEffects });
        return;
      }

      hasChanges = true;
      const livePos = getLiveMinionScreenPos(minion.id);
      const worldPos = getLiveMinionPosition(minion.id) || minion.spawnPosition;
      newDefeatedChampions.push(
        buildDefeatedChampion(
          minion,
          worldPos,
          livePos ? livePos.x : screenW * 0.5,
          livePos ? livePos.y : screenH * 0.65,
          bossName,
          now
        )
      );
      playSound(SFX_EVENT.CHAMPION_DEATH);
      get().addLog(
        'BOSS',
        `💀 ${minion.championName} của ${minion.summonerName} gục ngã vì hiệu ứng của [${bossName}]!`,
        minion.team
      );
    });

    if (!hasChanges) return;

    const keepFloatingCount = Math.max(
      0,
      COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - newFloats.length
    );
    set((prev) => ({
      minions: remainingMinions,
      activeDefeatedChampions: [...prev.activeDefeatedChampions.slice(-8), ...newDefeatedChampions],
      floatingDamages: [
        ...(keepFloatingCount > 0 ? prev.floatingDamages.slice(-keepFloatingCount) : []),
        ...newFloats,
      ],
    }));
  },

  resetBoss: () => {
    const state = get();
    if (state.isSeriesEnded) {
      get().resetBO5Match();
      return;
    }
    audioService.setCombatMuted(false);
    playSound(SFX_EVENT.ROUND_START);
    get().addLog('BOSS', '🔄 Hồi sinh Boss về trạng thái ban đầu');
    set({
      bossHp: state.bossMaxHp,
      bossStatus: BOSS_STATUS.IDLE,
      isRoundIntermission: false,
      roundWinner: null,
      teamScoreBLG: 0,
      teamScoreGENG: 0,
      minions: [],
      activeBursts: [],
      activeHearts: [],
      activeProjectiles: [],
      activeShockwaves: [],
      activeMeteors: [],
      activeSlashes: [],
      activeSummonPortals: [],
      activeHitImpacts: [],
      activeGiftBanner: null,
      floatingDamages: [],
      activeDefeatedChampions: [],
      teamCombos: createInitialTeamCombos(),
      teamHeartMomentum: createInitialTeamHeartMomentum(),
      leaderboard: [],
      proLeaderboard: [],
      lastHitTeam: null,
      lastHitDamageType: null,
      bossAttackTargetTeam: null,
      bossDefeatedTimestamp: 0,
      bossEnragedEntranceTimestamp: 0,
      bossShield: null,
      triggeredShieldThresholds: [],
      bossShieldBrokenTimestamp: 0,
      bossPhase: BOSS_PHASE.ONE,
      bossPhaseChangedAt: 0,
      bossWeakPoint: null,
      lastWeakPointSpawnTimestamp: 0,
      finisherPlayerName: null,
      finisherTeam: null,
      rosterAttackTimestamps: {},
      rosterPlayerFury: createInitialRosterFury(state.activeTeams),
      lastFuryUltimatePlayerId: null,
    });
  },

  setBossHp: (hp: number) => {
    const currentTheme = get().gameTheme;
    const difficulty = BOSS_DIFFICULTY_SCALE[currentTheme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
    const enrageThreshold = difficulty.enrageThreshold;
    const max = get().bossMaxHp;
    const clampedHp = Math.max(0, Math.min(max, hp));
    const wasEnraged = get().bossHp > 0 && get().bossHp <= max * enrageThreshold;
    const isEnraged = clampedHp > 0 && clampedHp <= max * enrageThreshold;
    const isJustEnraged = !wasEnraged && isEnraged;
    const isDefeated = clampedHp <= 0;
    if (isDefeated) {
      audioService.setCombatMuted(true);
      soundManager.stopAll();
    }
    const status = resolveBossStatusFromHp(isDefeated, isEnraged);

    get().addLog('BOSS', `Chỉnh máu Boss về ${clampedHp.toLocaleString()} HP`);

    if (isJustEnraged) {
      const themeConfig = getThemeConfig(currentTheme);
      playSound(SFX_EVENT.BOSS_ENRAGE, { rateScale: themeConfig.audioPitchRate });
      get().triggerScreenShake(BOSS_ENRAGED_CONSTANTS.SCREEN_SHAKE_INTENSITY);
      get().triggerScreenFlash(BOSS_ENRAGED_CONSTANTS.SCREEN_FLASH_COLOR);
      get().addLog(
        'BOSS',
        `🔥 [CẢNH BÁO: ${themeConfig.bossName.toUpperCase()} CUỒNG NỘ!] Máu dưới ${Math.round(enrageThreshold * 100)}% - Sát thương & Tốc đánh tăng vọt!`
      );
    }

    set({
      bossHp: clampedHp,
      bossStatus: status,
      isRoundIntermission: isDefeated ? true : get().isRoundIntermission,
      minions: isDefeated ? [] : get().minions,
      activeProjectiles: isDefeated ? [] : get().activeProjectiles,
      activeFlyingArrows: isDefeated ? [] : get().activeFlyingArrows,
      activeSlashes: isDefeated ? [] : get().activeSlashes,
      activeMeteors: isDefeated ? [] : get().activeMeteors,
      bossDefeatedTimestamp: isDefeated ? Date.now() : 0,
      bossEnragedEntranceTimestamp: resolveEnragedEntranceTimestamp(
        isJustEnraged,
        isDefeated,
        get().bossEnragedEntranceTimestamp
      ),
    });
  },

  setBossStatus: (status: BossStatusType) => {
    get().addLog('BOSS', `Chuyển trạng thái Boss sang [${status}]`);
    set({ bossStatus: status });
  },
});
