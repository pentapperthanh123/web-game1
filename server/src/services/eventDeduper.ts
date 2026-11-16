import { EVENT_DEDUPE } from '../constants/liveOps.js';

/**
 * Drops TikTok events seen again within a short window (connector retries / reconnect replays).
 * Keys are kept in insertion order, so expiry stops at the first fresh entry.
 */

export interface TikTokEventIdentity {
  msgId?: unknown;
  repeatCount?: unknown;
  repeatEnd?: unknown;
}

export const TIKTOK_DEDUPE_EVENT_TYPE = {
  CHAT: 'chat',
  GIFT: 'gift',
  LIKE: 'like',
  FOLLOW: 'follow',
  SHARE: 'share',
} as const;
export type TikTokDedupeEventType = (typeof TIKTOK_DEDUPE_EVENT_TYPE)[keyof typeof TIKTOK_DEDUPE_EVENT_TYPE];

/**
 * Streak gifts may reuse one msgId across combo ticks, so the gift key includes the tick state.
 * Returns undefined when the event carries no msgId (never treated as a duplicate).
 */
export const buildTikTokEventKey = (
  eventType: TikTokDedupeEventType,
  identity: TikTokEventIdentity
): string | undefined => {
  if (typeof identity.msgId !== 'string' || identity.msgId.length === 0) return undefined;
  if (eventType !== TIKTOK_DEDUPE_EVENT_TYPE.GIFT) return `${eventType}:${identity.msgId}`;
  return `${eventType}:${identity.msgId}:${String(identity.repeatCount)}:${String(identity.repeatEnd)}`;
};

export class EventDeduper {
  private readonly seenAtByKey = new Map<string, number>();
  private duplicateCount = 0;

  public isDuplicate(eventKey: string | undefined, now: number): boolean {
    if (!eventKey) return false;
    this.dropExpired(now);
    if (this.seenAtByKey.has(eventKey)) {
      this.duplicateCount += 1;
      return true;
    }
    if (this.seenAtByKey.size >= EVENT_DEDUPE.MAX_TRACKED) {
      const oldestKey = this.seenAtByKey.keys().next().value;
      if (oldestKey !== undefined) this.seenAtByKey.delete(oldestKey);
    }
    this.seenAtByKey.set(eventKey, now);
    return false;
  }

  public getDuplicateCount(): number {
    return this.duplicateCount;
  }

  public reset(): void {
    this.seenAtByKey.clear();
    this.duplicateCount = 0;
  }

  private dropExpired(now: number): void {
    for (const [eventKey, seenAt] of this.seenAtByKey) {
      if (now - seenAt < EVENT_DEDUPE.WINDOW_MS) return;
      this.seenAtByKey.delete(eventKey);
    }
  }
}
