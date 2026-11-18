import { SFX_EVENT, type SfxEventName } from './sfx';

/**
 * Friendly aliases for static in-game sound effects (0ms latency, preloaded via Howler).
 * Each alias maps to a canonical `SFX_EVENT` definition in `constants/sfx.ts`.
 */
export const STATIC_SOUND_ALIAS = {
  GAME_START: 'game_start',
  ROUND_START: 'round_start',
  ROUND_END: 'round_end',
  BOSS_SPAWN: 'boss_spawn',
  BOSS_ENRAGE: 'boss_enrage',
  BOSS_DEFEAT: 'boss_defeat',
  BOSS_ULTIMATE: 'boss_ultimate',
  SKILL_CAST: 'skill_cast',
  SKILL_SMITE: 'skill_smite',
  CHAMPION_SUMMON: 'champion_summon',
  SIGNATURE_SUMMON: 'signature_summon',
  CHAMPION_ATTACK: 'champion_attack',
  CHAMPION_HIT: 'champion_hit',
  CHAMPION_DEATH: 'champion_death',
  CRIT_HIT: 'crit_hit',
  TEAM_HEAL: 'team_heal',
  CHAT_POP: 'chat_pop',
  LIKE_TAP: 'like_tap',
  SCORE_UP: 'score_up',
  FOLLOW_NOTIFY: 'follow_notify',
  GIFT_MEDIUM: 'gift_medium',
  GIFT_MEGA: 'gift_mega',
  BIG_DONATE: 'big_donate',
  COMBO_LEVEL_UP: 'combo_level_up',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  WIPE: 'wipe',
  MATCH_FOUND: 'match_found',
  MATCH_ACCEPT: 'match_accept',
} as const;

export type StaticSoundAlias = (typeof STATIC_SOUND_ALIAS)[keyof typeof STATIC_SOUND_ALIAS];

/**
 * Union of friendly aliases, canonical `SFX_EVENT` names, and loose string autocomplete.
 */
export type StaticSoundName = StaticSoundAlias | SfxEventName | (string & {});

export const STATIC_ALIAS_TO_SFX_EVENT: Readonly<Record<StaticSoundAlias, SfxEventName>> = {
  [STATIC_SOUND_ALIAS.GAME_START]: SFX_EVENT.ROUND_START,
  [STATIC_SOUND_ALIAS.ROUND_START]: SFX_EVENT.ROUND_START,
  [STATIC_SOUND_ALIAS.ROUND_END]: SFX_EVENT.ROUND_END,
  [STATIC_SOUND_ALIAS.BOSS_SPAWN]: SFX_EVENT.BOSS_ROAR,
  [STATIC_SOUND_ALIAS.BOSS_ENRAGE]: SFX_EVENT.BOSS_ENRAGE,
  [STATIC_SOUND_ALIAS.BOSS_DEFEAT]: SFX_EVENT.BOSS_DEFEAT,
  [STATIC_SOUND_ALIAS.BOSS_ULTIMATE]: SFX_EVENT.BOSS_ULTIMATE,
  [STATIC_SOUND_ALIAS.SKILL_CAST]: SFX_EVENT.BOSS_SKILL,
  [STATIC_SOUND_ALIAS.SKILL_SMITE]: SFX_EVENT.SKILL_SMITE,
  [STATIC_SOUND_ALIAS.CHAMPION_SUMMON]: SFX_EVENT.CHAMPION_SUMMON,
  [STATIC_SOUND_ALIAS.SIGNATURE_SUMMON]: SFX_EVENT.SIGNATURE_SUMMON,
  [STATIC_SOUND_ALIAS.CHAMPION_ATTACK]: SFX_EVENT.CHAMPION_ATTACK,
  [STATIC_SOUND_ALIAS.CHAMPION_HIT]: SFX_EVENT.CHAMPION_HIT,
  [STATIC_SOUND_ALIAS.CHAMPION_DEATH]: SFX_EVENT.CHAMPION_DEATH,
  [STATIC_SOUND_ALIAS.CRIT_HIT]: SFX_EVENT.CRIT_HIT,
  [STATIC_SOUND_ALIAS.TEAM_HEAL]: SFX_EVENT.TEAM_HEAL,
  [STATIC_SOUND_ALIAS.CHAT_POP]: SFX_EVENT.CHAT_POP,
  [STATIC_SOUND_ALIAS.LIKE_TAP]: SFX_EVENT.LIKE_TAP,
  [STATIC_SOUND_ALIAS.SCORE_UP]: SFX_EVENT.SCORE_UP,
  [STATIC_SOUND_ALIAS.FOLLOW_NOTIFY]: SFX_EVENT.FOLLOW_NOTIFY,
  [STATIC_SOUND_ALIAS.GIFT_MEDIUM]: SFX_EVENT.GIFT_MEDIUM,
  [STATIC_SOUND_ALIAS.GIFT_MEGA]: SFX_EVENT.GIFT_MEGA,
  [STATIC_SOUND_ALIAS.BIG_DONATE]: SFX_EVENT.BIG_DONATE,
  [STATIC_SOUND_ALIAS.COMBO_LEVEL_UP]: SFX_EVENT.COMBO_LEVEL_UP,
  [STATIC_SOUND_ALIAS.VICTORY]: SFX_EVENT.VICTORY,
  [STATIC_SOUND_ALIAS.DEFEAT]: SFX_EVENT.DEFEAT,
  [STATIC_SOUND_ALIAS.WIPE]: SFX_EVENT.WIPE,
  [STATIC_SOUND_ALIAS.MATCH_FOUND]: SFX_EVENT.MATCH_FOUND,
  [STATIC_SOUND_ALIAS.MATCH_ACCEPT]: SFX_EVENT.MATCH_ACCEPT,
};

export const TTS_QUEUE_PRIORITY = {
  HIGH: 'high',
  NORMAL: 'normal',
} as const;

export type TtsQueuePriority = (typeof TTS_QUEUE_PRIORITY)[keyof typeof TTS_QUEUE_PRIORITY];

export const AUDIO_STORE_CONSTANTS = {
  LOG_PREFIX: '[AudioStore]',
  /** Maximum number of pending TTS items before dropping the oldest normal-priority item. */
  MAX_TTS_QUEUE_SIZE: 25,
  /** Default TTS audio format for Howler when streaming from `/api/caster/tts` or blob URLs. */
  TTS_AUDIO_FORMATS: ['mp3', 'mpeg', 'wav', 'ogg'] as const,
  /** Default language when converting raw text into a server TTS endpoint URL. */
  DEFAULT_TTS_LANG: 'vi',
  /** Watchdog timeout (ms) so a hung stream never locks `isTTSPlaying` forever. */
  TTS_WATCHDOG_TIMEOUT_MS: 12_000,
  /** Default playback rate for TTS voice lines. */
  DEFAULT_TTS_RATE: 1.2,
  /** Maximum playback rate when fitting a TTS line to a deadline. */
  MAX_TTS_FIT_RATE: 1.35,
  /** Volume scale for TTS voice relative to master volume. */
  TTS_VOLUME_SCALE: 1,
  /** Duck factor applied to background SFX while TTS is actively speaking. */
  SFX_DUCK_WHILE_TTS: 0.45,
  /** Normal SFX duck factor when TTS is idle. */
  SFX_DUCK_IDLE: 1,
  /** User gesture events used to unlock WebAudio / HTML5 Audio in browsers. */
  UNLOCK_GESTURE_EVENTS: ['click', 'keydown', 'touchstart', 'pointerdown'] as const,
} as const;
