// ═══════════════════════════════════════════════
// TYPED MESSAGE CONTRACT — Main Thread ↔ Web Workers
// ═══════════════════════════════════════════════

export const WORKER_MSG = {
  // Main -> Combat Worker
  COMBAT_TICK: 'COMBAT_TICK',
  MINION_DIED: 'MINION_DIED',
  RESET: 'RESET',
  // Combat Worker -> Main
  COMBAT_RESULT: 'COMBAT_RESULT',
  // Main -> Physics Worker
  PHYSICS_INIT: 'PHYSICS_INIT',
  PHYSICS_TICK: 'PHYSICS_TICK',
  MINION_ADD: 'MINION_ADD',
  MINION_REMOVE: 'MINION_REMOVE',
} as const;

export type WorkerMsgType = (typeof WORKER_MSG)[keyof typeof WORKER_MSG];

// Layout SharedArrayBuffer per minion
// [0]: curX, [1]: curY, [2]: curZ
// [3]: tgtX, [4]: tgtY, [5]: tgtZ
// [6]: bobPhase
// [7]: isAttacking (0.0 | 1.0)
// [8]: attackProgress (0.0 - 1.0)
// [9]: slotActive (0.0 | 1.0)
export const SAB_FLOATS_PER_MINION = 10;
export const SAB_MAX_MINIONS = 300; // Unlimited arena floor capacity

export interface CombatTickMsg {
  type: typeof WORKER_MSG.COMBAT_TICK;
  minionIds: string[];
  minionStats: ArrayBuffer; // Transferable
  now: number;
  bossHp: number;
  bossMaxHp: number;
  blgTeamMultiplier: number;
  gengTeamMultiplier: number;
}

export interface CombatResultMsg {
  type: typeof WORKER_MSG.COMBAT_RESULT;
  totalDamageBLG: number;
  totalDamageGENG: number;
  furyUpdates: ArrayBuffer; // Transferable Float32Array
  attackedMinionId: string | null;
  isFullFury: boolean;
  timestamp: number;
}
