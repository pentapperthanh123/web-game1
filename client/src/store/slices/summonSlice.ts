import { StateCreator } from 'zustand';
import {
  AdminEventLog,
  GameState,
  GiftAnnouncement,
  LiveChatMessage,
  MeteorEntity,
  MinionEntity,
  ParticleBurst,
  SummonPortalEntity,
} from '../../types/game';
import {
  COMBAT_VFX_CONSTANTS,
  DAMAGE_TYPE,
  GAME_CONSTANTS,
  SUMMON_PERF_CONSTANTS,
  TEAM_KEY,
  TeamType,
} from '../../constants/game';
import { CHAMPION_DEFAULT_MAX_HP } from '../../constants/bossSkills';
import { getChampionAvatarUrl } from '../../constants/roster';
import {
  findExactSignaturePlayer,
  findRosterPlayerInRoster,
  getTeamTheme,
} from '../../constants/teams';
import { SFX_EVENT } from '../../constants/sfx';
import { audioService } from '../../services/audioService';
import { playSound } from '../../services/soundManager';
import { swarmLegionPool, SwarmSpawnInput } from '../../services/swarmLegionPool';
import { isBattleHalted, randomInRange, createWingSpawnPosition } from '../storeHelpers';

export type SummonSlice = Pick<
  GameState,
  | 'summonMinion'
  | 'summonMinionsBatch'
  | 'triggerGiftExplosion'
  | 'triggerFollowReward'
  | 'triggerShareReward'
  | 'dismissGiftBanner'
>;

interface PendingSummonRequest {
  summonerName: string;
  championName: string;
  team: TeamType;
  isGiftBypass: boolean;
}

const pendingSummonQueue: PendingSummonRequest[] = [];
let isSummonFlushScheduled = false;
let lastSummonSfxAt = 0;
let lastBatchFlushAt = 0;

const scheduleBatchFlush = (callback: () => void, delayMs: number): void => {
  if (delayMs <= 0 && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => callback());
    return;
  }
  setTimeout(callback, Math.max(SUMMON_PERF_CONSTANTS.COALESCE_FALLBACK_MS, delayMs));
};

