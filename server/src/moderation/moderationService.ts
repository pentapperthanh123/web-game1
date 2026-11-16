import { findChampion, normalizeQuery } from '../constants/champions.js';
import { CasterConfig, MODERATION_LIMITS } from '../constants/liveOps.js';
import { ContentFilter, ViewerTextModerator } from './contentFilter.js';
import { loadModerationFromDisk, ModerationData, saveModerationToDisk } from './moderationStore.js';

export interface ModerationUpdateResult {
  snapshot: ModerationData;
  /** Aliases whose champion could not be found (or the alias table is full). */
  rejectedAliases: string[];
}

export interface ModerationService {
  getSnapshot(): ModerationData;
  /** Applies an untrusted admin patch: { addTerms?, removeTerms?, setAliases?, removeAliases? }. */
  applyUpdate(rawPatch: unknown): ModerationUpdateResult;
  /** Champion name for the first operator alias found in a chat comment. */
  findAliasChampion(comment: string): string | undefined;
  /** Moderator for the TikTok pipeline; honours the "do not read viewer names" kill switch. */
  createViewerTextModerator(getCasterConfig: () => CasterConfig): ViewerTextModerator;
  /** True when the text contains a blocked term (used before any caster line is spoken). */
  containsBlocked(text: string): boolean;
}

interface ModerationPatch {
  addTerms: string[];
  removeTerms: string[];
  setAliases: [string, string][];
  removeAliases: string[];
}

const WHITESPACE_RUN = /\s+/g;
const ALIAS_PATTERN = /^[a-z0-9]+$/;
const ALIAS_TOKEN_SEPARATOR = /[^a-z0-9]+/;
const VIETNAMESE_COLLATION = 'vi';

const readStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const normalizeTerm = (term: string): string =>
  term.normalize('NFC').toLowerCase().replace(WHITESPACE_RUN, ' ').trim();

const isValidTerm = (term: string): boolean =>
  term.length > 0 && term.length <= MODERATION_LIMITS.MAX_TERM_LENGTH;

const normalizeAlias = (alias: string): string => normalizeQuery(alias).replace(WHITESPACE_RUN, '');

const isValidAlias = (alias: string): boolean =>
  ALIAS_PATTERN.test(alias) && alias.length <= MODERATION_LIMITS.MAX_ALIAS_LENGTH;

const readTermList = (value: unknown): string[] =>
  readStringList(value).map(normalizeTerm).filter(isValidTerm);

const readAliasEntries = (value: unknown): [string, string][] => {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([alias, champion]): [string, string] => [normalizeAlias(alias), champion.trim()])
    .filter(([alias, champion]) => isValidAlias(alias) && champion.length > 0);
};

const readModerationPatch = (rawPatch: unknown): ModerationPatch => {
  const source = rawPatch && typeof rawPatch === 'object' ? (rawPatch as Record<string, unknown>) : {};
  return {
    addTerms: readTermList(source.addTerms),
    removeTerms: readTermList(source.removeTerms),
    setAliases: readAliasEntries(source.setAliases),
    removeAliases: readStringList(source.removeAliases).map(normalizeAlias),
  };
};

const mergeTerms = (current: readonly string[], patch: ModerationPatch): string[] => {
  const removed = new Set(patch.removeTerms);
  const terms = new Set(current.filter((term) => !removed.has(term)));
  for (const term of patch.addTerms) {
    if (terms.size >= MODERATION_LIMITS.MAX_TERMS) break;
    terms.add(term);
  }
  return [...terms].sort((left, right) => left.localeCompare(right, VIETNAMESE_COLLATION));
};

const mergeAliases = (
  current: Readonly<Record<string, string>>,
  patch: ModerationPatch
): { aliases: Record<string, string>; rejectedAliases: string[] } => {
  const removed = new Set(patch.removeAliases);
  const aliases = Object.fromEntries(Object.entries(current).filter(([alias]) => !removed.has(alias)));
  const rejectedAliases: string[] = [];
  for (const [alias, championInput] of patch.setAliases) {
    const champion = findChampion(championInput);
    const isTableFull =
      !Object.hasOwn(aliases, alias) && Object.keys(aliases).length >= MODERATION_LIMITS.MAX_ALIASES;
    if (!champion || isTableFull) {
      rejectedAliases.push(alias);
      continue;
    }
    aliases[alias] = champion.name;
  }
  return { aliases, rejectedAliases };
};

export function createModerationService(): ModerationService {
  const filter = new ContentFilter();
  let data = loadModerationFromDisk();
  filter.setBlockedTerms(data.blockedTerms);

  const applyUpdate = (rawPatch: unknown): ModerationUpdateResult => {
    const patch = readModerationPatch(rawPatch);
    const { aliases, rejectedAliases } = mergeAliases(data.championAliases, patch);
    data = {
      blockedTerms: mergeTerms(data.blockedTerms, patch),
      championAliases: aliases,
      updatedAt: Date.now(),
    };
    filter.setBlockedTerms(data.blockedTerms);
    saveModerationToDisk(data);
    return { snapshot: data, rejectedAliases };
  };

  const findAliasChampion = (comment: string): string | undefined => {
    if (Object.keys(data.championAliases).length === 0) return undefined;
    const tokens = normalizeQuery(comment).split(ALIAS_TOKEN_SEPARATOR);
    const matchedToken = tokens.find((token) => Object.hasOwn(data.championAliases, token));
    return matchedToken ? data.championAliases[matchedToken] : undefined;
  };

  const createViewerTextModerator = (getCasterConfig: () => CasterConfig): ViewerTextModerator => ({
    toDisplayName: (rawName) => filter.toDisplayName(rawName),
    toSpeechName: (rawName) => (getCasterConfig().isNameReadingEnabled ? filter.toSpeechName(rawName) : null),
    maskChatText: (text) => filter.maskChatText(text),
  });

  return {
    getSnapshot: () => data,
    applyUpdate,
    findAliasChampion,
    createViewerTextModerator,
    containsBlocked: (text) => filter.containsBlocked(text),
  };
}
