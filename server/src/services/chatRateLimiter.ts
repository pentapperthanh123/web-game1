import {
  CHAT_LIMITER,
  ChatLimitConfig,
  SUMMON_BLOCK_REASON,
  SummonBlockReason,
} from '../constants/liveOps.js';

/**
 * Per-viewer limits for summon chat commands (spec 2.1). Blocked commands are ignored silently;
 * a viewer who keeps hitting the limits is soft-muted for a while. Gifts never pass through here.
 */

interface ViewerSummonRecord {
  lastAcceptedAt: number;
  /** Accepted command times inside the sliding window (oldest first). */
  acceptedAt: number[];
  /** Blocked command times inside the sliding window (oldest first). */
  blockedAt: number[];
  /** Explicit champion → last accepted time, oldest first. */
  lastChampionAt: Map<string, number>;
}

export interface SummonVerdict {
  isAllowed: boolean;
  reason?: SummonBlockReason;
}

export interface ChatRateLimiterStats {
  blockedSummonChatCount: number;
  softMutedViewerCount: number;
}

const createViewerRecord = (): ViewerSummonRecord => ({
  lastAcceptedAt: Number.NEGATIVE_INFINITY,
  acceptedAt: [],
  blockedAt: [],
  lastChampionAt: new Map<string, number>(),
});

const dropTimestampsUpTo = (timestamps: number[], cutoff: number): void => {
  while (timestamps.length > 0 && timestamps[0] <= cutoff) {
    timestamps.shift();
  }
};

const deleteOldestKey = <K, V>(map: Map<K, V>): void => {
  const oldestKey = map.keys().next().value;
  if (oldestKey !== undefined) map.delete(oldestKey);
};

export class ChatRateLimiter {
  private readonly records = new Map<string, ViewerSummonRecord>();
  private readonly mutedUntilByViewer = new Map<string, number>();
  private blockedSummonChatCount = 0;

  constructor(private readonly getConfig: () => ChatLimitConfig) {}

  /**
   * @param explicitChampion champion typed by the viewer; random picks are not repeat-checked.
   */
  public checkSummon(viewerKey: string, explicitChampion: string | undefined, now: number): SummonVerdict {
    const config = this.getConfig();
    const record = this.touchRecord(viewerKey);
    const reason = this.findBlockReason(viewerKey, record, config, explicitChampion, now);
    if (reason) {
      this.registerBlock(viewerKey, record, config, reason, now);
      return { isAllowed: false, reason };
    }
    this.registerAccept(record, explicitChampion, now);
    return { isAllowed: true };
  }

  public getStats(now: number): ChatRateLimiterStats {
    for (const [viewerKey, mutedUntil] of this.mutedUntilByViewer) {
      if (mutedUntil <= now) this.mutedUntilByViewer.delete(viewerKey);
    }
    return {
      blockedSummonChatCount: this.blockedSummonChatCount,
      softMutedViewerCount: this.mutedUntilByViewer.size,
    };
  }

  public reset(): void {
    this.records.clear();
    this.mutedUntilByViewer.clear();
    this.blockedSummonChatCount = 0;
  }

  private findBlockReason(
    viewerKey: string,
    record: ViewerSummonRecord,
    config: ChatLimitConfig,
    explicitChampion: string | undefined,
    now: number
  ): SummonBlockReason | undefined {
    const mutedUntil = this.mutedUntilByViewer.get(viewerKey);
    if (mutedUntil !== undefined && now < mutedUntil) return SUMMON_BLOCK_REASON.SOFT_MUTED;
    if (now - record.lastAcceptedAt < config.summonCooldownMs) return SUMMON_BLOCK_REASON.COOLDOWN;

    dropTimestampsUpTo(record.acceptedAt, now - CHAT_LIMITER.WINDOW_MS);
    if (record.acceptedAt.length >= config.maxSummonsPerMinute) return SUMMON_BLOCK_REASON.PER_MINUTE_CAP;

    if (!explicitChampion) return undefined;
    const lastChampionAt = record.lastChampionAt.get(explicitChampion);
    const isRepeat = lastChampionAt !== undefined && now - lastChampionAt < config.sameChampionRepeatMs;
    return isRepeat ? SUMMON_BLOCK_REASON.SAME_CHAMPION : undefined;
  }

  private registerBlock(
    viewerKey: string,
    record: ViewerSummonRecord,
    config: ChatLimitConfig,
    reason: SummonBlockReason,
    now: number
  ): void {
    this.blockedSummonChatCount += 1;
    if (reason === SUMMON_BLOCK_REASON.SOFT_MUTED) return;

    record.blockedAt.push(now);
    dropTimestampsUpTo(record.blockedAt, now - CHAT_LIMITER.WINDOW_MS);
    if (record.blockedAt.length < config.softMuteTrigger) return;

    record.blockedAt.length = 0;
    this.mutedUntilByViewer.set(viewerKey, now + config.softMuteMs);
  }

  private registerAccept(record: ViewerSummonRecord, explicitChampion: string | undefined, now: number): void {
    record.lastAcceptedAt = now;
    record.acceptedAt.push(now);
    if (!explicitChampion) return;

    record.lastChampionAt.delete(explicitChampion);
    if (record.lastChampionAt.size >= CHAT_LIMITER.MAX_TRACKED_CHAMPIONS_PER_VIEWER) {
      deleteOldestKey(record.lastChampionAt);
    }
    record.lastChampionAt.set(explicitChampion, now);
  }

  /** Returns the viewer's record and marks it most recently used (bounded LRU). */
  private touchRecord(viewerKey: string): ViewerSummonRecord {
    const existing = this.records.get(viewerKey);
    if (existing) {
      this.records.delete(viewerKey);
      this.records.set(viewerKey, existing);
      return existing;
    }
    if (this.records.size >= CHAT_LIMITER.MAX_TRACKED_VIEWERS) deleteOldestKey(this.records);
    const created = createViewerRecord();
    this.records.set(viewerKey, created);
    return created;
  }
}
