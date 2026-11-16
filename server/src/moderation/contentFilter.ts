import { MODERATION_LIMITS } from '../constants/liveOps.js';

/**
 * Viewer text moderation (spec 2.2): blocked-term matching, display-name masking,
 * speech-safe names and chat masking. Pure in-memory; the term list is pushed in by the
 * moderation service whenever it changes.
 */

const DIACRITIC_MARKS = /[̀-ͯ]/g;
const VIETNAMESE_D = /đ/g;
const PLAIN_D = 'd';
const NON_LETTER_OR_DIGIT = /[^\p{L}\p{N}]+/gu;
const NON_ASCII_ALPHANUMERIC = /[^a-z0-9]+/g;
const REPEATED_CHARACTER = /(.)\1+/gu;
const LEETSPEAK_CHARACTER = /[013457@$]/g;
const LEETSPEAK_MAP: Readonly<Record<string, string>> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};
const PRINTABLE_ASCII_ONLY = /^[\x20-\x7e]*$/;
const TOKEN_SEPARATOR = ' ';

/** Links, phone numbers and @handles are never shown or spoken, whatever the term list says. */
const UNSAFE_PATTERNS: readonly RegExp[] = [
  /(https?:\/\/|www\.)\S+/i,
  /\b[a-z0-9-]{2,}\.(com|net|org|vn|io|me|xyz|link|shop|top|info|biz)\b/i,
  /(\+?84|\b0)(?:[\s.-]?\d){8,10}\b/,
  /@[a-z0-9_.]{2,}/i,
];

const TRAILING_ID_SUFFIX = /(_\d+)+/g;
const LONG_DIGIT_RUN = /\d{4,}/g;
const NAME_SEPARATORS = /[_.\-]+/g;
const NON_NAME_CHARACTER = /[^\p{L}\p{N}\s]/gu;
const WHITESPACE_RUN = /\s+/g;

interface CompiledTermSet {
  /** Single short words, matched against whole tokens only. */
  shortTokens: Set<string>;
  /** Longer words and phrases, matched as substrings of the space-free text. */
  longPhrases: string[];
}

export interface ViewerTextModerator {
  toDisplayName(rawName: string): string;
  toSpeechName(rawName: string): string | null;
  maskChatText(text: string): string;
}

const countCharacters = (text: string): number => Array.from(text).length;

const squashRepeats = (token: string): string => token.replace(REPEATED_CHARACTER, '$1');

const splitTokens = (text: string): string[] =>
  text
    .trim()
    .split(TOKEN_SEPARATOR)
    .filter((token) => token.length > 0)
    .map(squashRepeats);

const toAccentedTokens = (text: string): string[] =>
  splitTokens(text.toLowerCase().normalize('NFC').replace(NON_LETTER_OR_DIGIT, TOKEN_SEPARATOR));

const toAsciiTokens = (text: string): string[] =>
  splitTokens(
    text
      .toLowerCase()
      .replace(VIETNAMESE_D, PLAIN_D)
      .normalize('NFD')
      .replace(DIACRITIC_MARKS, '')
      .replace(LEETSPEAK_CHARACTER, (character) => LEETSPEAK_MAP[character] ?? character)
      .replace(NON_ASCII_ALPHANUMERIC, TOKEN_SEPARATOR)
  );

/** "đ . m" → tokens ["đ","m"] → extra token "đm", so spaced-out letters are still caught. */
const collectSingleCharacterRuns = (tokens: readonly string[]): string[] => {
  const runs: string[] = [];
  let currentRun = '';
  for (const token of tokens) {
    if (countCharacters(token) === 1) {
      currentRun += token;
      continue;
    }
    if (countCharacters(currentRun) > 1) runs.push(squashRepeats(currentRun));
    currentRun = '';
  }
  if (countCharacters(currentRun) > 1) runs.push(squashRepeats(currentRun));
  return runs;
};

