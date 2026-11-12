import { ActiveTeamsMap, TeamSlotKey } from '../constants/teams.js';
import {
  AffinityResolutionSource,
  PipelineStatsSummary,
  TeamScoreBalance,
  TIKTOK_PIPELINE_CONSTANTS,
  TikTokChatInput,
  TikTokGiftInput,
  TikTokLikeInput,
  TikTokSocialInput,
} from '../constants/tiktok.js';

interface AffinityRecord {
  team: TeamSlotKey;
  updatedAt: number;
}

interface GiftStreakRecord {
  lastCount: number;
  updatedAt: number;
}

export interface DuelContributionPayload {
  type: 'TAP' | 'SKILL' | 'ULTIMATE' | 'MYTHIC';
  donorName: string;
  team: TeamSlotKey;
  deltaPercent: number;
  description: string;
}

export interface TikTokPipelineDeps {
  getActiveTeams: () => ActiveTeamsMap;
  parseComment: (comment: string) => { team?: TeamSlotKey; champion?: string };
  getRandomChampionName: () => string;
  onDuelContribution: (team: TeamSlotKey, deltaPercent: number, event: DuelContributionPayload) => void;
  emit: (eventName: string, payload: unknown) => void;
  nowFn?: () => number;
}

const trimOldestEntries = <K, V>(map: Map<K, V>, maxEntries: number): void => {
  if (map.size < maxEntries) return;
  const oldestKey = map.keys().next().value;
  if (oldestKey !== undefined) {
    map.delete(oldestKey);
  }
};

export class TikTokLivePipeline {
  private readonly deps: TikTokPipelineDeps;
  private readonly viewerAffinity = new Map<string, AffinityRecord>();
  private readonly activeGiftStreaks = new Map<string, GiftStreakRecord>();
  private readonly followedViewers = new Set<string>();
  private readonly shareTimestamps = new Map<string, number>();
  private readonly reminderTimestamps = new Map<string, number>();

  private scoreBalance: TeamScoreBalance = { leftScore: 0, rightScore: 0 };
  private nextFallbackSlot: TeamSlotKey = 'BLG';
  private shareCount = 0;
  private blockedAntiSpamCount = 0;

  constructor(deps: TikTokPipelineDeps) {
    this.deps = deps;
  }

  private now(): number {
    return this.deps.nowFn ? this.deps.nowFn() : Date.now();
  }

  private buildViewerKey(uniqueId?: string, nickname?: string): string {
    const raw = (uniqueId || nickname || 'viewer').trim().toLowerCase();
    return raw.replace(/^@+/, '') || 'viewer';
  }

  private pickBalancedFallbackSlot(): TeamSlotKey {
    const { leftScore, rightScore } = this.scoreBalance;
    if (leftScore < rightScore) {
      return 'BLG';
    }
    if (rightScore < leftScore) {
      return 'GENG';
    }
    const chosen = this.nextFallbackSlot;
    this.nextFallbackSlot = chosen === 'BLG' ? 'GENG' : 'BLG';
    return chosen;
  }

  private shouldSendAffinityReminder(viewerKey: string, now: number): boolean {
    const lastSent = this.reminderTimestamps.get(viewerKey);
    if (
      lastSent !== undefined &&
      now - lastSent < TIKTOK_PIPELINE_CONSTANTS.AFFINITY_REMINDER_COOLDOWN_MS
    ) {
      return false;
    }
    trimOldestEntries(this.reminderTimestamps, TIKTOK_PIPELINE_CONSTANTS.MAX_TRACKED_VIEWERS);
    this.reminderTimestamps.set(viewerKey, now);
    return true;
  }

  private resolveViewerTeam(
    viewerKey: string,
    explicitTeam?: TeamSlotKey
  ): { team: TeamSlotKey; source: AffinityResolutionSource; shouldRemind: boolean } {
    const now = this.now();

    if (explicitTeam) {
      trimOldestEntries(this.viewerAffinity, TIKTOK_PIPELINE_CONSTANTS.MAX_TRACKED_VIEWERS);
      this.viewerAffinity.set(viewerKey, { team: explicitTeam, updatedAt: now });
      return { team: explicitTeam, source: 'explicit', shouldRemind: false };
    }

    const existing = this.viewerAffinity.get(viewerKey);
    if (existing && now - existing.updatedAt < TIKTOK_PIPELINE_CONSTANTS.AFFINITY_TTL_MS) {
      existing.updatedAt = now;
      return { team: existing.team, source: 'affinity', shouldRemind: false };
    }

    const fallbackTeam = this.pickBalancedFallbackSlot();
    return {
      team: fallbackTeam,
      source: 'balanced_fallback',
      shouldRemind: this.shouldSendAffinityReminder(viewerKey, now),
    };
  }

