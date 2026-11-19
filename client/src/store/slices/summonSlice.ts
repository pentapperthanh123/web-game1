import type { GiftRulePayload } from '../../constants/giftConfig';
import { StateCreator } from 'zustand';
import { GiftEvent, buildGiftAnnouncement, runGiftExplosion } from '../giftExplosion';
import { isGiftTierAtLeast, pickGiftBanner, resolveGiftTier } from '../giftTier';
import { GIFT_METEOR_SPAWN, GIFT_TIER } from '../../constants/game';
import { trackQuestProgress } from '../communityQuestRewards';
import { DAMAGE_SOURCE, QUEST_KIND } from '../../constants/game';
import {
  AdminEventLog,
  GameState,
  LiveChatMessage,
  ParticleBurst,
  QueuedSummon,
  SummonPortalEntity,
} from '../../types/game';
import { deployQueuedMinions, holdQueuedMinions, resolveSummonTurnLimits } from '../summonQueueHelper';
import { deferUntilRoundStart, onRoundStart, runWhenRoundLive } from '../preRoundBuffer';
import { isCurrentRoundIntroActive } from '../roundIntroStore';
import i18n from '../../i18n';
import { isMinionLiving, rebuildMinionCollections } from '../minionMapHelpers';
import {
  BOSS_STATUS,
  COMBAT_VFX_CONSTANTS,
  DAMAGE_TYPE,
  GAME_CONSTANTS,
  SUMMON_PERF_CONSTANTS,
  TEAM_SLOTS,
  TEAM_SLOT_LEFT,
  TEAM_SLOT_RIGHT,
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
import { useGiftVfxStore } from '../giftVfxStore';
import { playSound } from '../../services/soundManager';
import { createInitialTeamScores, isBattleHalted } from '../storeHelpers';

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
  isElite?: boolean;
  level?: number;
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

const isPageHidden = (): boolean => typeof document !== 'undefined' && document.hidden;

const scheduleBatchFlush = (callback: () => void, delayMs: number): void => {
  // If the browser tab is in the background or unfocused, requestAnimationFrame freezes completely.
  // Fall back immediately to setTimeout so summon processing never hangs waiting for focus.
  if (!isPageHidden() && delayMs <= 0 && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => callback());
    return;
  }
  setTimeout(callback, Math.max(0, delayMs));
};

