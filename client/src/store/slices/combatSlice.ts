import { StateCreator } from 'zustand';
import { resolveComboSoundRate } from '../../constants/game';
import { recordRoundDamage } from '../roundDamageTracker';
import { recordSessionDamage } from '../sessionLeaderboardStore';
import { trackQuestProgress } from '../communityQuestRewards';
import { scaleBossDamage } from '../bossDamageScaling';
import { QUEST_KIND } from '../../constants/game';
import {
  addChampionshipTitle,
  getMatchupTitleCount,
  persistChampionshipTally,
} from '../championshipTally';
import {
  AdminEventLog,
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
import { isRenderThrottled, workerSetTimeout } from '../../services/workerScheduler';
import {
  ARROW_VFX_CONFIG,
  AUTO_PRO_BATTLE_CONSTANTS,
  BOSS_DEFEAT_CONSTANTS,
  BOSS_DIFFICULTY_SCALE,
  BOSS_ENRAGED_CONSTANTS,
  BOSS_RETALIATION_WAVE,
  BOSS_MECHANICS_CONSTANTS,
  BOSS_STATUS,
  BossStatusType,
  CHAMPION_SKILL_VFX_TYPE,
  COMBAT_VFX_CONSTANTS,
  DAMAGE_SOURCE,
  DamageSource,
  DAMAGE_TYPE,
  DamageType,
  GAME_CONSTANTS,
  GAME_THEME,
  SUMMON_PERF_CONSTANTS,
  getChampionSkillVFX,
  isMeleeChampionName,
  getThemeConfig,
  TEAM_SLOT_LEFT,
  TEAM_SLOT_RIGHT,
  TeamType,
} from '../../constants/game';
import {
  findRosterPlayerInRoster,
  findSignatureChampionByPlayer,
  getTeamTheme,
} from '../../constants/teams';
import { BOSS_VOICE_KIND, SFX_EVENT } from '../../constants/sfx';
import { playBossVoice } from '../../services/bossVoice';
import { audioService } from '../../services/audioService';
import { soundManager, playSound } from '../../services/soundManager';
import {
  createEmptyTeamHeartMomentum,
  createInitialSummonQueue,
  createInitialTeamCombos,
  createInitialTeamHeartMomentum,
  createInitialTeamScores,
  DAMAGE_INTENSITY_MAP,
  getActiveHeartFuryMultiplier,
  isBattleHalted,
  isComboMilestoneReached,
  randomInRange,
  updateLeaderboardList,
  updateProLeaderboardList,
  appendIfCapacity,
} from '../storeHelpers';
import { pickScreenRumble } from '../screenRumble';
import { decideHitFeedback } from '../hitFeedbackAggregator';
import { isCurrentRoundIntroActive } from '../roundIntroStore';
import { isRoundOvertimeActive } from '../roundClockStore';
import i18n from '../../i18n';

export type CombatSlice = Pick<
  GameState,
  | 'addPlayerFury'
  | 'consumeMinionAttackFury'
  | 'triggerAutoProAttack'
  | 'endRoundByTimeout'
  | 'spawnFlyingArrow'
  | 'spawnProjectile'
  | 'damageBoss'
  | 'addLikes'
  | 'triggerScreenShake'
  | 'triggerScreenRumble'
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

const ROSTER_ANCHOR_EDGE_GAP_PX = 4;
const cachedRosterAnchors = new Map<string, { x: number; y: number; at: number }>();

/**
 * Every champion attack reads its roster card position; with a crowd that is dozens of
 * getBoundingClientRect calls per frame, each forcing a layout while the DOM is changing.
 * Roster cards barely move, so their anchor is reused for the same window as the boss rect.
 */
const getCachedAnchorPos = (anchorEl: HTMLElement, team: TeamType): { x: number; y: number } => {
  const now = Date.now();
  const cacheKey = `${anchorEl.id}:${team}`;
  const cached = cachedRosterAnchors.get(cacheKey);
  if (cached && now - cached.at < SUMMON_PERF_CONSTANTS.BOSS_RECT_CACHE_MS) return cached;

  const rect = anchorEl.getBoundingClientRect();
  const anchor = {
    x: team === TEAM_SLOT_LEFT ? rect.right + ROSTER_ANCHOR_EDGE_GAP_PX : rect.left - ROSTER_ANCHOR_EDGE_GAP_PX,
    y: rect.top + rect.height / 2,
    at: now,
  };
  cachedRosterAnchors.set(cacheKey, anchor);
  return anchor;
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
    return getCachedAnchorPos(anchorEl, team);
  }

  const playerIndex = playerId ? activeRoster.findIndex((p) => p.id === playerId) : 2;
  const idx = playerIndex >= 0 ? playerIndex : 2;
  return {
    x: team === TEAM_SLOT_LEFT ? 52 : screenW - 52,
    y: Math.min(screenH * 0.48, 185 + idx * 42),
  };
};

