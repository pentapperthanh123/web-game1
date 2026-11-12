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
  HeartMilestoneBanner,
  AutoProBattleConfig,
  AutoSummonConfig,
  DamageBossOptions,
  ProDamageRecord,
  BossShieldState,
  BossWeakPointState,
  TeamComboState,
  TeamHeartMomentum,
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
  AUTO_PRO_BATTLE_CONSTANTS,
  AUTO_PRO_STORAGE_KEY,
  DEFAULT_AUTO_PRO_BATTLE_CONFIG,
  AUTO_SUMMON_STORAGE_KEY,
  DEFAULT_AUTO_SUMMON_CONFIG,
  AUDIO_SFX_CONSTANTS,
  CHAMPION_SKILL_VFX_TYPE,
  getChampionSkillVFX,
  BOSS_DEFEAT_CONSTANTS,
  BOSS_ENRAGED_CONSTANTS,
  BOSS_MECHANICS_CONSTANTS,
} from '../constants/game';
import { getChampionAvatarUrl, findRosterPlayer, TEAM_ROSTERS, RosterPlayer } from '../constants/roster';
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

const updateProLeaderboardList = (
  proLeaderboard: ProDamageRecord[],
  player: RosterPlayer,
  amount: number
): ProDamageRecord[] => {
  const existingIndex = proLeaderboard.findIndex((p) => p.rosterId === player.id);
  const nextList =
    existingIndex >= 0
      ? proLeaderboard.map((entry, index) =>
          index === existingIndex ? { ...entry, totalDamage: entry.totalDamage + amount } : entry
        )
      : [
          ...proLeaderboard,
          {
            rosterId: player.id,
            playerName: player.name,
            role: player.role,
            championName: player.signatureChampion,
            avatarUrl: player.avatarUrl,
            team: player.team,
            totalDamage: amount,
          },
        ];

  return [...nextList].sort((a, b) => b.totalDamage - a.totalDamage);
};

