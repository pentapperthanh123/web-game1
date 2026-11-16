/**
 * AI caster ("BLV Bão"): event signals, priority ladder (spec 2.4) and timing.
 * Lines live in i18n under `Caster.lines.<SIGNAL>`; voice comes from the server TTS route.
 */

export const CASTER_SIGNAL = {
  SUMMON: 'SUMMON',
  SUMMON_MERGED: 'SUMMON_MERGED',
  /** Merged wave where fewer than two distinct names are known: count only. */
  SUMMON_WAVE: 'SUMMON_WAVE',
  FOLLOW: 'FOLLOW',
  SHARE: 'SHARE',
  GIFT_COMBO: 'GIFT_COMBO',
  GIFT_MEDIUM: 'GIFT_MEDIUM',
  GIFT_BIG: 'GIFT_BIG',
  GIFT_MEGA: 'GIFT_MEGA',
  BOSS_ENRAGE: 'BOSS_ENRAGE',
  BOSS_LOW_HP: 'BOSS_LOW_HP',
  BOSS_SKILL: 'BOSS_SKILL',
  BOSS_ULTIMATE: 'BOSS_ULTIMATE',
  /** Field wiped: caster line, then the boss gloats, then the caster rallies viewers. */
  WIPE: 'WIPE',
  BOSS_WIPE_TAUNT: 'BOSS_WIPE_TAUNT',
  EMPTY_FIELD_RALLY: 'EMPTY_FIELD_RALLY',
  /** Boss speech-bubble line: the boss roars and the line is shown as its caption (no TTS). */
  BOSS_TAUNT: 'BOSS_TAUNT',
  /** Round 1 of a series: welcome + matchup. Later rounds use ROUND_INTRO_MATCHUP. */
  SERIES_OPENING: 'SERIES_OPENING',
  ROUND_INTRO_MATCHUP: 'ROUND_INTRO_MATCHUP',
  /** The star duel shown on the intro card plus the chat commands it suggests ("Azir T1" / "Ahri BLG"). */
  ROUND_INTRO_STARS: 'ROUND_INTRO_STARS',
  /** Intro card closed: the fight starts. */
  ROUND_GO: 'ROUND_GO',
  COMEBACK: 'COMEBACK',
  ROUND_WIN: 'ROUND_WIN',
  /** Final blow, said the instant the boss dies over the finisher card (may belong to the losing team). */
  ROUND_FINISHER: 'ROUND_FINISHER',
  MVP: 'MVP',
  PODIUM_THANKS: 'PODIUM_THANKS',
  PRO_MVP: 'PRO_MVP',
  SERIES_WIN: 'SERIES_WIN',
  SERIES_OUTRO: 'SERIES_OUTRO',
  NEXT_MATCH: 'NEXT_MATCH',
  BANTER_GUIDE: 'BANTER_GUIDE',
  BANTER_CTA: 'BANTER_CTA',
  BANTER_HYPE: 'BANTER_HYPE',
  /** Data-driven banter: each one is only picked when its fact is true right now. */
  BANTER_BOSS_HP: 'BANTER_BOSS_HP',
  BANTER_FIELD: 'BANTER_FIELD',
  BANTER_LEAD: 'BANTER_LEAD',
  BANTER_SERIES: 'BANTER_SERIES',
  BANTER_IDLE: 'BANTER_IDLE',
  BANTER_EMPTY: 'BANTER_EMPTY',
  /** Boss crosses into phase 2 (ultimate unlocked) / phase 3 (stronger, faster skills). */
  BOSS_PHASE_TWO: 'BOSS_PHASE_TWO',
  BOSS_PHASE_THREE: 'BOSS_PHASE_THREE',
  /** Boss shield raised (break it before it expires), broken by viewers, or absorbed (boss heals). */
  BOSS_SHIELD_UP: 'BOSS_SHIELD_UP',
  BOSS_SHIELD_BROKEN: 'BOSS_SHIELD_BROKEN',
  BOSS_SHIELD_ABSORBED: 'BOSS_SHIELD_ABSORBED',
  /** Heart milestone reached: the whole field is healed. */
  HEART_MILESTONE: 'HEART_MILESTONE',
  /** Gift kill: said over the avatar-strike cinematic, naming the donor and the gift. */
  GIFT_FINISHER_CALLOUT: 'GIFT_FINISHER_CALLOUT',
  /** Silver Scrapes 1v1 duel: opening, last-stand shield, result. */
  DUEL_START: 'DUEL_START',
  DUEL_LAST_STAND: 'DUEL_LAST_STAND',
  DUEL_WIN: 'DUEL_WIN',
  DUEL_DRAW: 'DUEL_DRAW',
} as const;
export type CasterSignal = (typeof CASTER_SIGNAL)[keyof typeof CASTER_SIGNAL];

