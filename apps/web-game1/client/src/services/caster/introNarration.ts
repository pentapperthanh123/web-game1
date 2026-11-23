import { CASTER_VOICE_MAX_CHARS, CasterSpeaker, DEFAULT_CASTER_SPEAKER, resolveSpeakerRole } from '../../constants/caster';
import { getCasterLang } from './casterComposer';
import { toVoiceText } from './casterVoiceText';
import { SPEECH_OUTCOME, SpeechOutcome, casterSpeechEngine } from './speechEngine';

/** Split points, from the most natural pause to the last resort. */
const SENTENCE_BREAK = /(?<=[.!?:])\s+/;
const CLAUSE_BREAK = /(?<=[,;])\s+/;
const WORD_BREAK = /\s+/;
const SPLIT_LEVELS: readonly RegExp[] = [SENTENCE_BREAK, CLAUSE_BREAK, WORD_BREAK];

/** These outcomes mean nothing more can play right now, so the rest of the line is dropped. */
const STOP_OUTCOMES: ReadonlySet<SpeechOutcome> = new Set([
  SPEECH_OUTCOME.INTERRUPTED,
  SPEECH_OUTCOME.AUTOPLAY_BLOCKED,
  SPEECH_OUTCOME.SUSPENDED,
]);

const NOOP = (): void => undefined;

/** The server measures the spoken form (numbers and tags expanded), not the caption. */
const fitsVoiceLimit = (text: string): boolean => toVoiceText(text).length <= CASTER_VOICE_MAX_CHARS;

/** Greedily joins parts back together while each chunk still fits the voice limit. */
const packParts = (parts: readonly string[]): string[] =>
  parts.reduce<string[]>((chunks, part) => {
    const lastIndex = chunks.length - 1;
    const joined = lastIndex >= 0 ? `${chunks[lastIndex]} ${part}` : part;
    if (lastIndex >= 0 && fitsVoiceLimit(joined)) {
      chunks[lastIndex] = joined;
      return chunks;
    }
    chunks.push(part);
    return chunks;
  }, []);

const splitAtLevel = (text: string, level: number): string[] => {
  if (fitsVoiceLimit(text) || level >= SPLIT_LEVELS.length) return [text];
  const parts = text
    .split(SPLIT_LEVELS[level])
    .filter(Boolean)
    .flatMap((part) => splitAtLevel(part, level + 1));
  return packParts(parts);
};

/** Long intro lines (e.g. the rules) exceed the voice limit; they are cut at sentence, then clause, then word breaks. */
export const splitSpeechChunks = (text: string): string[] => splitAtLevel(text.trim(), 0);

/**
 * Speaks one intro line in voice-sized parts, back to back.
 * `isStillCurrent` turns false when the intro moves on (tab change, duel, card closed); the remaining parts are then dropped.
 * `initialDelayMs` introduces a resilient breathing room (e.g. for the round gong) without being cancelled by React re-renders.
 * `fallbackText` is used if the primary line is missing from the static audio cache.
 */
export const speakIntroNarration = async (
  text: string,
  isStillCurrent: () => boolean,
  initialDelayMs = 0,
  speaker: CasterSpeaker = DEFAULT_CASTER_SPEAKER,
  fallbackText?: string
): Promise<void> => {
  const lang = getCasterLang();
  const role = resolveSpeakerRole(speaker);
  const chunks = splitSpeechChunks(text);
  chunks.forEach((chunk) => casterSpeechEngine.prefetch(chunk, lang, role));

  if (initialDelayMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, initialDelayMs));
    if (!isStillCurrent()) return;
  }

  let spokeAny = false;
  for (const chunk of chunks) {
    const isReady = await casterSpeechEngine.prepare(chunk, lang, role);
    if (!isStillCurrent()) return;
    if (!isReady && !spokeAny && fallbackText) {
      const fallbackChunks = splitSpeechChunks(fallbackText);
      for (const fbChunk of fallbackChunks) {
        await casterSpeechEngine.prepare(fbChunk, lang, role);
        if (!isStillCurrent()) return;
        const fbOutcome = await casterSpeechEngine.speak(fbChunk, lang, NOOP, undefined, role);
        if (STOP_OUTCOMES.has(fbOutcome) || !isStillCurrent()) return;
      }
      return;
    }
    const outcome = await casterSpeechEngine.speak(chunk, lang, NOOP, undefined, role);
    if (outcome === SPEECH_OUTCOME.SPOKEN) spokeAny = true;
    if (STOP_OUTCOMES.has(outcome) || !isStillCurrent()) return;
  }
};