const createEmptyTermSet = (): CompiledTermSet => ({ shortTokens: new Set<string>(), longPhrases: [] });

const addTermToSet = (termSet: CompiledTermSet, termTokens: readonly string[]): void => {
  if (termTokens.length === 0) return;
  const isShortSingleWord =
    termTokens.length === 1 && countCharacters(termTokens[0]) <= MODERATION_LIMITS.SHORT_TERM_MAX_LENGTH;
  if (isShortSingleWord) {
    termSet.shortTokens.add(termTokens[0]);
    return;
  }
  termSet.longPhrases.push(termTokens.join(''));
};

const matchesTermSet = (termSet: CompiledTermSet, textTokens: readonly string[]): boolean => {
  if (textTokens.length === 0) return false;
  const candidateTokens = textTokens.concat(collectSingleCharacterRuns(textTokens));
  if (candidateTokens.some((token) => termSet.shortTokens.has(token))) return true;
  if (termSet.longPhrases.length === 0) return false;
  const compactText = textTokens.join('');
  return termSet.longPhrases.some((phrase) => compactText.includes(phrase));
};

const cleanNameForSpeech = (rawName: string): string => {
  const words = rawName
    .normalize('NFC')
    .replace(TRAILING_ID_SUFFIX, '')
    .replace(LONG_DIGIT_RUN, '')
    .replace(NAME_SEPARATORS, TOKEN_SEPARATOR)
    .replace(NON_NAME_CHARACTER, '')
    .replace(WHITESPACE_RUN, TOKEN_SEPARATOR)
    .trim()
    .split(TOKEN_SEPARATOR)
    .slice(0, MODERATION_LIMITS.SPEECH_NAME_MAX_WORDS)
    .join(TOKEN_SEPARATOR);
  return Array.from(words).slice(0, MODERATION_LIMITS.SPEECH_NAME_MAX_CHARS).join('').trim();
};

export class ContentFilter implements ViewerTextModerator {
  private accentedTerms: CompiledTermSet = createEmptyTermSet();
  private asciiTerms: CompiledTermSet = createEmptyTermSet();

  /**
   * Accented terms match accented text only. ASCII terms (teencode, English) additionally match
   * the accent-stripped, leetspeak-folded text.
   */
  public setBlockedTerms(terms: readonly string[]): void {
    const accentedTerms = createEmptyTermSet();
    const asciiTerms = createEmptyTermSet();
    for (const term of terms) {
      addTermToSet(accentedTerms, toAccentedTokens(term));
      if (PRINTABLE_ASCII_ONLY.test(term)) addTermToSet(asciiTerms, toAsciiTokens(term));
    }
    this.accentedTerms = accentedTerms;
    this.asciiTerms = asciiTerms;
  }

  public containsBlocked(text: string): boolean {
    if (!text) return false;
    if (UNSAFE_PATTERNS.some((pattern) => pattern.test(text))) return true;
    if (matchesTermSet(this.accentedTerms, toAccentedTokens(text))) return true;
    return matchesTermSet(this.asciiTerms, toAsciiTokens(text));
  }

  /** Safe on-screen name: unchanged, or masked as "Ng***" when blocked. */
  public toDisplayName(rawName: string): string {
    const name = rawName.trim();
    if (!this.containsBlocked(name)) return name;
    const visiblePrefix = Array.from(name).slice(0, MODERATION_LIMITS.MASK_VISIBLE_CHARS).join('');
    return `${visiblePrefix}${MODERATION_LIMITS.MASK_SUFFIX}`;
  }

  /** Name the caster may read aloud, or null when it must use a team alias instead. */
  public toSpeechName(rawName: string): string | null {
    if (this.containsBlocked(rawName)) return null;
    const cleanedName = cleanNameForSpeech(rawName);
    return cleanedName.length > 0 ? cleanedName : null;
  }

  public maskChatText(text: string): string {
    return this.containsBlocked(text) ? MODERATION_LIMITS.MASKED_CHAT_TEXT : text;
  }
}