export const CASTER_PRIORITY = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 } as const;
export type CasterPriority = (typeof CASTER_PRIORITY)[keyof typeof CASTER_PRIORITY];

export const CASTER_SIGNAL_PRIORITY: Readonly<Record<CasterSignal, CasterPriority>> = {
  [CASTER_SIGNAL.SUMMON]: CASTER_PRIORITY.P4,
  [CASTER_SIGNAL.SUMMON_MERGED]: CASTER_PRIORITY.P4,
  [CASTER_SIGNAL.SUMMON_WAVE]: CASTER_PRIORITY.P4,
  [CASTER_SIGNAL.FOLLOW]: CASTER_PRIORITY.P3,
  [CASTER_SIGNAL.SHARE]: CASTER_PRIORITY.P3,
  [CASTER_SIGNAL.GIFT_COMBO]: CASTER_PRIORITY.P4,
  [CASTER_SIGNAL.GIFT_MEDIUM]: CASTER_PRIORITY.P3,
  [CASTER_SIGNAL.GIFT_BIG]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.GIFT_MEGA]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.BOSS_ENRAGE]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.BOSS_LOW_HP]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.BOSS_SKILL]: CASTER_PRIORITY.P4,
  [CASTER_SIGNAL.BOSS_ULTIMATE]: CASTER_PRIORITY.P3,
  [CASTER_SIGNAL.WIPE]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.BOSS_WIPE_TAUNT]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.EMPTY_FIELD_RALLY]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.BOSS_TAUNT]: CASTER_PRIORITY.P3,
  // The round intro card is narrated page by page; the first line clears stale chatter
  [CASTER_SIGNAL.SERIES_OPENING]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.ROUND_INTRO_MATCHUP]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.ROUND_INTRO_STARS]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.ROUND_GO]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.COMEBACK]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.ROUND_WIN]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.ROUND_FINISHER]: CASTER_PRIORITY.P1,
  // End-of-round sequence: all P1 so they play in the order they are queued
  [CASTER_SIGNAL.MVP]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.PODIUM_THANKS]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.PRO_MVP]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.SERIES_WIN]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.SERIES_OUTRO]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.NEXT_MATCH]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.BANTER_GUIDE]: CASTER_PRIORITY.P5,
  [CASTER_SIGNAL.BANTER_CTA]: CASTER_PRIORITY.P5,
  [CASTER_SIGNAL.BANTER_HYPE]: CASTER_PRIORITY.P5,
  [CASTER_SIGNAL.BANTER_BOSS_HP]: CASTER_PRIORITY.P5,
  [CASTER_SIGNAL.BANTER_FIELD]: CASTER_PRIORITY.P5,
  [CASTER_SIGNAL.BANTER_LEAD]: CASTER_PRIORITY.P5,
  [CASTER_SIGNAL.BANTER_SERIES]: CASTER_PRIORITY.P5,
  [CASTER_SIGNAL.BANTER_IDLE]: CASTER_PRIORITY.P5,
  [CASTER_SIGNAL.BANTER_EMPTY]: CASTER_PRIORITY.P5,
  [CASTER_SIGNAL.BOSS_PHASE_TWO]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.BOSS_PHASE_THREE]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.BOSS_SHIELD_UP]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.BOSS_SHIELD_BROKEN]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.BOSS_SHIELD_ABSORBED]: CASTER_PRIORITY.P3,
  [CASTER_SIGNAL.HEART_MILESTONE]: CASTER_PRIORITY.P3,
  // The kill callout cuts whatever is being said: it plays over the finisher cinematic
  [CASTER_SIGNAL.GIFT_FINISHER_CALLOUT]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.DUEL_START]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.DUEL_LAST_STAND]: CASTER_PRIORITY.P2,
  [CASTER_SIGNAL.DUEL_WIN]: CASTER_PRIORITY.P1,
  [CASTER_SIGNAL.DUEL_DRAW]: CASTER_PRIORITY.P1,
};

/** The only lines allowed while the Silver Scrapes duel is on screen (everything else is muted). */
export const CASTER_DUEL_SIGNALS: ReadonlySet<CasterSignal> = new Set([
  CASTER_SIGNAL.DUEL_START,
  CASTER_SIGNAL.DUEL_LAST_STAND,
  CASTER_SIGNAL.DUEL_WIN,
  CASTER_SIGNAL.DUEL_DRAW,
]);

/** Lines that may be said while the round intro card is on screen. */
export const CASTER_INTRO_SIGNALS: ReadonlySet<CasterSignal> = new Set([
  CASTER_SIGNAL.SERIES_OPENING,
  CASTER_SIGNAL.ROUND_INTRO_MATCHUP,
  CASTER_SIGNAL.ROUND_INTRO_STARS,
]);