/** Creates the champion summon, TikTok gift, follow, and share reward slice. */
export const createSummonSlice: StateCreator<GameState, [], [], SummonSlice> = (set, get) => {
  // Summons made during the round intro wait in the queue; they start entering when the fight begins
  onRoundStart(() => get().advanceSummonTurnQueue());

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
    const activeLivingCount = state.minions.filter((minion) => isMinionLiving(minion)).length;
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
    const teamAggregatedSupportDmg = createInitialTeamScores();
    const teamOverflowCounts = createInitialTeamScores();
    let hasPlayedSupportChime = false;

    const nextQueue: Record<TeamType, QueuedSummon[]> = Object.fromEntries(
      TEAM_SLOTS.map((slot) => [slot, [...(state.summonQueue?.[slot] || [])]])
    ) as Record<TeamType, QueuedSummon[]>;

    if (overflowCount > 0) {
      const overflowItems = batch.slice(0, overflowCount);
      for (let k = 0; k < overflowItems.length; k += 1) {
        const item = overflowItems[k];
        const slotTeam = item.team === TEAM_SLOT_RIGHT ? TEAM_SLOT_RIGHT : TEAM_SLOT_LEFT;
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
          isElite: item.isElite,
          level: item.level,
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
          return isSameUser && isMinionLiving(m);
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
              isSignatureSynergy,
              signaturePlayerName: exactSignaturePro?.name,
              signaturePlayerRole: exactSignaturePro?.role,
            };
          } else {
            nextMinions[livingIdx] = {
              ...targetMinion,
              hp: Math.min(maxHp, curHp + healAmt),
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
        isElite: req.isElite,
        level: req.level,
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
      const leftTag = state.activeTeams[TEAM_SLOT_LEFT]?.shortTag ?? TEAM_SLOT_LEFT;
      const rightTag = state.activeTeams[TEAM_SLOT_RIGHT]?.shortTag ?? TEAM_SLOT_RIGHT;
      newLogs.unshift({
        id: `log-${now}-overflow`,
        time: new Date(now).toLocaleTimeString('vi-VN', { hour12: false }),
        type: 'SUMMON',
        message: `🌊 Bão triệu hồi đồng loạt: +${batch.length} người tham chiến (${teamOverflowCounts[TEAM_SLOT_LEFT]} ${leftTag} / ${teamOverflowCounts[TEAM_SLOT_RIGHT]} ${rightTag} tiếp sức)!`,
      });
    }

    // Apply aggregated support + overflow damage at most once per team per batch
    for (const slotTeam of TEAM_SLOTS) {
      const totalSupportDmg = teamAggregatedSupportDmg[slotTeam];
      if (totalSupportDmg > 0) {
        const teamShort = state.activeTeams[slotTeam]?.shortTag || slotTeam;
        runWhenRoundLive(() =>
          get().damageBoss(totalSupportDmg, slotTeam, `Hội Quân (${teamShort})`, DAMAGE_TYPE.NORMAL, { source: DAMAGE_SOURCE.RALLY })
        );
      }
    }

    const portalSliceCount = COMBAT_VFX_CONSTANTS.SUMMON.MAX_ACTIVE_PORTALS;
    const burstSliceCount = COMBAT_VFX_CONSTANTS.PARTICLES.MAX_BURST_QUEUE;

    // Tự động kiểm tra và xuất trận lượt tướng theo tuần tự (delay giữa các lượt xuất hiện)
    const turnLimits = resolveSummonTurnLimits(state.participationRuleConfig);
    const deployed = isCurrentRoundIntroActive(now)
      ? holdQueuedMinions(nextMinions, nextQueue, state.lastSummonTurnTimestamps)
      : deployQueuedMinions(nextMinions, nextQueue, state.lastSummonTurnTimestamps, now, state.activeTeams, turnLimits);
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
      const collections = rebuildMinionCollections(slicedMinions);

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

    const summonsByTeam = createInitialTeamScores();
    for (let i = 0; i < items.length; i += 1) {
      pendingSummonQueue.push(items[i]);
      summonsByTeam[items[i].team] += 1;
    }
    TEAM_SLOTS.forEach((slot) => {
      trackQuestProgress(get, slot, QUEST_KIND.SUMMONS, summonsByTeam[slot]);
    });

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
      isExplicitChampion?: boolean,
      isElite?: boolean,
      level?: number
    ) => {
      enqueueSummons([
        { summonerName, championName, team, isGiftBypass, userAvatarUrl, isExplicitChampion, isElite, level },
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
        isElite: item.isElite,
        level: item.level,
      }));
      enqueueSummons(normalized);
    },

    advanceSummonTurnQueue: () => {
      const state = get();
      // The round-start listener resumes the queue once the intro card closes
      if (isBattleHalted(state) || isCurrentRoundIntroActive()) return;
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
      const collections = rebuildMinionCollections(slicedMinions);
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
    donorAvatarUrl?: string,
    giftRule?: GiftRulePayload
  ) => {
    const isDeferred = deferUntilRoundStart(() =>
      get().triggerGiftExplosion(giftName, team, donorName, coins, streakCount, totalCoins, isComboFinal, donorAvatarUrl, giftRule)
    );
    if (isDeferred) {
      // Acknowledged now so the donor sees it landed; the explosion and damage happen at round start
      get().addChatMessage(
        donorName,
        i18n.t('Gift.queuedForRoundStart', {
          gift: giftName,
          coins: totalCoins ?? coins,
          defaultValue: 'Đã tặng {{gift}} ({{coins}} xu)! Quà sẽ kích hoạt khi vào trận ⚔️',
        }),
        team
      );
      return;
    }
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
      rule: giftRule,
    };

    if (isBattleHalted(get())) {
      trackQuestProgress(get, team, QUEST_KIND.COINS, coins);
      const isDefeated = get().bossStatus === BOSS_STATUS.DEFEATED || get().bossHp <= 0;
      const haltedTier = resolveGiftTier(event.coins, event.totalCoins);
      if (!isDefeated && isGiftTierAtLeast(haltedTier, GIFT_TIER.BIG)) {
        set({ activeGiftBanner: buildGiftAnnouncement(event, haltedTier, now) });
      }
      const streakLabel = event.streakCount > 1 ? ` x${event.streakCount}` : '';
      get().addChatMessage(donorName, `Đã tặng ${giftName}${streakLabel} (${event.totalCoins} xu)!`, team);
      return;
    }

    useGiftVfxStore.getState().recordGiftCoins(event.team, event.coins);
    const result = runGiftExplosion(get, event, now);
    const isNowDefeated = get().bossStatus === BOSS_STATUS.DEFEATED || get().bossHp <= 0;
    set((prev) => {
      const nextMomentum =
        result.frenzyUntil && result.frenzyTeam
          ? {
              ...prev.teamHeartMomentum,
              [result.frenzyTeam]: {
                multiplier: Math.max(
                  prev.teamHeartMomentum[result.frenzyTeam]?.multiplier ?? 1,
                  GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_MAX
                ),
                lastTapAt: now,
                burstCount: prev.teamHeartMomentum[result.frenzyTeam]?.burstCount ?? 0,
                frenzyUntil: Math.max(
                  prev.teamHeartMomentum[result.frenzyTeam]?.frenzyUntil ?? 0,
                  result.frenzyUntil
                ),
              },
            }
          : prev.teamHeartMomentum;

      return {
        activeMeteors: [...prev.activeMeteors.slice(-GIFT_METEOR_SPAWN.MAX_KEPT), ...result.meteors],
        activeGiftBanner: isNowDefeated ? null : pickGiftBanner(prev.activeGiftBanner, result.banner, now),
        bossStaggerUntil: Math.max(prev.bossStaggerUntil, result.bossStaggerUntil),
        teamHeartMomentum: nextMomentum,
      };
    });
    // Counted after the gift lands: a quest it completes rewards a damage burst, and that burst
    // must not land first and steal the killing blow from the gift (it hid the gift finisher).
    trackQuestProgress(get, team, QUEST_KIND.COINS, coins);
  },

  triggerFollowReward: (
    userName: string,
    team: TeamType,
    championName: string,
    furyGain = GAME_CONSTANTS.TIKTOK_ENGAGEMENT.FOLLOW_FURY_GAIN
  ) => {
    if (deferUntilRoundStart(() => get().triggerFollowReward(userName, team, championName, furyGain))) return;
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
    if (deferUntilRoundStart(() => get().triggerShareReward(userName, team, damageAmount, healAmount))) return;
    const state = get();
    const activeTeamProfile = state.activeTeams[team];
    const teamTag = activeTeamProfile?.shortTag || team;
    const theme = getTeamTheme(activeTeamProfile?.colorTheme);

    if (!isBattleHalted(state)) {
      get().healTeamChampions(team, healAmount);
      get().damageBoss(damageAmount, team, `${userName} (Share Live)`, DAMAGE_TYPE.CRIT, { source: DAMAGE_SOURCE.SHARE });
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