  private emitFallbackReminderIfNeeded(
    displayName: string,
    team: TeamSlotKey,
    shouldRemind: boolean
  ): void {
    if (!shouldRemind) return;
    const teams = this.deps.getActiveTeams();
    const assignedTag = teams[team]?.shortTag || team;
    const leftTag = teams.BLG?.shortTag || 'BLG';
    const rightTag = teams.GENG?.shortTag || 'GEN';
    this.deps.emit('game:chat', {
      userName: 'Hệ Thống',
      text: `💡 ${displayName} tạm tiếp sức ${assignedTag} — Comment [${leftTag}] hoặc [${rightTag}] để khóa phe nhé!`,
      team,
    });
  }

  public updateTeamScoreBalance(leftScore: number, rightScore: number): void {
    if (!Number.isFinite(leftScore) || !Number.isFinite(rightScore)) return;
    this.scoreBalance = {
      leftScore: Math.max(0, leftScore),
      rightScore: Math.max(0, rightScore),
    };
  }

  public resetSessionTrackers(): void {
    this.viewerAffinity.clear();
    this.activeGiftStreaks.clear();
    this.followedViewers.clear();
    this.shareTimestamps.clear();
    this.reminderTimestamps.clear();
    this.scoreBalance = { leftScore: 0, rightScore: 0 };
    this.shareCount = 0;
    this.blockedAntiSpamCount = 0;
  }

  public getStats(): PipelineStatsSummary {
    const now = this.now();
    let leftAffinityCount = 0;
    let rightAffinityCount = 0;
    for (const [key, entry] of this.viewerAffinity.entries()) {
      if (now - entry.updatedAt >= TIKTOK_PIPELINE_CONSTANTS.AFFINITY_TTL_MS) {
        this.viewerAffinity.delete(key);
        continue;
      }
      if (entry.team === 'BLG') {
        leftAffinityCount += 1;
      } else {
        rightAffinityCount += 1;
      }
    }

    for (const [key, streak] of this.activeGiftStreaks.entries()) {
      if (now - streak.updatedAt >= TIKTOK_PIPELINE_CONSTANTS.GIFT_STREAK_TTL_MS) {
        this.activeGiftStreaks.delete(key);
      }
    }

    return {
      trackedAffinityCount: this.viewerAffinity.size,
      leftAffinityCount,
      rightAffinityCount,
      activeStreakCount: this.activeGiftStreaks.size,
      followCount: this.followedViewers.size,
      shareCount: this.shareCount,
      blockedAntiSpamCount: this.blockedAntiSpamCount,
    };
  }

  public handleChat(input: TikTokChatInput): {
    team?: TeamSlotKey;
    championName?: string;
    source?: AffinityResolutionSource;
  } {
    const comment = input.comment || '';
    const displayName = input.nickname || input.uniqueId || 'Viewer';
    const viewerKey = this.buildViewerKey(input.uniqueId, input.nickname);
    const parsed = this.deps.parseComment(comment);

    let effectiveTeam = parsed.team;
    let source: AffinityResolutionSource | undefined;

    if (parsed.team) {
      const locked = this.resolveViewerTeam(viewerKey, parsed.team);
      effectiveTeam = locked.team;
      source = locked.source;
    } else if (parsed.champion) {
      const resolved = this.resolveViewerTeam(viewerKey);
      effectiveTeam = resolved.team;
      source = resolved.source;
    }

    this.deps.emit('game:chat', {
      userName: displayName,
      text: comment,
      team: effectiveTeam,
      championName: parsed.champion,
    });

    if (parsed.champion && effectiveTeam) {
      this.deps.emit('game:summon', {
        summonerName: displayName,
        championName: parsed.champion,
        team: effectiveTeam,
      });
      this.deps.onDuelContribution(effectiveTeam, TIKTOK_PIPELINE_CONSTANTS.DUEL_CHAT_DELTA, {
        type: 'SKILL',
        donorName: displayName,
        team: effectiveTeam,
        deltaPercent: TIKTOK_PIPELINE_CONSTANTS.DUEL_CHAT_DELTA,
        description: `${displayName} gọi ${parsed.champion} xuất chiêu! (+${TIKTOK_PIPELINE_CONSTANTS.DUEL_CHAT_DELTA}%)`,
      });
    }

    return { team: effectiveTeam, championName: parsed.champion, source };
  }

