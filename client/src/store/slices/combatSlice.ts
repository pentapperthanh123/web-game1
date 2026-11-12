import { StateCreator } from 'zustand';
import {
  BossShieldState,
  DamageBossOptions,
  FloatingDamageText,
  FlyingArrowEntity,
  GameState,
  HeartEntity,
  HitImpactEntity,
  ParticleBurst,
  ProjectileEntity,
  ShockwaveEntity,
  SlashEntity,
} from '../../types/game';
import {
  ARROW_VFX_CONFIG,
  AUTO_PRO_BATTLE_CONSTANTS,
  BOSS_DEFEAT_CONSTANTS,
  BOSS_DIFFICULTY_SCALE,
  BOSS_ENRAGED_CONSTANTS,
  BOSS_MECHANICS_CONSTANTS,
  BOSS_STATUS,
  BossStatusType,
  CHAMPION_SKILL_VFX_TYPE,
  COMBAT_VFX_CONSTANTS,
  DAMAGE_TYPE,
  DamageType,
  GAME_CONSTANTS,
  GAME_THEME,
  SUMMON_PERF_CONSTANTS,
  getChampionSkillVFX,
  getThemeConfig,
  TEAM_KEY,
  TeamType,
} from '../../constants/game';
import {
  findRosterPlayerInRoster,
  findSignatureChampionByPlayer,
  getTeamTheme,
} from '../../constants/teams';
import { SFX_EVENT } from '../../constants/sfx';
import { audioService } from '../../services/audioService';
import { soundManager, playSound } from '../../services/soundManager';
import { unprojectScreenToWorld } from '../../components/canvas/summon/summonShared';
import {
  createEmptyTeamHeartMomentum,
  createInitialTeamCombos,
  createInitialTeamHeartMomentum,
  DAMAGE_INTENSITY_MAP,
  getActiveHeartFuryMultiplier,
  isBattleHalted,
  isComboMilestoneReached,
  randomInRange,
  updateLeaderboardList,
  updateProLeaderboardList,
} from '../storeHelpers';

export type CombatSlice = Pick<
  GameState,
  | 'addPlayerFury'
  | 'consumeMinionAttackFury'
  | 'triggerAutoProAttack'
  | 'spawnFlyingArrow'
  | 'spawnProjectile'
  | 'damageBoss'
  | 'addLikes'
  | 'triggerScreenShake'
  | 'triggerScreenFlash'
  | 'triggerBossAttack'
  | 'spawnParticleBurst'
  | 'spawnSlash'
>;

const resolveFloatingTextColor = (damageType: DamageType, fallbackColor: string): string => {
  if (damageType === DAMAGE_TYPE.ULTIMATE) return '#fbbf24';
  if (damageType === DAMAGE_TYPE.CRIT) return '#fb7185';
  return fallbackColor;
};

const resolveEnragedTimestamp = (
  isJustEnraged: boolean,
  isDefeated: boolean,
  previousTimestamp: number,
  now: number
): number => {
  if (isJustEnraged) return now;
  if (isDefeated) return 0;
  return previousTimestamp;
};

const FLOATING_SCALE_MAP: Record<DamageType, number> = {
  [DAMAGE_TYPE.NORMAL]: COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_NORMAL,
  [DAMAGE_TYPE.CRIT]: COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_CRIT,
  [DAMAGE_TYPE.ULTIMATE]: COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_ULTIMATE,
};

let cachedBossRect: { left: number; top: number; width: number; height: number } | null = null;
let cachedBossRectAt = 0;

const getCachedBossRect = (): { left: number; top: number; width: number; height: number } | null => {
  if (typeof document === 'undefined') return null;
  const now = Date.now();
  if (cachedBossRect && now - cachedBossRectAt < SUMMON_PERF_CONSTANTS.BOSS_RECT_CACHE_MS) {
    return cachedBossRect;
  }
  const bossEl =
    document.getElementById('boss-monster-target') ||
    document.querySelector('[data-boss-hitbox="true"]');
  if (!bossEl) return null;
  const rect = bossEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  cachedBossRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  cachedBossRectAt = now;
  return cachedBossRect;
};

const resolveRosterAnchorScreenPos = (
  playerId: string | undefined,
  team: TeamType,
  activeRoster: { id: string }[]
): { x: number; y: number } => {
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 720;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 1280;

  const cardEl =
    typeof document !== 'undefined' && playerId
      ? document.getElementById(`roster-card-${playerId}`)
      : null;
  const avatarEl =
    typeof document !== 'undefined' && !cardEl && playerId
      ? document.getElementById(`roster-avatar-${playerId}`)
      : null;
  const collapsedEl =
    typeof document !== 'undefined' && !cardEl && !avatarEl
      ? document.getElementById(`roster-collapsed-${team}`)
      : null;
  const anchorEl = cardEl || avatarEl || collapsedEl;

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    return {
      x: team === TEAM_KEY.BLG ? rect.right + 4 : rect.left - 4,
      y: rect.top + rect.height / 2,
    };
  }

  const playerIndex = playerId ? activeRoster.findIndex((p) => p.id === playerId) : 2;
  const idx = playerIndex >= 0 ? playerIndex : 2;
  return {
    x: team === TEAM_KEY.BLG ? 52 : screenW - 52,
    y: Math.min(screenH * 0.48, 185 + idx * 42),
  };
};

