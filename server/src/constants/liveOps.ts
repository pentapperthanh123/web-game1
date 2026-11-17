/**
 * Defaults and bounds for no-host live operation: summon chat limits, caster switches,
 * moderation, event dedupe and operator alerts. Spec: docs/specs/2026-11-14-cktg-live-ops-spec.md
 */

export interface ChatLimitConfig {
  /** Minimum gap between two accepted summon commands of one viewer. */
  summonCooldownMs: number;
  /** Accepted summon commands per viewer in a sliding 60 s window. */
  maxSummonsPerMinute: number;
  /** Same viewer + same explicit champion is accepted once per this window. */
  sameChampionRepeatMs: number;
  /** Blocked summon commands within 60 s that trigger a silent soft mute. */
  softMuteTrigger: number;
  softMuteMs: number;
}

export interface CasterConfig {
  /** Overlay may speak caster lines (consumed by the client caster). */
  isTtsEnabled: boolean;
  /** Kill switch. false = no viewer name is ever offered for speech. */
  isNameReadingEnabled: boolean;
  /** Two casters banter on the overlay (A + B voices); false = one voice says everything. */
  isDuoEnabled: boolean;
}

export interface NumericBound {
  min: number;
  max: number;
}

export const DEFAULT_CHAT_LIMIT_CONFIG: ChatLimitConfig = {
  summonCooldownMs: 30_000,
  maxSummonsPerMinute: 8,
  sameChampionRepeatMs: 30_000,
  softMuteTrigger: 15,
  softMuteMs: 300_000,
};

export const CHAT_LIMIT_BOUNDS: Readonly<Record<keyof ChatLimitConfig, NumericBound>> = {
  summonCooldownMs: { min: 0, max: 60_000 },
  maxSummonsPerMinute: { min: 1, max: 60 },
  sameChampionRepeatMs: { min: 0, max: 300_000 },
  softMuteTrigger: { min: 3, max: 200 },
  softMuteMs: { min: 10_000, max: 3_600_000 },
};

export const DEFAULT_CASTER_CONFIG: CasterConfig = {
  isTtsEnabled: false,
  isNameReadingEnabled: true,
  isDuoEnabled: true,
};

export const CHAT_LIMITER = {
  WINDOW_MS: 60_000,
  MAX_TRACKED_VIEWERS: 5_000,
  MAX_TRACKED_CHAMPIONS_PER_VIEWER: 12,
} as const;

export const SUMMON_BLOCK_REASON = {
  COOLDOWN: 'COOLDOWN',
  PER_MINUTE_CAP: 'PER_MINUTE_CAP',
  SAME_CHAMPION: 'SAME_CHAMPION',
  SOFT_MUTED: 'SOFT_MUTED',
} as const;
export type SummonBlockReason = (typeof SUMMON_BLOCK_REASON)[keyof typeof SUMMON_BLOCK_REASON];

export const EVENT_DEDUPE = {
  WINDOW_MS: 60_000,
  MAX_TRACKED: 10_000,
} as const;

export const MODERATION_LIMITS = {
  SPEECH_NAME_MAX_CHARS: 16,
  SPEECH_NAME_MAX_WORDS: 3,
  /** Characters kept before the mask suffix when a display name is blocked. */
  MASK_VISIBLE_CHARS: 2,
  MASK_SUFFIX: '***',
  MASKED_CHAT_TEXT: '***',
  /** Terms up to this length are matched as whole tokens, longer ones as phrases. */
  SHORT_TERM_MAX_LENGTH: 3,
  MAX_TERM_LENGTH: 40,
  MAX_TERMS: 3_000,
  MAX_ALIASES: 500,
  MAX_ALIAS_LENGTH: 24,
} as const;

export const OPS_ALERT_KIND = {
  SERVER_START: 'SERVER_START',
  TIKTOK_DOWN_LONG: 'TIKTOK_DOWN_LONG',
  TIKTOK_RECOVERED: 'TIKTOK_RECOVERED',
  STREAM_END: 'STREAM_END',
  TEST: 'TEST',
} as const;
export type OpsAlertKind = (typeof OPS_ALERT_KIND)[keyof typeof OPS_ALERT_KIND];

/** Operator-facing Telegram text (server has no i18n layer). */
export const OPS_ALERT_MESSAGES: Readonly<Record<OpsAlertKind, string>> = {
  SERVER_START: '🟢 Server game vừa khởi động (nếu không phải bạn bật thì server đã tự khởi động lại sau sự cố).',
  TIKTOK_DOWN_LONG: '🔴 Mất kết nối TikTok Live quá lâu, hệ thống vẫn đang tự thử nối lại.',
  TIKTOK_RECOVERED: '✅ Đã kết nối lại TikTok Live.',
  STREAM_END: '⚠️ TikTok báo phiên live đã kết thúc. Kiểm tra OBS / phiên live.',
  TEST: '🧪 Tin nhắn thử từ admin portal.',
};

/** Kinds that are never rate-suppressed. */
export const UNSUPPRESSED_OPS_ALERT_KINDS: ReadonlySet<OpsAlertKind> = new Set<OpsAlertKind>([
  OPS_ALERT_KIND.TEST,
  OPS_ALERT_KIND.TIKTOK_RECOVERED,
]);

export const OPS_ALERT_TIMING = {
  TIKTOK_DOWN_ALERT_MS: 5 * 60_000,
  REPEAT_SUPPRESS_MS: 10 * 60_000,
  REQUEST_TIMEOUT_MS: 8_000,
} as const;

export const OPS_ALERT_ENV = {
  BOT_TOKEN: 'OPS_ALERT_TELEGRAM_BOT_TOKEN',
  CHAT_ID: 'OPS_ALERT_TELEGRAM_CHAT_ID',
  INSTANCE_NAME: 'OPS_ALERT_INSTANCE_NAME',
} as const;

export const OPS_ALERT_DEFAULT_INSTANCE_NAME = 'CKTG Live';
export const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';

export const OPS_ALERT_FAILURE = {
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  SUPPRESSED: 'SUPPRESSED',
  REQUEST_FAILED: 'REQUEST_FAILED',
} as const;
export type OpsAlertFailure = (typeof OPS_ALERT_FAILURE)[keyof typeof OPS_ALERT_FAILURE];

export const CONNECTION_GAP_LOG = {
  MAX_ENTRIES: 500,
} as const;

export const LIVE_OPS_ADMIN_ROOM = 'live-ops-admins';

export const LIVE_OPS_EVENT = {
  /** server → admin sockets: full live-ops state. */
  ADMIN_STATE: 'admin:live-ops-state',
  /** admin → server */
  ADMIN_REQUEST_STATE: 'admin:live-ops-request',
  ADMIN_CHAT_LIMITS: 'admin:chat-limits',
  ADMIN_CASTER_CONFIG: 'admin:caster-config',
  ADMIN_MODERATION_UPDATE: 'admin:moderation-update',
  ADMIN_OPS_ALERT_TEST: 'admin:ops-alert-test',
  /** server → everyone (overlay caster). */
  GAME_CASTER_CONFIG: 'game:caster-config',
} as const;
