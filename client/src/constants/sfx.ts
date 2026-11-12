/**
 * Sound-effect catalogue for the Howler-based SoundManager.
 *
 * To swap a sound, edit only the `src` list of its entry in `SFX_DEFINITIONS`:
 *   - Remote file (e.g. Myinstants): `fromMyinstants('vine-boom.mp3')` or any absolute https URL.
 *   - Local file: drop it in `client/public/sfx/` and use `fromLocal('pop.mp3')`.
 * Sources are tried in order; if one fails to load, the next one is used,
 * and when all fail the synthesized Web Audio fallback plays instead.
 */

import { BOSS_SKILL_VFX, BossSkillVfxType } from '../types/bossSkill';

export const SFX_EVENT = {
  CHAT_POP: 'CHAT_POP',
  SCORE_UP: 'SCORE_UP',
  LIKE_TAP: 'LIKE_TAP',
  SKILL_SMITE: 'SKILL_SMITE',
  BIG_DONATE: 'BIG_DONATE',
  COMBO_LEVEL_UP: 'COMBO_LEVEL_UP',
  FOLLOW_NOTIFY: 'FOLLOW_NOTIFY',
  ROUND_END: 'ROUND_END',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
  ROUND_START: 'ROUND_START',
  BOSS_ROAR: 'BOSS_ROAR',
  BOSS_ENRAGE: 'BOSS_ENRAGE',
  BOSS_SHIELD: 'BOSS_SHIELD',
  BOSS_SKILL: 'BOSS_SKILL',
  BOSS_ULTIMATE: 'BOSS_ULTIMATE',
  BOSS_DEFEAT: 'BOSS_DEFEAT',
  CHAMPION_SUMMON: 'CHAMPION_SUMMON',
  CHAMPION_DEATH: 'CHAMPION_DEATH',
  CRIT_HIT: 'CRIT_HIT',
  TEAM_HEAL: 'TEAM_HEAL',
  BOSS_PHASE_SHIFT: 'BOSS_PHASE_SHIFT',
  BOSS_FIRE_BREATH: 'BOSS_FIRE_BREATH',
  BOSS_SPIKES: 'BOSS_SPIKES',
  BOSS_SWEEP: 'BOSS_SWEEP',
  BOSS_LIGHTNING: 'BOSS_LIGHTNING',
  BOSS_METEOR: 'BOSS_METEOR',
  BOSS_BEAM: 'BOSS_BEAM',
  BOSS_VORTEX: 'BOSS_VORTEX',
  BOSS_CHARGE: 'BOSS_CHARGE',
} as const;

export type SfxEventName = (typeof SFX_EVENT)[keyof typeof SFX_EVENT];

export interface SfxDefinition {
  /** Ordered candidate URLs. The first one that loads is used. */
  src: readonly string[];
  /** 0..1, multiplied by the master volume. */
  volume: number;
  /** Max simultaneous voices of this sound; the oldest is cut when exceeded. */
  maxVoices: number;
  /** Minimum gap between two triggers of this sound (anti-spam for chat floods). */
  throttleMs: number;
  /** Random playback-rate spread (±) so repeated pops do not sound robotic. */
  rateJitter: number;
  /**
   * Set true only when a cross-origin host sends `Access-Control-Allow-Origin`.
   * Then Web Audio (lowest latency) is used; otherwise HTML5 Audio avoids CORS errors.
   */
  isCorsReady?: boolean;
}

export const SFX_SOURCE_BASE = {
  /** Myinstants does NOT send CORS headers → these play through HTML5 Audio. */
  MYINSTANTS: 'https://www.myinstants.com/media/sounds/',
  /** Served by Vite from `client/public/sfx/` (same-origin → Web Audio). */
  LOCAL: '/sfx/',
} as const;

export const fromMyinstants = (fileName: string): string => `${SFX_SOURCE_BASE.MYINSTANTS}${fileName}`;
export const fromLocal = (fileName: string): string => `${SFX_SOURCE_BASE.LOCAL}${fileName}`;

