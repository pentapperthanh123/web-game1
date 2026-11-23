import { QueuedMatchup, TeamProfile } from '../types/team';

export const MATCH_ROTATION_MODE = {
  RANDOM: 'random',
  REPEAT: 'repeat',
} as const;
export type MatchRotationMode = (typeof MATCH_ROTATION_MODE)[keyof typeof MATCH_ROTATION_MODE];

export interface MatchPairIds {
  leftTeamId: string;
  rightTeamId: string;
}

export interface NextMatchupResult {
  nextMatch: {
    leftTeamId: string;
    rightTeamId: string;
    label: string;
  };
  nextQueue: QueuedMatchup[];
  isGenerated: boolean;
}

export const createRotatedMatchup = (
  currentPair: MatchPairIds,
  catalog: TeamProfile[]
): QueuedMatchup => {
  const leftTeam = catalog.find((team) => team.id === currentPair.leftTeamId);
  const rightTeam = catalog.find((team) => team.id === currentPair.rightTeamId);
  const leftTag = leftTeam?.shortTag ?? currentPair.leftTeamId;
  const rightTag = rightTeam?.shortTag ?? currentPair.rightTeamId;

  return {
    id: `rot-${currentPair.leftTeamId}-${currentPair.rightTeamId}-${Date.now()}`,
    leftTeamId: currentPair.leftTeamId,
    rightTeamId: currentPair.rightTeamId,
    label: `${leftTag} vs ${rightTag}`,
  };
};

export const isSamePairing = (
  pairA: MatchPairIds,
  pairB: MatchPairIds
): boolean =>
  (pairA.leftTeamId === pairB.leftTeamId && pairA.rightTeamId === pairB.rightTeamId) ||
  (pairA.leftTeamId === pairB.rightTeamId && pairA.rightTeamId === pairB.leftTeamId);

/**
 * Generates a random matchup from the catalog, avoiding the current matchup if the catalog has >= 3 teams.
 */
export const pickRandomPair = (
  catalog: TeamProfile[],
  avoidPair?: MatchPairIds
): { leftTeamId: string; rightTeamId: string; label: string } => {
  if (catalog.length < 2) {
    const leftId = catalog[0]?.id ?? 't1';
    const rightId = catalog[0]?.id ?? 't1';
    return { leftTeamId: leftId, rightTeamId: rightId, label: 'T1 vs T1' };
  }

  // Generate all possible distinct 2-team combinations
  const combinations: Array<{ left: TeamProfile; right: TeamProfile }> = [];
  for (let i = 0; i < catalog.length; i += 1) {
    for (let j = i + 1; j < catalog.length; j += 1) {
      combinations.push({ left: catalog[i], right: catalog[j] });
    }
  }

  // Filter out the pair that matches avoidPair
  const validCandidates = avoidPair
    ? combinations.filter(
        (combo) =>
          !isSamePairing(
            { leftTeamId: combo.left.id, rightTeamId: combo.right.id },
            avoidPair
          )
      )
    : combinations;

  const pool = validCandidates.length > 0 ? validCandidates : combinations;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return {
    leftTeamId: picked.left.id,
    rightTeamId: picked.right.id,
    label: `${picked.left.shortTag} vs ${picked.right.shortTag}`,
  };
};

/**
 * Pure decision function for matchup progression.
 * - When queue has items: takes the head, pushes the current matchup to the back of the queue (infinite cycle).
 * - When queue is empty: generates a random pair (avoiding current pair) or repeats current pair per mode.
 */
export const pickNextMatchup = (
  queue: QueuedMatchup[],
  catalog: TeamProfile[],
  currentPair: MatchPairIds,
  mode: MatchRotationMode = MATCH_ROTATION_MODE.RANDOM
): NextMatchupResult => {
  if (queue.length > 0) {
    const [head, ...rest] = queue;
    const rotatedCurrent = createRotatedMatchup(currentPair, catalog);
    const nextQueue = [...rest, rotatedCurrent];
    return {
      nextMatch: {
        leftTeamId: head.leftTeamId,
        rightTeamId: head.rightTeamId,
        label: head.label,
      },
      nextQueue,
      isGenerated: false,
    };
  }

  if (mode === MATCH_ROTATION_MODE.RANDOM && catalog.length >= 2) {
    const randomPair = pickRandomPair(catalog, currentPair);
    return {
      nextMatch: randomPair,
      nextQueue: [],
      isGenerated: true,
    };
  }

  // Fallback: repeat current pair
  const leftTeam = catalog.find((team) => team.id === currentPair.leftTeamId);
  const rightTeam = catalog.find((team) => team.id === currentPair.rightTeamId);
  const leftTag = leftTeam?.shortTag ?? currentPair.leftTeamId;
  const rightTag = rightTeam?.shortTag ?? currentPair.rightTeamId;
  return {
    nextMatch: {
      leftTeamId: currentPair.leftTeamId,
      rightTeamId: currentPair.rightTeamId,
      label: `${leftTag} vs ${rightTag}`,
    },
    nextQueue: [],
    isGenerated: true,
  };
};

/**
 * Pure helper for previewing the next matchup (e.g. for Victory screen label).
 */
export const previewNextMatchup = (
  queue: QueuedMatchup[],
  catalog: TeamProfile[],
  currentPair: MatchPairIds,
  mode: MatchRotationMode = MATCH_ROTATION_MODE.RANDOM
): { leftTeamId: string; rightTeamId: string; label: string } | null => {
  if (queue.length > 0) {
    const head = queue[0];
    return {
      leftTeamId: head.leftTeamId,
      rightTeamId: head.rightTeamId,
      label: head.label,
    };
  }

  if (mode === MATCH_ROTATION_MODE.RANDOM && catalog.length >= 2) {
    return pickRandomPair(catalog, currentPair);
  }

  return null;
};
