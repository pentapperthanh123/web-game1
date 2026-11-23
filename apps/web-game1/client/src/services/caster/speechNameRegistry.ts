import { CASTER_NAME_RULES } from '../../constants/caster';
import { useCasterStore } from '../../store/casterStore';

/**
 * Display name → name the caster may speak.
 * TikTok events carry a server-moderated `speechName` (null = must not be read); those are
 * registered here. Names that never came through the TikTok pipeline were typed by the
 * operator (admin portal, guest dock) and are trusted after the same trimming.
 */
const speechNames = new Map<string, string | null>();

/** Follow rewards and gift elites prefix the summoner name with an emoji badge. */
const BADGE_PREFIX = /^[^\p{L}\p{N}]+\s*/u;
/** Leaderboard labels append the source, e.g. "Minh Anh (Trái Tim CKTG)". */
const SOURCE_SUFFIX = /\s*\(.*$/u;
const NON_SPEAKABLE = /[^\p{L}\p{N}\s'.-]/gu;
const WHITESPACE_RUN = /\s+/g;

const stripBadge = (displayName: string): string => displayName.replace(BADGE_PREFIX, '').replace(SOURCE_SUFFIX, '').trim();

const trimForSpeech = (name: string): string | null => {
  const words = name.replace(NON_SPEAKABLE, ' ').replace(WHITESPACE_RUN, ' ').trim().split(' ');
  const spoken = words.slice(0, CASTER_NAME_RULES.MAX_WORDS).join(' ').slice(0, CASTER_NAME_RULES.MAX_CHARS).trim();
  return spoken || null;
};

/** Call only with payloads from the TikTok pipeline (they always contain the `speechName` key). */
export const registerSpeechName = (displayName: unknown, speechName: unknown): void => {
  if (typeof displayName !== 'string' || !displayName) return;
  if (speechNames.size >= CASTER_NAME_RULES.MAX_REGISTRY_ENTRIES) {
    const oldestKey = speechNames.keys().next().value;
    if (oldestKey !== undefined) speechNames.delete(oldestKey);
  }
  speechNames.set(stripBadge(displayName), typeof speechName === 'string' ? speechName : null);
};

export const hasSpeechNameField = (payload: unknown): boolean =>
  Boolean(payload && typeof payload === 'object' && 'speechName' in payload);

/** Spoken form of a viewer name, or null when it must not be read (kill switch, blocked, unknown). */
export const resolveSpeechName = (displayName: string | null | undefined): string | null => {
  if (!displayName || !useCasterStore.getState().isNameReadingEnabled) return null;
  const cleanName = stripBadge(displayName);
  if (speechNames.has(cleanName)) return speechNames.get(cleanName) ?? null;
  return trimForSpeech(cleanName);
};
