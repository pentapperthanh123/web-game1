import { BossSkillConfig, ActiveBossSkillBanner } from '../types/bossSkill';
import {
  DEFAULT_BOSS_SKILL_CONFIG,
  BOSS_SKILL_STORAGE_KEY,
  CHAMPION_DEFAULT_MAX_HP,
  getBossSkillsByTheme,
  BOSS_ATTACK_BANNER_DURATION_MS,
} from '../constants/bossSkills';
import { create } from 'zustand';
import {
  GameState,
  MinionEntity,
  DPSPlayer,
  ParticleBurst,
  GiftAnnouncement,
  FloatingDamageText,
  AdminEventLog,
  HeartEntity,
  ProjectileEntity,
  LiveChatMessage,
  ShockwaveEntity,
  MeteorEntity,
  SlashEntity,
  SummonPortalEntity,
  HitImpactEntity,
  OverlayVisibility,
  FlyingArrowEntity,
  DefeatedChampionEntity,
} from '../types/game';
import {
  GAME_CONSTANTS,
  TEAM_KEY,
  BOSS_STATUS,
  DAMAGE_TYPE,
  COMBAT_VFX_CONSTANTS,
  TeamType,
  BossStatusType,
  DamageType,
  DEFAULT_OVERLAY_VISIBILITY,
  OVERLAY_STORAGE_KEY,
  ARROW_VFX_CONFIG,
  GAME_THEME,
  GameThemeType,
  THEME_STORAGE_KEY,
} from '../constants/game';
import { getChampionAvatarUrl, findRosterPlayer, TEAM_ROSTERS } from '../constants/roster';
import { gameBus } from '../services/eventBus';
import { audioService } from '../services/audioService';
import { getLiveMinionScreenPos, getLiveMinionPosition } from '../services/minionPositionRegistry';

const randomInRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const createWingSpawnPosition = (team: TeamType): [number, number, number] => {
  const bounds = COMBAT_VFX_CONSTANTS.WING_BOUNDS[team];
  return [
    randomInRange(bounds.minX, bounds.maxX),
    randomInRange(bounds.minY, bounds.maxY),
    randomInRange(bounds.minZ, bounds.maxZ),
  ];
};

const updateLeaderboardList = (
  leaderboard: DPSPlayer[],
  playerName: string,
  team: TeamType,
  amount: number
): DPSPlayer[] => {
  const existingIndex = leaderboard.findIndex((p) => p.userName === playerName);
  const nextList =
    existingIndex >= 0
      ? leaderboard.map((player, index) =>
          index === existingIndex ? { ...player, totalDamage: player.totalDamage + amount } : player
        )
      : [
          ...leaderboard,
          {
            id: `player-${Date.now()}-${Math.random()}`,
            userName: playerName,
            team,
            totalDamage: amount,
          },
        ];

  return [...nextList]
    .sort((a, b) => b.totalDamage - a.totalDamage)
    .slice(0, GAME_CONSTANTS.LEADERBOARD.MAX_DISPLAY);
};

const DAMAGE_INTENSITY_MAP: Record<DamageType, number> = {
  [DAMAGE_TYPE.NORMAL]: COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_NORMAL,
  [DAMAGE_TYPE.CRIT]: COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_CRIT,
  [DAMAGE_TYPE.ULTIMATE]: COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_ULTIMATE,
};

const getStoredGameTheme = (): GameThemeType => {
  if (typeof window === 'undefined') return GAME_THEME.BARON;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === GAME_THEME.ELDER_DRAGON) return GAME_THEME.ELDER_DRAGON;
    return GAME_THEME.BARON;
  } catch {
    return GAME_THEME.BARON;
  }
};

const getStoredBossSkillConfig = (): BossSkillConfig => {
  if (typeof window === 'undefined') return DEFAULT_BOSS_SKILL_CONFIG;
  try {
    const raw = localStorage.getItem(BOSS_SKILL_STORAGE_KEY);
    if (!raw) return DEFAULT_BOSS_SKILL_CONFIG;
    return { ...DEFAULT_BOSS_SKILL_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BOSS_SKILL_CONFIG;
  }
};

const getStoredOverlayVisibility = (): OverlayVisibility => {
  if (typeof window === 'undefined') return DEFAULT_OVERLAY_VISIBILITY;
  try {
    const raw = localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) return DEFAULT_OVERLAY_VISIBILITY;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_OVERLAY_VISIBILITY, ...parsed };
  } catch {
    return DEFAULT_OVERLAY_VISIBILITY;
  }
};

