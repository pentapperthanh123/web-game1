import {
  CasterConfig,
  CHAT_LIMIT_BOUNDS,
  ChatLimitConfig,
  DEFAULT_CASTER_CONFIG,
} from '../constants/liveOps.js';

const CHAT_LIMIT_KEYS = Object.keys(CHAT_LIMIT_BOUNDS) as (keyof ChatLimitConfig)[];
const CASTER_CONFIG_KEYS = Object.keys(DEFAULT_CASTER_CONFIG) as (keyof CasterConfig)[];

const asRecord = (rawPayload: unknown): Record<string, unknown> =>
  rawPayload && typeof rawPayload === 'object' ? (rawPayload as Record<string, unknown>) : {};

/** Keeps known numeric chat-limit fields, rounded and clamped to their bounds. */
export function pickChatLimitPatch(rawPayload: unknown): Partial<ChatLimitConfig> {
  const source = asRecord(rawPayload);
  const patch: Partial<ChatLimitConfig> = {};
  for (const key of CHAT_LIMIT_KEYS) {
    const value = source[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const { min, max } = CHAT_LIMIT_BOUNDS[key];
    patch[key] = Math.max(min, Math.min(max, Math.round(value)));
  }
  return patch;
}

/** Keeps known boolean caster switches. */
export function pickCasterConfigPatch(rawPayload: unknown): Partial<CasterConfig> {
  const source = asRecord(rawPayload);
  const patch: Partial<CasterConfig> = {};
  for (const key of CASTER_CONFIG_KEYS) {
    const value = source[key];
    if (typeof value === 'boolean') patch[key] = value;
  }
  return patch;
}
