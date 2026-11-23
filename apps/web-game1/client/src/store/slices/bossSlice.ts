import { StateCreator } from 'zustand';
import { announceChampionDeaths } from '../combatMomentStore';
import {
  ActiveStatusEffect,
  BossMeteorRainRequest,
  DefeatedChampionEntity,
  GameState,
  HeartMilestoneBanner,
  MeteorEntity,
  MinionEntity,
} from '../../types/game';
import {
  ActiveBossSkillBanner,
  BOSS_SKILL_VFX,
  BOSS_STATUS_EFFECT,
  BossSkillDefinition,
  BossSkillImpactPoint,
} from '../../types/bossSkill';
import {
  BOSS_DEFEAT_CONSTANTS,
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
  LEGACY_GEN_SLOT,
  TEAM_SLOT_LEFT,
  TEAM_SLOT_RIGHT,
  DAMAGE_SOURCE,
} from '../../constants/game';
import {
  BOSS_SKILL_STORAGE_KEY,
  CHAMPION_DEFAULT_MAX_HP,
  getBossSkillsByTheme,
} from '../../constants/bossSkills';
import { BOSS_PHASE, BOSS_PHASE_RULES, resolveBossPhase } from '../../constants/bossPhases';
import {
  BOSS_LIFESTEAL_CAP,
  resolveSkillDamageScale,
  resolveSkillHitDamage,
} from '../../constants/bossSkillBalance';
import { buildSkillImpactWaves } from '../bossSkillWaves';
import {
  BOSS_METEOR_RAIN_CONSTANTS,
  BOSS_PHASE_SHIFT_SHAKE_INTENSITY,
  BOSS_SKILL_HIT_RULES,
  CHAMPION_HIT_FEEDBACK,
} from '../../constants/bossSkillVfx';
import {
  DAMAGE_OVER_TIME_EFFECTS,
  STATUS_EFFECT_CONSTANTS,
  STATUS_EFFECT_PRESENTATION,
} from '../../constants/bossStatusEffects';
import { BOSS_SKILL_VFX_SFX, BOSS_VOICE_KIND, SFX_EVENT } from '../../constants/sfx';
import { playBossVoice } from '../../services/bossVoice';
import { playBossUltimateFeedback } from '../bossUltimateFeedback';
import { audioService } from '../../services/audioService';
import { soundManager, playSound } from '../../services/soundManager';
import { getLiveMinionPositionSnapshot } from '../../services/minionPositionRegistry';
import {
  buildChampionStatusEffect,
  buildDefeatedChampion,
  pickBossSkillIndex,
  pickSkillHit,
} from '../bossSkillResolver';
import {
  createInitialRosterFury,
  createInitialSummonQueue,
  createInitialTeamCombos,
  createInitialTeamHeartMomentum,
  createInitialTeamScores,
  isBattleHalted,
} from '../storeHelpers';
import {
  PendingBossSkillImpact,
  applyBossSkillImpact,
  resolveChampionWorldPosition,
  showChampionDamage,
} from '../bossSkillImpact';
import { isCurrentRoundIntroActive } from '../roundIntroStore';
import { resetMatchLeaderboard } from '../sessionLeaderboardStore';
import { deployQueuedMinions, resolveSummonTurnLimits } from '../summonQueueHelper';
import { createEmptyMinionCollections, rebuildMinionCollections } from '../minionMapHelpers';
import { workerSetTimeout } from '../../services/workerScheduler';

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
/** One request per METEOR_RAIN archetype of the skill (its main VFX and/or any layer). */
const getMeteorRainRequests = (
  skill: BossSkillDefinition,
  now: number,
  impactPoints: readonly BossSkillImpactPoint[]
): BossMeteorRainRequest[] => {
  const mainRequest: BossMeteorRainRequest[] =
    skill.vfxType === BOSS_SKILL_VFX.METEOR_RAIN
      ? [
          {
            color: skill.color,
            glowColor: skill.vfxParams?.secondaryColor,
            count: skill.vfxParams?.count ?? BOSS_METEOR_RAIN_CONSTANTS.DEFAULT_COUNT,
            startAt: now,
            impactPoints,
          },
        ]
      : [];
  const layerRequests = (skill.vfxParams?.layers ?? [])
    .filter((layer) => layer.vfxType === BOSS_SKILL_VFX.METEOR_RAIN)
    .map((layer) => ({
      color: layer.color ?? skill.color,
      glowColor: layer.secondaryColor ?? skill.vfxParams?.secondaryColor,
      count: layer.count ?? BOSS_METEOR_RAIN_CONSTANTS.DEFAULT_COUNT,
      startAt: now + (layer.delayMs ?? 0),
      impactPoints,
    }));
  return [...mainRequest, ...layerRequests];
};

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

    const leftScore = state.teamScores?.[TEAM_SLOT_LEFT] ?? state.teamScoreBLG;
    const rightScore = state.teamScores?.[TEAM_SLOT_RIGHT] ?? state.teamScoreGENG;
    const dominantTeam = leftScore >= rightScore ? TEAM_SLOT_LEFT : TEAM_SLOT_RIGHT;
    const baseDamage = BOSS_MECHANICS_CONSTANTS.WEAK_POINT.POKE_BASE_DAMAGE;
    set({ bossWeakPoint: null });
    get().damageBoss(baseDamage, dominantTeam, playerName, DAMAGE_TYPE.CRIT, { source: DAMAGE_SOURCE.WEAK_POINT_POKE });
  },

  tickBossMechanics: () => {
    const state = get();
    const now = Date.now();
    if (isBattleHalted(state) || isCurrentRoundIntroActive()) {
      return;
    }

    if (state.bossShield && now >= state.bossShield.expiresAt) {
      const healAmount = BOSS_MECHANICS_CONSTANTS.SHIELD.HEAL_PENALTY_AMOUNT;
      const healedHp = Math.min(state.bossMaxHp, state.bossHp + healAmount);
      const nextStatus =
        healedHp <= state.bossMaxHp * BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT
          ? BOSS_STATUS.ENRAGED
          : BOSS_STATUS.IDLE;

      playBossVoice(state.gameTheme, BOSS_VOICE_KIND.ROAR);
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
    if (state.minions.length === 0 || isBattleHalted(state) || isCurrentRoundIntroActive()) {
      return;
    }

    const normalizedTarget = targetTeam === LEGACY_GEN_SLOT ? TEAM_SLOT_RIGHT : targetTeam;

    const updatedMinions = state.minions.map((minion) => {
      if (normalizedTarget !== 'ALL' && minion.team !== normalizedTarget) {
        return minion;
      }
      const curHp = minion.hp ?? CHAMPION_DEFAULT_MAX_HP;
      const nextHp = Math.min(minion.maxHp ?? CHAMPION_DEFAULT_MAX_HP, curHp + amount);
      return { ...minion, hp: nextHp };
    });

    audioService.playHeartChime();
    set({
      minions: updatedMinions,
    });
  },

  triggerHeartMilestoneHeal: (milestoneCount: number) => {
    const state = get();
    if (isBattleHalted(state) || isCurrentRoundIntroActive()) {
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
    if (isBattleHalted(state) || isCurrentRoundIntroActive()) {
      return;
    }
    if (Date.now() < state.bossStaggerUntil) return;

    const skills = getBossSkillsByTheme(state.gameTheme);
    if (!skills || skills.length === 0) return;

    const phase = resolveBossPhase(state.bossHp, state.bossMaxHp);
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
    const damageScale = resolveSkillDamageScale({
      damageMultiplier: state.bossSkillConfig.damageMultiplier || 1.0,
      difficultyMultiplier: difficulty.skillDamageMultiplier || 1.0,
      phase,
      isEnraged,
    });
    const actualDamage = resolveSkillHitDamage(skill.baseDamage, damageScale);
    const now = Date.now();
    const themeConfig = getThemeConfig(state.gameTheme);
    const bossName = themeConfig.bossName;

    const currentMinions = state.minions;
    const gracePeriodMs = GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS;
    const vulnerableMinions = currentMinions.filter(
      (m) => now - (m.createdAt || 0) >= gracePeriodMs
    );
    // Damage follows the area the effect is drawn in (attacked wing / around the boss / whole arena)
    const skillHit = pickSkillHit(
      vulnerableMinions,
      skill,
      (minion) => getLiveMinionPositionSnapshot(minion.id) || minion.spawnPosition
    );
    const { targetedMinionIds, targetTeam } = skillHit;
    const championDebuff = buildChampionStatusEffect(skill.statusEffect, skill.id, phase, now, actualDamage);

    const banner: ActiveBossSkillBanner = {
      skillId: skill.id,
      skillName: skill.name,
      vietnameseName: skill.vietnameseName,
      damage: actualDamage,
      color: skill.color,
      isUltimate: skill.isUltimate,
      bossName,
      timestamp: now,
      iconName: skill.iconName,
      targetTeam,
      vfxType: skill.vfxType,
      vfxParams: skill.vfxParams,
      statusEffectType: skill.statusEffect?.type,
      impactPoints: skillHit.impactPoints,
      impactPositions: skillHit.impactPositions,
      targetedMinionIds: Array.from(targetedMinionIds).slice(0, BOSS_SKILL_HIT_RULES.MAX_IMPACT_POINTS),
    };

    const archetypeSound = BOSS_SKILL_VFX_SFX[skill.vfxType];
    if (skill.isUltimate) {
      // Opening kick, a rumble as long as the VFX, one sample per layer and a thump per ground hit
      playBossUltimateFeedback(get, skill, themeConfig.audioPitchRate);
      get().triggerScreenFlash(skill.color);
      playSound(SFX_EVENT.BOSS_ULTIMATE, { rateScale: themeConfig.audioPitchRate });
      // The boss's own roar over the shared boom gives every ultimate its owner's voice
      playBossVoice(state.gameTheme, BOSS_VOICE_KIND.ROAR);
    } else {
      get().triggerScreenShake(0.5);
    }
    // One skill voice per cast: the archetype layer when it exists; ultimates already have their own sting
    if (archetypeSound) {
      playSound(archetypeSound, { rateScale: themeConfig.audioPitchRate });
    } else if (!skill.isUltimate) {
      playSound(SFX_EVENT.BOSS_SKILL, { rateScale: themeConfig.audioPitchRate });
    }

    getMeteorRainRequests(skill, now, skillHit.impactPoints).forEach((request) =>
      get().spawnBossMeteorRain(request)
    );

    set({
      bossAttackTimestamp: now,
      bossAttackTargetTeam: targetTeam,
      activeBossSkillBanner: banner,
      bossSkillRotationIndex: (state.bossSkillRotationIndex + 1) % skills.length,
    });

    // Damage lands when the effect reaches the champions, never at the cast itself; an ultimate built
    // from several layers hurts once per layer, each at the moment that layer lands
    const lifestealBudget = { remainingHp: Math.round(state.bossMaxHp * BOSS_LIFESTEAL_CAP.MAX_BOSS_HP_RATIO) };
    buildSkillImpactWaves(skill).forEach((wave) => {
      const pendingImpact: PendingBossSkillImpact = {
        skill,
        damage: Math.max(1, Math.round(actualDamage * wave.damageShare)),
        targetedMinionIds,
        championDebuff: wave.isFirst ? championDebuff : null,
        isFirstWave: wave.isFirst,
        lifestealBudget,
        bossName,
      };
      workerSetTimeout(() => applyBossSkillImpact(set, get, pendingImpact), wave.delayMs);
    });
  },

  spawnBossMeteorRain: ({ color, glowColor, count, startAt, impactPoints }) => {
    const newMeteors: MeteorEntity[] = Array.from({ length: count }, (_, index) => {
      // The first meteors fall on the champions the skill hurts, the rest scatter over the arena
      const impactPoint = impactPoints[index];
      const targetX = impactPoint ? impactPoint[0] : (Math.random() - 0.5) * BOSS_METEOR_RAIN_CONSTANTS.SPREAD_X;
      const targetZ = impactPoint ? impactPoint[1] : (Math.random() - 0.5) * BOSS_METEOR_RAIN_CONSTANTS.SPREAD_Z;
      return {
        id: `boss-meteor-${startAt}-${index}`,
        start: [
          targetX + (Math.random() - 0.5) * 2,
          BOSS_METEOR_RAIN_CONSTANTS.START_HEIGHT,
          targetZ - 2,
        ],
        target: [targetX, BOSS_METEOR_RAIN_CONSTANTS.GROUND_Y, targetZ],
        color,
        glowColor,
        coreColor: '#ffffff',
        createdAt: startAt + index * BOSS_METEOR_RAIN_CONSTANTS.STAGGER_MS,
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
    const bossName = getThemeConfig(state.gameTheme).bossName;

    const remainingMinions: MinionEntity[] = [];
    const newDefeatedChampions: DefeatedChampionEntity[] = [];
    let hasChanges = false;

    state.minions.forEach((minion) => {
      const effects = minion.statusEffects;
      if (!effects || effects.length === 0) {
        remainingMinions.push(minion);
        return;
      }

      let nextHp = minion.hp ?? minion.maxHp ?? CHAMPION_DEFAULT_MAX_HP;
      let tickDamageTaken = 0;
      let tickColor: string = CHAMPION_HIT_FEEDBACK.DAMAGE_COLOR;
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
        tickDamageTaken += tickDamage;
        tickColor = effect.color;
        nextEffects.push({ ...effect, lastTickAt: now });
      });

      // Every burn / poison tick shows its number on the champion, so the HP loss is never silent
      const screenPoint =
        tickDamageTaken > 0 ? showChampionDamage(minion, tickDamageTaken, nextHp <= 0, tickColor, now) : null;

      if (nextHp > 0) {
        remainingMinions.push({ ...minion, hp: nextHp, statusEffects: nextEffects });
        return;
      }

      hasChanges = true;
      const defeatPoint = screenPoint ?? showChampionDamage(minion, 0, true, tickColor, now);
      newDefeatedChampions.push(
        buildDefeatedChampion(minion, resolveChampionWorldPosition(minion), defeatPoint.x, defeatPoint.y, bossName, now)
      );
      get().addLog(
        'BOSS',
        `💀 ${minion.championName} của ${minion.summonerName} gục ngã vì hiệu ứng của [${bossName}]!`,
        minion.team
      );
    });

    if (!hasChanges) return;

    // Tự động xuất trận tiếp viện từ hàng đợi nếu có tướng gục ngã vì hiệu ứng
    announceChampionDeaths(newDefeatedChampions.length, now, remainingMinions.length);
    const deployed = deployQueuedMinions(
      remainingMinions,
      state.summonQueue,
      state.lastSummonTurnTimestamps,
      now,
      state.activeTeams,
      resolveSummonTurnLimits(state.participationRuleConfig)
    );

    const effectCollections = rebuildMinionCollections(deployed.nextMinions);
    set((prev) => ({
      minions: deployed.nextMinions,
      ...effectCollections,
      summonQueue: deployed.nextQueue,
      lastSummonTurnTimestamps: deployed.nextLastTurnTimestamps,
      activeSummonPortals: [
        ...prev.activeSummonPortals,
        ...deployed.newPortals,
      ],
      activeDefeatedChampions: [...prev.activeDefeatedChampions, ...newDefeatedChampions].slice(
        -COMBAT_VFX_CONSTANTS.SUMMON.MAX_ACTIVE_DEFEATED
      ),
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
    resetMatchLeaderboard();
    get().addLog('BOSS', '🔄 Hồi sinh Boss về trạng thái ban đầu');
    set({
      bossHp: state.bossMaxHp,
      bossStatus: BOSS_STATUS.IDLE,
      isRoundIntermission: false,
      roundWinner: null,
      teamScores: createInitialTeamScores(),
      teamScoreBLG: 0,
      teamScoreGENG: 0,
      minions: [],
      ...createEmptyMinionCollections(),
      summonQueue: createInitialSummonQueue(),
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
      finisherAvatarUrl: null,
      finisherGiftName: null,
      finisherCoins: null,
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
      if (get().bossHp > 0) {
        // Phase 1: Boss death cry, then Phase 2: Cinematic explosion, then Phase 3: Victory sound
        playSound(SFX_EVENT.BOSS_DEATH_CRY);
        workerSetTimeout(() => {
          playSound(SFX_EVENT.BOSS_DEFEAT);
        }, BOSS_DEFEAT_CONSTANTS.BURST_STAGGER_MS);
        workerSetTimeout(() => {
          playSound(SFX_EVENT.VICTORY);
        }, BOSS_DEFEAT_CONSTANTS.BURST_STAGGER_MS * 2);
        get().triggerScreenShake(BOSS_DEFEAT_CONSTANTS.SCREEN_SHAKE_INTENSITY);
        get().triggerScreenFlash('#fbbf24');
      }
      audioService.setCombatMuted(true);
      soundManager.stopAll();
    }
    const status = resolveBossStatusFromHp(isDefeated, isEnraged);

    get().addLog('BOSS', `Chỉnh máu Boss về ${clampedHp.toLocaleString()} HP`);

    if (isJustEnraged) {
      const themeConfig = getThemeConfig(currentTheme);
      playBossVoice(currentTheme, BOSS_VOICE_KIND.ENRAGE);
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