const INITIAL_STATE = {
  bossHp: GAME_CONSTANTS.BOSS.INITIAL_HP,
  bossMaxHp: GAME_CONSTANTS.BOSS.MAX_HP,
  bossStatus: BOSS_STATUS.IDLE,
  bossHitTimestamp: 0,
  bossAttackTimestamp: 0,
  screenShakeTimestamp: 0,
  screenShakeIntensity: 0,
  screenFlashColor: null as string | null,
  screenFlashTimestamp: 0,
  teamScoreBLG: 0,
  teamScoreGENG: 0,
  totalLikesBLG: 0,
  totalLikesGENG: 0,
  minions: [] as MinionEntity[],
  leaderboard: [] as DPSPlayer[],
  activeBursts: [] as ParticleBurst[],
  activeHearts: [] as HeartEntity[],
  activeProjectiles: [] as ProjectileEntity[],
  activeShockwaves: [] as ShockwaveEntity[],
  activeMeteors: [] as MeteorEntity[],
  activeSlashes: [] as SlashEntity[],
  activeSummonPortals: [] as SummonPortalEntity[],
  activeHitImpacts: [] as HitImpactEntity[],
  activeDefeatedChampions: [] as DefeatedChampionEntity[],
  activeGiftBanner: null as GiftAnnouncement | null,
  floatingDamages: [] as FloatingDamageText[],
  comboCount: 0,
  comboDamage: 0,
  comboTeam: null as TeamType | null,
  lastComboTimestamp: 0,
  chatMessages: [] as LiveChatMessage[],
  eventLogs: [] as AdminEventLog[],
  isSimulationActive: false,
  botSpeedMs: 1200,
  overlayVisibility: getStoredOverlayVisibility(),
  activeFlyingArrows: [] as FlyingArrowEntity[],
  gameTheme: getStoredGameTheme(),
  bossSkillConfig: getStoredBossSkillConfig(),
  activeBossSkillBanner: null as ActiveBossSkillBanner | null,
  bossSkillRotationIndex: 0,
  lastHitTeam: null as TeamType | null,
  lastHitDamageType: null as DamageType | null,
  bossAttackTargetTeam: null as 'BLG' | 'GENG' | 'ALL' | null,
  bo5Score: {
    [TEAM_KEY.BLG]: 0,
    [TEAM_KEY.GENG]: 0,
  },
  currentRound: 1,
  bo5TargetWins: GAME_CONSTANTS.BO5.TARGET_WINS,
  roundWinner: null as TeamType | null,
  isSeriesEnded: false,
  seriesWinner: null as TeamType | null,
  roundCountdownSeconds: GAME_CONSTANTS.BO5.ROUND_TRANSITION_SECONDS,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL_STATE,

  setGameTheme: (theme: GameThemeType) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // ignore
      }
    }
    set({ gameTheme: theme });
  },

  setOverlayVisibility: (visibility) => {
    set((state) => {
      const next = { ...state.overlayVisibility, ...visibility };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage error
        }
      }
      return { overlayVisibility: next };
    });
  },

  spawnFlyingArrow: (championName: string, team: TeamType, isCrit = false) => {
    audioService.playLaserSound();

    const rosterPlayer = findRosterPlayer(championName, team);
    let startX: number;
    let startY: number;

    const screenW = typeof window !== 'undefined' ? window.innerWidth : 720;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1280;

    const avatarEl =
      typeof document !== 'undefined' && rosterPlayer
        ? document.getElementById(`roster-avatar-${rosterPlayer.id}`)
        : null;

    if (avatarEl) {
      const rect = avatarEl.getBoundingClientRect();
      startX = team === TEAM_KEY.BLG ? rect.right + 2 : rect.left - 2;
      startY = rect.top + rect.height / 2;

      avatarEl.style.transform = 'scale(1.22)';
      setTimeout(() => {
        avatarEl.style.transform = '';
      }, 180);
    } else {
      const playerIndex = rosterPlayer
        ? TEAM_ROSTERS[team].findIndex((p) => p.id === rosterPlayer.id)
        : 2;
      const idx = playerIndex >= 0 ? playerIndex : 2;
      startX = team === TEAM_KEY.BLG ? 45 : screenW - 45;
      startY = Math.min(screenH * 0.45, 180 + idx * 42);
    }

    const targetX = screenW * 0.5 + (Math.random() - 0.5) * 50;
    const targetY = screenH * 0.36 + (Math.random() - 0.5) * 40;

    const palette = ARROW_VFX_CONFIG.COLORS;
    const color =
      team === TEAM_KEY.BLG
        ? isCrit
          ? palette.BLG_CRIT
          : palette.BLG
        : isCrit
        ? palette.GENG_CRIT
        : palette.GENG;

    const newArrow: FlyingArrowEntity = {
      id: `arrow-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceRosterId: rosterPlayer?.id,
      championName,
      team,
      startX,
      startY,
      targetX,
      targetY,
      isCrit,
      color,
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

  addLog: (type: AdminEventLog['type'], message: string, team?: TeamType) => {
    const newLog: AdminEventLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      type,
      message,
      team,
    };
    set((state) => ({
      eventLogs: [newLog, ...state.eventLogs.slice(0, 99)],
    }));
  },

  addChatMessage: (userName: string, text: string, team?: TeamType, championName?: string) => {
    const newMessage: LiveChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      userName,
      text,
      team,
      championName,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-GAME_CONSTANTS.CHAT.MAX_MESSAGES), newMessage],
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
    if (state.bossStatus === BOSS_STATUS.DEFEATED) return;

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

    audioService.playHeartChime();

    const heartsToSpawn = Math.min(count, 8);
    const newHearts: HeartEntity[] = [];
    const colors = GAME_CONSTANTS.HEARTS.COLORS;

    for (let i = 0; i < heartsToSpawn; i++) {
      const targetColor = team === TEAM_KEY.BLG ? '#38bdf8' : '#facc15';
      const randomColor = Math.random() < 0.6 ? targetColor : colors[Math.floor(Math.random() * colors.length)];
      newHearts.push({
        id: `heart-${Date.now()}-${Math.random()}`,
        x: (team === TEAM_KEY.BLG ? -2.2 : 2.2) + (Math.random() - 0.5) * 1.5,
        y: -3.5,
        z: 3.5 + Math.random() * 1.5,
        speed: GAME_CONSTANTS.HEARTS.FLOAT_SPEED_MIN + Math.random() * (GAME_CONSTANTS.HEARTS.FLOAT_SPEED_MAX - GAME_CONSTANTS.HEARTS.FLOAT_SPEED_MIN),
        color: randomColor,
        scale: 0.18 + Math.random() * 0.14,
        swaySpeed: 2.0 + Math.random() * 3.0,
        createdAt: Date.now(),
      });
    }

    const likeDamage = count * 15;
    get().damageBoss(likeDamage, team, `${userName} (Thả tim)`, 'NORMAL');

    set({
      totalLikesBLG: newLikesBLG,
      totalLikesGENG: newLikesGENG,
      activeHearts: [...state.activeHearts.slice(-GAME_CONSTANTS.HEARTS.MAX_ACTIVE), ...newHearts],
    });
  },

  spawnProjectile: (from: [number, number, number], color: string, isCrit = false) => {
    audioService.playLaserSound();

    const [baseTargetX, baseTargetY, baseTargetZ] = COMBAT_VFX_CONSTANTS.BOSS_TARGET;
    const newProj: ProjectileEntity = {
      id: `proj-${Date.now()}-${Math.random()}`,
      startX: from[0],
      startY: from[1],
      startZ: from[2],
      targetX: baseTargetX + randomInRange(-0.55, 0.55),
      targetY: baseTargetY + randomInRange(-0.35, 0.45),
      targetZ: baseTargetZ + randomInRange(-0.25, 0.35),
      arcHeight: isCrit ? randomInRange(1.2, 1.9) : randomInRange(0.4, 1.15),
      isCrit,
      color,
      createdAt: Date.now(),
    };
    set((state) => ({
      activeProjectiles: [
        ...state.activeProjectiles.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.PROJECTILE_MAX_ACTIVE - 1)),
        newProj,
      ],
    }));
  },

  damageBoss: (amount: number, team: TeamType, playerName: string, damageType: DamageType = DAMAGE_TYPE.NORMAL) => {
    const state = get();
    if (state.bossHp <= 0) return;

    audioService.playHitSound();

    const now = Date.now();
    const newHp = Math.max(0, state.bossHp - amount);
    const isEnraged = newHp > 0 && newHp <= state.bossMaxHp * 0.35;
    const isDefeated = newHp <= 0;

    let nextStatus: BossStatusType = BOSS_STATUS.HIT;
    if (isDefeated) {
      nextStatus = BOSS_STATUS.DEFEATED;
    } else if (isEnraged) {
      nextStatus = BOSS_STATUS.ENRAGED;
    }

    const newBLGScore = team === TEAM_KEY.BLG ? state.teamScoreBLG + amount : state.teamScoreBLG;
    const newGENGScore = team === TEAM_KEY.GENG ? state.teamScoreGENG + amount : state.teamScoreGENG;
    const topLeaderboard = updateLeaderboardList(state.leaderboard, playerName, team, amount);

    let nextBO5Score = { ...state.bo5Score };
    let nextRoundWinner: TeamType | null = state.roundWinner;
    let nextIsSeriesEnded = state.isSeriesEnded;
    let nextSeriesWinner: TeamType | null = state.seriesWinner;

    if (isDefeated && !state.roundWinner && !state.isSeriesEnded) {
      nextRoundWinner = newBLGScore >= newGENGScore ? TEAM_KEY.BLG : TEAM_KEY.GENG;
      nextBO5Score[nextRoundWinner] = (nextBO5Score[nextRoundWinner] || 0) + 1;
      if (nextBO5Score[nextRoundWinner] >= state.bo5TargetWins) {
        nextIsSeriesEnded = true;
        nextSeriesWinner = nextRoundWinner;
        get().addLog(
          'SYSTEM',
          `🏆 ${nextRoundWinner} VÔ ĐỊCH CKTG 2026 BO5 (${nextBO5Score.BLG} - ${nextBO5Score.GENG})!`
        );
      } else {
        get().addLog(
          'SYSTEM',
          `🚩 ${nextRoundWinner} THẮNG VÁN ${state.currentRound}! (BO5: BLG ${nextBO5Score.BLG} - ${nextBO5Score.GENG} GEN.G)`
        );
      }
    }

    const teamPalette = COMBAT_VFX_CONSTANTS.TEAM_COLORS[team];
    const isCritOrUlt = damageType === DAMAGE_TYPE.CRIT || damageType === DAMAGE_TYPE.ULTIMATE;
    const hitPoint: [number, number, number] = [
      randomInRange(-0.65, 0.65),
      0.35 + randomInRange(-0.4, 0.45),
      0.65 + randomInRange(-0.2, 0.25),
    ];

    const impactColor = damageType === DAMAGE_TYPE.ULTIMATE ? '#fbbf24' : teamPalette.secondary;
    get().spawnSlash(hitPoint, impactColor, isCritOrUlt);
    get().spawnParticleBurst(hitPoint, impactColor, DAMAGE_INTENSITY_MAP[damageType]);

    const newShockwaves: ShockwaveEntity[] = [...state.activeShockwaves];
    if (isCritOrUlt) {
      newShockwaves.push({
        id: `shock-${now}-${Math.random()}`,
        timestamp: now,
        color: damageType === DAMAGE_TYPE.ULTIMATE ? '#fbbf24' : '#ef4444',
        maxRadius:
          damageType === DAMAGE_TYPE.ULTIMATE
            ? COMBAT_VFX_CONSTANTS.DAMAGE.ULTIMATE_SHOCKWAVE_RADIUS
            : COMBAT_VFX_CONSTANTS.DAMAGE.CRIT_SHOCKWAVE_RADIUS,
      });
      get().triggerScreenShake(damageType === DAMAGE_TYPE.ULTIMATE ? 1.2 : 0.55);
    }

    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const textColor =
      damageType === DAMAGE_TYPE.ULTIMATE
        ? '#fbbf24'
        : damageType === DAMAGE_TYPE.CRIT
          ? '#fb7185'
          : teamPalette.secondary;
    const textScale =
      damageType === DAMAGE_TYPE.ULTIMATE ? 1.55 : damageType === DAMAGE_TYPE.CRIT ? 1.25 : 1.0;

    const newFloat: FloatingDamageText = {
      id: `float-${now}-${Math.random()}`,
      amount: safeAmount,
      text: `-${safeAmount.toLocaleString()}`,
      damageType,
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
      damageType,
      team,
      createdAt: now,
    };

    const isComboActive = now - state.lastComboTimestamp <= COMBAT_VFX_CONSTANTS.DAMAGE.COMBO_WINDOW_MS;
    const nextComboCount = isComboActive ? state.comboCount + 1 : 1;
    const nextComboDamage = isComboActive ? state.comboDamage + safeAmount : safeAmount;

    set((prev) => ({
      bossHp: newHp,
      bossStatus: nextStatus,
      bossHitTimestamp: now,
      lastHitTeam: team,
      lastHitDamageType: damageType,
      teamScoreBLG: newBLGScore,
      teamScoreGENG: newGENGScore,
      leaderboard: topLeaderboard,
      activeShockwaves: newShockwaves.slice(-6),
      floatingDamages: [
        ...prev.floatingDamages.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - 1)),
        newFloat,
      ],
      activeHitImpacts: [
        ...prev.activeHitImpacts.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_ACTIVE_HIT_IMPACTS - 1)),
        newImpact,
      ],
      comboCount: nextComboCount,
      comboDamage: nextComboDamage,
      comboTeam: team,
      lastComboTimestamp: now,
      bo5Score: nextBO5Score,
      roundWinner: nextRoundWinner,
      isSeriesEnded: nextIsSeriesEnded,
      seriesWinner: nextSeriesWinner,
    }));
  },

  summonMinion: (summonerName: string, championName: string, team: TeamType) => {
    const now = Date.now();
    const spawnPosition = createWingSpawnPosition(team);
    const avatarUrl = getChampionAvatarUrl(championName, team);
    const teamPalette = COMBAT_VFX_CONSTANTS.TEAM_COLORS[team];
    const baseDps = GAME_CONSTANTS.MINIONS.BASE_DPS + Math.floor(Math.random() * 100);
    const isCrit = Math.random() < COMBAT_VFX_CONSTANTS.SUMMON.CRIT_CHANCE;
    const summonDps = isCrit
      ? baseDps * COMBAT_VFX_CONSTANTS.SUMMON.CRIT_MULTIPLIER
      : baseDps * COMBAT_VFX_CONSTANTS.SUMMON.NORMAL_MULTIPLIER;

    const newMinion: MinionEntity = {
      id: `minion-${now}-${Math.random().toString(36).substring(2, 6)}`,
      summonerName,
      championName,
      avatarUrl,
      team,
      spawnPosition,
      orbitRadius: randomInRange(GAME_CONSTANTS.MINIONS.ORBIT_RADIUS_MIN, GAME_CONSTANTS.MINIONS.ORBIT_RADIUS_MAX),
      orbitSpeed: (0.4 + Math.random() * 0.6) * (team === TEAM_KEY.BLG ? 1 : -1),
      orbitAngle: Math.random() * Math.PI * 2,
      verticalOffset: (Math.random() - 0.5) * 1.8,
      createdAt: now,
      lifetimeMs: GAME_CONSTANTS.MINIONS.LIFETIME_MS,
      dps: baseDps,
      hp: CHAMPION_DEFAULT_MAX_HP,
      maxHp: CHAMPION_DEFAULT_MAX_HP,
    };

    const newPortal: SummonPortalEntity = {
      id: `portal-${now}-${Math.random().toString(36).substring(2, 6)}`,
      summonerName,
      championName,
      avatarUrl,
      team,
      position: spawnPosition,
      color: teamPalette.primary,
      isCrit,
      dps: summonDps,
      createdAt: now,
    };

    get().spawnParticleBurst(
      spawnPosition,
      teamPalette.primary,
      COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_CRIT
    );
    // 1s Grace Period: Champion enters the field with invulnerability, dealing damage only after 1s
    setTimeout(() => {
      if (get().bossStatus === BOSS_STATUS.DEFEATED) return;

      get().damageBoss(
        summonDps,
        team,
        summonerName,
        isCrit ? DAMAGE_TYPE.CRIT : DAMAGE_TYPE.NORMAL
      );
      get().spawnProjectile(spawnPosition, teamPalette.primary, isCrit);
      get().spawnFlyingArrow(championName, team, isCrit);

      if (isCrit) {
        setTimeout(() => {
          if (get().bossStatus === BOSS_STATUS.DEFEATED) return;
          get().spawnFlyingArrow(championName, team, true);
        }, COMBAT_VFX_CONSTANTS.SUMMON.CRIT_FOLLOWUP_DELAY_MS);
      }

      if (isCrit) {
        setTimeout(() => {
          if (get().bossStatus === BOSS_STATUS.DEFEATED) return;
          get().spawnProjectile(
            [spawnPosition[0] + randomInRange(-0.25, 0.25), spawnPosition[1] + 0.2, spawnPosition[2]],
            teamPalette.crit,
            true
          );
        }, COMBAT_VFX_CONSTANTS.SUMMON.CRIT_FOLLOWUP_DELAY_MS);
      }
    }, GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS);

    get().addLog('SUMMON', `${summonerName} triệu hồi [${championName}] phe ${team} (Bảo hộ 1s)`, team);
    get().addChatMessage(summonerName, `Triệu hồi ${championName} chiến đấu!`, team, championName);

    set((prev) => ({
      minions: [
        ...prev.minions.slice(-(GAME_CONSTANTS.MINIONS.MAX_INSTANCES - 1)),
        newMinion,
      ],
      activeSummonPortals: [
        ...prev.activeSummonPortals.slice(-(COMBAT_VFX_CONSTANTS.SUMMON.MAX_ACTIVE_PORTALS - 1)),
        newPortal,
      ],
    }));
  },

  triggerGiftExplosion: (giftName: string, team: TeamType, donorName: string, coins = 100) => {
    const burstColor = team === TEAM_KEY.BLG ? GAME_CONSTANTS.MINIONS.BLG_COLOR : GAME_CONSTANTS.MINIONS.GENG_COLOR;

    audioService.playGiftFanfare();

    // Spawn 8 Blazing Meteors from above!
    const newMeteors: MeteorEntity[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const startX = Math.cos(angle) * (3.5 + Math.random() * 2);
      const startZ = Math.sin(angle) * (3.5 + Math.random() * 2);
      newMeteors.push({
        id: `meteor-${Date.now()}-${i}`,
        start: [startX, 10 + Math.random() * 3, startZ],
        target: [(Math.random() - 0.5) * 1.5, 0.4, (Math.random() - 0.5) * 1.5],
        color: burstColor,
        createdAt: Date.now() + i * 90, // staggered impact
        duration: 0.65,
      });
    }

    get().healTeamChampions(team, 50);
    const giftDamage = coins * 120;
    get().damageBoss(giftDamage, team, `${donorName} (${giftName})`, 'ULTIMATE');
    get().triggerScreenFlash(team === TEAM_KEY.BLG ? '#38bdf8' : '#fbbf24');
    get().triggerScreenShake(1.3);

    const newBanner: GiftAnnouncement = {
      id: `banner-${Date.now()}`,
      donorName,
      giftName,
      team,
      coins,
      timestamp: Date.now(),
    };

    const safeGiftDamage = Number.isFinite(giftDamage) ? giftDamage : 0;
    get().addLog('GIFT', `💎 ${donorName} tặng [${giftName}] (${coins} xu) phe ${team} gây ${safeGiftDamage.toLocaleString()} ST!`, team);
    get().addChatMessage(donorName, `Đã tặng ${giftName} (+${safeGiftDamage.toLocaleString()} DMG)!`, team);


    set((prev) => ({
      activeBursts: [
        ...prev.activeBursts.slice(-4),
        { id: `burst-${Date.now()}`, timestamp: Date.now(), origin: [0, 0, 0], color: burstColor, intensity: 4 },
      ],
      activeMeteors: [...prev.activeMeteors.slice(-12), ...newMeteors],
      activeGiftBanner: newBanner,
    }));
  },

  dismissGiftBanner: () => {
    set({ activeGiftBanner: null });
  },

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

  healTeamChampions: (targetTeam, amount) => {
    const state = get();
    if (state.minions.length === 0) return;

    const screenW = typeof window !== 'undefined' ? window.innerWidth : 720;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1280;
    const now = Date.now();
    const newFloats: FloatingDamageText[] = [];

    const updatedMinions = state.minions.map((minion) => {
      if (targetTeam !== 'ALL' && minion.team !== targetTeam) {
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
      floatingDamages: [...prev.floatingDamages.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - 1)), ...newFloats],
    }));
  },

  castBossSkill: (skillIndex) => {
    const state = get();
    if (state.bossStatus === BOSS_STATUS.DEFEATED) return;

    const skills = getBossSkillsByTheme(state.gameTheme);
    if (!skills || skills.length === 0) return;

    let nextIndex = 0;
    if (skillIndex !== undefined && skillIndex >= 0 && skillIndex < skills.length) {
      nextIndex = skillIndex;
    } else if (state.bossSkillConfig.mode === 'ROTATION') {
      nextIndex = state.bossSkillRotationIndex % skills.length;
    } else if (state.bossSkillConfig.mode === 'RANDOM_EQUAL') {
      nextIndex = Math.floor(Math.random() * skills.length);
    } else {
      // RANDOM_WEIGHTED (40% Skill 1, 30% Skill 2, 20% Skill 3, 10% Ultimate)
      const roll = Math.random();
      if (roll < 0.40) nextIndex = 0;
      else if (roll < 0.70) nextIndex = 1;
      else if (roll < 0.90) nextIndex = 2;
      else nextIndex = 3;
    }

    const skill = skills[nextIndex];
    const damageMultiplier = state.bossSkillConfig.damageMultiplier || 1.0;
    const actualDamage = Math.max(1, Math.round(skill.baseDamage * damageMultiplier));
    const now = Date.now();
    const isElderDragon = state.gameTheme === GAME_THEME.ELDER_DRAGON;
    const bossName = isElderDragon ? 'Rồng Ngàn Tuổi' : 'Baron Nashor';

    const currentMinions = state.minions;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 720;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1280;

    const gracePeriodMs = GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS;
    // Champions spawned less than 1s ago are completely immune and cannot be targeted
    const vulnerableMinions = currentMinions.filter(
      (m) => now - (m.createdAt || 0) >= gracePeriodMs
    );

    const targetedMinionIds = new Set<string>();
    if (skill.targetCount >= 999) {
      vulnerableMinions.forEach((m) => targetedMinionIds.add(m.id));
    } else {
      const shuffled = [...vulnerableMinions].sort(() => Math.random() - 0.5);
      shuffled.slice(0, skill.targetCount).forEach((m) => targetedMinionIds.add(m.id));
    }

    let targetTeam: 'BLG' | 'GENG' | 'ALL' = 'ALL';
    if (!skill.isUltimate && targetedMinionIds.size > 0) {
      const targetedMinions = currentMinions.filter((m) => targetedMinionIds.has(m.id));
      const blgCount = targetedMinions.filter((m) => m.team === TEAM_KEY.BLG).length;
      const gengCount = targetedMinions.filter((m) => m.team === TEAM_KEY.GENG).length;
      if (blgCount > 0 && gengCount === 0) {
        targetTeam = 'BLG';
      } else if (gengCount > 0 && blgCount === 0) {
        targetTeam = 'GENG';
      } else if (blgCount > gengCount) {
        targetTeam = 'BLG';
      } else if (gengCount > blgCount) {
        targetTeam = 'GENG';
      }
    }

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
    };

    if (skill.isUltimate) {
      get().triggerScreenShake(1.6);
      get().triggerScreenFlash(skill.color);
      audioService.playBossRoarSound(isElderDragon, true);
    } else {
      get().triggerScreenShake(0.5);
      audioService.playDamageImpactSound(DAMAGE_TYPE.CRIT, false);
    }

    const remainingMinions: MinionEntity[] = [];
    const newFloats: FloatingDamageText[] = [];
    const newDefeatedChampions: DefeatedChampionEntity[] = [];

    currentMinions.forEach((minion) => {
      // 1. Invulnerability grace check: Immune to damage for the first 1s after summon/revival
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
        scale: skill.isUltimate ? 1.4 : 1.1,
        createdAt: now,
      });

      const liveWorldPos = getLiveMinionPosition(minion.id) || minion.spawnPosition;
      get().spawnParticleBurst(liveWorldPos, skill.color, skill.isUltimate ? 2.0 : 1.0);

      if (nextHp > 0) {
        remainingMinions.push({ ...minion, hp: nextHp });
      } else {
        newDefeatedChampions.push({
          id: `defeat-${now}-${Math.random().toString(36).substring(2, 6)}`,
          championName: minion.championName,
          summonerName: minion.summonerName,
          avatarUrl: minion.avatarUrl,
          team: minion.team,
          position: liveWorldPos,
          screenX: posX,
          screenY: posY,
          killerName: bossName,
          createdAt: now,
          durationMs: 1400,
        });

        // Visceral death particle burst right at champion's live location
        get().spawnParticleBurst(liveWorldPos, '#ef4444', 2.2);
        audioService.playChampionDeathSound();

        get().addLog('BOSS', `💀 [${bossName}] dùng [${skill.vietnameseName}] hạ gục ${minion.championName} của ${minion.summonerName}!`, minion.team);
      }
    });

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
      floatingDamages: [...prev.floatingDamages.slice(-(COMBAT_VFX_CONSTANTS.DAMAGE.MAX_FLOATING_DAMAGE - 1)), ...newFloats],
    }));
  },

  startNextRound: () => {
    const state = get();
    if (state.isSeriesEnded) return;
    const nextRound = Math.min(GAME_CONSTANTS.BO5.MAX_ROUNDS, state.currentRound + 1);
    get().addLog('SYSTEM', `⚔️ Bắt đầu Ván ${nextRound} / BO5!`);
    set({
      bossHp: state.bossMaxHp,
      bossStatus: BOSS_STATUS.IDLE,
      currentRound: nextRound,
      roundWinner: null,
      teamScoreBLG: 0,
      teamScoreGENG: 0,
      minions: [],
      comboCount: 0,
      comboDamage: 0,
      comboTeam: null,
      floatingDamages: [],
      activeSlashes: [],
      activeHitImpacts: [],
      activeDefeatedChampions: [],
      lastHitTeam: null,
      lastHitDamageType: null,
      bossAttackTargetTeam: null,
      leaderboard: [],
    });
  },

  resetBO5Match: () => {
    const maxHp = get().bossMaxHp;
    get().addLog('SYSTEM', '🔄 Bắt đầu Trận đấu BO5 Mới (0 - 0)!');
    set({
      bossHp: maxHp,
      bossStatus: BOSS_STATUS.IDLE,
      bo5Score: { [TEAM_KEY.BLG]: 0, [TEAM_KEY.GENG]: 0 },
      currentRound: 1,
      roundWinner: null,
      isSeriesEnded: false,
      seriesWinner: null,
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
      comboCount: 0,
      comboDamage: 0,
      comboTeam: null,
      lastComboTimestamp: 0,
      leaderboard: [],
      lastHitTeam: null,
      lastHitDamageType: null,
      bossAttackTargetTeam: null,
    });
  },

  setBO5Score: (blg: number, geng: number, currentRound?: number) => {
    const targetWins = get().bo5TargetWins;
    const clampedBlg = Math.max(0, Math.min(targetWins, blg));
    const clampedGeng = Math.max(0, Math.min(targetWins, geng));
    const isEnded = clampedBlg >= targetWins || clampedGeng >= targetWins;
    const seriesWinner = isEnded ? (clampedBlg >= targetWins ? TEAM_KEY.BLG : TEAM_KEY.GENG) : null;
    const nextRound = currentRound ?? Math.min(GAME_CONSTANTS.BO5.MAX_ROUNDS, clampedBlg + clampedGeng + 1);

    get().addLog('SYSTEM', `⚙️ Cập nhật điểm BO5: BLG ${clampedBlg} - ${clampedGeng} GEN.G (Ván ${nextRound})`);
    set({
      bo5Score: {
        [TEAM_KEY.BLG]: clampedBlg,
        [TEAM_KEY.GENG]: clampedGeng,
      },
      currentRound: nextRound,
      isSeriesEnded: isEnded,
      seriesWinner,
    });
  },

  resetBoss: () => {
    const state = get();
    if (state.isSeriesEnded) {
      get().resetBO5Match();
      return;
    }
    get().addLog('BOSS', '🔄 Hồi sinh Boss về trạng thái ban đầu');
    set({
      bossHp: state.bossMaxHp,
      bossStatus: BOSS_STATUS.IDLE,
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
      comboCount: 0,
      comboDamage: 0,
      comboTeam: null,
      lastComboTimestamp: 0,
      leaderboard: [],
      lastHitTeam: null,
      lastHitDamageType: null,
      bossAttackTargetTeam: null,
      roundWinner: null,
    });
  },

  setBossHp: (hp: number) => {
    const max = get().bossMaxHp;
    const clampedHp = Math.max(0, Math.min(max, hp));
    const status = clampedHp <= 0 ? BOSS_STATUS.DEFEATED : clampedHp <= max * 0.35 ? BOSS_STATUS.ENRAGED : BOSS_STATUS.IDLE;
    get().addLog('BOSS', `Chỉnh máu Boss về ${clampedHp.toLocaleString()} HP`);
    set({ bossHp: clampedHp, bossStatus: status });
  },

  setBossStatus: (status: BossStatusType) => {
    get().addLog('BOSS', `Chuyển trạng thái Boss sang [${status}]`);
    set({ bossStatus: status });
  },

  toggleSimulation: (forcedState?: boolean, speedMs?: number) => {
    set((state) => {
      const nextActive = forcedState !== undefined ? forcedState : !state.isSimulationActive;
      const nextSpeed = speedMs ?? state.botSpeedMs;
      get().addLog('SYSTEM', nextActive ? `▶ Bật bot giả lập (${nextSpeed}ms/lượt)` : '⏹ Tắt bot giả lập');
      return { isSimulationActive: nextActive, botSpeedMs: nextSpeed };
    });
  },

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
    const isComboActive =
      state.lastComboTimestamp > 0 &&
      now - state.lastComboTimestamp <= COMBAT_VFX_CONSTANTS.DAMAGE.COMBO_WINDOW_MS;

    const hasMinionsChanged = activeMinions.length !== state.minions.length;
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
    const hasComboChanged = (state.comboCount > 0) !== isComboActive;

    if (
      !hasMinionsChanged &&
      !hasHeartsChanged &&
      !hasProjChanged &&
      !hasFloatsChanged &&
      !hasSlashesChanged &&
      !hasWavesChanged &&
      !hasMeteorsChanged &&
      !hasPortalsChanged &&
      !hasImpactsChanged &&
      !hasBurstsChanged &&
      !hasArrowsChanged &&
      !hasDefeatedChanged &&
      !hasFlashChanged &&
      !hasBannerChanged &&
      !hasComboChanged
    ) {
      return;
    }

    set({
      minions: hasMinionsChanged ? activeMinions : state.minions,
      activeHearts: hasHeartsChanged ? activeHearts : state.activeHearts,
      activeProjectiles: hasProjChanged ? activeProj : state.activeProjectiles,
      floatingDamages: hasFloatsChanged ? activeFloats : state.floatingDamages,
      activeSlashes: hasSlashesChanged ? activeSlashes : state.activeSlashes,
      activeShockwaves: hasWavesChanged ? activeWaves : state.activeShockwaves,
      activeMeteors: hasMeteorsChanged ? activeMeteors : state.activeMeteors,
      activeSummonPortals: hasPortalsChanged ? activeSummonPortals : state.activeSummonPortals,
      activeHitImpacts: hasImpactsChanged ? activeHitImpacts : state.activeHitImpacts,
      activeBursts: hasBurstsChanged ? activeBursts : state.activeBursts,
      activeFlyingArrows: hasArrowsChanged ? activeArrows : state.activeFlyingArrows,
      activeDefeatedChampions: hasDefeatedChanged ? activeDefeated : state.activeDefeatedChampions,
      comboCount: isComboActive ? state.comboCount : 0,
      comboDamage: isComboActive ? state.comboDamage : 0,
      comboTeam: isComboActive ? state.comboTeam : null,
      screenFlashColor: isFlashActive ? state.screenFlashColor : null,
      activeBossSkillBanner: isBannerActive ? state.activeBossSkillBanner : null,
    });
  },
}));

// Cross-tab EventBus listener
if (typeof window !== 'undefined') {
  gameBus.subscribe((event) => {
    const store = useGameStore.getState();
    switch (event.type) {
      case 'SUMMON_MINION':
        store.summonMinion(event.payload.summonerName, event.payload.championName, event.payload.team);
        break;
      case 'TRIGGER_GIFT':
        store.triggerGiftExplosion(event.payload.giftName, event.payload.team, event.payload.donorName, event.payload.coins);
        break;
      case 'DAMAGE_BOSS':
        store.damageBoss(event.payload.amount, event.payload.team, event.payload.playerName);
        break;
      case 'ADD_LIKE':
        store.addLikes(event.payload.count, event.payload.team, event.payload.userName);
        break;
      case 'SEND_CHAT':
        store.addChatMessage(event.payload.userName, event.payload.text, event.payload.team, event.payload.championName);
        break;
      case 'RESET_BOSS':
        store.resetBoss();
        break;
      case 'START_NEXT_ROUND':
        store.startNextRound();
        break;
      case 'RESET_BO5':
        store.resetBO5Match();
        break;
      case 'SET_BO5_SCORE':
        store.setBO5Score(event.payload.blg, event.payload.geng, event.payload.currentRound);
        break;
      case 'SET_BOSS_HP':
        store.setBossHp(event.payload.hp);
        break;
      case 'SET_ENRAGED':
        store.setBossStatus(event.payload.isEnraged ? BOSS_STATUS.ENRAGED : BOSS_STATUS.IDLE);
        break;
      case 'SET_OVERLAY_VISIBILITY':
        store.setOverlayVisibility(event.payload);
        break;
      case 'TOGGLE_BOT':
        store.toggleSimulation(event.payload.isActive, event.payload.speedMs);
        break;
      default:
        break;
    }
  });
}
