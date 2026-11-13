// Loudness-normalizes the bundled SFX so every sound sits at a consistent level on stream:
// EBU R128 loudnorm (I=-16 LUFS, TP=-1 dBTP), leading silence trimmed, length capped per category.
// Needs ffmpeg on PATH (skips with a warning otherwise). Rewrites files in place via a temp file.
// Usage: node scripts/sfx/normalize-sfx.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SFX_DIR = path.join(REPO_ROOT, 'client/public/sfx');
const SFX_SOURCE_FILE = path.join(REPO_ROOT, 'client/src/constants/sfx.ts');
const LOUDNESS = { TARGET_LUFS: -16, TRUE_PEAK_DBTP: -1, LOUDNESS_RANGE: 11 };
const SILENCE_THRESHOLD_DB = -50;
const FADE_OUT_S = 0.08;
const BITRATE = '128k';
/** Max seconds per mix category (see SFX_CATEGORY in constants/sfx.ts). */
const MAX_SECONDS_BY_CATEGORY = { VIEWER: 0.6, COMBAT: 1.5, BOSS: 3, STINGER: 4 };
const DEFAULT_MAX_SECONDS = 3;
/** Full-length musical moments that must not be cut by the category cap. */
const MAX_SECONDS_BY_EVENT = { VICTORY: 10, DEFEAT: 9, ROUND_START: 5.5 };

const hasFfmpeg = () => spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

/** `[SFX_EVENT.NAME]: { src: [...], volume: x, category: SFX_CATEGORY.CAT` → { NAME: 'CAT' } */
const parseCategories = () => {
  const source = readFileSync(SFX_SOURCE_FILE, 'utf-8');
  const pattern = /\[SFX_EVENT\.(\w+)\]:\s*\{[^}]*?category:\s*SFX_CATEGORY\.(\w+)/g;
  return Object.fromEntries([...source.matchAll(pattern)].map((match) => [match[1], match[2]]));
};

const normalizeFile = (filePath, maxSeconds) => {
  const tempPath = `${filePath}.tmp.mp3`;
  const fadeStart = Math.max(0, maxSeconds - FADE_OUT_S);
  const filters = [
    `silenceremove=start_periods=1:start_threshold=${SILENCE_THRESHOLD_DB}dB`,
    `atrim=0:${maxSeconds}`,
    `afade=t=out:st=${fadeStart}:d=${FADE_OUT_S}`,
    `loudnorm=I=${LOUDNESS.TARGET_LUFS}:TP=${LOUDNESS.TRUE_PEAK_DBTP}:LRA=${LOUDNESS.LOUDNESS_RANGE}`,
  ].join(',');
  const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', filePath, '-af', filters, '-ar', '44100', '-b:a', BITRATE, tempPath], { encoding: 'utf-8' });
  if (result.status !== 0) {
    rmSync(tempPath, { force: true });
    throw new Error(result.stderr.trim() || `ffmpeg exited ${result.status}`);
  }
  renameSync(tempPath, filePath);
};

const main = () => {
  if (!hasFfmpeg()) {
    console.warn('ffmpeg not found on PATH — skipping normalization (files stay as downloaded).');
    return;
  }
  const categories = parseCategories();
  let totalBytes = 0;
  for (const [eventName, category] of Object.entries(categories)) {
    const filePath = path.join(SFX_DIR, `${eventName}.mp3`);
    const maxSeconds = MAX_SECONDS_BY_EVENT[eventName] ?? MAX_SECONDS_BY_CATEGORY[category] ?? DEFAULT_MAX_SECONDS;
    try {
      normalizeFile(filePath, maxSeconds);
      const bytes = statSync(filePath).size;
      totalBytes += bytes;
      console.log(`ok   ${eventName.padEnd(22)} ${category.padEnd(8)} ≤${maxSeconds}s ${bytes}B`);
    } catch (error) {
      console.error(`fail ${eventName}: ${error.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\nNormalized ${Object.keys(categories).length} files, ${(totalBytes / 1048576).toFixed(2)} MB`);
};

main();
