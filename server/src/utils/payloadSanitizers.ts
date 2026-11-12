import { findChampion, getRandomChampion } from '../constants/champions.js';
import { matchCommentTeam, TeamConfigState, TeamSlotKey } from '../constants/teams.js';
import { OVERLAY_VISIBILITY_KEYS, OverlayVisibility } from '../types/serverState.js';

/**
 * Extracts valid boolean visibility fields from an untrusted payload.
 */
export function pickOverlayVisibilityPatch(rawPayload: unknown): Partial<OverlayVisibility> {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {};
  }
  const source = rawPayload as Record<string, unknown>;
  const patch: Partial<OverlayVisibility> = {};
  for (const key of OVERLAY_VISIBILITY_KEYS) {
    if (typeof source[key] === 'boolean') {
      patch[key] = source[key];
    }
  }
  return patch;
}

/**
 * Extracts optional `senderId` string from an untrusted payload.
 */
export function extractSenderId(rawPayload: unknown): string | undefined {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return undefined;
  }
  const source = rawPayload as Record<string, unknown>;
  return typeof source.senderId === 'string' ? source.senderId : undefined;
}

/**
 * Safely extracts an error message from an unknown thrown value.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

/**
 * Parses a viewer chat comment for team affinity and champion summon commands.
 */
export function parseCommentCommand(
  comment: string,
  activeTeams: TeamConfigState['activeTeams'],
  fallbackTeam?: TeamSlotKey
): { team?: TeamSlotKey; champion?: string } {
  const upperComment = comment.toUpperCase();
  let team: TeamSlotKey | undefined = matchCommentTeam(comment, activeTeams);
  let detectedChampion: string | undefined;

  if (
    upperComment.includes('RANDOM') ||
    upperComment.includes('NGAU NHIEN') ||
    upperComment.includes('NGAUNHIEN')
  ) {
    const randomChamp = getRandomChampion();
    detectedChampion = randomChamp.name;
    if (!team) {
      team = Math.random() < 0.5 ? 'BLG' : 'GENG';
    }
  } else {
    const matched = findChampion(comment);
    if (matched) {
      detectedChampion = matched.name;
    }
  }

  return {
    team: team || fallbackTeam,
    champion: detectedChampion,
  };
}