/** Creates the combat damage, fury, projectiles, likes, and screen VFX slice. */
export const createCombatSlice: StateCreator<GameState, [], [], CombatSlice> = (set, get) => ({
  addPlayerFury: (playerId: string, amount: number) => {
    set((prev) => {
      const cur = prev.rosterPlayerFury[playerId] ?? 0;
      const next = Math.min(GAME_CONSTANTS.PRO_FURY.MAX_FURY, cur + amount);
      return {
        rosterPlayerFury: {
          ...prev.rosterPlayerFury,
          [playerId]: next,
        },
      };
    });
  },

  consumeMinionAttackFury: (minionId: string) => {
    const state = get();
    const targetMinion = state.minions.find((minion) => minion.id === minionId);
    if (!targetMinion) {
      return { isFullFury: false, nextFury: 0 };
    }

    const now = Date.now();
    const isFullFury = targetMinion.fury >= targetMinion.maxFury;
    const speedMultiplier = getActiveHeartFuryMultiplier(
      state.teamHeartMomentum[targetMinion.team],
      now
    );
    const furyGain = Math.round(GAME_CONSTANTS.MINION_FURY.GAIN_PER_ATTACK * speedMultiplier);
    const nextFury = isFullFury
      ? 0
      : Math.min(targetMinion.maxFury, targetMinion.fury + furyGain);

    set((prev) => ({
      minions: prev.minions.map((minion) =>
        minion.id === minionId ? { ...minion, fury: nextFury } : minion
      ),
    }));

    return { isFullFury, nextFury };
  },

  triggerAutoProAttack: (team: TeamType, playerIndex: number) => {
    const state = get();
    if (isBattleHalted(state)) {
      return;
    }

    const roster = state.activeTeams[team]?.roster;
    if (!roster || roster.length === 0) return;

    const player = roster[playerIndex % roster.length];
    const prevFury = state.rosterPlayerFury[player.id] ?? 0;
    const isFullFury = prevFury >= GAME_CONSTANTS.PRO_FURY.MAX_FURY;

    const bossFloorHp = Math.ceil(state.bossMaxHp * AUTO_PRO_BATTLE_CONSTANTS.BOSS_HP_FLOOR_PERCENT);
    if (!isFullFury && state.bossHp <= bossFloorHp) {
      return;
    }

    let finalDamage: number;
    let damageType: DamageType;

    if (isFullFury) {
      damageType = DAMAGE_TYPE.ULTIMATE;
      finalDamage = Math.round(
        AUTO_PRO_BATTLE_CONSTANTS.DAMAGE_MAX * GAME_CONSTANTS.PRO_FURY.FURY_ULTIMATE_DAMAGE_MULTIPLIER +
          randomInRange(600, 1800)
      );

      audioService.playDamageImpactSound(DAMAGE_TYPE.ULTIMATE, true);
      get().triggerScreenShake(0.45);

      get().addLog(
        'BOSS',
        `🔥 [SIÊU TUYỆT KỸ BẠO NỘ] ${player.name} (${player.role}) xả Full Nộ gây ${finalDamage.toLocaleString()} ST!`,
        team
      );
      get().addChatMessage(
        player.name,
        `🔥 BẠO NỘ TUYỆT KỸ: Gây ${finalDamage.toLocaleString()} ST!`,
        team,
        player.signatureChampion
      );
    } else {
      damageType = DAMAGE_TYPE.NORMAL;
      finalDamage = Math.round(
        randomInRange(
          AUTO_PRO_BATTLE_CONSTANTS.DAMAGE_MIN,
          AUTO_PRO_BATTLE_CONSTANTS.DAMAGE_MAX
        )
      );
    }

    const now = Date.now();
    const activeMomentumMultiplier = getActiveHeartFuryMultiplier(
      state.teamHeartMomentum[team],
      now
    );
    const furyGain = Math.round(
      GAME_CONSTANTS.PRO_FURY.FURY_GAIN_AUTO_ATTACK * activeMomentumMultiplier
    );
    const furyCap =
      activeMomentumMultiplier > 1
        ? GAME_CONSTANTS.PRO_FURY.MAX_FURY
        : GAME_CONSTANTS.PRO_FURY.FURY_AUTO_CAP;
    const nextFury = isFullFury ? 0 : Math.min(furyCap, prevFury + furyGain);

    const proLaneY = 1.65 - (playerIndex % 5) * 0.55;
    const activeRoster = state.activeTeams[team]?.roster ?? [];
    const playerScreenStart = resolveRosterAnchorScreenPos(player.id, team, activeRoster);
    const bossRect = getCachedBossRect();
    const proStart3D: [number, number, number] =
      unprojectScreenToWorld(playerScreenStart.x, playerScreenStart.y, 0.65) ?? [
        team === TEAM_KEY.BLG ? -2.9 : 2.9,
        proLaneY,
        0.7,
      ];
    const bossTarget3D: [number, number, number] | undefined = bossRect
      ? unprojectScreenToWorld(
          bossRect.left + bossRect.width * 0.5,
          bossRect.top + bossRect.height * 0.48,
          COMBAT_VFX_CONSTANTS.BOSS_TARGET[2]
        ) ?? undefined
      : undefined;

    const activeTeamTheme = getTeamTheme(state.activeTeams[team]?.colorTheme);
    const proBeamColor = isFullFury ? '#fbbf24' : activeTeamTheme.primaryHex;

    get().spawnFlyingArrow(
      player.signatureChampion,
      team,
      isFullFury,
      playerScreenStart,
      undefined,
      player.id
    );
    get().spawnProjectile(proStart3D, proBeamColor, isFullFury, bossTarget3D);

    set((prev) => ({
      rosterAttackTimestamps: {
        ...prev.rosterAttackTimestamps,
        [player.id]: now,
      },
      lastFuryUltimatePlayerId: isFullFury ? player.id : prev.lastFuryUltimatePlayerId,
      rosterPlayerFury: {
        ...prev.rosterPlayerFury,
        [player.id]: nextFury,
      },
    }));

    setTimeout(() => {
      const latest = get();
      if (isBattleHalted(latest)) {
        return;
      }

      latest.damageBoss(
        finalDamage,
        team,
        isFullFury ? `🔥 ${player.name} (Bạo Nộ)` : `${player.name} (${player.role})`,
        damageType,
        {
          excludeFromLeaderboard: true,
          proPlayer: player,
          suppressCombo: true,
          minHpFloorPercent: AUTO_PRO_BATTLE_CONSTANTS.BOSS_HP_FLOOR_PERCENT,
        }
      );
    }, AUTO_PRO_BATTLE_CONSTANTS.FLYING_ARROW_HIT_DELAY_MS);
  },

  spawnFlyingArrow: (
    championName: string,
    team: TeamType,
    isCrit = false,
    customStart?: { x: number; y: number },
    customTarget?: { x: number; y: number },
    sourcePlayerId?: string
  ) => {
    const currentState = get();
    if (isBattleHalted(currentState)) {
      return;
    }

    const resolvedChampion = findSignatureChampionByPlayer(championName) || championName;
    const skillVfx = getChampionSkillVFX(resolvedChampion, isCrit);
    audioService.playChampionSkillSound(
      isCrit ? skillVfx.type : CHAMPION_SKILL_VFX_TYPE.ARROW,
      isCrit,
      team
    );
    const activeRoster = currentState.activeTeams[team]?.roster ?? [];
    const rosterPlayer =
      (sourcePlayerId ? activeRoster.find((p) => p.id === sourcePlayerId) : undefined) ||
      findRosterPlayerInRoster(resolvedChampion, activeRoster);
    const fallbackStart = resolveRosterAnchorScreenPos(rosterPlayer?.id, team, activeRoster);
    const startX = customStart ? customStart.x : fallbackStart.x;
    const startY = customStart ? customStart.y : fallbackStart.y;

    const bossRect = !customTarget ? getCachedBossRect() : null;

    let targetX: number;
    let targetY: number;

    if (customTarget) {
      targetX = customTarget.x;
      targetY = customTarget.y;
    } else if (bossRect) {
      targetX = bossRect.left + bossRect.width * 0.5 + (Math.random() - 0.5) * 44;
      targetY = bossRect.top + bossRect.height * 0.48 + (Math.random() - 0.5) * 36;
    } else {
      const fallbackW = typeof window !== 'undefined' ? window.innerWidth : 720;
      const fallbackH = typeof window !== 'undefined' ? window.innerHeight : 1280;
      targetX = fallbackW * 0.5 + (Math.random() - 0.5) * 50;
      targetY = fallbackH * 0.59 + (Math.random() - 0.5) * 40;
    }

    const teamTheme = getTeamTheme(currentState.activeTeams[team]?.colorTheme);
    const color = isCrit ? teamTheme.critHex : teamTheme.primaryHex;

    const newArrow: FlyingArrowEntity = {
      id: `arrow-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceRosterId: rosterPlayer?.id,
      championName,
      vfxType: skillVfx.type,
      skillName: skillVfx.skillName,
      team,
      startX,
      startY,
      targetX,
      targetY,
      isCrit,
      color,
      glowColor: skillVfx.glowColor || color,
      coreColor: skillVfx.coreColor || '#ffffff',
      createdAt: Date.now(),
      durationMs: ARROW_VFX_CONFIG.DURATION_MS,
    };

    set((state) => ({
      activeFlyingArrows: [
        ...state.activeFlyingArrows.slice(-(ARROW_VFX_CONFIG.MAX_ACTIVE - 1)),
        newArrow,
      ],
    }));
  },

  triggerScreenShake: (intensity = 0.5) => {
    set({
      screenShakeTimestamp: Date.now(),
      screenShakeIntensity: intensity,
    });
  },

  triggerScreenFlash: (color: string) => {
    set({
      screenFlashColor: color,
      screenFlashTimestamp: Date.now(),
    });
  },

  triggerBossAttack: (_type: 'ROAR' | 'LIGHTNING' = 'ROAR') => {
    const state = get();
    if (isBattleHalted(state)) {
      return;
    }

    audioService.playHitSound();

    const isEnraged = state.bossStatus === BOSS_STATUS.ENRAGED;
    const waveColor = isEnraged ? '#ef4444' : '#a855f7';
    const shakeIntensity = isEnraged ? 0.95 : 0.65;

    get().triggerScreenShake(shakeIntensity);
    get().triggerScreenFlash(isEnraged ? '#dc2626' : '#7c3aed');

    const newWave: ShockwaveEntity = {
      id: `boss-wave-${Date.now()}`,
      timestamp: Date.now(),
      color: waveColor,
      maxRadius: 7.2,
    };

    get().addLog(
      'BOSS',
      isEnraged
        ? '🔥 BARON CUỒNG NỘ: Đại Lôi Kích Hư Không quét sạch đấu trường!'
        : '⚡ BARON PHẢN ĐÒN: Tiếng Gầm Hư Không làm rung chuyển mặt đất!'
    );

    set((prev) => ({
      bossAttackTimestamp: Date.now(),
      bossAttackTargetTeam: 'ALL',
      activeShockwaves: [...prev.activeShockwaves.slice(-5), newWave],
    }));
  },

  spawnParticleBurst: (origin: [number, number, number], color: string, intensity: number) => {
    const newBurst: ParticleBurst = {
      id: `burst-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      origin,
      color,
      intensity,
    };
    set((state) => ({
      activeBursts: [
        ...state.activeBursts.slice(-(COMBAT_VFX_CONSTANTS.PARTICLES.MAX_BURST_QUEUE - 1)),
        newBurst,
      ],
    }));
  },

  spawnSlash: (position: [number, number, number], color: string, isCrit = false) => {
    const newSlash: SlashEntity = {
      id: `slash-${Date.now()}-${Math.random()}`,
      position,
      rotationZ: Math.random() * Math.PI * 2,
      tiltX: (Math.random() - 0.5) * 0.7,
      tiltY: (Math.random() - 0.5) * 0.7,
      isCrit,
      color,
      scale: isCrit ? 1.25 + Math.random() * 0.4 : 0.85 + Math.random() * 0.35,
      createdAt: Date.now(),
    };
    set((state) => ({
      activeSlashes: [
        ...state.activeSlashes.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_ACTIVE_SLASHES - 1)),
        newSlash,
      ],
    }));
  },

  addLikes: (count: number, team: TeamType, userName = 'Viewer') => {
    const state = get();
    const newLikesBLG = team === TEAM_KEY.BLG ? state.totalLikesBLG + count : state.totalLikesBLG;
    const newLikesGENG = team === TEAM_KEY.GENG ? state.totalLikesGENG + count : state.totalLikesGENG;

    if (isBattleHalted(state)) {
      set({
        totalLikesBLG: newLikesBLG,
        totalLikesGENG: newLikesGENG,
      });
      return;
    }

    audioService.playHeartChime();

    const now = Date.now();
    const prevMomentum = state.teamHeartMomentum[team] ?? createEmptyTeamHeartMomentum();
    const isRapidTap =
      prevMomentum.lastTapAt > 0 &&
      now - prevMomentum.lastTapAt <= GAME_CONSTANTS.MINION_FURY.HEART_TAP_RAPID_WINDOW_MS;
    const isWithinSpeedWindow =
      prevMomentum.lastTapAt > 0 &&
      now - prevMomentum.lastTapAt <= GAME_CONSTANTS.MINION_FURY.HEART_TAP_SPEED_WINDOW_MS;

    const batchFactor = Math.min(3, Math.max(1, Math.ceil(count / 5)));
    let nextMultiplier = 1;
    let nextBurstCount = 1;

    if (isRapidTap) {
      nextBurstCount = prevMomentum.burstCount + 1;
      nextMultiplier = Math.min(
        GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_MAX,
        Number(
          (
            prevMomentum.multiplier +
            GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_STEP * batchFactor
          ).toFixed(2)
        )
      );
    } else if (isWithinSpeedWindow) {
      nextBurstCount = prevMomentum.burstCount + 1;
      nextMultiplier = Math.min(
        GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_MAX,
        Number(
          (
            prevMomentum.multiplier +
            GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_STEP * 0.5 * batchFactor
          ).toFixed(2)
        )
      );
    } else if (count >= 3) {
      nextMultiplier = Math.min(
        GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_MAX,
        Number((1 + GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_STEP).toFixed(2))
      );
    }

    const minionHeartFuryGain = Math.round(
      GAME_CONSTANTS.MINION_FURY.HEART_TAP_GAIN_BASE * batchFactor * nextMultiplier
    );
    const proHeartFuryGain = Math.round(
      GAME_CONSTANTS.PRO_FURY.FURY_GAIN_HEART_TAP * batchFactor * nextMultiplier
    );

    const heartsToSpawn = Math.min(count, 8);
    const newHearts: HeartEntity[] = [];
    const colors = GAME_CONSTANTS.HEARTS.COLORS;

    for (let i = 0; i < heartsToSpawn; i++) {
      const teamTheme = getTeamTheme(state.activeTeams[team]?.colorTheme);
      const targetColor = teamTheme.secondaryHex;
      const randomColor =
        Math.random() < 0.6 ? targetColor : colors[Math.floor(Math.random() * colors.length)];
      newHearts.push({
        id: `heart-${now}-${Math.random()}`,
        x: (team === TEAM_KEY.BLG ? -2.2 : 2.2) + (Math.random() - 0.5) * 1.5,
        y: -3.5,
        z: 3.5 + Math.random() * 1.5,
        speed:
          GAME_CONSTANTS.HEARTS.FLOAT_SPEED_MIN +
          Math.random() *
            (GAME_CONSTANTS.HEARTS.FLOAT_SPEED_MAX - GAME_CONSTANTS.HEARTS.FLOAT_SPEED_MIN),
        color: randomColor,
        scale: 0.18 + Math.random() * 0.14,
        swaySpeed: 2.0 + Math.random() * 3.0,
        createdAt: now,
      });
    }

    const likeDamage = count * 15;
    get().damageBoss(likeDamage, team, `${userName} (Thả tim)`, 'NORMAL');

    set((prev) => {
      const nextRosterFury = { ...prev.rosterPlayerFury };
      for (const rosterPlayer of state.activeTeams[team]?.roster ?? []) {
        const curFury = nextRosterFury[rosterPlayer.id] ?? 0;
        nextRosterFury[rosterPlayer.id] = Math.min(
          GAME_CONSTANTS.PRO_FURY.MAX_FURY,
          curFury + proHeartFuryGain
        );
      }

      return {
        totalLikesBLG: newLikesBLG,
        totalLikesGENG: newLikesGENG,
        activeHearts: [...prev.activeHearts.slice(-GAME_CONSTANTS.HEARTS.MAX_ACTIVE), ...newHearts],
        minions: prev.minions.map((minion) =>
          minion.team === team
            ? { ...minion, fury: Math.min(minion.maxFury, minion.fury + minionHeartFuryGain) }
            : minion
        ),
        rosterPlayerFury: nextRosterFury,
        teamHeartMomentum: {
          ...prev.teamHeartMomentum,
          [team]: {
            multiplier: nextMultiplier,
            lastTapAt: now,
            burstCount: nextBurstCount,
          },
        },
      };
    });

    const prevTotalLikes = state.totalLikesBLG + state.totalLikesGENG;
    const newTotalLikes = newLikesBLG + newLikesGENG;
    const milestoneThreshold = GAME_CONSTANTS.HEART_MILESTONE.THRESHOLD;
    const prevMilestoneTier = Math.floor(prevTotalLikes / milestoneThreshold);
    const newMilestoneTier = Math.floor(newTotalLikes / milestoneThreshold);

    const isHeartMilestoneEnabled = get().overlayVisibility.heartMilestone !== false;
    if (isHeartMilestoneEnabled && newMilestoneTier > prevMilestoneTier) {
      get().triggerHeartMilestoneHeal(newMilestoneTier * milestoneThreshold);
    }
  },

  spawnProjectile: (
    from: [number, number, number],
    color: string,
    isCrit = false,
    customTarget?: [number, number, number]
  ) => {
    const currentState = get();
    if (isBattleHalted(currentState)) {
      return;
    }

    audioService.playLaserSound();

    const [baseTargetX, baseTargetY, baseTargetZ] = customTarget ?? COMBAT_VFX_CONSTANTS.BOSS_TARGET;
    const newProj: ProjectileEntity = {
      id: `proj-${Date.now()}-${Math.random()}`,
      startX: from[0],
      startY: from[1],
      startZ: from[2],
      targetX: baseTargetX + randomInRange(-0.18, 0.18),
      targetY: baseTargetY + randomInRange(-0.15, 0.18),
      targetZ: baseTargetZ + randomInRange(-0.1, 0.1),
      arcHeight: isCrit ? randomInRange(0.35, 0.65) : randomInRange(0.1, 0.28),
      isCrit,
      color,
      glowColor: color,
      coreColor: '#ffffff',
      createdAt: Date.now(),
    };
    set((state) => ({
      activeProjectiles: [
        ...state.activeProjectiles.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.PROJECTILE_MAX_ACTIVE - 1)),
        newProj,
      ],
    }));
  },

  damageBoss: (
    amount: number,
    team: TeamType,
    playerName: string,
    damageType: DamageType = DAMAGE_TYPE.NORMAL,
    options?: DamageBossOptions
  ) => {
    const state = get();
    if (isBattleHalted(state)) {
      return;
    }

    const now = Date.now();
    const isWeakPointActive =
      !options?.proPlayer &&
      state.bossWeakPoint !== null &&
      now < state.bossWeakPoint.expiresAt;

    const damageMultiplier = state.championDamageMultiplier ?? 1;
    const baseWithGlobalMultiplier = Math.max(1, Math.round(amount * damageMultiplier));
    const scaledAmount = isWeakPointActive
      ? Math.round(baseWithGlobalMultiplier * BOSS_MECHANICS_CONSTANTS.WEAK_POINT.DAMAGE_MULTIPLIER)
      : baseWithGlobalMultiplier;
    const effectiveDamageType: DamageType =
      isWeakPointActive && damageType === DAMAGE_TYPE.NORMAL ? DAMAGE_TYPE.CRIT : damageType;

    // 1. If Boss Shield is active, damage Shield first before Boss HP
    if (state.bossShield && now < state.bossShield.expiresAt) {
      const absorbedDamage = Math.max(0, Math.min(state.bossShield.hp, scaledAmount));
      const remainingShieldHp = state.bossShield.hp - absorbedDamage;
      const isShieldBroken = remainingShieldHp <= 0;

      audioService.playDamageImpactSound(
        isShieldBroken ? DAMAGE_TYPE.ULTIMATE : effectiveDamageType,
        true
      );

      const shieldHitFloat: FloatingDamageText = {
        id: `float-${now}-${Math.random()}`,
        amount: absorbedDamage,
        text: isShieldBroken
          ? `💥 -${BOSS_MECHANICS_CONSTANTS.SHIELD.BREAK_BONUS_DAMAGE.toLocaleString()}`
          : `🛡️ -${absorbedDamage.toLocaleString()}`,
        damageType: isShieldBroken ? DAMAGE_TYPE.ULTIMATE : effectiveDamageType,
        team,
        playerName,
        x: randomInRange(-76, 76),
        y: randomInRange(-44, 34),
        color: isShieldBroken ? '#fbbf24' : '#38bdf8',
        scale: isShieldBroken
          ? COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_ULTIMATE
          : COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_NORMAL,
        createdAt: now,
      };

      const nextScoreBLG = team === TEAM_KEY.BLG ? state.teamScoreBLG + absorbedDamage : state.teamScoreBLG;
      const nextScoreGENG = team === TEAM_KEY.GENG ? state.teamScoreGENG + absorbedDamage : state.teamScoreGENG;
      const nextViewerBoard = options?.excludeFromLeaderboard
        ? state.leaderboard
        : updateLeaderboardList(state.leaderboard, playerName, team, absorbedDamage);
      const nextProBoard = options?.proPlayer
        ? updateProLeaderboardList(state.proLeaderboard, options.proPlayer, absorbedDamage)
        : state.proLeaderboard;

      if (isShieldBroken) {
        const floorHpAfterBreak = options?.minHpFloorPercent
          ? Math.ceil(state.bossMaxHp * options.minHpFloorPercent)
          : 0;
        const hpAfterBreak = Math.max(
          floorHpAfterBreak,
          state.bossHp - BOSS_MECHANICS_CONSTANTS.SHIELD.BREAK_BONUS_DAMAGE
        );

        get().triggerScreenShake(0.9);
        get().triggerScreenFlash('#38bdf8');
        get().spawnParticleBurst([0, 0.4, 0.6], '#38bdf8', COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE);
        get().addLog(
          'BOSS',
          `💥 ${playerName} phá vỡ KHIÊN NĂNG LƯỢNG! Boss choáng nhận ${BOSS_MECHANICS_CONSTANTS.SHIELD.BREAK_BONUS_DAMAGE.toLocaleString()} ST!`,
          team
        );

        set((prev) => ({
          bossHp: hpAfterBreak,
          bossShield: null,
          bossShieldBrokenTimestamp: now,
          bossHitTimestamp: now,
          lastHitTeam: team,
          lastHitDamageType: DAMAGE_TYPE.ULTIMATE,
          teamScoreBLG: nextScoreBLG,
          teamScoreGENG: nextScoreGENG,
          leaderboard: nextViewerBoard,
          proLeaderboard: nextProBoard,
          floatingDamages: [
            ...prev.floatingDamages.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - 1)),
            shieldHitFloat,
          ],
        }));
        return;
      }

      get().spawnParticleBurst([0, 0.4, 0.7], '#38bdf8', 0.8);
      set((prev) => ({
        bossShield: prev.bossShield ? { ...prev.bossShield, hp: remainingShieldHp } : null,
        bossHitTimestamp: now,
        lastHitTeam: team,
        lastHitDamageType: effectiveDamageType,
        teamScoreBLG: nextScoreBLG,
        teamScoreGENG: nextScoreGENG,
        leaderboard: nextViewerBoard,
        proLeaderboard: nextProBoard,
        floatingDamages: [
          ...prev.floatingDamages.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - 1)),
          shieldHitFloat,
        ],
      }));
      return;
    }

    const floorHp = options?.minHpFloorPercent
      ? Math.ceil(state.bossMaxHp * options.minHpFloorPercent)
      : 0;
    const newHp = Math.max(floorHp, state.bossHp - scaledAmount);
    const effectiveDamage = Math.max(0, state.bossHp - newHp);
    if (effectiveDamage <= 0) return;

    audioService.playDamageImpactSound(effectiveDamageType, effectiveDamageType === DAMAGE_TYPE.CRIT);

    const difficulty = BOSS_DIFFICULTY_SCALE[state.gameTheme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
    const enrageThreshold = difficulty.enrageThreshold;
    const wasEnraged = state.bossHp > 0 && state.bossHp <= state.bossMaxHp * enrageThreshold;
    const isEnraged = newHp > 0 && newHp <= state.bossMaxHp * enrageThreshold;
    const isJustEnraged = !wasEnraged && isEnraged;
    const isDefeated = newHp <= 0;

    // 2. Check Boss Shield trigger thresholds
    let nextShield: BossShieldState | null = state.bossShield;
    let nextTriggeredShieldThresholds = state.triggeredShieldThresholds;
    if (!isDefeated && !nextShield) {
      for (const threshold of BOSS_MECHANICS_CONSTANTS.SHIELD.TRIGGER_THRESHOLDS) {
        const thresholdHp = state.bossMaxHp * threshold;
        const alreadyTriggered = state.triggeredShieldThresholds.includes(threshold);
        if (!alreadyTriggered && newHp <= thresholdHp) {
          nextShield = {
            hp: BOSS_MECHANICS_CONSTANTS.SHIELD.SHIELD_HP,
            maxHp: BOSS_MECHANICS_CONSTANTS.SHIELD.SHIELD_HP,
            createdAt: now,
            expiresAt: now + BOSS_MECHANICS_CONSTANTS.SHIELD.DURATION_MS,
          };
          nextTriggeredShieldThresholds = [...state.triggeredShieldThresholds, threshold];
          playSound(SFX_EVENT.BOSS_SHIELD, { rateScale: getThemeConfig(state.gameTheme).audioPitchRate });
          get().addLog(
            'BOSS',
            `🛡️ [KHIÊN NĂNG LƯỢNG] Boss bật khiên ${BOSS_MECHANICS_CONSTANTS.SHIELD.SHIELD_HP.toLocaleString()} HP! Phá trong 12s kẻo Boss hồi máu!`
          );
          break;
        }
      }
    }

    if (isJustEnraged) {
      const themeConfig = getThemeConfig(state.gameTheme);
      playSound(SFX_EVENT.BOSS_ENRAGE, { rateScale: themeConfig.audioPitchRate });
      get().triggerScreenShake(BOSS_ENRAGED_CONSTANTS.SCREEN_SHAKE_INTENSITY);
      get().triggerScreenFlash(BOSS_ENRAGED_CONSTANTS.SCREEN_FLASH_COLOR);
      get().addLog(
        'BOSS',
        `🔥 [CẢNH BÁO: ${themeConfig.bossName.toUpperCase()} CUỒNG NỘ!] Máu dưới ${Math.round(enrageThreshold * 100)}% - Sát thương & Tốc đánh tăng vọt!`
      );
    }

    let nextStatus: BossStatusType = BOSS_STATUS.HIT;
    if (isDefeated) {
      nextStatus = BOSS_STATUS.DEFEATED;
    } else if (isEnraged) {
      nextStatus = BOSS_STATUS.ENRAGED;
    }

    const newBLGScore = team === TEAM_KEY.BLG ? state.teamScoreBLG + effectiveDamage : state.teamScoreBLG;
    const newGENGScore = team === TEAM_KEY.GENG ? state.teamScoreGENG + effectiveDamage : state.teamScoreGENG;
    const topLeaderboard = options?.excludeFromLeaderboard
      ? state.leaderboard
      : updateLeaderboardList(state.leaderboard, playerName, team, effectiveDamage);
    const nextProLeaderboard = options?.proPlayer
      ? updateProLeaderboardList(state.proLeaderboard, options.proPlayer, effectiveDamage)
      : state.proLeaderboard;

    const nextBO5Score = { ...state.bo5Score };
    let nextRoundWinner: TeamType | null = state.roundWinner;
    let nextIsSeriesEnded = state.isSeriesEnded;
    let nextSeriesWinner: TeamType | null = state.seriesWinner;

    if (isDefeated && !state.roundWinner && !state.isSeriesEnded) {
      nextRoundWinner = newBLGScore >= newGENGScore ? TEAM_KEY.BLG : TEAM_KEY.GENG;
      nextBO5Score[nextRoundWinner] = (nextBO5Score[nextRoundWinner] || 0) + 1;
      const winnerTag = state.activeTeams[nextRoundWinner].shortTag;
      const leftTag = state.activeTeams[TEAM_KEY.BLG].shortTag;
      const rightTag = state.activeTeams[TEAM_KEY.GENG].shortTag;
      if (nextBO5Score[nextRoundWinner] >= state.bo5TargetWins) {
        nextIsSeriesEnded = true;
        nextSeriesWinner = nextRoundWinner;
        get().addLog(
          'SYSTEM',
          `🏆 ${winnerTag} VÔ ĐỊCH CKTG 2026 BO5 (${nextBO5Score.BLG} - ${nextBO5Score.GENG})!`
        );
      } else {
        get().addLog(
          'SYSTEM',
          `🚩 ${winnerTag} THẮNG VÁN ${state.currentRound}! (BO5: ${leftTag} ${nextBO5Score.BLG} - ${nextBO5Score.GENG} ${rightTag})`
        );
      }
    }

    const dynamicTeamTheme = getTeamTheme(state.activeTeams[team]?.colorTheme);
    const teamPalette = {
      primary: dynamicTeamTheme.primaryHex,
      secondary: dynamicTeamTheme.secondaryHex,
    };
    const isCritOrUlt =
      effectiveDamageType === DAMAGE_TYPE.CRIT || effectiveDamageType === DAMAGE_TYPE.ULTIMATE;
    const hitPoint: [number, number, number] = [
      randomInRange(-0.65, 0.65),
      0.35 + randomInRange(-0.4, 0.45),
      0.65 + randomInRange(-0.2, 0.25),
    ];

    const impactColor = effectiveDamageType === DAMAGE_TYPE.ULTIMATE ? '#fbbf24' : teamPalette.secondary;
    if (isCritOrUlt) {
      get().spawnSlash(hitPoint, impactColor, true);
    }
    get().spawnParticleBurst(hitPoint, impactColor, DAMAGE_INTENSITY_MAP[effectiveDamageType]);

    const newShockwaves: ShockwaveEntity[] = [...state.activeShockwaves];
    if (isCritOrUlt) {
      newShockwaves.push({
        id: `shock-${now}-${Math.random()}`,
        timestamp: now,
        color: effectiveDamageType === DAMAGE_TYPE.ULTIMATE ? '#fbbf24' : '#ef4444',
        maxRadius:
          effectiveDamageType === DAMAGE_TYPE.ULTIMATE
            ? COMBAT_VFX_CONSTANTS.DAMAGE.ULTIMATE_SHOCKWAVE_RADIUS
            : COMBAT_VFX_CONSTANTS.DAMAGE.CRIT_SHOCKWAVE_RADIUS,
      });
      get().triggerScreenShake(effectiveDamageType === DAMAGE_TYPE.ULTIMATE ? 1.2 : 0.55);
    }

    const safeAmount = Number.isFinite(effectiveDamage) ? effectiveDamage : 0;
    const textColor = resolveFloatingTextColor(effectiveDamageType, teamPalette.secondary);
    const textScale = FLOATING_SCALE_MAP[effectiveDamageType];

    const newFloat: FloatingDamageText = {
      id: `float-${now}-${Math.random()}`,
      amount: safeAmount,
      text: isWeakPointActive ? `🎯 -${safeAmount.toLocaleString()}` : `-${safeAmount.toLocaleString()}`,
      damageType: effectiveDamageType,
      team,
      playerName,
      x: randomInRange(-88, 88),
      y: randomInRange(-48, 44),
      color: textColor,
      scale: textScale,
      createdAt: now,
    };

    const newImpact: HitImpactEntity = {
      id: `impact-${now}-${Math.random()}`,
      offsetX: randomInRange(-36, 36),
      offsetY: randomInRange(-34, 30),
      color: impactColor,
      damageType: effectiveDamageType,
      team,
      createdAt: now,
    };

    let nextTeamCombos = state.teamCombos;
    if (!options?.suppressCombo) {
      const currentTeamCombo = state.teamCombos[team];
      const isTeamComboActive =
        currentTeamCombo.lastTimestamp > 0 &&
        now - currentTeamCombo.lastTimestamp <= COMBAT_VFX_CONSTANTS.DAMAGE.COMBO_WINDOW_MS;
      const nextCount = isTeamComboActive ? currentTeamCombo.count + 1 : 1;
      const nextDamage = isTeamComboActive ? currentTeamCombo.damage + safeAmount : safeAmount;

      nextTeamCombos = {
        ...state.teamCombos,
        [team]: {
          count: nextCount,
          damage: nextDamage,
          lastTimestamp: now,
        },
      };

      if (isComboMilestoneReached(nextCount)) {
        playSound(SFX_EVENT.COMBO_LEVEL_UP);
      }
    }

    if (isDefeated) {
      audioService.setCombatMuted(true);
      soundManager.stopAll();
      const themeConfig = getThemeConfig(state.gameTheme);
      const defeatColor = themeConfig.colors.enragedHex || themeConfig.colors.primaryHex;

      playSound(SFX_EVENT.BOSS_DEFEAT, { rateScale: themeConfig.audioPitchRate });
      get().triggerScreenShake(BOSS_DEFEAT_CONSTANTS.SCREEN_SHAKE_INTENSITY);
      get().triggerScreenFlash(teamPalette.primary);

      get().addLog('BOSS', `🏆 [TIÊU DIỆT BOSS] ${themeConfig.bossName} ĐÃ BỊ HẠ GỤC!`);

      newShockwaves.push(
        {
          id: `defeat-wave-1-${now}`,
          timestamp: now,
          color: defeatColor,
          maxRadius: BOSS_DEFEAT_CONSTANTS.SHOCKWAVE_RADIUS_INNER,
        },
        {
          id: `defeat-wave-2-${now}`,
          timestamp: now + BOSS_DEFEAT_CONSTANTS.BURST_STAGGER_MS,
          color: teamPalette.primary,
          maxRadius: BOSS_DEFEAT_CONSTANTS.SHOCKWAVE_RADIUS_MID,
        },
        {
          id: `defeat-wave-3-${now}`,
          timestamp: now + BOSS_DEFEAT_CONSTANTS.BURST_STAGGER_MS * 2,
          color: '#ffffff',
          maxRadius: BOSS_DEFEAT_CONSTANTS.SHOCKWAVE_RADIUS_OUTER,
        }
      );

      get().spawnParticleBurst([0, 0.5, 0.6], defeatColor, COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE);
      get().spawnParticleBurst([-1.1, 0.9, 0.4], teamPalette.primary, COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE);
      get().spawnParticleBurst([1.1, 0.2, 0.4], '#ffffff', COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE);
    }

    set((prev) => ({
      bossHp: newHp,
      bossStatus: nextStatus,
      isRoundIntermission: isDefeated ? true : prev.isRoundIntermission,
      bossHitTimestamp: now,
      lastHitTeam: team,
      lastHitDamageType: effectiveDamageType,
      bossDefeatedTimestamp: isDefeated ? now : prev.bossDefeatedTimestamp,
      bossEnragedEntranceTimestamp: resolveEnragedTimestamp(
        isJustEnraged,
        isDefeated,
        prev.bossEnragedEntranceTimestamp,
        now
      ),
      bossShield: isDefeated ? null : nextShield,
      triggeredShieldThresholds: nextTriggeredShieldThresholds,
      bossWeakPoint: isDefeated ? null : prev.bossWeakPoint,
      finisherPlayerName: isDefeated ? playerName : prev.finisherPlayerName,
      finisherTeam: isDefeated ? team : prev.finisherTeam,
      activeBossSkillBanner: isDefeated ? null : prev.activeBossSkillBanner,
      teamScoreBLG: newBLGScore,
      teamScoreGENG: newGENGScore,
      leaderboard: topLeaderboard,
      proLeaderboard: nextProLeaderboard,
      activeShockwaves: newShockwaves.slice(-8),
      floatingDamages: isDefeated
        ? []
        : [
            ...prev.floatingDamages.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - 1)),
            newFloat,
          ],
      activeHitImpacts: isDefeated
        ? []
        : [
            ...prev.activeHitImpacts.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_ACTIVE_HIT_IMPACTS - 1)),
            newImpact,
          ],
      teamCombos: isDefeated ? createInitialTeamCombos() : nextTeamCombos,
      teamHeartMomentum: isDefeated ? createInitialTeamHeartMomentum() : prev.teamHeartMomentum,
      minions: isDefeated ? [] : prev.minions,
      activeSummonPortals: isDefeated ? [] : prev.activeSummonPortals,
      activeProjectiles: isDefeated ? [] : prev.activeProjectiles,
      activeFlyingArrows: isDefeated ? [] : prev.activeFlyingArrows,
      activeSlashes: isDefeated ? [] : prev.activeSlashes,
      activeMeteors: isDefeated ? [] : prev.activeMeteors,
      bo5Score: nextBO5Score,
      roundWinner: nextRoundWinner,
      isSeriesEnded: nextIsSeriesEnded,
      seriesWinner: nextSeriesWinner,
    }));
  },
});