/** Caps a list by dropping its oldest entries; used for short-lived overlays that may be cut. */
const resolveNextCappedList = <T>(
  current: T[],
  incoming: T,
  maxItems: number,
  isCleared: boolean,
  shouldAdd: boolean
): T[] => {
  if (isCleared) return [];
  if (!shouldAdd) return current;
  return [...current.slice(-(maxItems - 1)), incoming];
};

const formatHitText = (amount: number, hitCount: number, isWeakPoint: boolean): string => {
  const base = `-${amount.toLocaleString()}`;
  const withCount = hitCount > 1 ? `${base} ×${hitCount}` : base;
  return isWeakPoint ? `🎯 ${withCount}` : withCount;
};

/** Left team's numbers float left of the boss centre, right team's to the right. */
const resolveTeamFloatX = (team: TeamType): number => {
  const offset = randomInRange(COMBAT_VFX_CONSTANTS.DAMAGE.FLOAT_SIDE_MIN_X, COMBAT_VFX_CONSTANTS.DAMAGE.FLOAT_SIDE_MAX_X);
  return team === TEAM_SLOT_LEFT ? -offset : offset;
};

const resolveMergedTextScale = (baseScale: number, hitCount: number): number => {
  const extraHits = Math.min(hitCount - 1, COMBAT_VFX_CONSTANTS.DAMAGE.MERGED_TEXT_SCALE_MAX_HITS);
  return baseScale * (1 + Math.max(0, extraHits) * COMBAT_VFX_CONSTANTS.DAMAGE.MERGED_TEXT_SCALE_STEP);
};

const pendingFuryByMinionId = new Map<string, number>();
let isFuryFlushScheduled = false;

const requestNextFrame = (callback: () => void): void => {
  if (!isRenderThrottled() && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => callback());
    return;
  }
  workerSetTimeout(callback, COMBAT_VFX_CONSTANTS.DAMAGE.FRAME_FALLBACK_MS);
};

const buildParticleBurst = (
  origin: [number, number, number],
  color: string,
  intensity: number,
  now = Date.now()
): ParticleBurst => ({
  id: `burst-${now}-${Math.random()}`,
  timestamp: now,
  origin,
  color,
  intensity,
});

const buildSlashEntity = (
  position: [number, number, number],
  color: string,
  isCrit = false,
  now = Date.now()
): SlashEntity => ({
  id: `slash-${now}-${Math.random()}`,
  position,
  rotationZ: Math.random() * Math.PI * 2,
  tiltX: (Math.random() - 0.5) * 0.7,
  tiltY: (Math.random() - 0.5) * 0.7,
  isCrit,
  color,
  scale: isCrit ? 1.25 + Math.random() * 0.4 : 0.85 + Math.random() * 0.35,
  createdAt: now,
});

const buildAdminLog = (
  type: AdminEventLog['type'],
  message: string,
  team?: TeamType,
  now = Date.now()
): AdminEventLog => ({
  id: `log-${now}-${Math.random().toString(36).substring(2, 5)}`,
  time: new Date(now).toLocaleTimeString('vi-VN', { hour12: false }),
  type,
  message,
  team,
});

const mergeCappedSlashes = (
  current: SlashEntity[],
  incoming: SlashEntity[],
  isCleared: boolean
): SlashEntity[] => {
  if (isCleared) return [];
  if (incoming.length === 0) return current;
  return [...current, ...incoming].slice(-COMBAT_VFX_CONSTANTS.DAMAGE.MAX_ACTIVE_SLASHES);
};

const mergeCappedBursts = (current: ParticleBurst[], incoming: ParticleBurst[]): ParticleBurst[] => {
  if (incoming.length === 0) return current;
  return [...current, ...incoming].slice(-COMBAT_VFX_CONSTANTS.PARTICLES.MAX_BURST_QUEUE);
};

/**
 * Many champions attack in the same frame. Rebuilding the whole `minions` array for each of them
 * made every attack O(N) and re-rendered all subscribers once per attack; this batches the fury
 * writes of a frame into a single array rebuild. Only `fury` is written, so a hp change that lands
 * in between is never reverted.
 */
const scheduleFuryFlush = (
  minionId: string,
  nextFury: number,
  set: (updater: (state: GameState) => Partial<GameState>) => void
): void => {
  pendingFuryByMinionId.set(minionId, nextFury);
  if (isFuryFlushScheduled) return;
  isFuryFlushScheduled = true;
  requestNextFrame(() => {
    isFuryFlushScheduled = false;
    if (pendingFuryByMinionId.size === 0) return;
    const furyUpdates = new Map(pendingFuryByMinionId);
    pendingFuryByMinionId.clear();
    set((prev) => ({
      minions: prev.minions.map((minion) => {
        const furyUpdate = furyUpdates.get(minion.id);
        if (furyUpdate === undefined || furyUpdate === minion.fury) return minion;
        return { ...minion, fury: furyUpdate };
      }),
    }));
  });
};

/** Creates the combat damage, fury, projectiles, likes, and screen VFX slice. */
/** Rally hits are a team pool ("Hội Quân (T1)"), not one viewer: they never enter the session board. */
const SESSION_EXCLUDED_SOURCES: ReadonlySet<DamageSource> = new Set([DAMAGE_SOURCE.RALLY]);