/** Creates the champion summon, TikTok gift, follow, and share reward slice. */
export const createSummonSlice: StateCreator<GameState, [], [], SummonSlice> = (set, get) => {
  const flushSummonBatch = () => {
    isSummonFlushScheduled = false;
    if (pendingSummonQueue.length === 0) return;

    const batch = pendingSummonQueue.splice(0, pendingSummonQueue.length);
    const state = get();
    if (isBattleHalted(state)) return;

    const now = Date.now();
    lastBatchFlushAt = now;

    // Prevent WebGL thrashing when 100-200 people summon continuously:
    // keep visible 3D slots stable and swap at most MAX_VISUAL_SWAPS_PER_WAVE when saturated.
    const activeLivingCount = state.minions.filter(
      (m) => (m.hp ?? CHAMPION_DEFAULT_MAX_HP) > 0 && now - m.createdAt < m.lifetimeMs
    ).length;
    const isVisualSaturated = activeLivingCount >= COMBAT_VFX_CONSTANTS.SUMMON.MAX_VISIBLE_ORBS;
    const visualBudget = isVisualSaturated
      ? SUMMON_PERF_CONSTANTS.MAX_VISUAL_SWAPS_PER_WAVE
      : SUMMON_PERF_CONSTANTS.MAX_BATCH_BUILD_COUNT;

    const effectiveBatch =
      batch.length > visualBudget ? batch.slice(-visualBudget) : batch;
    const overflowCount = Math.max(0, batch.length - effectiveBatch.length);

    // Throttle summon audio so 100-1000 simultaneous summons never spam WebAudio nodes
    if (now - lastSummonSfxAt >= SUMMON_PERF_CONSTANTS.SFX_THROTTLE_MS) {
      lastSummonSfxAt = now;
      playSound(SFX_EVENT.CHAMPION_SUMMON);
    }

    const nextMinions = [...state.minions];
    const newPortals: SummonPortalEntity[] = [];
    const newBursts: ParticleBurst[] = [];
    const newLogs: AdminEventLog[] = [];
    const newChats: LiveChatMessage[] = [];
    const furyBoosts: Record<string, number> = {};
    const teamAggregatedSupportDmg: Record<TeamType, number> = {
      [TEAM_KEY.BLG]: 0,
      [TEAM_KEY.GENG]: 0,
    };
    const teamOverflowCounts: Record<TeamType, number> = {
      [TEAM_KEY.BLG]: 0,
      [TEAM_KEY.GENG]: 0,
    };
    let hasPlayedSupportChime = false;

    const swarmSpawnList: SwarmSpawnInput[] = [];
    const teamColorCache: Record<TeamType, string> = {
      [TEAM_KEY.BLG]: getTeamTheme(state.activeTeams[TEAM_KEY.BLG]?.colorTheme).primaryHex,
      [TEAM_KEY.GENG]: getTeamTheme(state.activeTeams[TEAM_KEY.GENG]?.colorTheme).primaryHex,
    };

    if (overflowCount > 0) {
      const overflowItems = batch.slice(0, overflowCount);
      for (let k = 0; k < overflowItems.length; k += 1) {
        const item = overflowItems[k];
        const slotTeam = item.team === TEAM_KEY.GENG ? TEAM_KEY.GENG : TEAM_KEY.BLG;
        teamOverflowCounts[slotTeam] += 1;
        teamAggregatedSupportDmg[slotTeam] += Math.round(
          GAME_CONSTANTS.MINIONS.BASE_DPS * SUMMON_PERF_CONSTANTS.OVERFLOW_SUPPORT_DPS_FACTOR
        );
        swarmSpawnList.push({
          team: slotTeam,
          colorHex: teamColorCache[slotTeam],
          avatarUrl: getChampionAvatarUrl(item.championName, slotTeam),
        });
      }
    }

    // Any units in effectiveBatch beyond MAX_VISIBLE_ORBS won't appear in the 3D Hero slots,
    // so mirror them into SwarmLegionCanvas so the full requested army (200/500/1000/2000) is visible.
    const maxVisible3D = COMBAT_VFX_CONSTANTS.SUMMON.MAX_VISIBLE_ORBS;
    if (!isVisualSaturated && effectiveBatch.length > maxVisible3D) {
      const hidden3DCount = effectiveBatch.length - maxVisible3D;
      for (let k = 0; k < hidden3DCount; k += 1) {
        const item = effectiveBatch[k];
        const slotTeam = item.team === TEAM_KEY.GENG ? TEAM_KEY.GENG : TEAM_KEY.BLG;
        swarmSpawnList.push({
          team: slotTeam,
          colorHex: teamColorCache[slotTeam],
          avatarUrl: getChampionAvatarUrl(item.championName, slotTeam),
        });
      }
    }

    if (swarmSpawnList.length > 0) {
      swarmLegionPool.spawnUnits(swarmSpawnList, now);
    }

    for (let i = 0; i < effectiveBatch.length; i += 1) {
      const req = effectiveBatch[i];
      const normalizedUser = req.summonerName.trim().toLowerCase();

      if (!req.isGiftBypass) {
        const livingIdx = nextMinions.findIndex((m) => {
          const isSameUser = m.summonerName.trim().toLowerCase() === normalizedUser;
          const isAlive = (m.hp ?? CHAMPION_DEFAULT_MAX_HP) > 0;
          const isNotExpired = now - m.createdAt < m.lifetimeMs;
          return isSameUser && isAlive && isNotExpired;
        });

        if (livingIdx !== -1) {
          const targetMinion = nextMinions[livingIdx];
          const healAmt = GAME_CONSTANTS.SUMMON_RULES.ALIVE_SUPPORT_HEAL;
          const bonusDmg = GAME_CONSTANTS.SUMMON_RULES.ALIVE_SUPPORT_DAMAGE;
          const curHp = targetMinion.hp ?? CHAMPION_DEFAULT_MAX_HP;
          const maxHp = targetMinion.maxHp ?? CHAMPION_DEFAULT_MAX_HP;

          nextMinions[livingIdx] = {
            ...targetMinion,
            hp: Math.min(maxHp, curHp + healAmt),
            lifetimeMs: targetMinion.lifetimeMs + GAME_CONSTANTS.SUMMON_RULES.LIFETIME_EXTENSION_MS,
          };
          teamAggregatedSupportDmg[req.team] += bonusDmg;
          if (!hasPlayedSupportChime) {
            hasPlayedSupportChime = true;
            audioService.playHeartChime();
          }
          if (newLogs.length < SUMMON_PERF_CONSTANTS.MAX_LOGS_PER_BATCH) {
            newLogs.push({
              id: `log-${now}-${i}-${Math.random().toString(36).substring(2, 5)}`,
              time: new Date(now).toLocaleTimeString('vi-VN', { hour12: false }),
              type: 'SUMMON',
              message: `⚡ ${req.summonerName} tiếp sức [${targetMinion.championName}] (+${healAmt} HP & +${bonusDmg} ST)`,
              team: req.team,
            });
          }
          if (newChats.length < SUMMON_PERF_CONSTANTS.MAX_CHATS_PER_BATCH) {
            newChats.push({
              id: `chat-${now}-${i}-${Math.random().toString(36).substring(2, 5)}`,
              userName: req.summonerName,
              text: `Tiếp sức cho ${targetMinion.championName}! (+${healAmt} HP)`,
              team: req.team,
              championName: targetMinion.championName,
              timestamp: new Date(now).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            });
          }
          continue;
        }
      }

      const spawnPosition = createWingSpawnPosition(req.team);
      const avatarUrl = getChampionAvatarUrl(req.championName, req.team);
      const activeTeamProfile = state.activeTeams[req.team];
      const dynamicTeamTheme = getTeamTheme(activeTeamProfile?.colorTheme);
      const primaryColor = dynamicTeamTheme.primaryHex;
      const exactSignaturePro = findExactSignaturePlayer(
        req.championName,
        activeTeamProfile?.roster ?? []
      );
      const isSignatureSynergy = Boolean(exactSignaturePro);
      const rawBaseDps =
        GAME_CONSTANTS.MINIONS.BASE_DPS +
        Math.floor(Math.random() * GAME_CONSTANTS.MINIONS.DPS_VARIANCE);
      const baseDps = isSignatureSynergy
        ? Math.round(rawBaseDps * GAME_CONSTANTS.SIGNATURE_SYNERGY.DAMAGE_MULTIPLIER)
        : rawBaseDps;
      const summonDps = baseDps * COMBAT_VFX_CONSTANTS.SUMMON.NORMAL_MULTIPLIER;

      const newMinion: MinionEntity = {
        id: `minion-${now}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        summonerName: req.summonerName,
        championName: req.championName,
        avatarUrl,
        team: req.team,
        spawnPosition,
        orbitRadius: randomInRange(
          GAME_CONSTANTS.MINIONS.ORBIT_RADIUS_MIN,
          GAME_CONSTANTS.MINIONS.ORBIT_RADIUS_MAX
        ),
        orbitSpeed: (0.4 + Math.random() * 0.6) * (req.team === TEAM_KEY.BLG ? 1 : -1),
        orbitAngle: Math.random() * Math.PI * 2,
        verticalOffset: (Math.random() - 0.5) * 1.8,
        createdAt: now,
        lifetimeMs: GAME_CONSTANTS.MINIONS.LIFETIME_MS,
        dps: baseDps,
        hp: CHAMPION_DEFAULT_MAX_HP,
        maxHp: CHAMPION_DEFAULT_MAX_HP,
        fury: 0,
        maxFury: GAME_CONSTANTS.MINION_FURY.MAX_FURY,
        isSignatureSynergy,
        signaturePlayerName: exactSignaturePro?.name,
        signaturePlayerRole: exactSignaturePro?.role,
      };
      nextMinions.push(newMinion);

      newPortals.push({
        id: `portal-${now}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        summonerName: req.summonerName,
        championName: req.championName,
        avatarUrl,
        team: req.team,
        position: spawnPosition,
        color: isSignatureSynergy ? GAME_CONSTANTS.SIGNATURE_SYNERGY.GOLD_COLOR : primaryColor,
        isCrit: isSignatureSynergy,
        dps: summonDps,
        createdAt: now,
        isSignatureSynergy,
        signaturePlayerName: exactSignaturePro?.name,
      });

      newBursts.push({
        id: `burst-${now}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        origin: spawnPosition,
        color: primaryColor,
        intensity: COMBAT_VFX_CONSTANTS.PARTICLES.INTENSITY_NORMAL,
        timestamp: now,
      });

      const matchingPro =
        exactSignaturePro ||
        findRosterPlayerInRoster(req.championName, activeTeamProfile?.roster ?? []);
      if (matchingPro) {
        furyBoosts[matchingPro.id] =
          (furyBoosts[matchingPro.id] ?? 0) + GAME_CONSTANTS.PRO_FURY.FURY_GAIN_SUMMON_MATCH;
      }

      const teamTag = activeTeamProfile?.shortTag || req.team;
      if (newLogs.length < SUMMON_PERF_CONSTANTS.MAX_LOGS_PER_BATCH) {
        const logMsg =
          isSignatureSynergy && exactSignaturePro
            ? `⭐ TƯỚNG TỦ [${exactSignaturePro.name}]! ${req.summonerName} triệu hồi ${req.championName} phe ${teamTag} (+${GAME_CONSTANTS.SIGNATURE_SYNERGY.BONUS_PERCENT}% ST)`
            : `${req.summonerName} triệu hồi [${req.championName}] phe ${teamTag} (Bảo hộ 1s)`;
        newLogs.push({
          id: `log-${now}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          time: new Date(now).toLocaleTimeString('vi-VN', { hour12: false }),
          type: 'SUMMON',
          message: logMsg,
          team: req.team,
        });
      }
      if (newChats.length < SUMMON_PERF_CONSTANTS.MAX_CHATS_PER_BATCH) {
        const chatMsg =
          isSignatureSynergy && exactSignaturePro
            ? `⭐ Tướng Tủ ${exactSignaturePro.name}: ${req.championName} (+${GAME_CONSTANTS.SIGNATURE_SYNERGY.BONUS_PERCENT}% ST)!`
            : `Triệu hồi ${req.championName} chiến đấu!`;
        newChats.push({
          id: `chat-${now}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          userName: req.summonerName,
          text: chatMsg,
          team: req.team,
          championName: req.championName,
          timestamp: new Date(now).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }
    }

    if (overflowCount > 0) {
      newLogs.unshift({
        id: `log-${now}-overflow`,
        time: new Date(now).toLocaleTimeString('vi-VN', { hour12: false }),
        type: 'SUMMON',
        message: `🌊 Bão triệu hồi đồng loạt: +${batch.length} người tham chiến (${teamOverflowCounts[TEAM_KEY.BLG]} ${state.activeTeams[TEAM_KEY.BLG].shortTag} / ${teamOverflowCounts[TEAM_KEY.GENG]} ${state.activeTeams[TEAM_KEY.GENG].shortTag} tiếp sức)!`,
      });
    }

    // Apply aggregated support + overflow damage at most once per team per batch
    for (const slotTeam of [TEAM_KEY.BLG, TEAM_KEY.GENG] as const) {
      const totalSupportDmg = teamAggregatedSupportDmg[slotTeam];
      if (totalSupportDmg > 0) {
        const teamShort = state.activeTeams[slotTeam]?.shortTag || slotTeam;
        get().damageBoss(
          totalSupportDmg,
          slotTeam,
          `Hội Quân (${teamShort})`,
          DAMAGE_TYPE.NORMAL
        );
      }
    }

    const portalSliceCount = COMBAT_VFX_CONSTANTS.SUMMON.MAX_ACTIVE_PORTALS;
    const burstSliceCount = COMBAT_VFX_CONSTANTS.PARTICLES.MAX_BURST_QUEUE;

    set((prev) => {
      let nextFuryMap = prev.rosterPlayerFury;
      const boostEntries = Object.entries(furyBoosts);
      if (boostEntries.length > 0) {
        nextFuryMap = { ...prev.rosterPlayerFury };
        for (const [proId, gain] of boostEntries) {
          nextFuryMap[proId] = Math.min(
            GAME_CONSTANTS.PRO_FURY.MAX_FURY,
            (nextFuryMap[proId] ?? 0) + gain
          );
        }
      }

      return {
        minions: nextMinions.slice(-GAME_CONSTANTS.MINIONS.MAX_INSTANCES),
        activeSummonPortals: [...prev.activeSummonPortals, ...newPortals].slice(-portalSliceCount),
        activeBursts: [...prev.activeBursts, ...newBursts].slice(-burstSliceCount),
        eventLogs: [...newLogs.reverse(), ...prev.eventLogs].slice(0, 100),
        chatMessages: [...prev.chatMessages, ...newChats].slice(-GAME_CONSTANTS.CHAT.MAX_MESSAGES),
        rosterPlayerFury: nextFuryMap,
      };
    });
  };

  const enqueueSummons = (items: PendingSummonRequest[]) => {
    const state = get();
    if (isBattleHalted(state) || items.length === 0) {
      return;
    }

    for (let i = 0; i < items.length; i += 1) {
      pendingSummonQueue.push(items[i]);
    }

    if (!isSummonFlushScheduled) {
      isSummonFlushScheduled = true;
      const elapsedSinceLastFlush = Date.now() - lastBatchFlushAt;
      const delayMs =
        elapsedSinceLastFlush < SUMMON_PERF_CONSTANTS.BURST_COALESCE_MS
          ? SUMMON_PERF_CONSTANTS.BURST_COALESCE_MS - elapsedSinceLastFlush
          : 0;
      scheduleBatchFlush(flushSummonBatch, delayMs);
    }
  };

  return {
    summonMinion: (summonerName: string, championName: string, team: TeamType, isGiftBypass = false) => {
      enqueueSummons([{ summonerName, championName, team, isGiftBypass }]);
    },

    summonMinionsBatch: (items) => {
      const normalized: PendingSummonRequest[] = items.map((item) => ({
        summonerName: item.summonerName,
        championName: item.championName,
        team: item.team,
        isGiftBypass: Boolean(item.isGiftBypass),
      }));
      enqueueSummons(normalized);
    },

  triggerGiftExplosion: (
    giftName: string,
    team: TeamType,
    donorName: string,
    coins = 100,
    streakCount = 1,
    totalCoins?: number,
    isComboFinal = false
  ) => {
    const state = get();
    const resolvedStreak = Math.max(1, streakCount);
    const resolvedTotalCoins = totalCoins ?? coins;
    const newBanner: GiftAnnouncement = {
      id: `banner-${Date.now()}-${resolvedStreak}`,
      donorName,
      giftName,
      team,
      coins,
      streakCount: resolvedStreak,
      totalCoins: resolvedTotalCoins,
      isComboFinal,
      timestamp: Date.now(),
    };

    if (isBattleHalted(state)) {
      set({ activeGiftBanner: newBanner });
      get().addChatMessage(
        donorName,
        `Đã tặng ${giftName}${resolvedStreak > 1 ? ` x${resolvedStreak}` : ''} (${resolvedTotalCoins} xu)!`,
        team
      );
      return;
    }

    const activeGiftTeam = state.activeTeams[team];
    const giftTeamTheme = getTeamTheme(activeGiftTeam?.colorTheme);
    const burstColor = giftTeamTheme.primaryHex;
    const isRapidStreakTick = resolvedStreak > 1 && coins < 10 && resolvedStreak % 5 !== 0;

    if (isRapidStreakTick) {
      audioService.playHeartChime();
    } else {
      audioService.playGiftFanfare();
    }

    const meteorCount = isRapidStreakTick
      ? GAME_CONSTANTS.TIKTOK_ENGAGEMENT.STREAK_BURST_METEOR_COUNT
      : GAME_CONSTANTS.TIKTOK_ENGAGEMENT.DEFAULT_METEOR_COUNT;
    const newMeteors: MeteorEntity[] = [];
    for (let i = 0; i < meteorCount; i++) {
      const angle = (i / meteorCount) * Math.PI * 2;
      const startX = Math.cos(angle) * (3.5 + Math.random() * 2);
      const startZ = Math.sin(angle) * (3.5 + Math.random() * 2);
      newMeteors.push({
        id: `meteor-${Date.now()}-${resolvedStreak}-${i}`,
        start: [startX, 10 + Math.random() * 3, startZ],
        target: [(Math.random() - 0.5) * 1.5, 0.4, (Math.random() - 0.5) * 1.5],
        color: burstColor,
        createdAt: Date.now() + i * 90,
        duration: 0.65,
      });
    }

    get().healTeamChampions(team, GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_HEAL_AMOUNT);
    const giftDamage = coins * GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_DAMAGE_PER_COIN;
    get().damageBoss(giftDamage, team, `${donorName} (${giftName})`, 'ULTIMATE');
    get().triggerScreenFlash(giftTeamTheme.secondaryHex);
    get().triggerScreenShake(isRapidStreakTick ? 0.65 : 1.3);

    const giftTeamRoster = activeGiftTeam?.roster ?? [];
    giftTeamRoster.forEach((pro) => {
      get().addPlayerFury(pro.id, GAME_CONSTANTS.PRO_FURY.FURY_GAIN_GIFT_BOOST);
    });

    if (resolvedStreak === 1 || resolvedStreak % 3 === 0 || coins >= 10) {
      const signaturePool = giftTeamRoster.map((p) => p.signatureChampion).filter(Boolean);
      const pool = signaturePool.length > 0 ? signaturePool : ['Ahri', 'Yone', 'Aatrox', 'Jinx', 'Lee Sin'];
      const eliteChamp = pool[Math.floor(Math.random() * pool.length)];
      get().summonMinion(`👑 ${donorName}`, eliteChamp, team, true);
    }

    const safeGiftDamage = Number.isFinite(giftDamage) ? giftDamage : 0;
    const giftTeamTag = activeGiftTeam?.shortTag || team;
    const streakLabel = resolvedStreak > 1 ? ` x${resolvedStreak}` : '';
    get().addLog(
      'GIFT',
      `💎 ${donorName} tặng [${giftName}${streakLabel}] (+${coins} xu) phe ${giftTeamTag} gây +${safeGiftDamage.toLocaleString()} ST!`,
      team
    );
    if (!isRapidStreakTick || isComboFinal) {
      get().addChatMessage(
        donorName,
        `Đã tặng ${giftName}${streakLabel} (+${safeGiftDamage.toLocaleString()} DMG)!`,
        team
      );
    }

    set((prev) => ({
      activeBursts: [
        ...prev.activeBursts.slice(-4),
        { id: `burst-${Date.now()}`, timestamp: Date.now(), origin: [0, 0, 0], color: burstColor, intensity: 4 },
      ],
      activeMeteors: [...prev.activeMeteors.slice(-12), ...newMeteors],
      activeGiftBanner: newBanner,
    }));
  },

  triggerFollowReward: (
    userName: string,
    team: TeamType,
    championName: string,
    furyGain = GAME_CONSTANTS.TIKTOK_ENGAGEMENT.FOLLOW_FURY_GAIN
  ) => {
    const state = get();
    const activeTeamProfile = state.activeTeams[team];
    const teamTag = activeTeamProfile?.shortTag || team;
    const roster = activeTeamProfile?.roster ?? [];

    roster.forEach((pro) => {
      get().addPlayerFury(pro.id, furyGain);
    });

    if (!isBattleHalted(state)) {
      get().summonMinion(`💖 ${userName}`, championName, team, true);
      audioService.playHeartChime();
    }

    get().addLog(
      'SYSTEM',
      `💖 ${userName} vừa Follow! Triệu hồi ${championName} & +${furyGain}% Nộ phe ${teamTag}!`,
      team
    );
    get().addChatMessage(
      userName,
      `💖 Vừa Follow kênh! Gọi ${championName} & +${furyGain}% Nộ ${teamTag}!`,
      team,
      championName
    );
  },

  triggerShareReward: (
    userName: string,
    team: TeamType,
    damageAmount = GAME_CONSTANTS.TIKTOK_ENGAGEMENT.SHARE_BURST_DAMAGE,
    healAmount = GAME_CONSTANTS.TIKTOK_ENGAGEMENT.SHARE_HEAL_AMOUNT
  ) => {
    const state = get();
    const activeTeamProfile = state.activeTeams[team];
    const teamTag = activeTeamProfile?.shortTag || team;
    const theme = getTeamTheme(activeTeamProfile?.colorTheme);

    if (!isBattleHalted(state)) {
      get().healTeamChampions(team, healAmount);
      get().damageBoss(damageAmount, team, `${userName} (Share Live)`, DAMAGE_TYPE.CRIT);
      get().spawnParticleBurst([0, 0.4, 0.5], theme.primaryHex, 1.5);
      audioService.playHeartChime();
    }

    get().addLog(
      'SYSTEM',
      `🚀 ${userName} Chia sẻ Live! +${damageAmount} ST & hồi +${healAmount} HP phe ${teamTag}!`,
      team
    );
    get().addChatMessage(
      userName,
      `🚀 Đã Chia sẻ Live! +${damageAmount} ST & +${healAmount} HP (${teamTag})!`,
      team
    );
  },

  dismissGiftBanner: () => {
    set({ activeGiftBanner: null });
  },
  };
};