/** Lines older than their TTL are dropped: a late line about a past event is worse than silence. */
export const CASTER_PRIORITY_TTL_MS: Readonly<Record<CasterPriority, number>> = {
  [CASTER_PRIORITY.P1]: 30_000,
  [CASTER_PRIORITY.P2]: 15_000,
  [CASTER_PRIORITY.P3]: 10_000,
  [CASTER_PRIORITY.P4]: 6_000,
  [CASTER_PRIORITY.P5]: 8_000,
};

export const CASTER_QUEUE = {
  /** Large enough to keep a whole summon wave waiting for its roll call. */
  MAX_PENDING_LINES: 80,
  /** Short breath between two summon lines: every summoner gets named, so they follow closely. */
  MIN_P4_GAP_MS: 1_500,
  /** ≥ this many queued summons of one team are merged into one roll-call line naming everyone. */
  MERGE_SUMMON_THRESHOLD: 2,
  /** Names of one roll-call line stay under this length (server TTS limit is 180 chars per line);
   *  summoners that do not fit are named in the next line. */
  ROLLCALL_MAX_NAME_CHARS: 110,
  /** A roll call needs at least this many different names; otherwise the wave is announced by count. */
  ROLLCALL_MIN_NAMES: 2,
  /** A summoner still waiting to be named after this long is skipped (flood protection). */
  SUMMON_NAME_TTL_MS: 45_000,
  SPOKEN_NAME_SEPARATOR: ', ',
  /** Pause between two lines. */
  LINE_GAP_MS: 350,
  /** Higher priorities are prefetched as soon as they are queued (P1..P3). */
  PREFETCH_MAX_PRIORITY: CASTER_PRIORITY.P3,
} as const;

export const CASTER_SPEECH = {
  ROUTE: '/api/caster/tts',
  /** A clip that has not finished after this long is cut (hung audio, network stall). */
  WATCHDOG_MS: 12_000,
  MAX_CONSECUTIVE_FAILURES: 3,
  /** After repeated failures the caster goes subtitle-only for this long. */
  SUSPEND_MS: 5 * 60_000,
  MAX_CACHED_CLIPS: 80,
  VOICE_VOLUME: 1,
  /** Game SFX volume multiplier while the caster is talking. */
  SFX_DUCK_FACTOR: 0.45,
  /** Subtitle-only mode shows a line for about this long per character. */
  SUBTITLE_MS_PER_CHAR: 65,
  SUBTITLE_MIN_MS: 1_800,
  SUBTITLE_LINGER_MS: 600,
  HTTP_DISABLED: 403,
  HTTP_BLOCKED: 422,
  /** Lines with a deadline are sped up just enough to end on time (pitch is preserved). */
  MAX_FIT_RATE: 1.9,
  /** Every line plays at this speed (the Google voice is slow at 1x); pitch is preserved by the browser. */
  NORMAL_RATE: 1.6,
  /** Server marks clips made with the fallback voice; they are dropped from the cache after this,
   *  so the next time the line is needed the upgraded (Edge / Azure) clip is fetched. */
  VOICE_HEADER: 'X-Caster-Voice',
  VOICE_HEADER_FALLBACK: 'fallback',
  FALLBACK_CLIP_KEEP_MS: 20_000,
  /** A line whose voice clip is not ready by then is shown as a caption only, so the queue keeps moving. */
  CLIP_WAIT_MS: 7_000,
  /** Server could not produce the voice (provider slow / down): caption only, not counted as an engine failure. */
  HTTP_VOICE_UNAVAILABLE: [502, 503, 429],
} as const;

/** Mirrors server CASTER_TTS.MAX_TEXT_CHARS: longer voice texts are refused, so long lines are spoken in parts. */
export const CASTER_VOICE_MAX_CHARS = 180;

/** The intro card lasts ROUND_INTRO_CONSTANTS.TOTAL_MS; its lines must end while it is on screen. */
export const CASTER_INTRO_TIMING = {
  /** The welcome / matchup line ends around the first card tab. */
  FIRST_LINE_END_MS: 8_000,
  /** The star duel + chat commands line ends just before the card closes. */
  LAST_LINE_END_BEFORE_CLOSE_MS: 500,
} as const;

export const CASTER_BANTER = {
  TICK_MS: 1_000,
  /** No summon or gift for this long = idle room (spec state IDLE). */
  IDLE_AFTER_MS: 90_000,
  ACTIVE_SILENCE_MS: 22_000,
  IDLE_SILENCE_MIN_MS: 25_000,
  IDLE_SILENCE_MAX_MS: 40_000,
  /** No champion alive: the caster keeps rallying viewers much more often. */
  EMPTY_FIELD_SILENCE_MS: 10_000,
} as const;

