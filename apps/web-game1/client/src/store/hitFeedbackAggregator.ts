import { COMBAT_VFX_CONSTANTS, TEAM_KEY, TeamType } from '../constants/game';

/**
 * Merges the damage numbers / impact rings of many simultaneous hits.
 * With dozens of champions attacking, showing every hit would exceed the on-screen caps and silently
 * drop most of them. Instead, normal hits of one team inside a short window add up into one
 * "-4,210 x6" number, so the number on screen always reflects ALL the damage dealt.
 */
export interface HitFeedbackDecision {
  shouldShow: boolean;
  /** Total damage this number stands for (own hit + merged hits). */
  amount: number;
  hitCount: number;
}

interface PendingBucket {
  amount: number;
  hits: number;
  startedAt: number;
}

const createBucket = (): PendingBucket => ({ amount: 0, hits: 0, startedAt: 0 });

const pendingByTeam: Record<TeamType, PendingBucket> = {
  [TEAM_KEY.BLG]: createBucket(),
  [TEAM_KEY.GENG]: createBucket(),
};
const lastShownAtByTeam: Record<TeamType, number> = {
  [TEAM_KEY.BLG]: 0,
  [TEAM_KEY.GENG]: 0,
};

const NOT_SHOWN: HitFeedbackDecision = { shouldShow: false, amount: 0, hitCount: 0 };

/**
 * `isForced` hits (crit / ultimate / weak point) always show on their own and never absorb
 * the pending normal damage, so a crit number still reads as the crit itself.
 */
export const decideHitFeedback = (
  team: TeamType,
  damage: number,
  now: number,
  isForced: boolean
): HitFeedbackDecision => {
  if (isForced) return { shouldShow: true, amount: damage, hitCount: 1 };

  const bucket = pendingByTeam[team];
  const isStale = now - bucket.startedAt > COMBAT_VFX_CONSTANTS.DAMAGE.HIT_FEEDBACK_PENDING_EXPIRE_MS;
  if (bucket.hits === 0 || isStale) {
    bucket.amount = 0;
    bucket.hits = 0;
    bucket.startedAt = now;
  }
  bucket.amount += damage;
  bucket.hits += 1;

  const isWindowOpen = now - lastShownAtByTeam[team] >= COMBAT_VFX_CONSTANTS.DAMAGE.HIT_FEEDBACK_MERGE_MS;
  if (!isWindowOpen) return NOT_SHOWN;

  const decision: HitFeedbackDecision = { shouldShow: true, amount: bucket.amount, hitCount: bucket.hits };
  lastShownAtByTeam[team] = now;
  bucket.amount = 0;
  bucket.hits = 0;
  return decision;
};
