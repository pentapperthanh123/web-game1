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
} from '../types/game';
import { GAME_CONSTANTS, TEAM_KEY, BOSS_STATUS, TeamType, BossStatusType } from '../constants/game';
import { gameBus } from '../services/eventBus';
import { audioService } from '../services/audioService';

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
  activeGiftBanner: null as GiftAnnouncement | null,
  floatingDamages: [] as FloatingDamageText[],
  chatMessages: [] as LiveChatMessage[],
  eventLogs: [] as AdminEventLog[],
  isSimulationActive: false,
  botSpeedMs: 1200,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL_STATE,

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
      activeShockwaves: [...prev.activeShockwaves.slice(-5), newWave],
    }));
  },

  spawnSlash: (position: [number, number, number], color: string) => {
    const newSlash: SlashEntity = {
      id: `slash-${Date.now()}-${Math.random()}`,
      position,
      rotationZ: Math.random() * Math.PI * 2,
      color,
      scale: 0.8 + Math.random() * 0.5,
      createdAt: Date.now(),
    };
    set((state) => ({
      activeSlashes: [...state.activeSlashes.slice(-8), newSlash],
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

  spawnProjectile: (from: [number, number, number], color: string) => {
    audioService.playLaserSound();

    const newProj: ProjectileEntity = {
      id: `proj-${Date.now()}-${Math.random()}`,
      startX: from[0],
      startY: from[1],
      startZ: from[2],
      color,
      createdAt: Date.now(),
    };
    set((state) => ({
      activeProjectiles: [...state.activeProjectiles.slice(-GAME_CONSTANTS.PROJECTILES.MAX_ACTIVE), newProj],
    }));
  },

  damageBoss: (amount: number, team: TeamType, playerName: string, damageType: 'NORMAL' | 'CRIT' | 'ULTIMATE' = 'NORMAL') => {
    const state = get();
    if (state.bossHp <= 0) return;

    audioService.playHitSound();

    const newHp = Math.max(0, state.bossHp - amount);
    const isEnraged = newHp > 0 && newHp <= state.bossMaxHp * 0.35;
    const isDefeated = newHp <= 0;

    let nextStatus: BossStatusType = state.bossStatus;
    if (isDefeated) {
      nextStatus = BOSS_STATUS.DEFEATED;
    } else if (isEnraged) {
      nextStatus = BOSS_STATUS.ENRAGED;
    } else {
      nextStatus = BOSS_STATUS.HIT;
    }

    const newBLGScore = team === TEAM_KEY.BLG ? state.teamScoreBLG + amount : state.teamScoreBLG;
    const newGENGScore = team === TEAM_KEY.GENG ? state.teamScoreGENG + amount : state.teamScoreGENG;

    // Leaderboard
    const existingPlayerIndex = state.leaderboard.findIndex((p) => p.userName === playerName);
    let updatedLeaderboard: DPSPlayer[] = [];

    if (existingPlayerIndex >= 0) {
      updatedLeaderboard = state.leaderboard.map((player, index) => {
        if (index === existingPlayerIndex) {
          return { ...player, totalDamage: player.totalDamage + amount };
        }
        return player;
      });
    } else {
      const newPlayer: DPSPlayer = {
        id: `player-${Date.now()}-${Math.random()}`,
        userName: playerName,
        team,
        totalDamage: amount,
      };
      updatedLeaderboard = [...state.leaderboard, newPlayer];
    }

    updatedLeaderboard.sort((a, b) => b.totalDamage - a.totalDamage);
    const topLeaderboard = updatedLeaderboard.slice(0, GAME_CONSTANTS.LEADERBOARD.MAX_DISPLAY);

    // Dynamic Slashes & Shockwaves
    const slashColor = team === TEAM_KEY.BLG ? '#38bdf8' : '#f59e0b';
    const randomSlashPos: [number, number, number] = [
      (Math.random() - 0.5) * 1.2,
      0.3 + (Math.random() - 0.5) * 0.8,
      0.6 + (Math.random() - 0.5) * 0.4,
    ];
    get().spawnSlash(randomSlashPos, slashColor);

    // Shockwave on big hits
    const newShockwaves: ShockwaveEntity[] = [...state.activeShockwaves];
    if (damageType === 'CRIT' || damageType === 'ULTIMATE') {
      newShockwaves.push({
        id: `shock-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        color: damageType === 'ULTIMATE' ? '#fbbf24' : '#ef4444',
        maxRadius: damageType === 'ULTIMATE' ? 6.5 : 4.5,
      });
      get().triggerScreenShake(damageType === 'ULTIMATE' ? 1.2 : 0.6);
    }

    // Floating text
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const randomOffsetSpreadX = (Math.random() - 0.5) * 170;
    const randomOffsetSpreadY = (Math.random() - 0.5) * 90;
    let label = `-${safeAmount.toLocaleString()}`;
    let textColor = team === TEAM_KEY.BLG ? '#38bdf8' : '#facc15';
    let textScale = 1.0;

    if (damageType === 'CRIT') {
      label = `BẠO KÍCH! -${safeAmount.toLocaleString()}`;
      textColor = '#f43f5e';
      textScale = 1.35;
    } else if (damageType === 'ULTIMATE') {
      label = `TUYỆT KỸ! -${safeAmount.toLocaleString()}`;
      textColor = '#fbbf24';
      textScale = 1.8;
    }

    const newFloat: FloatingDamageText = {
      id: `float-${Date.now()}-${Math.random()}`,
      text: label,
      damageType,
      x: randomOffsetSpreadX,
      y: randomOffsetSpreadY,
      color: textColor,
      scale: textScale,
      createdAt: Date.now(),
    };

    set({
      bossHp: newHp,
      bossStatus: nextStatus,
      bossHitTimestamp: Date.now(),
      teamScoreBLG: newBLGScore,
      teamScoreGENG: newGENGScore,
      leaderboard: topLeaderboard,
      activeShockwaves: newShockwaves.slice(-6),
      floatingDamages: [...state.floatingDamages.slice(-15), newFloat],
    });
  },

  summonMinion: (summonerName: string, championName: string, team: TeamType) => {
    const state = get();
    if (state.minions.length >= GAME_CONSTANTS.MINIONS.MAX_INSTANCES) {
      state.minions.shift();
    }

    const radiusSpread =
      GAME_CONSTANTS.MINIONS.ORBIT_RADIUS_MIN +
      Math.random() * (GAME_CONSTANTS.MINIONS.ORBIT_RADIUS_MAX - GAME_CONSTANTS.MINIONS.ORBIT_RADIUS_MIN);

    const newMinion: MinionEntity = {
      id: `minion-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      summonerName,
      championName,
      team,
      orbitRadius: radiusSpread,
      orbitSpeed: (0.4 + Math.random() * 0.6) * (team === TEAM_KEY.BLG ? 1 : -1),
      orbitAngle: Math.random() * Math.PI * 2,
      verticalOffset: (Math.random() - 0.5) * 1.8,
      createdAt: Date.now(),
      lifetimeMs: GAME_CONSTANTS.MINIONS.LIFETIME_MS,
      dps: GAME_CONSTANTS.MINIONS.BASE_DPS + Math.floor(Math.random() * 100),
    };

    const isCrit = Math.random() < 0.25;
    const summonDps = isCrit ? newMinion.dps * 4 : newMinion.dps * 2;
    get().damageBoss(summonDps, team, summonerName, isCrit ? 'CRIT' : 'NORMAL');

    // Launch direct champion assault projectile from the team's side
    const isBLG = team === TEAM_KEY.BLG;
    const startX = (isBLG ? -3.8 : 3.8) + (Math.random() - 0.5) * 0.4;
    const startY = -0.8 + (Math.random() - 0.5) * 0.5;
    const startZ = 2.0 + (Math.random() - 0.5) * 0.4;
    const teamColor = isBLG ? '#00f2fe' : '#ffa751';

    get().spawnProjectile([startX, startY, startZ], teamColor);

    // If critical hit, launch a second follow-up strike
    if (isCrit) {
      setTimeout(() => {
        get().spawnProjectile(
          [startX + (Math.random() - 0.5) * 0.3, startY + 0.2, startZ],
          teamColor
        );
      }, 100);
    }

    get().addLog('SUMMON', `${summonerName} triệu hồi [${championName}] phe ${team} (-${summonDps} HP)`, team);
    get().addChatMessage(summonerName, `Triệu hồi ${championName} chiến đấu!`, team, championName);

    audioService.speak(`${summonerName} triệu hồi ${championName}!`);

    set({
      minions: [...state.minions, newMinion],
    });
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

    audioService.speak(`Cảm ơn ${donorName} đã tặng ${giftName} cho phe ${team}!`);

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

  resetBoss: () => {
    get().addLog('BOSS', '🔄 Hồi sinh Boss Baron Nashor về trạng thái ban đầu');
    set({
      bossHp: GAME_CONSTANTS.BOSS.INITIAL_HP,
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
      activeGiftBanner: null,
      floatingDamages: [],
      leaderboard: [],
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

    // Prune expired minions
    const activeMinions = state.minions.filter((m) => now - m.createdAt < m.lifetimeMs);
    // Prune hearts
    const activeHearts = state.activeHearts.filter((h) => now - h.createdAt < 3200);
    // Prune projectiles
    const activeProj = state.activeProjectiles.filter((p) => now - p.createdAt < 800);
    // Prune floating damage
    const activeFloats = state.floatingDamages.filter((f) => now - f.createdAt < 1350);
    // Prune slashes
    const activeSlashes = state.activeSlashes.filter((s) => now - s.createdAt < 300);
    // Prune shockwaves
    const activeWaves = state.activeShockwaves.filter((w) => now - w.timestamp < 850);
    // Prune meteors
    const activeMeteors = state.activeMeteors.filter((m) => now - m.createdAt < m.duration * 1000 + 300);

    // Auto-clear screen flash in store if expired
    const isFlashActive = state.screenFlashColor !== null && now - state.screenFlashTimestamp < 450;

    set({
      minions: activeMinions,
      activeHearts,
      activeProjectiles: activeProj,
      floatingDamages: activeFloats,
      activeSlashes,
      activeShockwaves: activeWaves,
      activeMeteors,
      screenFlashColor: isFlashActive ? state.screenFlashColor : null,
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
      case 'SET_BOSS_HP':
        store.setBossHp(event.payload.hp);
        break;
      case 'SET_ENRAGED':
        store.setBossStatus(event.payload.isEnraged ? BOSS_STATUS.ENRAGED : BOSS_STATUS.IDLE);
        break;
      case 'TOGGLE_BOT':
        store.toggleSimulation(event.payload.isActive, event.payload.speedMs);
        break;
      default:
        break;
    }
  });
}
