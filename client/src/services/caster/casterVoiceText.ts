import i18n from '../../i18n';

/**
 * Caption text → text sent to the TTS voice.
 * The caption keeps the compact on-screen form ("Tỉ số 2 - 1", "BLV Bão"); the voice gets a form
 * every engine reads correctly. Applied wherever a clip is requested (live line and warm-up), so the
 * server cache key is identical for both.
 */

/** "2 - 1" / "2–1": read as a score, never as "two minus one". */
const SCORE_PATTERN = /(\d+)\s*[-–—]\s*(\d+)/g;
/** Repeated or mixed sentence marks ("!!", "?!") make some voices pause twice or read the mark. */
const MARK_RUN = /([!?.])[!?.]+/g;
const WHITESPACE_RUN = /\s+/g;

interface VoiceReplacement {
  pattern: RegExp;
  i18nKey: string;
  fallback: string;
}

/** Abbreviations the voices spell letter by letter. */
const VOICE_REPLACEMENTS: readonly VoiceReplacement[] = [
  { pattern: /\bBLV\b/g, i18nKey: 'Caster.voice.casterTitle', fallback: 'bình luận viên' },
];

export const toVoiceText = (captionText: string): string => {
  const scoreJoiner = i18n.t('Caster.voice.scoreJoiner', { defaultValue: ' ' });
  const replaced = VOICE_REPLACEMENTS.reduce(
    (text, { pattern, i18nKey, fallback }) => text.replace(pattern, i18n.t(i18nKey, { defaultValue: fallback })),
    captionText
  );
  return replaced
    .replace(SCORE_PATTERN, `$1${scoreJoiner}$2`)
    .replace(MARK_RUN, '$1')
    .replace(WHITESPACE_RUN, ' ')
    .trim();
};