  public handleGift(input: TikTokGiftInput): {
    accepted: boolean;
    team: TeamSlotKey;
    source: AffinityResolutionSource;
    deltaCoins: number;
    streakCount: number;
    reason?: string;
  } {
    const now = this.now();
    const displayName = input.nickname || input.uniqueId || 'Đại Gia';
    const viewerKey = this.buildViewerKey(input.uniqueId, input.nickname);
    const giftName = input.giftName || 'Quà TikTok';
    const unitCoins = Math.max(1, input.diamondCount ?? TIKTOK_PIPELINE_CONSTANTS.DEFAULT_UNIT_COINS);
    const isStreakGift = input.giftType === TIKTOK_PIPELINE_CONSTANTS.STREAK_GIFT_TYPE;
    const rawRepeatCount = Math.max(1, input.repeatCount ?? 1);

    const { team, source, shouldRemind } = this.resolveViewerTeam(viewerKey, input.explicitTeam);

    let deltaCount = rawRepeatCount;
    if (isStreakGift) {
      const streakKey = `${viewerKey}:${String(input.giftId ?? giftName)}`;
      const existing = this.activeGiftStreaks.get(streakKey);
      const prevCount =
        existing && now - existing.updatedAt < TIKTOK_PIPELINE_CONSTANTS.GIFT_STREAK_TTL_MS
          ? existing.lastCount
          : 0;
      deltaCount = Math.max(0, rawRepeatCount - prevCount);

      if (input.repeatEnd) {
        this.activeGiftStreaks.delete(streakKey);
      } else {
        trimOldestEntries(this.activeGiftStreaks, TIKTOK_PIPELINE_CONSTANTS.MAX_TRACKED_STREAKS);
        this.activeGiftStreaks.set(streakKey, { lastCount: rawRepeatCount, updatedAt: now });
      }

      if (deltaCount === 0) {
        return {
          accepted: false,
          team,
          source,
          deltaCoins: 0,
          streakCount: rawRepeatCount,
          reason: 'STREAK_FINAL_ALREADY_COUNTED',
        };
      }
    }

    const deltaCoins = deltaCount * unitCoins;
    const totalCoins = rawRepeatCount * unitCoins;

    this.deps.emit('game:gift', {
      donorName: displayName,
      giftName,
      team,
      coins: deltaCoins,
      streakCount: rawRepeatCount,
      totalCoins,
      isComboFinal: Boolean(input.repeatEnd),
      affinitySource: source,
    });

    this.emitFallbackReminderIfNeeded(displayName, team, shouldRemind);

    let duelDelta: number = TIKTOK_PIPELINE_CONSTANTS.DUEL_GIFT_DELTA_LOW;
    let duelType: DuelContributionPayload['type'] = 'SKILL';
    if (deltaCoins >= TIKTOK_PIPELINE_CONSTANTS.DUEL_GIFT_TIER_HIGH_COINS) {
      duelDelta = TIKTOK_PIPELINE_CONSTANTS.DUEL_GIFT_DELTA_HIGH;
      duelType = 'MYTHIC';
    } else if (deltaCoins >= TIKTOK_PIPELINE_CONSTANTS.DUEL_GIFT_TIER_MID_COINS) {
      duelDelta = TIKTOK_PIPELINE_CONSTANTS.DUEL_GIFT_DELTA_MID;
      duelType = 'ULTIMATE';
    }

    this.deps.onDuelContribution(team, duelDelta, {
      type: duelType,
      donorName: displayName,
      team,
      deltaPercent: duelDelta,
      description: `${displayName} nạp ${giftName}${rawRepeatCount > 1 ? ` x${rawRepeatCount}` : ''} (+${duelDelta}%)`,
    });

    return { accepted: true, team, source, deltaCoins, streakCount: rawRepeatCount };
  }

  public handleLike(input: TikTokLikeInput): {
    team: TeamSlotKey;
    source: AffinityResolutionSource;
    count: number;
  } {
    const displayName = input.nickname || input.uniqueId || 'Viewer';
    const viewerKey = this.buildViewerKey(input.uniqueId, input.nickname);
    const clampedCount = Math.min(
      TIKTOK_PIPELINE_CONSTANTS.MAX_LIKE_BATCH_CLAMP,
      Math.max(1, input.likeCount ?? 1)
    );
    const { team, source } = this.resolveViewerTeam(viewerKey, input.explicitTeam);

    this.deps.emit('game:like', {
      count: clampedCount,
      team,
      userName: displayName,
      affinitySource: source,
    });

    this.deps.onDuelContribution(team, TIKTOK_PIPELINE_CONSTANTS.DUEL_LIKE_DELTA, {
      type: 'TAP',
      donorName: displayName,
      team,
      deltaPercent: TIKTOK_PIPELINE_CONSTANTS.DUEL_LIKE_DELTA,
      description: `${displayName} thả tim tiếp sức! (+${TIKTOK_PIPELINE_CONSTANTS.DUEL_LIKE_DELTA}%)`,
    });

    return { team, source, count: clampedCount };
  }

