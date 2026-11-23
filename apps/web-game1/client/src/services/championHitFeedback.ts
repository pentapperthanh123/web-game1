/**
 * Feedback channel for damage champions TAKE (boss skills, damage-over-time ticks).
 * It bypasses the zustand store on purpose: a boss ultimate hits dozens of champions at once, and
 * one store update per hit would re-render every subscriber. Consumers:
 *   - ChampionDamageNumbers (2D canvas) draws the "-95" over the champion
 *   - stepChampionFrame reads `readChampionHitAt` to make the token flinch
 */
export interface ChampionHitEvent {
  minionId: string;
  /** Champion position in viewport pixels at the moment of the hit. */
  screenX: number;
  screenY: number;
  amount: number;
  color: string;
  isLethal: boolean;
  createdAt: number;
}

type ChampionHitListener = (event: ChampionHitEvent) => void;

/** Entries older than this are dropped when the map is swept (longer than any flinch animation). */
const HIT_RECORD_TTL_MS = 2000;
const HIT_RECORD_SWEEP_SIZE = 256;
const NEVER_HIT_AT = 0;

const listeners = new Set<ChampionHitListener>();
const hitAtByMinionId = new Map<string, number>();

const sweepStaleHitRecords = (now: number): void => {
  if (hitAtByMinionId.size < HIT_RECORD_SWEEP_SIZE) return;
  hitAtByMinionId.forEach((hitAt, minionId) => {
    if (now - hitAt > HIT_RECORD_TTL_MS) hitAtByMinionId.delete(minionId);
  });
};

export const emitChampionHit = (event: ChampionHitEvent): void => {
  sweepStaleHitRecords(event.createdAt);
  hitAtByMinionId.set(event.minionId, event.createdAt);
  listeners.forEach((listener) => listener(event));
};

export const onChampionHit = (listener: ChampionHitListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Timestamp of the champion's last hit, or 0 when it was never hit (safe to call every frame). */
export const readChampionHitAt = (minionId: string): number => hitAtByMinionId.get(minionId) ?? NEVER_HIT_AT;
