import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MODERATION_SEED_TERMS } from './moderationSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const MODERATION_FILE = path.join(DATA_DIR, 'moderation.json');
const JSON_INDENT = 2;

export interface ModerationData {
  blockedTerms: string[];
  /** Operator-defined chat alias (lower case) → canonical champion name. */
  championAliases: Record<string, string>;
  updatedAt: number;
}

const createSeedData = (): ModerationData => ({
  blockedTerms: [...MODERATION_SEED_TERMS],
  championAliases: {},
  updatedAt: Date.now(),
});

const isStringRecord = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value as Record<string, unknown>).every((entry) => typeof entry === 'string');

const isModerationData = (value: unknown): value is ModerationData => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.blockedTerms) &&
    candidate.blockedTerms.every((term) => typeof term === 'string') &&
    isStringRecord(candidate.championAliases) &&
    typeof candidate.updatedAt === 'number'
  );
};

export function saveModerationToDisk(data: ModerationData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(MODERATION_FILE, JSON.stringify(data, null, JSON_INDENT), 'utf-8');
  } catch (err) {
    console.warn('[Moderation] Could not persist moderation list to disk:', err);
  }
}

/** Loads the list; the first run (no file) writes the seed so the operator can edit it. */
export function loadModerationFromDisk(): ModerationData {
  try {
    if (!fs.existsSync(MODERATION_FILE)) {
      const seed = createSeedData();
      saveModerationToDisk(seed);
      return seed;
    }
    const parsed: unknown = JSON.parse(fs.readFileSync(MODERATION_FILE, 'utf-8'));
    if (isModerationData(parsed)) return parsed;
    console.warn('[Moderation] Invalid moderation file shape, using seed list in memory.');
  } catch (err) {
    console.warn('[Moderation] Could not read moderation list from disk, using seed list:', err);
  }
  return createSeedData();
}
