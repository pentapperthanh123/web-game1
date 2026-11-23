import {
  CASTER_ALWAYS_DIALOGUE_SIGNALS,
  CASTER_DIALOGUE,
  CASTER_DUEL_SIGNALS,
  CASTER_INTENSITY,
  CASTER_INTRO_SIGNALS,
  CASTER_SIGNAL_PRIORITY,
  CASTER_SPEECH,
  CasterIntensity,
  CasterRole,
  CasterSignal,
  CasterSpeaker,
  CasterVoice,
  isDonateSignal,
  resolveSpeakerRole,
} from '../../constants/caster';
import { TeamType } from '../../constants/game';
import { useCasterStore } from '../../store/casterStore';
import { useGameStore } from '../../store/gameStore';
import { isCurrentRoundIntroActive } from '../../store/roundIntroStore';
import { CasterSlots, DialogueTurn, composeCasterDialogue, composeCasterLine, getAnonymousName, getCasterLang } from './casterComposer';
import { CasterLine, casterQueue } from './presentationQueue';
import { casterSpeechEngine } from './speechEngine';
import { resolveSpeechName } from './speechNameRegistry';

export const getTeamTag = (team: TeamType | null | undefined): string => {
  if (!team) return '';
  return useGameStore.getState().activeTeams[team]?.shortTag || team;
};

/** Spoken name of a viewer, or "a warrior of <team>" when the name may not be read. */
export const speakerFor = (displayName: string | null | undefined, team: TeamType | null | undefined): string =>
  resolveSpeechName(displayName) ?? getAnonymousName(getTeamTag(team));

export interface CasterSignalMeta {
  team?: TeamType;
  speakerName?: string;
  voice?: CasterVoice;
  ttlMs?: number;
  deadlineAt?: number;
  role?: CasterRole;
  intensity?: CasterIntensity;
  /** Which caster says a single line (A by default); turns of an exchange carry their own speaker. */
  speaker?: CasterSpeaker;
}

/** During the duel only its own lines are said; during the intro card only the intro lines.
 * Donate / gift shoutouts are ALWAYS allowed in any state so viewer contributions are never silenced. */
const isSignalAllowedNow = (signal: CasterSignal): boolean => {
  if (isDonateSignal(signal)) return true;
  const state = useGameStore.getState();
  if (state.silverScrapesState.isActive) return CASTER_DUEL_SIGNALS.has(signal);
  if (isCurrentRoundIntroActive()) return CASTER_INTRO_SIGNALS.has(signal);
  if (state.bossHp <= 0 || state.roundWinner !== null || state.isRoundIntermission) return false;
  return true;
};

const canCastNow = (signal: CasterSignal): boolean =>
  useCasterStore.getState().isTtsEnabled && isSignalAllowedNow(signal);

const buildLine = (signal: CasterSignal, text: string, meta: CasterSignalMeta, createdAt: number): CasterLine => ({
  signal,
  priority: CASTER_SIGNAL_PRIORITY[signal],
  text,
  createdAt,
  team: meta.team,
  teamTag: meta.team ? getTeamTag(meta.team) : undefined,
  speakerName: meta.speakerName,
  voice: meta.voice,
  ttlMs: meta.ttlMs ?? (isDonateSignal(signal) ? CASTER_SPEECH.DONATE_TTL_MS : undefined),
  deadlineAt: meta.deadlineAt,
  role: meta.role,
  intensity: meta.intensity,
  speaker: meta.speaker,
});

/** Composes and queues one caster line; silently skipped when the voice is off, the moment does not allow it, or a slot is missing. */
export const castCasterSignal = (signal: CasterSignal, slots: CasterSlots, meta: CasterSignalMeta = {}): void => {
  if (!canCastNow(signal)) return;
  const text = composeCasterLine(signal, slots);
  if (!text) return;
  casterQueue.enqueue(buildLine(signal, text, meta, Date.now()));
};

// ── Two-caster exchanges ───────────────────────────────────────────────────────

let lastMainExchangeAt = 0;
let lastDonateExchangeAt = 0;

/**
 * Whether this moment gets the two-caster exchange: the duo must be on, key moments always do,
 * the rest roll against SHARE and keep a cooldown so the desk does not chatter non-stop.
 */
const shouldOpenExchange = (signal: CasterSignal, now: number): boolean => {
  if (!useCasterStore.getState().isDuoEnabled) return false;
  const isDonate = isDonateSignal(signal);
  const cooldownMs = isDonate ? CASTER_DIALOGUE.DONATE_COOLDOWN_MS : CASTER_DIALOGUE.COOLDOWN_MS;
  const lastAt = isDonate ? lastDonateExchangeAt : lastMainExchangeAt;
  if (CASTER_ALWAYS_DIALOGUE_SIGNALS.has(signal)) return true;
  if (now - lastAt < cooldownMs) return false;
  return Math.random() < CASTER_DIALOGUE.SHARE;
};

const markExchange = (signal: CasterSignal, now: number): void => {
  if (isDonateSignal(signal)) lastDonateExchangeAt = now;
  else lastMainExchangeAt = now;
};

/** Queues written turns as one exchange (a single turn is just a line said by its speaker). */
export const castCasterTurns = (signal: CasterSignal, turns: readonly DialogueTurn[], meta: CasterSignalMeta = {}): void => {
  if (!canCastNow(signal) || turns.length === 0) return;
  const now = Date.now();
  // Each turn's voice follows its speaker, never the meta role
  const lines = turns.map((turn) => ({ ...buildLine(signal, turn.text, meta, now), role: undefined, speaker: turn.speaker }));
  if (lines.length === 1) {
    casterQueue.enqueue(lines[0]);
    return;
  }
  markExchange(signal, now);
  casterQueue.enqueueExchange(lines);
};

/** The two-caster exchange when one is written and the moment allows it; otherwise the single line. */
export const castCasterDialogue = (signal: CasterSignal, slots: CasterSlots, meta: CasterSignalMeta = {}): void => {
  if (!canCastNow(signal)) return;
  const turns = shouldOpenExchange(signal, Date.now()) ? composeCasterDialogue(signal, slots) : null;
  if (!turns) {
    castCasterSignal(signal, slots, meta);
    return;
  }
  castCasterTurns(signal, turns, meta);
};

/** Fetches the voice of turns that will be said later (e.g. "Xung trận!" prepared during the intro card). */
export const prefetchDialogueTurns = (turns: readonly DialogueTurn[]): void => {
  const lang = getCasterLang();
  turns.forEach((turn) => {
    casterSpeechEngine.prefetch(turn.text, lang, resolveSpeakerRole(turn.speaker), CASTER_INTENSITY.NORMAL);
  });
};