const isComboMilestoneReached = (comboCount: number): boolean => {
  if (AUDIO_SFX_CONSTANTS.COMBO_EARLY_MILESTONES.includes(comboCount)) {
    return true;
  }
  return (
    comboCount >= AUDIO_SFX_CONSTANTS.COMBO_STEP_MILESTONE &&
    comboCount % AUDIO_SFX_CONSTANTS.COMBO_STEP_MILESTONE === 0
  );
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

const getStoredAutoProBattleConfig = (): AutoProBattleConfig => {
  if (typeof window === 'undefined') return DEFAULT_AUTO_PRO_BATTLE_CONFIG;
  try {
    const raw = localStorage.getItem(AUTO_PRO_STORAGE_KEY);
    if (!raw) return DEFAULT_AUTO_PRO_BATTLE_CONFIG;
    return { ...DEFAULT_AUTO_PRO_BATTLE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AUTO_PRO_BATTLE_CONFIG;
  }
};

const getStoredAutoSummonConfig = (): AutoSummonConfig => {
  if (typeof window === 'undefined') return DEFAULT_AUTO_SUMMON_CONFIG;
  try {
    const raw = localStorage.getItem(AUTO_SUMMON_STORAGE_KEY);
    if (!raw) return DEFAULT_AUTO_SUMMON_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AutoSummonConfig>;
    const team = parsed.team === TEAM_KEY.GENG ? TEAM_KEY.GENG : TEAM_KEY.BLG;
    return { ...DEFAULT_AUTO_SUMMON_CONFIG, ...parsed, team };
  } catch {
    return DEFAULT_AUTO_SUMMON_CONFIG;
  }
};

const createEmptyTeamCombo = (): TeamComboState => ({
  count: 0,
  damage: 0,
  lastTimestamp: 0,
});

const createInitialTeamCombos = (): Record<TeamType, TeamComboState> => ({
  [TEAM_KEY.BLG]: createEmptyTeamCombo(),
  [TEAM_KEY.GENG]: createEmptyTeamCombo(),
});

const createEmptyTeamHeartMomentum = (): TeamHeartMomentum => ({
  multiplier: 1,
  lastTapAt: 0,
  burstCount: 0,
});

const createInitialTeamHeartMomentum = (): Record<TeamType, TeamHeartMomentum> => ({
  [TEAM_KEY.BLG]: createEmptyTeamHeartMomentum(),
  [TEAM_KEY.GENG]: createEmptyTeamHeartMomentum(),
});

const createInitialRosterFury = (): Record<string, number> => ({
  'blg-bin': 0,
  'blg-xun': 0,
  'blg-knight': 0,
  'blg-viper': 0,
  'blg-on': 0,
  'gen-kiin': 0,
  'gen-canyon': 0,
  'gen-chovy': 0,
  'gen-ruler': 0,
  'gen-duro': 0,
});

const getActiveHeartFuryMultiplier = (
  momentum: TeamHeartMomentum | undefined,
  now: number
): number => {
  if (!momentum) return 1;
  if (now - momentum.lastTapAt > GAME_CONSTANTS.MINION_FURY.HEART_TAP_SPEED_WINDOW_MS) {
    return 1;
  }
  return momentum.multiplier;
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
  proLeaderboard: [] as ProDamageRecord[],
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
  teamCombos: createInitialTeamCombos(),
  chatMessages: [] as LiveChatMessage[],
  eventLogs: [] as AdminEventLog[],
  isSimulationActive: false,
  botSpeedMs: 1200,
  overlayVisibility: getStoredOverlayVisibility(),
  activeFlyingArrows: [] as FlyingArrowEntity[],
  gameTheme: getStoredGameTheme(),
  bossSkillConfig: getStoredBossSkillConfig(),
  activeBossSkillBanner: null as ActiveBossSkillBanner | null,
  activeHeartMilestoneBanner: null as HeartMilestoneBanner | null,
  bossSkillRotationIndex: 0,
  lastHitTeam: null as TeamType | null,
  lastHitDamageType: null as DamageType | null,
  bossAttackTargetTeam: null as 'BLG' | 'GENG' | 'ALL' | null,
  bossDefeatedTimestamp: 0,
  bossEnragedEntranceTimestamp: 0,
  bossShield: null as BossShieldState | null,
  triggeredShieldThresholds: [] as number[],
  bossShieldBrokenTimestamp: 0,
  bossWeakPoint: null as BossWeakPointState | null,
  lastWeakPointSpawnTimestamp: 0,
  finisherPlayerName: null as string | null,
  finisherTeam: null as TeamType | null,
  autoProBattleConfig: getStoredAutoProBattleConfig(),
  autoSummonConfig: getStoredAutoSummonConfig(),
  rosterAttackTimestamps: {} as Record<string, number>,
  rosterPlayerFury: createInitialRosterFury(),
  lastFuryUltimatePlayerId: null as string | null,
  teamHeartMomentum: createInitialTeamHeartMomentum(),
  bo5Score: {
    [TEAM_KEY.BLG]: 0,
    [TEAM_KEY.GENG]: 0,
  },
  currentRound: 1,
  bo5TargetWins: GAME_CONSTANTS.BO5.TARGET_WINS,
  roundWinner: null as TeamType | null,
  isRoundIntermission: false,
  isSeriesEnded: false,
  seriesWinner: null as TeamType | null,
  roundCountdownSeconds: GAME_CONSTANTS.BO5.ROUND_TRANSITION_SECONDS,
  isGuestModeActive: false,
  guestTeam: TEAM_KEY.BLG,
  guestName: 'Khách_VIP_88',
  isAdminModeActive: false,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL_STATE,

  setGuestMode: (active: boolean) => set({ isGuestModeActive: active }),
  setGuestTeam: (team: TeamType) => set({ guestTeam: team }),
  setGuestName: (name: string) => set({ guestName: name.trim() || 'Khách_VIP_88' }),
  setAdminMode: (active: boolean) => set({ isAdminModeActive: active }),

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

  setAutoProBattleConfig: (config: Partial<AutoProBattleConfig>) => {
    set((state) => {
      const next: AutoProBattleConfig = {
        ...state.autoProBattleConfig,
        ...config,
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(AUTO_PRO_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage error
        }
      }
      return { autoProBattleConfig: next };
    });
  },

  setAutoSummonConfig: (config: Partial<AutoSummonConfig>) => {
    set((state) => {
      const next: AutoSummonConfig = {
        ...state.autoSummonConfig,
        ...config,
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(AUTO_SUMMON_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage error
        }
      }
      return { autoSummonConfig: next };
    });
  },

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
    if (
      state.bossHp <= 0 ||
      state.bossStatus === BOSS_STATUS.DEFEATED ||
      state.isRoundIntermission ||
      state.roundWinner !== null
    ) {
      return;
    }

    const bossFloorHp = Math.ceil(state.bossMaxHp * AUTO_PRO_BATTLE_CONSTANTS.BOSS_HP_FLOOR_PERCENT);
    if (state.bossHp <= bossFloorHp) return;

    const roster = TEAM_ROSTERS[team];
    if (!roster || roster.length === 0) return;

    const player = roster[playerIndex % roster.length];
    const prevFury = state.rosterPlayerFury[player.id] ?? 0;
    const isFullFury = prevFury >= GAME_CONSTANTS.PRO_FURY.MAX_FURY;

    let finalDamage: number;
    let damageType: DamageType;

    if (isFullFury) {
      // FULL NỘ (100% Nộ) -> XẢ SIÊU TUYỆT KỸ
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
      // Chưa đủ 100% Nộ -> chỉ tung đòn đánh thường, tuyệt đối không xả chiêu mạnh/tuyệt kỹ
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
    const proStart3D: [number, number, number] = [
      team === TEAM_KEY.BLG ? -2.9 : 2.9,
      proLaneY,
      0.7,
    ];
    const proBeamColor = isFullFury
      ? '#fbbf24'
      : COMBAT_VFX_CONSTANTS.TEAM_COLORS[team].primary;

    get().spawnFlyingArrow(player.signatureChampion, team, isFullFury);
    if (isFullFury) {
      get().spawnProjectile(proStart3D, proBeamColor, true);
    }

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
      if (
        latest.bossHp <= 0 ||
        latest.bossStatus === BOSS_STATUS.DEFEATED ||
        latest.isRoundIntermission ||
        latest.roundWinner !== null
      ) {
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
    customTarget?: { x: number; y: number }
  ) => {
    const currentState = get();
    if (currentState.bossStatus === BOSS_STATUS.DEFEATED || currentState.bossHp <= 0) {
      return;
    }

    const skillVfx = getChampionSkillVFX(championName, isCrit);
    audioService.playChampionSkillSound(
      isCrit ? skillVfx.type : CHAMPION_SKILL_VFX_TYPE.ARROW,
      isCrit,
      team
    );
    const rosterPlayer = findRosterPlayer(championName, team);
    let startX: number;
    let startY: number;

    const screenW = typeof window !== 'undefined' ? window.innerWidth : 720;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1280;

    const cardEl =
      typeof document !== 'undefined' && rosterPlayer
        ? document.getElementById(`roster-card-${rosterPlayer.id}`)
        : null;
    const avatarEl =
      typeof document !== 'undefined' && !cardEl && rosterPlayer
        ? document.getElementById(`roster-avatar-${rosterPlayer.id}`)
        : null;
    const collapsedEl =
      typeof document !== 'undefined' && !cardEl && !avatarEl
        ? document.getElementById(`roster-collapsed-${team}`)
        : null;
    const anchorEl = cardEl || avatarEl || collapsedEl;

    if (customStart) {
      startX = customStart.x;
      startY = customStart.y;
    } else if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      startX = team === TEAM_KEY.BLG ? rect.right + 4 : rect.left - 4;
      startY = rect.top + rect.height / 2;

      const popTarget = avatarEl || anchorEl;
      popTarget.style.transform = 'scale(1.18)';
      setTimeout(() => {
        popTarget.style.transform = '';
      }, 180);
    } else {
      const playerIndex = rosterPlayer
        ? TEAM_ROSTERS[team].findIndex((p) => p.id === rosterPlayer.id)
        : 2;
      const idx = playerIndex >= 0 ? playerIndex : 2;
      startX = team === TEAM_KEY.BLG ? 52 : screenW - 52;
      startY = Math.min(screenH * 0.48, 185 + idx * 42);
    }

    const bossEl =
      typeof document !== 'undefined'
        ? document.getElementById('boss-monster-target')
        : null;

    let targetX: number;
    let targetY: number;

    if (customTarget) {
      targetX = customTarget.x;
      targetY = customTarget.y;
    } else if (bossEl) {
      const bossRect = bossEl.getBoundingClientRect();
      targetX = bossRect.left + bossRect.width * 0.5 + (Math.random() - 0.5) * 44;
      targetY = bossRect.top + bossRect.height * 0.48 + (Math.random() - 0.5) * 36;
    } else {
      targetX = screenW * 0.5 + (Math.random() - 0.5) * 50;
      targetY = screenH * 0.59 + (Math.random() - 0.5) * 40;
    }

    const palette = ARROW_VFX_CONFIG.COLORS;
    const blgColor = isCrit ? palette.BLG_CRIT : palette.BLG;
    const gengColor = isCrit ? palette.GENG_CRIT : palette.GENG;
    const color = team === TEAM_KEY.BLG ? blgColor : gengColor;

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
    if (
      state.bossStatus === BOSS_STATUS.DEFEATED ||
      state.isRoundIntermission ||
      state.roundWinner !== null ||
      state.bossHp <= 0
    ) {
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

    // During intermission or boss defeat: only accumulate likes counter, no combat or heart spawning
    if (
      state.isRoundIntermission ||
      state.bossStatus === BOSS_STATUS.DEFEATED ||
      state.roundWinner !== null ||
      state.bossHp <= 0
    ) {
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
      const targetColor = team === TEAM_KEY.BLG ? '#38bdf8' : '#facc15';
      const randomColor = Math.random() < 0.6 ? targetColor : colors[Math.floor(Math.random() * colors.length)];
      newHearts.push({
        id: `heart-${now}-${Math.random()}`,
        x: (team === TEAM_KEY.BLG ? -2.2 : 2.2) + (Math.random() - 0.5) * 1.5,
        y: -3.5,
        z: 3.5 + Math.random() * 1.5,
        speed: GAME_CONSTANTS.HEARTS.FLOAT_SPEED_MIN + Math.random() * (GAME_CONSTANTS.HEARTS.FLOAT_SPEED_MAX - GAME_CONSTANTS.HEARTS.FLOAT_SPEED_MIN),
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
      for (const rosterPlayer of TEAM_ROSTERS[team]) {
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

    // Heart Milestone Check: Trigger all-map heal when total combined likes reach milestone
    const prevTotalLikes = state.totalLikesBLG + state.totalLikesGENG;
    const newTotalLikes = newLikesBLG + newLikesGENG;
    const milestoneThreshold = GAME_CONSTANTS.HEART_MILESTONE.THRESHOLD;
    const prevMilestoneTier = Math.floor(prevTotalLikes / milestoneThreshold);
    const newMilestoneTier = Math.floor(newTotalLikes / milestoneThreshold);

    if (newMilestoneTier > prevMilestoneTier) {
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
    if (currentState.bossStatus === BOSS_STATUS.DEFEATED || currentState.bossHp <= 0) {
      return;
    }

    audioService.playLaserSound();

    const [baseTargetX, baseTargetY, baseTargetZ] = customTarget ?? COMBAT_VFX_CONSTANTS.BOSS_TARGET;
    const newProj: ProjectileEntity = {
      id: `proj-${Date.now()}-${Math.random()}`,
      startX: from[0],
      startY: from[1],
      startZ: from[2],
      targetX: baseTargetX + randomInRange(-0.45, 0.45),
      targetY: baseTargetY + randomInRange(-0.3, 0.4),
      targetZ: baseTargetZ + randomInRange(-0.2, 0.3),
      arcHeight: isCrit ? randomInRange(1.2, 1.9) : randomInRange(0.4, 1.15),
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
    if (
      state.bossHp <= 0 ||
      state.bossStatus === BOSS_STATUS.DEFEATED ||
      state.isRoundIntermission ||
      state.roundWinner !== null
    ) {
      return;
    }

    const now = Date.now();
    const isWeakPointActive =
      !options?.proPlayer &&
      state.bossWeakPoint !== null &&
      now < state.bossWeakPoint.expiresAt;

    const scaledAmount = isWeakPointActive
      ? Math.round(amount * BOSS_MECHANICS_CONSTANTS.WEAK_POINT.DAMAGE_MULTIPLIER)
      : amount;
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

    const wasEnraged =
      state.bossHp > 0 &&
      state.bossHp <= state.bossMaxHp * BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT;
    const isEnraged =
      newHp > 0 &&
      newHp <= state.bossMaxHp * BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT;
    const isJustEnraged = !wasEnraged && isEnraged;
    const isDefeated = newHp <= 0;

    // 2. Check Boss Shield trigger thresholds (50% & 22% HP)
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
          audioService.playBossRoarSound(state.gameTheme === GAME_THEME.ELDER_DRAGON, false);
          get().addLog(
            'BOSS',
            `🛡️ [KHIÊN NĂNG LƯỢNG] Boss bật khiên ${BOSS_MECHANICS_CONSTANTS.SHIELD.SHIELD_HP.toLocaleString()} HP! Phá trong 12s kẻo Boss hồi máu!`
          );
          break;
        }
      }
    }

    if (isJustEnraged) {
      audioService.playBossEnrageSound(state.gameTheme === GAME_THEME.ELDER_DRAGON);
      get().triggerScreenShake(BOSS_ENRAGED_CONSTANTS.SCREEN_SHAKE_INTENSITY);
      get().triggerScreenFlash(BOSS_ENRAGED_CONSTANTS.SCREEN_FLASH_COLOR);
      get().addLog(
        'BOSS',
        state.gameTheme === GAME_THEME.ELDER_DRAGON
          ? '🔥 [CẢNH BÁO: RỒNG NGÀN TUỔI CUỒNG NỘ!] Máu dưới 35% - Sát thương & Tốc đánh tăng vọt!'
          : '🔥 [CẢNH BÁO: BARON CUỒNG NỘ!] Máu dưới 35% - Sát thương & Tốc đánh tăng vọt!'
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
    const textColor =
      effectiveDamageType === DAMAGE_TYPE.ULTIMATE
        ? '#fbbf24'
        : effectiveDamageType === DAMAGE_TYPE.CRIT
          ? '#fb7185'
          : teamPalette.secondary;
    const floatingScaleMap: Record<DamageType, number> = {
      [DAMAGE_TYPE.NORMAL]: COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_NORMAL,
      [DAMAGE_TYPE.CRIT]: COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_CRIT,
      [DAMAGE_TYPE.ULTIMATE]: COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_ULTIMATE,
    };
    const textScale = floatingScaleMap[effectiveDamageType];

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
        audioService.playComboMilestoneSound(nextCount);
      }
    }

    if (isDefeated) {
      const isElder = state.gameTheme === GAME_THEME.ELDER_DRAGON;
      const defeatColor = isElder
        ? BOSS_DEFEAT_CONSTANTS.ELDER_DRAGON_DEFEAT_COLOR
        : BOSS_DEFEAT_CONSTANTS.BARON_DEFEAT_COLOR;

      audioService.playBossDefeatSound(isElder);
      get().triggerScreenShake(BOSS_DEFEAT_CONSTANTS.SCREEN_SHAKE_INTENSITY);
      get().triggerScreenFlash(teamPalette.primary);

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
      bossEnragedEntranceTimestamp: isJustEnraged
        ? now
        : isDefeated
          ? 0
          : prev.bossEnragedEntranceTimestamp,
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

  summonMinion: (summonerName: string, championName: string, team: TeamType, isGiftBypass = false) => {
    const state = get();
    if (
      state.bossStatus === BOSS_STATUS.DEFEATED ||
      state.bossHp <= 0 ||
      state.isRoundIntermission ||
      state.roundWinner !== null
    ) {
      return;
    }
    const now = Date.now();

    // Option B: Limit to 1 active living champion per user
    // Option D: Gifts (isGiftBypass) break through this cap completely!
    if (!isGiftBypass) {
      const activeLivingMinion = state.minions.find((m) => {
        const isSameUser = m.summonerName.trim().toLowerCase() === summonerName.trim().toLowerCase();
        const isAlive = (m.hp ?? CHAMPION_DEFAULT_MAX_HP) > 0;
        const isNotExpired = now - m.createdAt < m.lifetimeMs;
        return isSameUser && isAlive && isNotExpired;
      });

      if (activeLivingMinion) {
        // User already has an active living champion on the field:
        // Option B dynamic engagement -> Cheer & empower the existing champion!
        const healAmt = GAME_CONSTANTS.SUMMON_RULES.ALIVE_SUPPORT_HEAL;
        const bonusDmg = GAME_CONSTANTS.SUMMON_RULES.ALIVE_SUPPORT_DAMAGE;
        const curHp = activeLivingMinion.hp ?? CHAMPION_DEFAULT_MAX_HP;
        const maxHp = activeLivingMinion.maxHp ?? CHAMPION_DEFAULT_MAX_HP;
        const nextHp = Math.min(maxHp, curHp + healAmt);

        const updatedMinions = state.minions.map((m) => {
          if (m.id === activeLivingMinion.id) {
            return {
              ...m,
              hp: nextHp,
              lifetimeMs: m.lifetimeMs + GAME_CONSTANTS.SUMMON_RULES.LIFETIME_EXTENSION_MS,
            };
          }
          return m;
        });

        // Trigger immediate support strike from champion against Boss
        get().damageBoss(bonusDmg, team, `${summonerName} (Tiếp sức)`, 'NORMAL');
        get().spawnFlyingArrow(activeLivingMinion.championName, team, false);
        audioService.playHeartChime();

        get().addLog(
          'SUMMON',
          `⚡ ${summonerName} tiếp sức [${activeLivingMinion.championName}] (+${healAmt} HP & +${bonusDmg} ST)`,
          team
        );
        get().addChatMessage(
          summonerName,
          `Tiếp sức cho ${activeLivingMinion.championName}! (+${healAmt} HP)`,
          team,
          activeLivingMinion.championName
        );

        set({ minions: updatedMinions });
        return;
      }
    }

    const spawnPosition = createWingSpawnPosition(team);
    const avatarUrl = getChampionAvatarUrl(championName, team);
    const teamPalette = COMBAT_VFX_CONSTANTS.TEAM_COLORS[team];
    const baseDps = GAME_CONSTANTS.MINIONS.BASE_DPS + Math.floor(Math.random() * 100);
    // Tướng triệu hồi khởi đầu với 0 Nộ, chỉ tung chiêu đánh thường cho đến khi tích đủ 100% Nộ
    const summonDps = baseDps * COMBAT_VFX_CONSTANTS.SUMMON.NORMAL_MULTIPLIER;

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
      fury: 0,
      maxFury: GAME_CONSTANTS.MINION_FURY.MAX_FURY,
    };

    const newPortal: SummonPortalEntity = {
      id: `portal-${now}-${Math.random().toString(36).substring(2, 6)}`,
      summonerName,
      championName,
      avatarUrl,
      team,
      position: spawnPosition,
      color: teamPalette.primary,
      isCrit: false,
      dps: summonDps,
      createdAt: now,
    };

    audioService.playSummonArrivalSound(team, false);

    get().spawnParticleBurst(
      spawnPosition,
      teamPalette.primary,
      COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_NORMAL
    );
    // 1s Grace Period: Champion enters the field with invulnerability, opening with a normal strike that builds Fury
    setTimeout(() => {
      const latest = get();
      if (
        latest.bossStatus === BOSS_STATUS.DEFEATED ||
        latest.bossHp <= 0 ||
        latest.isRoundIntermission ||
        latest.roundWinner !== null
      ) {
        return;
      }

      get().consumeMinionAttackFury(newMinion.id);
      get().damageBoss(summonDps, team, summonerName, DAMAGE_TYPE.NORMAL);
      get().spawnFlyingArrow(championName, team, false);
    }, GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS);

    get().addLog('SUMMON', `${summonerName} triệu hồi [${championName}] phe ${team} (Bảo hộ 1s)`, team);
    get().addChatMessage(summonerName, `Triệu hồi ${championName} chiến đấu!`, team, championName);

    // Boost Fury of matching Pro Player when fans summon their champion!
    const matchingPro = findRosterPlayer(championName, team);
    if (matchingPro) {
      get().addPlayerFury(matchingPro.id, GAME_CONSTANTS.PRO_FURY.FURY_GAIN_SUMMON_MATCH);
    }

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
    const state = get();
    const newBanner: GiftAnnouncement = {
      id: `banner-${Date.now()}`,
      donorName,
      giftName,
      team,
      coins,
      timestamp: Date.now(),
    };

    if (
      state.bossStatus === BOSS_STATUS.DEFEATED ||
      state.bossHp <= 0 ||
      state.isRoundIntermission ||
      state.roundWinner !== null
    ) {
      set({ activeGiftBanner: newBanner });
      get().addChatMessage(donorName, `Đã tặng ${giftName} (${coins} xu)!`, team);
      return;
    }

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

    // Supercharge Fury for all Pro Players on the gifted team!
    TEAM_ROSTERS[team].forEach((pro) => {
      get().addPlayerFury(pro.id, GAME_CONSTANTS.PRO_FURY.FURY_GAIN_GIFT_BOOST);
    });

    // Option D: Donating gifts breaks through champion limits and summons an Elite Champion for the donor
    const giftRosterBLG = ['Jax', "Kai'Sa", 'Ahri', 'Aatrox', 'Zed'];
    const giftRosterGEN = ['Yone', 'Ezreal', 'Nidalee', 'Yasuo', 'Sylas'];
    const pool = team === TEAM_KEY.BLG ? giftRosterBLG : giftRosterGEN;
    const eliteChamp = pool[Math.floor(Math.random() * pool.length)];
    get().summonMinion(`👑 ${donorName}`, eliteChamp, team, true);

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
    if (
      state.bossHp <= 0 ||
      state.bossStatus === BOSS_STATUS.DEFEATED ||
      state.isRoundIntermission ||
      state.roundWinner !== null
    ) {
      return;
    }

    // 1. Check Boss Shield expiry -> Heal Boss if viewers failed to break it
    if (state.bossShield && now >= state.bossShield.expiresAt) {
      const healAmount = BOSS_MECHANICS_CONSTANTS.SHIELD.HEAL_PENALTY_AMOUNT;
      const healedHp = Math.min(state.bossMaxHp, state.bossHp + healAmount);
      const nextStatus =
        healedHp <= state.bossMaxHp * BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT
          ? BOSS_STATUS.ENRAGED
          : BOSS_STATUS.IDLE;

      audioService.playBossRoarSound(state.gameTheme === GAME_THEME.ELDER_DRAGON, true);
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

    // 2. Expire old Weak Point
    if (state.bossWeakPoint) {
      set({ bossWeakPoint: null });
      return;
    }

    // 3. Weak Point disabled per user request (removed yellow ring / weak point)
  },

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

  triggerHeartMilestoneHeal: (milestoneCount: number) => {
    const healAmount = GAME_CONSTANTS.HEART_MILESTONE.HEAL_AMOUNT;
    const now = Date.now();

    // 1. Heal all champions on the map (minions), EXCLUDING monsters/boss
    get().healTeamChampions('ALL', healAmount);

    // 2. Play celestial divine healing sound
    audioService.playGlobalDivineHealSound();

    // 3. Screen flash emerald green radiance
    get().triggerScreenFlash('#10b981');

    // 4. Subtle screen shake pulse
    get().triggerScreenShake(0.6);

    // 5. Spawn celebratory divine emerald & golden particle bursts across the arena
    get().spawnParticleBurst([-2.5, 0.5, 0], '#10b981', 2.0);
    get().spawnParticleBurst([2.5, 0.5, 0], '#10b981', 2.0);
    get().spawnParticleBurst([0, 1.0, 1.5], '#facc15', 2.0);

    // 6. Set milestone banner
    const banner: HeartMilestoneBanner = {
      id: `heart-milestone-${now}`,
      milestoneCount,
      healAmount,
      timestamp: now,
    };

    // 7. Event logs and Chat
    get().addLog('GIFT', `💖 [ĐẠI HỒI PHỤC] Đạt mốc ${milestoneCount.toLocaleString()} tim: Hồi phục +${healAmount} HP toàn bản đồ!`);
    get().addChatMessage('Hệ Thống', `💖 Mốc ${milestoneCount.toLocaleString()} TIM đạt được! Mưa hồi phục toàn bản đồ (+${healAmount} HP)`);

    set({
      activeHeartMilestoneBanner: banner,
    });
  },

  clearHeartMilestoneBanner: () => set({ activeHeartMilestoneBanner: null }),

  castBossSkill: (skillIndex) => {
    const state = get();
    if (
      state.bossStatus === BOSS_STATUS.DEFEATED ||
      state.bossHp <= 0 ||
      state.isRoundIntermission ||
      state.roundWinner !== null
    ) {
      return;
    }

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
    const isEnraged = state.bossStatus === BOSS_STATUS.ENRAGED;
    const baseMultiplier = state.bossSkillConfig.damageMultiplier || 1.0;
    const rageBoost = isEnraged ? BOSS_ENRAGED_CONSTANTS.DAMAGE_BOOST_MULTIPLIER : 1.0;
    const actualDamage = Math.max(1, Math.round(skill.baseDamage * baseMultiplier * rageBoost));
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
        scale: skill.isUltimate
          ? COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_ULTIMATE
          : COMBAT_VFX_CONSTANTS.DAMAGE.FLOATING_SCALE_CRIT,
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
          durationMs: 450,
        });

        // Clean sound feedback, no heavy particle burst spam to limit effects
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
    audioService.playRoundStartSound();
    get().addLog('SYSTEM', `⚔️ Bắt đầu Ván ${nextRound} / BO5!`);
    set({
      bossHp: state.bossMaxHp,
      bossStatus: BOSS_STATUS.IDLE,
      currentRound: nextRound,
      roundWinner: null,
      isRoundIntermission: false,
      teamScoreBLG: 0,
      teamScoreGENG: 0,
      minions: [],
      teamCombos: createInitialTeamCombos(),
      teamHeartMomentum: createInitialTeamHeartMomentum(),
      floatingDamages: [],
      activeSlashes: [],
      activeHitImpacts: [],
      activeDefeatedChampions: [],
      activeBursts: [],
      activeFlyingArrows: [],
      activeProjectiles: [],
      activeShockwaves: [],
      activeMeteors: [],
      activeSummonPortals: [],
      lastHitTeam: null,
      lastHitDamageType: null,
      bossAttackTargetTeam: null,
      bossDefeatedTimestamp: 0,
      bossEnragedEntranceTimestamp: 0,
      bossShield: null,
      triggeredShieldThresholds: [],
      bossShieldBrokenTimestamp: 0,
      bossWeakPoint: null,
      lastWeakPointSpawnTimestamp: 0,
      finisherPlayerName: null,
      finisherTeam: null,
      leaderboard: [],
      proLeaderboard: [],
      rosterAttackTimestamps: {},
      rosterPlayerFury: createInitialRosterFury(),
      lastFuryUltimatePlayerId: null,
    });
  },

  resetBO5Match: () => {
    const maxHp = get().bossMaxHp;
    audioService.playRoundStartSound();
    get().addLog('SYSTEM', '🔄 Bắt đầu Trận đấu BO5 Mới (0 - 0)!');
    set({
      bossHp: maxHp,
      bossStatus: BOSS_STATUS.IDLE,
      bo5Score: { [TEAM_KEY.BLG]: 0, [TEAM_KEY.GENG]: 0 },
      currentRound: 1,
      roundWinner: null,
      isRoundIntermission: false,
      isSeriesEnded: false,
      seriesWinner: null,
      teamScoreBLG: 0,
      teamScoreGENG: 0,
      minions: [],
      activeBursts: [],
      activeHearts: [],
      activeProjectiles: [],
      activeFlyingArrows: [],
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
      bossWeakPoint: null,
      lastWeakPointSpawnTimestamp: 0,
      finisherPlayerName: null,
      finisherTeam: null,
      rosterAttackTimestamps: {},
      rosterPlayerFury: createInitialRosterFury(),
      lastFuryUltimatePlayerId: null,
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
    audioService.playRoundStartSound();
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
      bossWeakPoint: null,
      lastWeakPointSpawnTimestamp: 0,
      finisherPlayerName: null,
      finisherTeam: null,
      rosterAttackTimestamps: {},
      rosterPlayerFury: createInitialRosterFury(),
      lastFuryUltimatePlayerId: null,
    });
  },

  setBossHp: (hp: number) => {
    const max = get().bossMaxHp;
    const clampedHp = Math.max(0, Math.min(max, hp));
    const wasEnraged =
      get().bossHp > 0 &&
      get().bossHp <= max * BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT;
    const isEnraged =
      clampedHp > 0 &&
      clampedHp <= max * BOSS_ENRAGED_CONSTANTS.HEALTH_THRESHOLD_PERCENT;
    const isJustEnraged = !wasEnraged && isEnraged;
    const isDefeated = clampedHp <= 0;
    const status = isDefeated
      ? BOSS_STATUS.DEFEATED
      : isEnraged
        ? BOSS_STATUS.ENRAGED
        : BOSS_STATUS.IDLE;

    get().addLog('BOSS', `Chỉnh máu Boss về ${clampedHp.toLocaleString()} HP`);

    if (isJustEnraged) {
      audioService.playBossEnrageSound(get().gameTheme === GAME_THEME.ELDER_DRAGON);
      get().triggerScreenShake(BOSS_ENRAGED_CONSTANTS.SCREEN_SHAKE_INTENSITY);
      get().triggerScreenFlash(BOSS_ENRAGED_CONSTANTS.SCREEN_FLASH_COLOR);
      get().addLog(
        'BOSS',
        get().gameTheme === GAME_THEME.ELDER_DRAGON
          ? '🔥 [CẢNH BÁO: RỒNG NGÀN TUỔI CUỒNG NỘ!] Máu dưới 35% - Sát thương & Tốc đánh tăng vọt!'
          : '🔥 [CẢNH BÁO: BARON CUỒNG NỘ!] Máu dưới 35% - Sát thương & Tốc đánh tăng vọt!'
      );
    }

    set({
      bossHp: clampedHp,
      bossStatus: status,
      bossDefeatedTimestamp: isDefeated ? Date.now() : 0,
      bossEnragedEntranceTimestamp: isJustEnraged
        ? Date.now()
        : isDefeated
          ? 0
          : get().bossEnragedEntranceTimestamp,
    });
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
    const hasHeartBannerChanged = (state.activeHeartMilestoneBanner !== null) !== isHeartMilestoneBannerActive;

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
      !hasHeartBannerChanged &&
      !hasComboChanged &&
      !hasMomentumChanged &&
      !hasRosterAttackChanged
    ) {
      return;
    }

    const nextTeamCombos = hasComboChanged
      ? {
          [TEAM_KEY.BLG]: isBLGComboExpired ? createEmptyTeamCombo() : state.teamCombos[TEAM_KEY.BLG],
          [TEAM_KEY.GENG]: isGENGComboExpired ? createEmptyTeamCombo() : state.teamCombos[TEAM_KEY.GENG],
        }
      : state.teamCombos;

    const nextTeamHeartMomentum = hasMomentumChanged
      ? {
          [TEAM_KEY.BLG]: isBLGMomentumExpired
            ? createEmptyTeamHeartMomentum()
            : state.teamHeartMomentum[TEAM_KEY.BLG],
          [TEAM_KEY.GENG]: isGENGMomentumExpired
            ? createEmptyTeamHeartMomentum()
            : state.teamHeartMomentum[TEAM_KEY.GENG],
        }
      : state.teamHeartMomentum;

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
      teamCombos: nextTeamCombos,
      teamHeartMomentum: nextTeamHeartMomentum,
      screenFlashColor: isFlashActive ? state.screenFlashColor : null,
      activeBossSkillBanner: isBannerActive ? state.activeBossSkillBanner : null,
      activeHeartMilestoneBanner: isHeartMilestoneBannerActive ? state.activeHeartMilestoneBanner : null,
      rosterAttackTimestamps: hasRosterAttackChanged
        ? nextRosterTimestamps
        : state.rosterAttackTimestamps,
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
      case 'SET_AUTO_PRO_BATTLE':
        store.setAutoProBattleConfig(event.payload);
        break;
      default:
        break;
    }
  });
}
