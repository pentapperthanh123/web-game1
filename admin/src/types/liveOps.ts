/** Mirrors server/src/constants/liveOps.ts and services/liveOpsService.ts payloads. */

export interface ChatLimitConfig {
  summonCooldownMs: number;
  maxSummonsPerMinute: number;
  sameChampionRepeatMs: number;
  softMuteTrigger: number;
  softMuteMs: number;
}

export interface CasterConfig {
  isTtsEnabled: boolean;
  isNameReadingEnabled: boolean;
  /** Two casters banter (Bảo + Anna); off = one male voice. */
  isDuoEnabled: boolean;
}

export interface ModerationSnapshot {
  blockedTerms: string[];
  championAliases: Record<string, string>;
  updatedAt: number;
}

export interface LiveOpsAdminState {
  chatLimitConfig: ChatLimitConfig;
  casterConfig: CasterConfig;
  moderation: ModerationSnapshot;
  opsAlert: { isConfigured: boolean };
}

export interface ModerationUpdatePatch {
  addTerms?: string[];
  removeTerms?: string[];
  setAliases?: Record<string, string>;
  removeAliases?: string[];
}

export interface ModerationUpdateAck {
  rejectedAliases: string[];
}

export type OpsAlertFailure = 'NOT_CONFIGURED' | 'SUPPRESSED' | 'REQUEST_FAILED';

export interface OpsAlertResult {
  isDelivered: boolean;
  failure?: OpsAlertFailure;
}

export function isLiveOpsAdminState(value: unknown): value is LiveOpsAdminState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const moderation = candidate.moderation as Record<string, unknown> | undefined;
  return (
    typeof candidate.chatLimitConfig === 'object' &&
    typeof candidate.casterConfig === 'object' &&
    typeof candidate.opsAlert === 'object' &&
    Array.isArray(moderation?.blockedTerms)
  );
}