export const SOUND_MANAGER_CONSTANTS = {
  /** Shared HTML5 Audio pool; must cover the sum of concurrent cross-origin voices. */
  HTML5_POOL_SIZE: 48,
  DEFAULT_RATE: 1,
  MIN_VOLUME: 0,
  MAX_VOLUME: 1,
} as const;

/**
 * Every Myinstants file below was verified on 2026-11-12 (HTTP 206, audio/mpeg)
 * and its length measured with ffprobe; the comment after each entry is that length.
 * Short clips (< 1 s) go to spammy events, long stingers (5–9 s) only to one-shot moments.
 */
export const SFX_DEFINITIONS: Record<SfxEventName, SfxDefinition> = {
  // ── Viewer interaction ────────────────────────────────────────────────
  [SFX_EVENT.CHAT_POP]: {
    src: [fromMyinstants('bubble-pop.mp3'), fromMyinstants('pop.mp3')], // ~0.3 s
    volume: 0.45,
    maxVoices: 6,
    throttleMs: 45,
    rateJitter: 0.12,
  },
  [SFX_EVENT.SCORE_UP]: {
    src: [fromMyinstants('magic-coins_RXOks55.mp3'), fromMyinstants('coin.mp3')], // 2.0 s
    volume: 0.5,
    maxVoices: 6,
    throttleMs: 60,
    rateJitter: 0.08,
  },
  [SFX_EVENT.LIKE_TAP]: {
    src: [fromMyinstants('click.mp3'), fromMyinstants('mouse-click.mp3')], // ~0.2 s
    volume: 0.35,
    maxVoices: 4,
    throttleMs: 80,
    rateJitter: 0.15,
  },
  [SFX_EVENT.SKILL_SMITE]: {
    src: [fromMyinstants('thunder-crack.mp3'), fromMyinstants('explosion.mp3')], // 3.5 s
    volume: 0.8,
    maxVoices: 3,
    throttleMs: 120,
    rateJitter: 0.05,
  },
  [SFX_EVENT.BIG_DONATE]: {
    src: [fromMyinstants('cinematic-boom-loud.mp3'), fromMyinstants('vine-boom.mp3')], // 4.9 s
    volume: 0.9,
    maxVoices: 2,
    throttleMs: 250,
    rateJitter: 0,
  },
  [SFX_EVENT.COMBO_LEVEL_UP]: {
    src: [fromMyinstants('orchestra-hit-hq.mp3'), fromMyinstants('orchestra-hit-or-combo-sound-1.mp3')], // 2.0 s
    volume: 0.7,
    maxVoices: 2,
    throttleMs: 400,
    rateJitter: 0,
  },
  [SFX_EVENT.FOLLOW_NOTIFY]: {
    src: [fromMyinstants('steam-achievement.mp3'), fromMyinstants('notification.mp3')], // 0.8 s
    volume: 0.55,
    maxVoices: 3,
    throttleMs: 150,
    rateJitter: 0.05,
  },

  // ── Round / series flow ───────────────────────────────────────────────
  [SFX_EVENT.ROUND_START]: {
    src: [fromMyinstants('gong-sfx.mp3'), fromMyinstants('mk-round-1-fight-gong.mp3')], // 5.0 s
    volume: 0.8,
    maxVoices: 1,
    throttleMs: 1000,
    rateJitter: 0,
  },
  [SFX_EVENT.ROUND_END]: {
    src: [fromMyinstants('announcer-congratulations.mp3'), fromMyinstants('tada.mp3')], // 2.4 s
    volume: 0.85,
    maxVoices: 1,
    throttleMs: 1000,
    rateJitter: 0,
  },
  [SFX_EVENT.VICTORY]: {
    src: [fromMyinstants('victory_2.mp3'), fromMyinstants('announcer-congratulations.mp3')], // 9.4 s
    volume: 0.9,
    maxVoices: 1,
    throttleMs: 1500,
    rateJitter: 0,
  },
  [SFX_EVENT.DEFEAT]: {
    src: [fromMyinstants('loud-dramatic-stinger.mp3'), fromMyinstants('sad-trombone.mp3')], // 8.4 s
    volume: 0.8,
    maxVoices: 1,
    throttleMs: 1500,
    rateJitter: 0,
  },

  // ── Boss (rateScale follows theme.audioPitchRate: deeper for Baron, higher for Herald) ──
  [SFX_EVENT.BOSS_ROAR]: {
    src: [fromMyinstants('largepredatorsnarl.mp3'), fromMyinstants('dragon-roar-sfx.mp3')], // 4.0 s
    volume: 0.75,
    maxVoices: 2,
    throttleMs: 600,
    rateJitter: 0.04,
  },
  [SFX_EVENT.BOSS_ENRAGE]: {
    src: [fromMyinstants('enraged-scream2.mp3'), fromMyinstants('beastly-battler-enraged.mp3')], // 4.1 s
    volume: 0.9,
    maxVoices: 1,
    throttleMs: 1500,
    rateJitter: 0,
  },
  [SFX_EVENT.BOSS_SHIELD]: {
    src: [fromMyinstants('casting-spell-buff_fr4Y6am.mp3'), fromMyinstants('magic-chimes.mp3')], // 3.0 s
    volume: 0.7,
    maxVoices: 1,
    throttleMs: 800,
    rateJitter: 0,
  },
  [SFX_EVENT.BOSS_SKILL]: {
    src: [fromMyinstants('boss-shockwave.mp3'), fromMyinstants('skill_spell_earthquake_01-23.mp3')], // 2.3 s
    volume: 0.8,
    maxVoices: 2,
    throttleMs: 300,
    rateJitter: 0.05,
  },
  [SFX_EVENT.BOSS_ULTIMATE]: {
    src: [fromMyinstants('cinematic-boom-hq.mp3'), fromMyinstants('quintiple-pound.mp3')], // 4.9 s
    volume: 1,
    maxVoices: 1,
    throttleMs: 800,
    rateJitter: 0,
  },
  [SFX_EVENT.BOSS_DEFEAT]: {
    src: [fromMyinstants('death-monster.mp3'), fromMyinstants('mb-monster-death.mp3')], // 2.5 s
    volume: 0.95,
    maxVoices: 1,
    throttleMs: 1500,
    rateJitter: 0,
  },

  // ── Champions ─────────────────────────────────────────────────────────
  [SFX_EVENT.CHAMPION_SUMMON]: {
    src: [fromMyinstants('teleport1_Cw1ot9l.mp3'), fromMyinstants('vwoop.mp3')], // 0.9 s
    volume: 0.55,
    maxVoices: 6,
    throttleMs: 60,
    rateJitter: 0.1,
  },
  [SFX_EVENT.CHAMPION_DEATH]: {
    src: [fromMyinstants('body-fall-sound-effect.mp3'), fromMyinstants('male-grunt.mp3')], // 1.7 s
    volume: 0.6,
    maxVoices: 4,
    throttleMs: 90,
    rateJitter: 0.1,
  },
  [SFX_EVENT.CRIT_HIT]: {
    src: [fromMyinstants('sword-slash-1.mp3'), fromMyinstants('critical-hit-sounds-effect.mp3')], // 0.4 s
    volume: 0.6,
    maxVoices: 6,
    throttleMs: 50,
    rateJitter: 0.12,
  },
  [SFX_EVENT.TEAM_HEAL]: {
    src: [fromMyinstants('casting-spell-heal.mp3'), fromMyinstants('healing-sound.mp3')], // 1.8 s
    volume: 0.7,
    maxVoices: 2,
    throttleMs: 400,
    rateJitter: 0,
  },

  // ── Boss skill archetypes (layered on top of BOSS_SKILL / BOSS_ULTIMATE) ──
  [SFX_EVENT.BOSS_PHASE_SHIFT]: {
    src: [fromMyinstants('titan-transformation-lightning.mp3'), fromMyinstants('dramatic-sting.MP3')], // 4.4 s
    volume: 0.9,
    maxVoices: 1,
    throttleMs: 2000,
    rateJitter: 0,
  },
  [SFX_EVENT.BOSS_FIRE_BREATH]: {
    src: [fromMyinstants('firebreath.mp3'), fromMyinstants('fire-breath.mp3')], // 2.4 s
    volume: 0.7,
    maxVoices: 2,
    throttleMs: 300,
    rateJitter: 0.05,
  },
  [SFX_EVENT.BOSS_SPIKES]: {
    src: [fromMyinstants('sword-uhsheathe.mp3'), fromMyinstants('skill_spell_earthquake_01-23.mp3')], // 1.5 s
    volume: 0.65,
    maxVoices: 2,
    throttleMs: 300,
    rateJitter: 0.08,
  },
  [SFX_EVENT.BOSS_SWEEP]: {
    src: [fromMyinstants('whoosh-dark.mp3'), fromMyinstants('whoosh-clean.mp3')], // 1.4 s
    volume: 0.7,
    maxVoices: 2,
    throttleMs: 250,
    rateJitter: 0.08,
  },
  [SFX_EVENT.BOSS_LIGHTNING]: {
    src: [fromMyinstants('thunder-crack.mp3'), fromMyinstants('lightning-strike-cool.mp3')], // 3.5 s
    volume: 0.8,
    maxVoices: 3,
    throttleMs: 150,
    rateJitter: 0.1,
  },
  [SFX_EVENT.BOSS_METEOR]: {
    src: [fromMyinstants('boss-shockwave.mp3'), fromMyinstants('cinematic-boom-hq.mp3')], // 2.3 s
    volume: 0.75,
    maxVoices: 3,
    throttleMs: 200,
    rateJitter: 0.1,
  },
  [SFX_EVENT.BOSS_BEAM]: {
    src: [fromMyinstants('laser-eye-beam.mp3'), fromMyinstants('fire-beam.mp3')], // 2.4 s
    volume: 0.75,
    maxVoices: 1,
    throttleMs: 400,
    rateJitter: 0,
  },
  [SFX_EVENT.BOSS_VORTEX]: {
    src: [fromMyinstants('whoosh-wind.mp3'), fromMyinstants('gust-of-wind-pauli.mp3')], // 0.65 s
    volume: 0.7,
    maxVoices: 2,
    throttleMs: 300,
    rateJitter: 0.05,
  },
  [SFX_EVENT.BOSS_CHARGE]: {
    src: [fromMyinstants('endless-stampede.mp3'), fromMyinstants('fire-whoosh.mp3')], // 4.2 s
    volume: 0.7,
    maxVoices: 1,
    throttleMs: 500,
    rateJitter: 0,
  },
};

