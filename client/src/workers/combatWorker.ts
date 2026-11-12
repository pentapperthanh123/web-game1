import {
  WORKER_MSG,
  CombatTickMsg,
  CombatResultMsg,
} from './workerProtocol';
import { GAME_CONSTANTS } from '../constants/game';

const FURY_GAIN_PER_ATTACK = GAME_CONSTANTS.MINION_FURY.GAIN_PER_ATTACK;
const MAX_FURY = GAME_CONSTANTS.MINION_FURY.MAX_FURY;
const ULTIMATE_DAMAGE_MULTIPLIER = GAME_CONSTANTS.MINION_FURY.ULTIMATE_DAMAGE_MULTIPLIER;

self.onmessage = (event: MessageEvent<CombatTickMsg>) => {
  const { minionIds, minionStats, now, blgTeamMultiplier, gengTeamMultiplier } = event.data;

  // Layout: [fury, dps, hp, maxHp, teamIdx(0:BLG, 1:GENG), isStunned(0|1)]
  const STRIDE = 6;
  const stats = new Float32Array(minionStats);
  const furyOut = new Float32Array(minionIds.length);

  let totalDamageBLG = 0;
  let totalDamageGENG = 0;
  let attackedMinionId: string | null = null;
  let isFullFury = false;

  for (let i = 0; i < minionIds.length; i += 1) {
    const offset = i * STRIDE;
    const fury = stats[offset];
    const dps = stats[offset + 1];
    const hp = stats[offset + 2];
    const teamIdx = stats[offset + 4];
    const isStunned = stats[offset + 5] > 0.5;

    if (hp <= 0 || isStunned) {
      furyOut[i] = fury;
      continue;
    }

    const isFull = fury >= MAX_FURY;
    const multiplier = teamIdx === 0 ? blgTeamMultiplier : gengTeamMultiplier;
    const furyGain = Math.round(FURY_GAIN_PER_ATTACK * multiplier);
    const nextFury = isFull ? 0 : Math.min(MAX_FURY, fury + furyGain);
    furyOut[i] = nextFury;

    const damage = isFull
      ? Math.round(dps * ULTIMATE_DAMAGE_MULTIPLIER)
      : Math.round(dps);

    if (teamIdx === 0) {
      totalDamageBLG += damage;
    } else {
      totalDamageGENG += damage;
    }

    if (!attackedMinionId) {
      attackedMinionId = minionIds[i];
      isFullFury = isFull;
    }
  }

  const result: CombatResultMsg = {
    type: WORKER_MSG.COMBAT_RESULT,
    totalDamageBLG,
    totalDamageGENG,
    furyUpdates: furyOut.buffer,
    attackedMinionId,
    isFullFury,
    timestamp: now,
  };

  // Zero-copy transfer back to Main Thread
  (self as unknown as { postMessage: (msg: unknown, transfer: Transferable[]) => void }).postMessage(result, [furyOut.buffer]);
};