/** Weighted banter groups (spec 5.3). BANTER_IDLE only joins the draw when the room is idle. */
export const CASTER_BANTER_WEIGHTS: ReadonlyArray<readonly [CasterSignal, number]> = [
  [CASTER_SIGNAL.BANTER_GUIDE, 20],
  [CASTER_SIGNAL.BANTER_LEAD, 15],
  [CASTER_SIGNAL.BANTER_BOSS_HP, 15],
  [CASTER_SIGNAL.BANTER_CTA, 12],
  [CASTER_SIGNAL.BANTER_HYPE, 12],
  [CASTER_SIGNAL.BANTER_FIELD, 10],
  [CASTER_SIGNAL.BANTER_SERIES, 8],
  [CASTER_SIGNAL.BANTER_IDLE, 8],
];

/** Facts a data-driven banter line needs before it may be said. */
export const CASTER_BANTER_RULES = {
  /** "N champions on the field" / hype lines need a real crowd. */
  MIN_FIELD_COUNT: 5,
  /** "Boss has X % left" only after the boss has taken real damage. */
  MAX_BOSS_HP_RATIO: 0.95,
  /** "Team X is ahead" needs a lead of at least this share of total damage. */
  MIN_LEAD_RATIO: 0.1,
  /** Lead lines also need some fighting first. */
  MIN_TOTAL_DAMAGE: 2_000,
} as const;

/** Banter while the field is empty (after a wipe or before anyone joined). */
export const CASTER_EMPTY_FIELD_BANTER_WEIGHTS: ReadonlyArray<readonly [CasterSignal, number]> = [
  [CASTER_SIGNAL.BANTER_EMPTY, 45],
  [CASTER_SIGNAL.BANTER_GUIDE, 35],
  [CASTER_SIGNAL.BANTER_CTA, 20],
];

export const CASTER_VOICE = {
  CASTER: 'CASTER',
  /** The boss: roar sound + red caption, no speech. */
  BOSS: 'BOSS',
} as const;
export type CasterVoice = (typeof CASTER_VOICE)[keyof typeof CASTER_VOICE];

/** The boss does not talk (a slowed TTS voice sounded sluggish): it roars and its line is shown. */
export const BOSS_CAPTION = {
  MS_PER_CHAR: 55,
  MIN_MS: 2_500,
} as const;

export const CASTER_EVENT_RULES = {
  /** Boss HP ratio for the "almost dead" line, once per round. */
  LOW_HP_RATIO: 0.1,
  /** Share of normal boss skills that get a line. */
  BOSS_SKILL_LINE_CHANCE: 0.25,
  /** Small-gift streak length worth a P4 line when the streak ends. */
  MIN_SMALL_COMBO_COUNT: 5,
  /** Recent variants of a signal that are not reused. */
  RECENT_VARIANTS_TO_AVOID: 3,
  MAX_TRACKED_PORTALS: 400,
  /** The end-of-round sequence plays during the victory screen; keep it alive until the next intro. */
  ROUND_END_SEQUENCE_TTL_MS: 45_000,
  /** Podium thanks need a full top 3. */
  PODIUM_SIZE: 3,
  /** A damage-lead change counts as a comeback only after this much total team damage... */
  COMEBACK_MIN_TOTAL_DAMAGE: 5_000,
  /** ...and only if the team that lost the lead had been ahead by at least this share. */
  COMEBACK_MIN_PEAK_LEAD_RATIO: 0.2,
  /** ...and at most once per this window. */
  COMEBACK_COOLDOWN_MS: 30_000,
  /** Percent scale for the boss HP status line. */
  PERCENT: 100,
  /** At least this many champions must fall at once for the field-wiped sequence. */
  WIPE_MIN_LIVING: 1,
  /** The wipe sequence (caster, slow boss voice, rally) runs long; keep its lines alive. */
  WIPE_SEQUENCE_TTL_MS: 45_000,
} as const;

/** Spoken names: same trimming as the server's speechName (short, no handle digits). */
export const CASTER_NAME_RULES = {
  MAX_WORDS: 3,
  MAX_CHARS: 16,
  MAX_REGISTRY_ENTRIES: 2_000,
} as const;

/** Lines generated ahead of time on the server so they play instantly (server: CASTER_TTS_WARM). */
export const CASTER_WARM = {
  SOCKET_EVENT: 'caster:warm',
  MAX_TEXTS: 300,
} as const;

export const CASTER_NUMBER = {
  THOUSAND: 1_000,
  MILLION: 1_000_000,
} as const;