/** Extra layer per VFX archetype; SEISMIC_SLAM / NOVA rely on the generic BOSS_SKILL / BOSS_ULTIMATE sound. */
export const BOSS_SKILL_VFX_SFX: Readonly<Partial<Record<BossSkillVfxType, SfxEventName>>> = {
  [BOSS_SKILL_VFX.FIRE_BREATH]: SFX_EVENT.BOSS_FIRE_BREATH,
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: SFX_EVENT.BOSS_FIRE_BREATH,
  [BOSS_SKILL_VFX.GROUND_SPIKES]: SFX_EVENT.BOSS_SPIKES,
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: SFX_EVENT.BOSS_SWEEP,
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: SFX_EVENT.BOSS_LIGHTNING,
  [BOSS_SKILL_VFX.METEOR_RAIN]: SFX_EVENT.BOSS_METEOR,
  [BOSS_SKILL_VFX.BEAM]: SFX_EVENT.BOSS_BEAM,
  [BOSS_SKILL_VFX.VORTEX]: SFX_EVENT.BOSS_VORTEX,
  [BOSS_SKILL_VFX.CHARGE_DASH]: SFX_EVENT.BOSS_CHARGE,
};

/** Socket.io events that `useSocketSoundEffects` listens to. */
export const SFX_SOCKET_EVENT = {
  CHAT: 'game:chat',
  LIKE: 'game:like',
  GIFT: 'game:gift',
  FOLLOW: 'game:follow',
  BOSS_CAST_SKILL: 'game:boss-cast-skill',
} as const;

/** Gifts at or above this coin value play BIG_DONATE; smaller gifts play SCORE_UP. */
export const BIG_DONATE_MIN_COINS = 99;