/** Feeds the live-session board with the team tag / colour of the hit (the session spans several matchups). */
const recordViewerSessionDamage = (
  state: GameState,
  playerName: string,
  team: TeamType,
  amount: number,
  options: DamageBossOptions | undefined
): void => {
  if (options?.excludeFromLeaderboard) return;
  if (options?.source && SESSION_EXCLUDED_SOURCES.has(options.source)) return;
  const teamProfile = state.activeTeams[team];
  recordSessionDamage(playerName, teamProfile?.shortTag ?? team, teamProfile?.colorTheme, amount);
};

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
    const targetMinion = state.minionMap?.get(minionId) || state.minions.find((minion) => minion.id === minionId);
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

    // The map is updated right away (callers read fury from it); the `minions` array is rebuilt once per frame
    state.minionMap?.set(minionId, { ...targetMinion, fury: nextFury });
    scheduleFuryFlush(minionId, nextFury, set);

    return { isFullFury, nextFury };
  },

  triggerAutoProAttack: (team: TeamType, playerIndex: number) => {
    const state = get();
    if (isBattleHalted(state) || isCurrentRoundIntroActive()) {
      return;
    }

    const roster = state.activeTeams[team]?.roster;
    if (!roster || roster.length === 0) return;

    const player = roster[playerIndex % roster.length];
    const prevFury = state.rosterPlayerFury[player.id] ?? 0;
    const isFullFury = prevFury >= GAME_CONSTANTS.PRO_FURY.MAX_FURY;

    // In overtime the pros may finish the boss, so a quiet room still gets a decided round
    const proHpFloorPercent = isRoundOvertimeActive() ? 0 : AUTO_PRO_BATTLE_CONSTANTS.BOSS_HP_FLOOR_PERCENT;
    const bossFloorHp = Math.ceil(state.bossMaxHp * proHpFloorPercent);
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

    const activeRoster = state.activeTeams[team]?.roster ?? [];
    const playerScreenStart = resolveRosterAnchorScreenPos(player.id, team, activeRoster);

    // Single definitive attack trajectory: Champion signature weapon arrow VFX
    get().spawnFlyingArrow(
      player.signatureChampion,
      team,
      isFullFury,
      playerScreenStart,
      undefined,
      player.id
    );

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

    workerSetTimeout(() => {
      const latest = get();
      if (isBattleHalted(latest)) {
        return;
      }

      if (isFullFury) latest.triggerScreenShake(AUTO_PRO_BATTLE_CONSTANTS.ULTIMATE_HIT_SHAKE);
      latest.damageBoss(
        finalDamage,
        team,
        isFullFury ? `🔥 ${player.name} (Bạo Nộ)` : `${player.name} (${player.role})`,
        damageType,
        {
          source: DAMAGE_SOURCE.PRO,
          excludeFromLeaderboard: true,
          proPlayer: player,
          suppressCombo: true,
          minHpFloorPercent: proHpFloorPercent,
        }
      );
    }, AUTO_PRO_BATTLE_CONSTANTS.FLYING_ARROW_HIT_DELAY_MS);
  },

  endRoundByTimeout: () => {
    const state = get();
    if (isBattleHalted(state) || state.bossHp <= 0) return;

    const scores = state.teamScores || createInitialTeamScores();
    // Same tie rule as a boss kill (damageBoss): left team wins a draw
    const leadingTeam = (scores[TEAM_SLOT_LEFT] || 0) >= (scores[TEAM_SLOT_RIGHT] || 0) ? TEAM_SLOT_LEFT : TEAM_SLOT_RIGHT;
    // The shield would absorb the finishing blow; time is up, so it goes away first
    set({ bossShield: null });
    get().damageBoss(
      state.bossHp,
      leadingTeam,
      i18n.t('RoundClock.timeUpFinisher', '⏱️ Hết giờ'),
      DAMAGE_TYPE.ULTIMATE,
      {
        source: DAMAGE_SOURCE.EXTERNAL,
        isPreScaled: true,
        excludeFromLeaderboard: true,
        excludeFromScore: true,
        suppressCombo: true,
      }
    );
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

    const activeTeamsList = Object.values(currentState.activeTeams);
    const resolvedChampion =
      findSignatureChampionByPlayer(championName, activeTeamsList) || championName;
    const isMelee = isMeleeChampionName(resolvedChampion);
    const skillVfx = getChampionSkillVFX(resolvedChampion, isCrit);
    const attackVfxType = isCrit
      ? skillVfx.type
      : isMelee
        ? CHAMPION_SKILL_VFX_TYPE.BLADE_SLASH
        : CHAMPION_SKILL_VFX_TYPE.ARROW;
    const attackSkillName = isCrit
      ? skillVfx.skillName
      : isMelee
        ? 'Nhát Chém Thường'
        : 'Đòn Đánh Thường';

    if (!isCrit) {
      playSound(isMelee ? SFX_EVENT.CHAMPION_ATTACK_MELEE : SFX_EVENT.CHAMPION_ATTACK);
    }

    audioService.playChampionSkillSound(
      attackVfxType,
      isCrit,
      team
    );
    const activeRoster = currentState.activeTeams[team]?.roster ?? [];
    const rosterPlayer =
      (sourcePlayerId ? activeRoster.find((p) => p.id === sourcePlayerId) : undefined) ||
      findRosterPlayerInRoster(resolvedChampion, activeRoster);
    // Champions pass their own screen position; only roster attacks need the roster card lookup
    const arrowStart = customStart ?? resolveRosterAnchorScreenPos(rosterPlayer?.id, team, activeRoster);
    const startX = arrowStart.x;
    const startY = arrowStart.y;

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
      vfxType: attackVfxType,
      skillName: attackSkillName,
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

    set((state) => {
      const nextArrows = appendIfCapacity(
        state.activeFlyingArrows,
        newArrow,
        ARROW_VFX_CONFIG.MAX_ACTIVE,
        newArrow.createdAt
      );
      if (!nextArrows) return state;
      return { activeFlyingArrows: nextArrows };
    });
  },

  triggerScreenShake: (intensity = 0.5) => {
    set({
      screenShakeTimestamp: Date.now(),
      screenShakeIntensity: intensity,
    });
  },

  triggerScreenRumble: (intensity: number, durationMs: number) => {
    set((state) => pickScreenRumble(state, intensity, durationMs, Date.now()));
  },

  triggerScreenFlash: (color: string) => {
    set({
      screenFlashColor: color,
      screenFlashTimestamp: Date.now(),
    });
  },

  triggerBossAttack: (_type: 'ROAR' | 'LIGHTNING' = 'ROAR') => {
    const state = get();
    if (isBattleHalted(state) || isCurrentRoundIntroActive()) {
      return;
    }

    const isEnraged = state.bossStatus === BOSS_STATUS.ENRAGED;
    const retaliationWave: ShockwaveEntity = {
      id: `boss-wave-${Date.now()}`,
      timestamp: Date.now(),
      color: getThemeConfig(state.gameTheme).colors.primaryHex,
      maxRadius: isEnraged ? BOSS_RETALIATION_WAVE.ENRAGED_RADIUS : BOSS_RETALIATION_WAVE.RADIUS,
      intensity: isEnraged ? BOSS_RETALIATION_WAVE.ENRAGED_INTENSITY : BOSS_RETALIATION_WAVE.INTENSITY,
    };
    const shakeIntensity = isEnraged ? 0.95 : 0.65;
    const pitchRate = getThemeConfig(state.gameTheme).audioPitchRate;

    get().triggerScreenShake(shakeIntensity);
    get().triggerScreenFlash(isEnraged ? '#dc2626' : '#7c3aed');

    audioService.playShockwaveExplosion(isEnraged ? 1.25 : 0.95, pitchRate, true);
    playBossVoice(state.gameTheme, isEnraged ? BOSS_VOICE_KIND.ENRAGE : BOSS_VOICE_KIND.ROAR);

    get().addLog(
      'BOSS',
      isEnraged
        ? '🔥 BARON CUỒNG NỘ: Đại Lôi Kích Hư Không quét sạch đấu trường!'
        : '⚡ BARON PHẢN ĐÒN: Tiếng Gầm Hư Không làm rung chuyển mặt đất!'
    );

    set((prev) => ({
      bossAttackTimestamp: Date.now(),
      bossAttackTargetTeam: 'ALL',
      activeShockwaves: [...prev.activeShockwaves.slice(-5), retaliationWave],
    }));
  },

  spawnParticleBurst: (origin: [number, number, number], color: string, intensity: number) => {
    const newBurst = buildParticleBurst(origin, color, intensity);
    set((state) => ({
      activeBursts: mergeCappedBursts(state.activeBursts, [newBurst]),
    }));
  },

  spawnSlash: (position: [number, number, number], color: string, isCrit = false) => {
    const newSlash = buildSlashEntity(position, color, isCrit);
    set((state) => ({
      activeSlashes: mergeCappedSlashes(state.activeSlashes, [newSlash], false),
    }));
  },

  addLikes: (count: number, team: TeamType, userName = 'Viewer') => {
    trackQuestProgress(get, team, QUEST_KIND.LIKES, count);
    const state = get();
    const newLikesLeft = team === TEAM_SLOT_LEFT ? state.totalLikesBLG + count : state.totalLikesBLG;
    const newLikesRight = team === TEAM_SLOT_RIGHT ? state.totalLikesGENG + count : state.totalLikesGENG;

    if (isBattleHalted(state)) {
      set({
        totalLikesBLG: newLikesLeft,
        totalLikesGENG: newLikesRight,
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
        x: (team === TEAM_SLOT_LEFT ? -2.2 : 2.2) + (Math.random() - 0.5) * 1.5,
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

    const likeDamage = count * GAME_CONSTANTS.TIKTOK_ENGAGEMENT.HEART_DAMAGE;
    get().damageBoss(likeDamage, team, `${userName} (Thả tim)`, DAMAGE_TYPE.NORMAL, { source: DAMAGE_SOURCE.HEART });

    set((prev) => {
      const nextRosterFury = { ...prev.rosterPlayerFury };
      for (const rosterPlayer of state.activeTeams[team]?.roster ?? []) {
        const curFury = nextRosterFury[rosterPlayer.id] ?? 0;
        nextRosterFury[rosterPlayer.id] = Math.min(
          GAME_CONSTANTS.PRO_FURY.MAX_FURY,
          curFury + proHeartFuryGain
        );
      }

      const hasTeamMinion = prev.minions.some((minion) => minion.team === team);
      const nextMinions = hasTeamMinion
        ? prev.minions.map((minion) => {
            if (minion.team !== team) return minion;
            const updated = { ...minion, fury: Math.min(minion.maxFury, minion.fury + minionHeartFuryGain) };
            prev.minionMap?.set(minion.id, updated);
            return updated;
          })
        : prev.minions;

      return {
        totalLikesBLG: newLikesLeft,
        totalLikesGENG: newLikesRight,
        activeHearts: [...prev.activeHearts.slice(-GAME_CONSTANTS.HEARTS.MAX_ACTIVE), ...newHearts],
        minions: nextMinions,
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
    const newTotalLikes = newLikesLeft + newLikesRight;
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
    customTarget?: [number, number, number],
    shouldPlaySound = true
  ) => {
    const currentState = get();
    if (isBattleHalted(currentState)) {
      return;
    }

    if (shouldPlaySound) {
      playSound(SFX_EVENT.CHAMPION_ATTACK);
      audioService.playAttackWhoosh(isCrit, false);
    }

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
    if (isBattleHalted(state) || isCurrentRoundIntroActive()) {
      return;
    }

    const now = Date.now();
    // Multipliers depend on where the hit comes from (see bossDamageScaling); overflow re-entries are already scaled
    const scaled = options?.isPreScaled
      ? { amount, isWeakPointHit: false }
      : scaleBossDamage(state, amount, team, options?.source ?? DAMAGE_SOURCE.EXTERNAL, now);
    const scaledAmount = scaled.amount;
    const isWeakPointActive = scaled.isWeakPointHit;
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

      const shieldFeedback = decideHitFeedback(team, absorbedDamage, now, isShieldBroken);
      const shieldHitFloat: FloatingDamageText = {
        id: `float-${now}-${Math.random()}`,
        amount: absorbedDamage,
        text: isShieldBroken
          ? `💥 -${BOSS_MECHANICS_CONSTANTS.SHIELD.BREAK_BONUS_DAMAGE.toLocaleString()}`
          : `🛡️ ${formatHitText(shieldFeedback.amount, shieldFeedback.hitCount, false)}`,
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

      const currentScores = state.teamScores || createInitialTeamScores();
      const nextTeamScores = {
        ...currentScores,
        [team]: (currentScores[team] || 0) + absorbedDamage,
      };
      const nextScoreLeft = nextTeamScores[TEAM_SLOT_LEFT];
      const nextScoreRight = nextTeamScores[TEAM_SLOT_RIGHT];
      recordViewerSessionDamage(state, playerName, team, absorbedDamage, options);
      const nextViewerBoard = options?.excludeFromLeaderboard
        ? state.leaderboard
        : updateLeaderboardList(state.leaderboard, playerName, team, absorbedDamage, options?.source);
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
        const breakBurst = buildParticleBurst(
          [0, 0.4, 0.6],
          '#38bdf8',
          COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE,
          now
        );
        const breakLog = buildAdminLog(
          'BOSS',
          `💥 ${playerName} phá vỡ KHIÊN NĂNG LƯỢNG! Boss choáng nhận ${BOSS_MECHANICS_CONSTANTS.SHIELD.BREAK_BONUS_DAMAGE.toLocaleString()} ST!`,
          team,
          now
        );

        set((prev) => ({
          bossHp: hpAfterBreak,
          bossShield: null,
          bossShieldBrokenTimestamp: now,
          bossHitTimestamp: now,
          lastHitTeam: team,
          lastHitDamageType: DAMAGE_TYPE.ULTIMATE,
          screenShakeTimestamp: now,
          screenShakeIntensity: 0.9,
          screenFlashColor: '#38bdf8',
          screenFlashTimestamp: now,
          activeBursts: mergeCappedBursts(prev.activeBursts, [breakBurst]),
          eventLogs: [breakLog, ...prev.eventLogs].slice(0, 100),
          teamScores: nextTeamScores,
          teamScoreBLG: nextScoreLeft,
          teamScoreGENG: nextScoreRight,
          leaderboard: nextViewerBoard,
          proLeaderboard: nextProBoard,
          floatingDamages: [
            ...prev.floatingDamages.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - 1)),
            shieldHitFloat,
          ],
        }));
        // The part of the hit the shield did not absorb carries on into the boss (it used to be lost:
        // a 1 000-coin gift landing on a shield dealt ~10 500 instead of 120 000)
        const overflowDamage = scaledAmount - absorbedDamage;
        if (overflowDamage > 0) {
          get().damageBoss(overflowDamage, team, playerName, damageType, { ...options, isPreScaled: true });
        }
        return;
      }

      const shieldHitBurst = shieldFeedback.shouldShow
        ? [buildParticleBurst([0, 0.4, 0.7], '#38bdf8', 0.8, now)]
        : [];
      set((prev) => ({
        bossShield: prev.bossShield ? { ...prev.bossShield, hp: remainingShieldHp } : null,
        bossHitTimestamp: now,
        lastHitTeam: team,
        lastHitDamageType: effectiveDamageType,
        activeBursts: mergeCappedBursts(prev.activeBursts, shieldHitBurst),
        teamScores: nextTeamScores,
        teamScoreBLG: nextScoreLeft,
        teamScoreGENG: nextScoreRight,
        leaderboard: nextViewerBoard,
        proLeaderboard: nextProBoard,
        floatingDamages: resolveNextCappedList(
          prev.floatingDamages,
          shieldHitFloat,
          COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE,
          false,
          shieldFeedback.shouldShow
        ),
      }));
      return;
    }

    const floorHp = options?.minHpFloorPercent
      ? Math.ceil(state.bossMaxHp * options.minHpFloorPercent)
      : 0;
    // A capped hit (big gift) removes at most `hpDamageCap` HP but still counts in full for the score
    const hpDamage = options?.hpDamageCap ? Math.min(scaledAmount, options.hpDamageCap) : scaledAmount;
    const newHp = Math.max(floorHp, state.bossHp - hpDamage);
    const hpLost = Math.max(0, state.bossHp - newHp);
    if (hpLost <= 0) return;
    const effectiveDamage = options?.hpDamageCap ? scaledAmount : hpLost;

    const pendingLogs: AdminEventLog[] = [];
    const pendingBursts: ParticleBurst[] = [];
    const pendingSlashes: SlashEntity[] = [];
    let pendingShakeIntensity: number | null = null;
    let pendingFlashColor: string | null = null;

    const isCritHit = effectiveDamageType === DAMAGE_TYPE.CRIT;
    playSound(isCritHit ? SFX_EVENT.CRIT_HIT : SFX_EVENT.CHAMPION_HIT);
    audioService.playDamageImpactSound(effectiveDamageType, isCritHit);

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
          pendingLogs.unshift(
            buildAdminLog(
              'BOSS',
              `🛡️ [KHIÊN NĂNG LƯỢNG] Boss bật khiên ${BOSS_MECHANICS_CONSTANTS.SHIELD.SHIELD_HP.toLocaleString()} HP! Phá trong 12s kẻo Boss hồi máu!`,
              undefined,
              now
            )
          );
          break;
        }
      }
    }

    if (isJustEnraged) {
      const themeConfig = getThemeConfig(state.gameTheme);
      playBossVoice(state.gameTheme, BOSS_VOICE_KIND.ENRAGE);
      pendingShakeIntensity = BOSS_ENRAGED_CONSTANTS.SCREEN_SHAKE_INTENSITY;
      pendingFlashColor = BOSS_ENRAGED_CONSTANTS.SCREEN_FLASH_COLOR;
      pendingLogs.unshift(
        buildAdminLog(
          'BOSS',
          `🔥 [CẢNH BÁO: ${themeConfig.bossName.toUpperCase()} CUỒNG NỘ!] Máu dưới ${Math.round(enrageThreshold * 100)}% - Sát thương & Tốc đánh tăng vọt!`,
          undefined,
          now
        )
      );
    }

    let nextStatus: BossStatusType = BOSS_STATUS.HIT;
    if (isDefeated) {
      nextStatus = BOSS_STATUS.DEFEATED;
    } else if (isEnraged) {
      nextStatus = BOSS_STATUS.ENRAGED;
    }

    const currentScores = state.teamScores || createInitialTeamScores();
    const nextTeamScores = options?.excludeFromScore
      ? currentScores
      : {
          ...currentScores,
          [team]: (currentScores[team] || 0) + effectiveDamage,
        };
    const newScoreLeft = nextTeamScores[TEAM_SLOT_LEFT];
    const newScoreRight = nextTeamScores[TEAM_SLOT_RIGHT];
    if (!options?.excludeFromLeaderboard) recordRoundDamage(playerName, team, effectiveDamage, options?.source);
    recordViewerSessionDamage(state, playerName, team, effectiveDamage, options);
    const topLeaderboard = options?.excludeFromLeaderboard
      ? state.leaderboard
      : updateLeaderboardList(state.leaderboard, playerName, team, effectiveDamage, options?.source);
    const nextProLeaderboard = options?.proPlayer
      ? updateProLeaderboardList(state.proLeaderboard, options.proPlayer, effectiveDamage)
      : state.proLeaderboard;

    const nextBO5Score = { ...state.bo5Score };
    let nextRoundWinner: TeamType | null = state.roundWinner;
    let nextIsSeriesEnded = state.isSeriesEnded;
    let nextSeriesWinner: TeamType | null = state.seriesWinner;
    let nextChampionshipTally = state.championshipTally;

    if (isDefeated && !state.roundWinner && !state.isSeriesEnded) {
      nextRoundWinner = newScoreLeft >= newScoreRight ? TEAM_SLOT_LEFT : TEAM_SLOT_RIGHT;
      nextBO5Score[nextRoundWinner] = (nextBO5Score[nextRoundWinner] || 0) + 1;
      const winnerTag = state.activeTeams[nextRoundWinner]?.shortTag ?? nextRoundWinner;
      const leftTag = state.activeTeams[TEAM_SLOT_LEFT]?.shortTag ?? TEAM_SLOT_LEFT;
      const rightTag = state.activeTeams[TEAM_SLOT_RIGHT]?.shortTag ?? TEAM_SLOT_RIGHT;
      if (nextBO5Score[nextRoundWinner] >= state.bo5TargetWins) {
        nextIsSeriesEnded = true;
        nextSeriesWinner = nextRoundWinner;
        const loserSlot = nextRoundWinner === TEAM_SLOT_LEFT ? TEAM_SLOT_RIGHT : TEAM_SLOT_LEFT;
        const winnerProfile = state.activeTeams[nextRoundWinner];
        nextChampionshipTally = addChampionshipTitle(
          state.championshipTally,
          winnerProfile,
          state.activeTeams[loserSlot]
        );
        persistChampionshipTally(nextChampionshipTally);
        const { leftTitles: winnerTitleCount } = getMatchupTitleCount(
          nextChampionshipTally,
          winnerProfile,
          state.activeTeams[loserSlot]
        );
        pendingLogs.unshift(
          buildAdminLog(
            'SYSTEM',
            `🏆 ${winnerTag} VÔ ĐỊCH CKTG 2026 ${state.seriesFormat} (${nextBO5Score[TEAM_SLOT_LEFT]} - ${nextBO5Score[TEAM_SLOT_RIGHT]})! Lần vô địch thứ ${winnerTitleCount} trước ${state.activeTeams[loserSlot]?.shortTag ?? loserSlot}.`,
            undefined,
            now
          )
        );
      } else {
        pendingLogs.unshift(
          buildAdminLog(
            'SYSTEM',
            `🚩 ${winnerTag} THẮNG VÁN ${state.currentRound}! (BO5: ${leftTag} ${nextBO5Score[TEAM_SLOT_LEFT]} - ${nextBO5Score[TEAM_SLOT_RIGHT]} ${rightTag})`,
            undefined,
            now
          )
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

    // Decided once per hit: crowds fire dozens of hits per second, so normal ones share one number/ring/burst
    const hitFeedback = decideHitFeedback(
      team,
      Number.isFinite(effectiveDamage) ? effectiveDamage : 0,
      now,
      isCritOrUlt || isWeakPointActive
    );

    const impactColor = effectiveDamageType === DAMAGE_TYPE.ULTIMATE ? '#fbbf24' : teamPalette.secondary;
    if (isCritOrUlt) {
      pendingSlashes.push(buildSlashEntity(hitPoint, impactColor, true, now));
    }
    if (hitFeedback.shouldShow) {
      pendingBursts.push(buildParticleBurst(hitPoint, impactColor, DAMAGE_INTENSITY_MAP[effectiveDamageType], now));
    }

    const newShockwaves: ShockwaveEntity[] = [...state.activeShockwaves];
    const isUltimateHit = effectiveDamageType === DAMAGE_TYPE.ULTIMATE;
    // Crits keep their shake, slash and big number but no floor ring: in crowds the red rings never left the arena
    if (isUltimateHit) {
      newShockwaves.push({
        id: `shock-${now}-${Math.random()}`,
        timestamp: now,
        color: COMBAT_VFX_CONSTANTS.DAMAGE.ULTIMATE_SHOCKWAVE_COLOR,
        maxRadius: COMBAT_VFX_CONSTANTS.DAMAGE.ULTIMATE_SHOCKWAVE_RADIUS,
      });
    }
    if (isCritOrUlt) {
      pendingShakeIntensity = isUltimateHit
        ? COMBAT_VFX_CONSTANTS.DAMAGE.ULTIMATE_SCREEN_SHAKE
        : COMBAT_VFX_CONSTANTS.DAMAGE.CRIT_SCREEN_SHAKE;
    }

    const safeAmount = Number.isFinite(effectiveDamage) ? effectiveDamage : 0;
    const textColor = resolveFloatingTextColor(effectiveDamageType, teamPalette.secondary);
    const textScale = resolveMergedTextScale(FLOATING_SCALE_MAP[effectiveDamageType], hitFeedback.hitCount);

    const newFloat: FloatingDamageText = {
      id: `float-${now}-${Math.random()}`,
      amount: hitFeedback.amount,
      text: formatHitText(hitFeedback.amount, hitFeedback.hitCount, isWeakPointActive),
      damageType: effectiveDamageType,
      team,
      playerName,
      x: resolveTeamFloatX(team),
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
        playSound(SFX_EVENT.COMBO_LEVEL_UP, { rateScale: resolveComboSoundRate(nextCount) });
      }
    }

    const isDonorFinisher = Boolean(options?.giftName || (options?.coins && options.coins > 0));

    if (isDefeated) {
      audioService.setCombatMuted(true);
      soundManager.stopAll();
      const themeConfig = getThemeConfig(state.gameTheme);
      const defeatColor = themeConfig.colors.enragedHex || themeConfig.colors.primaryHex;

      if (!isDonorFinisher) {
        // Phase 1: Boss death cry (groan/kneeling)
        playSound(SFX_EVENT.BOSS_DEATH_CRY, { rateScale: themeConfig.audioPitchRate });
        // Phase 2: Cinematic explosion (delayed for impact layering)
        workerSetTimeout(() => {
          playSound(SFX_EVENT.BOSS_DEFEAT, { rateScale: themeConfig.audioPitchRate });
        }, BOSS_DEFEAT_CONSTANTS.BURST_STAGGER_MS);
        // Phase 3: Victory sound plays right after explosion
        workerSetTimeout(() => {
          playSound(SFX_EVENT.VICTORY);
        }, BOSS_DEFEAT_CONSTANTS.BURST_STAGGER_MS * 2);
        pendingShakeIntensity = BOSS_DEFEAT_CONSTANTS.SCREEN_SHAKE_INTENSITY;
        pendingFlashColor = '#fbbf24';

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

        pendingBursts.push(
          buildParticleBurst([0, 0.5, 0.6], defeatColor, COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE, now),
          buildParticleBurst([-1.1, 0.9, 0.4], teamPalette.primary, COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE, now),
          buildParticleBurst([1.1, 0.2, 0.4], '#ffffff', COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE, now)
        );
      }

      pendingLogs.unshift(
        buildAdminLog('BOSS', `🏆 [TIÊU DIỆT BOSS] ${themeConfig.bossName} ĐÃ BỊ HẠ GỤC!`, undefined, now)
      );
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
      finisherAvatarUrl: isDefeated ? (options?.donorAvatarUrl ?? null) : prev.finisherAvatarUrl,
      finisherGiftName: isDefeated ? (options?.giftName ?? null) : prev.finisherGiftName,
      finisherCoins: isDefeated ? (options?.coins ?? null) : prev.finisherCoins,
      activeBossSkillBanner: isDefeated ? null : prev.activeBossSkillBanner,
      activeGiftBanner: isDefeated ? null : prev.activeGiftBanner,
      teamScores: nextTeamScores,
      teamScoreBLG: newScoreLeft,
      teamScoreGENG: newScoreRight,
      leaderboard: topLeaderboard,
      proLeaderboard: nextProLeaderboard,
      activeShockwaves: newShockwaves.slice(-8),
      activeBursts: mergeCappedBursts(prev.activeBursts, pendingBursts),
      eventLogs:
        pendingLogs.length > 0
          ? [...pendingLogs, ...prev.eventLogs].slice(0, 100)
          : prev.eventLogs,
      screenShakeTimestamp: pendingShakeIntensity !== null ? now : prev.screenShakeTimestamp,
      screenShakeIntensity:
        pendingShakeIntensity !== null ? pendingShakeIntensity : prev.screenShakeIntensity,
      screenFlashColor: pendingFlashColor !== null ? pendingFlashColor : prev.screenFlashColor,
      screenFlashTimestamp: pendingFlashColor !== null ? now : prev.screenFlashTimestamp,
      floatingDamages: resolveNextCappedList(
        prev.floatingDamages,
        newFloat,
        COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE,
        isDefeated,
        hitFeedback.shouldShow
      ),
      activeHitImpacts: resolveNextCappedList(
        prev.activeHitImpacts,
        newImpact,
        COMBAT_VFX_CONSTANTS.DAMAGE.MAX_ACTIVE_HIT_IMPACTS,
        isDefeated,
        hitFeedback.shouldShow
      ),
      teamCombos: isDefeated ? createInitialTeamCombos() : nextTeamCombos,
      teamHeartMomentum: isDefeated ? createInitialTeamHeartMomentum() : prev.teamHeartMomentum,
      minions: isDefeated ? [] : prev.minions,
      summonQueue: isDefeated
        ? createInitialSummonQueue()
        : prev.summonQueue,
      activeSummonPortals: isDefeated ? [] : prev.activeSummonPortals,
      activeProjectiles: isDefeated ? [] : prev.activeProjectiles,
      activeFlyingArrows: isDefeated ? [] : prev.activeFlyingArrows,
      activeSlashes: mergeCappedSlashes(prev.activeSlashes, pendingSlashes, isDefeated),
      activeMeteors: isDefeated ? [] : prev.activeMeteors,
      bo5Score: nextBO5Score,
      roundWinner: nextRoundWinner,
      isSeriesEnded: nextIsSeriesEnded,
      seriesWinner: nextSeriesWinner,
      championshipTally: nextChampionshipTally,
    }));
  },
});