  public handleFollow(input: TikTokSocialInput): {
    accepted: boolean;
    team?: TeamSlotKey;
    source?: AffinityResolutionSource;
    championName?: string;
    reason?: string;
  } {
    const displayName = input.nickname || input.uniqueId || 'Follower';
    const viewerKey = this.buildViewerKey(input.uniqueId, input.nickname);

    if (this.followedViewers.has(viewerKey)) {
      this.blockedAntiSpamCount += 1;
      return { accepted: false, reason: 'ALREADY_FOLLOWED' };
    }

    if (this.followedViewers.size >= TIKTOK_PIPELINE_CONSTANTS.MAX_FOLLOW_HISTORY) {
      const firstFollower = this.followedViewers.values().next().value;
      if (firstFollower) this.followedViewers.delete(firstFollower);
    }
    this.followedViewers.add(viewerKey);

    const { team, source, shouldRemind } = this.resolveViewerTeam(viewerKey, input.explicitTeam);
    const championName = this.deps.getRandomChampionName();

    this.deps.emit('game:follow', {
      userName: displayName,
      team,
      championName,
      furyGain: TIKTOK_PIPELINE_CONSTANTS.FOLLOW_FURY_GAIN,
      affinitySource: source,
    });
    this.emitFallbackReminderIfNeeded(displayName, team, shouldRemind);

    this.deps.onDuelContribution(team, TIKTOK_PIPELINE_CONSTANTS.DUEL_FOLLOW_DELTA, {
      type: 'SKILL',
      donorName: displayName,
      team,
      deltaPercent: TIKTOK_PIPELINE_CONSTANTS.DUEL_FOLLOW_DELTA,
      description: `${displayName} đã Follow kênh! (+${TIKTOK_PIPELINE_CONSTANTS.DUEL_FOLLOW_DELTA}%)`,
    });

    return { accepted: true, team, source, championName };
  }

  public handleShare(input: TikTokSocialInput): {
    accepted: boolean;
    team?: TeamSlotKey;
    source?: AffinityResolutionSource;
    reason?: string;
  } {
    const now = this.now();
    const displayName = input.nickname || input.uniqueId || 'Sharer';
    const viewerKey = this.buildViewerKey(input.uniqueId, input.nickname);
    const lastShareAt = this.shareTimestamps.get(viewerKey);

    if (lastShareAt !== undefined && now - lastShareAt < TIKTOK_PIPELINE_CONSTANTS.SHARE_COOLDOWN_MS) {
      this.blockedAntiSpamCount += 1;
      return { accepted: false, reason: 'SHARE_COOLDOWN' };
    }

    trimOldestEntries(this.shareTimestamps, TIKTOK_PIPELINE_CONSTANTS.MAX_TRACKED_VIEWERS);
    this.shareTimestamps.set(viewerKey, now);
    this.shareCount += 1;

    const { team, source, shouldRemind } = this.resolveViewerTeam(viewerKey, input.explicitTeam);

    this.deps.emit('game:share', {
      userName: displayName,
      team,
      damageAmount: TIKTOK_PIPELINE_CONSTANTS.SHARE_BURST_DAMAGE,
      healAmount: TIKTOK_PIPELINE_CONSTANTS.SHARE_HEAL_AMOUNT,
      affinitySource: source,
    });
    this.emitFallbackReminderIfNeeded(displayName, team, shouldRemind);

    this.deps.onDuelContribution(team, TIKTOK_PIPELINE_CONSTANTS.DUEL_SHARE_DELTA, {
      type: 'SKILL',
      donorName: displayName,
      team,
      deltaPercent: TIKTOK_PIPELINE_CONSTANTS.DUEL_SHARE_DELTA,
      description: `${displayName} đã Chia sẻ Live! (+${TIKTOK_PIPELINE_CONSTANTS.DUEL_SHARE_DELTA}%)`,
    });

    return { accepted: true, team, source };
  }
}
