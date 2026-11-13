import { StateCreator } from 'zustand';
import { GiftEvent, buildGiftAnnouncement, runGiftExplosion } from '../giftExplosion';
import { isGiftTierAtLeast, resolveGiftTier } from '../giftTier';
import { GIFT_METEOR_SPAWN, GIFT_TIER } from '../../constants/game';
import { trackQuestProgress } from '../communityQuestRewards';
import { QUEST_KIND } from '../../constants/game';
import {
  AdminEventLog,
  GameState,
  LiveChatMessage,
  ParticleBurst,
  QueuedSummon,
  SummonPortalEntity,
} from '../../types/game';
import { deployQueuedMinions, resolveSummonTurnLimits } from '../summonQueueHelper';
import { rebuildMinionCollections } from '../minionMapHelpers';
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
import { isBattleHalted } from '../storeHelpers';

export type SummonSlice = Pick<
  GameState,
  | 'summonMinion'
  | 'summonMinionsBatch'
  | 'advanceSummonTurnQueue'
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
  userAvatarUrl?: string;
  isExplicitChampion?: boolean;
}

const pendingSummonQueue: PendingSummonRequest[] = [];
let isSummonFlushScheduled = false;
let lastSummonSfxAt = 0;

/** One entrance sound per deploy tick, throttled so a 15-champion turn is not 15 whooshes. */
const playSummonEntranceSfx = (now: number, deployedPortals: readonly SummonPortalEntity[]): void => {
  if (deployedPortals.length === 0) return;
  if (now - lastSummonSfxAt < SUMMON_PERF_CONSTANTS.SFX_THROTTLE_MS) return;
  lastSummonSfxAt = now;
  // A pro's signature champion entering gets its own chord on top of the normal entrance
  const hasSignatureEntrance = deployedPortals.some((portal) => portal.isSignatureSynergy);
  playSound(hasSignatureEntrance ? SFX_EVENT.SIGNATURE_SUMMON : SFX_EVENT.CHAMPION_SUMMON);
};
let lastBatchFlushAt = 0;
let turnTimerId: ReturnType<typeof setTimeout> | null = null;

const scheduleTurnAdvance = (get: () => GameState, delayMs: number): void => {
  if (turnTimerId !== null) return;
  turnTimerId = setTimeout(() => {
    turnTimerId = null;
    get().advanceSummonTurnQueue();
  }, Math.max(GAME_CONSTANTS.SUMMON_RULES.MIN_TURN_ADVANCE_DELAY_MS, delayMs));
};

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

    const nextQueue: Record<TeamType, QueuedSummon[]> = {
      [TEAM_KEY.BLG]: [...(state.summonQueue?.[TEAM_KEY.BLG] || [])],
      [TEAM_KEY.GENG]: [...(state.summonQueue?.[TEAM_KEY.GENG] || [])],
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
        nextQueue[slotTeam].push({
          id: `queue-${now}-ov-${k}-${Math.random().toString(36).substring(2, 6)}`,
          summonerName: item.summonerName,
          championName: item.championName,
          team: slotTeam,
          userAvatarUrl: item.userAvatarUrl,
          isExplicitChampion: item.isExplicitChampion,
          isGiftBypass: item.isGiftBypass,
          queuedAt: now,
        });
      }
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
          const shouldEvolve =
            state.participationRuleConfig.allowChampionEvolution &&
            Boolean(req.isExplicitChampion) &&
            targetMinion.championName.trim().toLowerCase() !== req.championName.trim().toLowerCase();

          if (shouldEvolve) {
            const activeTeamProfile = state.activeTeams[targetMinion.team];
            const exactSignaturePro = findExactSignaturePlayer(
              req.championName,
              activeTeamProfile?.roster ?? []
            );
            const isSignatureSynergy = Boolean(exactSignaturePro);
            const evolvedDps = isSignatureSynergy
              ? Math.round(targetMinion.dps * GAME_CONSTANTS.SIGNATURE_SYNERGY.DAMAGE_MULTIPLIER)
              : targetMinion.dps;

            nextMinions[livingIdx] = {
              ...targetMinion,
              championName: req.championName,
              avatarUrl: getChampionAvatarUrl(req.championName, targetMinion.team),
              userAvatarUrl: req.userAvatarUrl ?? targetMinion.userAvatarUrl,
              dps: evolvedDps,
              hp: Math.min(maxHp, curHp + healAmt),
              lifetimeMs: targetMinion.lifetimeMs + GAME_CONSTANTS.SUMMON_RULES.LIFETIME_EXTENSION_MS,
              isSignatureSynergy,
              signaturePlayerName: exactSignaturePro?.name,
              signaturePlayerRole: exactSignaturePro?.role,
            };
          } else {
            nextMinions[livingIdx] = {
              ...targetMinion,
              hp: Math.min(maxHp, curHp + healAmt),
              lifetimeMs: targetMinion.lifetimeMs + GAME_CONSTANTS.SUMMON_RULES.LIFETIME_EXTENSION_MS,
            };
          }

          teamAggregatedSupportDmg[targetMinion.team] += bonusDmg;
          if (!hasPlayedSupportChime) {
            hasPlayedSupportChime = true;
            audioService.playHeartChime();
          }
          if (newLogs.length < SUMMON_PERF_CONSTANTS.MAX_LOGS_PER_BATCH) {
            newLogs.push({
              id: `log-${now}-${i}-${Math.random().toString(36).substring(2, 5)}`,
              time: new Date(now).toLocaleTimeString('vi-VN', { hour12: false }),
              type: 'SUMMON',
              message: shouldEvolve
                ? `🌟 TIẾN HÓA! ${req.summonerName}: [${targetMinion.championName} → ${req.championName}] (+${healAmt} HP)`
                : `⚡ ${req.summonerName} tiếp sức [${targetMinion.championName}] (+${healAmt} HP & +${bonusDmg} ST)`,
              team: targetMinion.team,
            });
          }
          if (newChats.length < SUMMON_PERF_CONSTANTS.MAX_CHATS_PER_BATCH) {
            newChats.push({
              id: `chat-${now}-${i}-${Math.random().toString(36).substring(2, 5)}`,
              userName: req.summonerName,
              text: shouldEvolve
                ? `🌟 Tiến hóa thành ${req.championName}!`
                : `Tiếp sức cho ${targetMinion.championName}! (+${healAmt} HP)`,
              team: targetMinion.team,
              championName: shouldEvolve ? req.championName : targetMinion.championName,
              timestamp: new Date(now).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            });
          }
          continue;
        }
      }

      const activeTeamProfile = state.activeTeams[req.team];
      const teamTag = activeTeamProfile?.shortTag || req.team;

      // Xếp vào hàng đợi xuất trận theo lượt (Reinforcement Turn Queue)
      nextQueue[req.team].push({
        id: `queue-${now}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        summonerName: req.summonerName,
        championName: req.championName,
        team: req.team,
        userAvatarUrl: req.userAvatarUrl,
        isExplicitChampion: req.isExplicitChampion,
        isGiftBypass: req.isGiftBypass,
        queuedAt: now,
      });

      const queuePos = nextQueue[req.team].length;
      newChats.push({
        id: `chat-q-${now}-${i}`,
        userName: req.summonerName,
        text: `gọi tướng [${req.championName}] (${teamTag} • Lượt #${queuePos})`,
        team: req.team,
        championName: req.championName,
        timestamp: new Date(now).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      const exactSignaturePro = findExactSignaturePlayer(
        req.championName,
        activeTeamProfile?.roster ?? []
      );
      const matchingPro =
        exactSignaturePro ||
        findRosterPlayerInRoster(req.championName, activeTeamProfile?.roster ?? []);
      if (matchingPro) {
        furyBoosts[matchingPro.id] =
          (furyBoosts[matchingPro.id] ?? 0) + GAME_CONSTANTS.PRO_FURY.FURY_GAIN_SUMMON_MATCH;
      } else {
        const teamRoster = activeTeamProfile?.roster ?? [];
        for (const pro of teamRoster) {
          furyBoosts[pro.id] =
            (furyBoosts[pro.id] ?? 0) + GAME_CONSTANTS.PRO_FURY.FURY_GAIN_COMMENT_TEAM;
        }
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

    // Tự động kiểm tra và xuất trận lượt tướng theo tuần tự (delay giữa các lượt xuất hiện)
    const turnLimits = resolveSummonTurnLimits(state.participationRuleConfig);
    const deployed = deployQueuedMinions(
      nextMinions,
      nextQueue,
      state.lastSummonTurnTimestamps,
      now,
      state.activeTeams,
      turnLimits
    );
    const finalMinions = deployed.nextMinions;
    const finalQueue = deployed.nextQueue;
    newPortals.push(...deployed.newPortals);
    newLogs.push(...deployed.newLogs);
    playSummonEntranceSfx(now, deployed.newPortals);

    if (deployed.hasPendingTurns) {
      scheduleTurnAdvance(get, turnLimits.summonTurnDelayMs);
    }

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

      const slicedMinions = finalMinions.slice(-GAME_CONSTANTS.MINIONS.MAX_INSTANCES);
      const collections = rebuildMinionCollections(slicedMinions, now);

      return {
        minions: slicedMinions,
        minionMap: collections.minionMap,
        minionIdsByTeam: collections.minionIdsByTeam,
        livingCountByTeam: collections.livingCountByTeam,
        summonQueue: finalQueue,
        lastSummonTurnTimestamps: deployed.nextLastTurnTimestamps,
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

    const summonsByTeam: Record<TeamType, number> = { [TEAM_KEY.BLG]: 0, [TEAM_KEY.GENG]: 0 };
    for (let i = 0; i < items.length; i += 1) {
      pendingSummonQueue.push(items[i]);
      summonsByTeam[items[i].team] += 1;
    }
    trackQuestProgress(get, TEAM_KEY.BLG, QUEST_KIND.SUMMONS, summonsByTeam[TEAM_KEY.BLG]);
    trackQuestProgress(get, TEAM_KEY.GENG, QUEST_KIND.SUMMONS, summonsByTeam[TEAM_KEY.GENG]);

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
    summonMinion: (
      summonerName: string,
      championName: string,
      team: TeamType,
      isGiftBypass = false,
      userAvatarUrl?: string,
      isExplicitChampion?: boolean
    ) => {
      enqueueSummons([
        { summonerName, championName, team, isGiftBypass, userAvatarUrl, isExplicitChampion },
      ]);
    },

    summonMinionsBatch: (items) => {
      const normalized: PendingSummonRequest[] = items.map((item) => ({
        summonerName: item.summonerName,
        championName: item.championName,
        team: item.team,
        isGiftBypass: Boolean(item.isGiftBypass),
        userAvatarUrl: item.userAvatarUrl,
        isExplicitChampion: item.isExplicitChampion,
      }));
      enqueueSummons(normalized);
    },

    advanceSummonTurnQueue: () => {
      const state = get();
      if (isBattleHalted(state)) return;
      const now = Date.now();
      const turnLimits = resolveSummonTurnLimits(state.participationRuleConfig);
      const deployed = deployQueuedMinions(
        state.minions,
        state.summonQueue,
        state.lastSummonTurnTimestamps,
        now,
        state.activeTeams,
        turnLimits
      );
      if (deployed.newPortals.length === 0) {
        if (deployed.hasPendingTurns) scheduleTurnAdvance(get, turnLimits.summonTurnDelayMs);
        return;
      }
      const slicedMinions = deployed.nextMinions.slice(-GAME_CONSTANTS.MINIONS.MAX_INSTANCES);
      const collections = rebuildMinionCollections(slicedMinions, now);
      playSummonEntranceSfx(now, deployed.newPortals);

      set((prev) => ({
        minions: slicedMinions,
        minionMap: collections.minionMap,
        minionIdsByTeam: collections.minionIdsByTeam,
        livingCountByTeam: collections.livingCountByTeam,
        summonQueue: deployed.nextQueue,
        lastSummonTurnTimestamps: deployed.nextLastTurnTimestamps,
        activeSummonPortals: [
          ...prev.activeSummonPortals,
          ...deployed.newPortals,
        ].slice(-COMBAT_VFX_CONSTANTS.SUMMON.MAX_ACTIVE_PORTALS),
        eventLogs: [...deployed.newLogs.reverse(), ...prev.eventLogs].slice(0, 100),
      }));
      if (deployed.hasPendingTurns) {
        scheduleTurnAdvance(get, turnLimits.summonTurnDelayMs);
      }
    },

  triggerGiftExplosion: (
    giftName: string,
    team: TeamType,
    donorName: string,
    coins = 100,
    streakCount = 1,
    totalCoins?: number,
    isComboFinal = false,
    donorAvatarUrl?: string
  ) => {
    const now = Date.now();
    const event: GiftEvent = {
      giftName,
      team,
      donorName,
      donorAvatarUrl,
      coins,
      streakCount: Math.max(1, streakCount),
      totalCoins: totalCoins ?? coins,
      isComboFinal,
    };
    trackQuestProgress(get, team, QUEST_KIND.COINS, coins);

    if (isBattleHalted(get())) {
      const haltedTier = resolveGiftTier(event.coins, event.totalCoins);
      if (isGiftTierAtLeast(haltedTier, GIFT_TIER.BIG)) {
        set({ activeGiftBanner: buildGiftAnnouncement(event, haltedTier, now) });
      }
      const streakLabel = event.streakCount > 1 ? ` x${event.streakCount}` : '';
      get().addChatMessage(donorName, `Đã tặng ${giftName}${streakLabel} (${event.totalCoins} xu)!`, team);
      return;
    }

    const result = runGiftExplosion(get, event, now);
    set((prev) => ({
      activeMeteors: [...prev.activeMeteors.slice(-GIFT_METEOR_SPAWN.MAX_KEPT), ...result.meteors],
      activeGiftBanner: result.banner ?? prev.activeGiftBanner,
      bossStaggerUntil: Math.max(prev.bossStaggerUntil, result.bossStaggerUntil),
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

    playSound(SFX_EVENT.FOLLOW_NOTIFY);
    if (!isBattleHalted(state)) {
      get().summonMinion(`💖 ${userName}`, championName, team, true);
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
