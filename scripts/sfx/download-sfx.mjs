// Bundles every sound used by the game into client/public/sfx so a live stream never depends on myinstants.com.
// Reads client/src/constants/sfx.ts, downloads the first remote file of each event to
// client/public/sfx/<EVENT>.<ext>, and writes manifest.json (bytes, sha1, source URL).
// Usage: node scripts/sfx/download-sfx.mjs [--force]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SFX_SOURCE_FILE = path.join(REPO_ROOT, 'client/src/constants/sfx.ts');
const OUTPUT_DIR = path.join(REPO_ROOT, 'client/public/sfx');
const MANIFEST_FILE = path.join(OUTPUT_DIR, 'manifest.json');
const MYINSTANTS_BASE = 'https://www.myinstants.com/media/sounds/';
const REQUEST_TIMEOUT_MS = 20000;
const isForced = process.argv.includes('--force');

/** `[SFX_EVENT.NAME]: { src: [fromMyinstants('file.mp3'), ...` → { NAME: ['file.mp3', ...] } */
const parseEventSources = (source) => {
  const entryPattern = /\[SFX_EVENT\.(\w+)\]:\s*\{\s*src:\s*\[([^\]]*)\]/g;
  const filePattern = /fromMyinstants\('([^']+)'\)/g;
  const events = {};
  for (const match of source.matchAll(entryPattern)) {
    events[match[1]] = [...match[2].matchAll(filePattern)].map((fileMatch) => fileMatch[1]);
  }
  return events;
};

const sha1 = (buffer) => createHash('sha1').update(buffer).digest('hex');

const download = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
};

/** Tries each remote candidate of the event until one downloads. */
const bundleEvent = async (eventName, fileNames) => {
  for (const fileName of fileNames) {
    const extension = path.extname(fileName).toLowerCase() || '.mp3';
    const targetFile = path.join(OUTPUT_DIR, `${eventName}${extension}`);
    const sourceUrl = `${MYINSTANTS_BASE}${fileName}`;
    if (existsSync(targetFile) && !isForced) {
      const buffer = readFileSync(targetFile);
      return { event: eventName, file: path.basename(targetFile), bytes: buffer.length, sha1: sha1(buffer), sourceUrl, status: 'cached' };
    }
    try {
      const buffer = await download(sourceUrl);
      writeFileSync(targetFile, buffer);
      return { event: eventName, file: path.basename(targetFile), bytes: buffer.length, sha1: sha1(buffer), sourceUrl, status: 'downloaded' };
    } catch (error) {
      console.warn(`  ${eventName}: ${fileName} failed (${error.message}), trying next candidate`);
    }
  }
  return { event: eventName, file: null, bytes: 0, sha1: null, sourceUrl: null, status: 'failed' };
};

const main = async () => {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const events = parseEventSources(readFileSync(SFX_SOURCE_FILE, 'utf-8'));
  const entries = [];
  for (const [eventName, fileNames] of Object.entries(events)) {
    const entry = await bundleEvent(eventName, fileNames);
    console.log(`${entry.status.padEnd(10)} ${eventName} ${entry.file ?? ''} ${entry.bytes}B`);
    entries.push({ ...entry, bundledAt: new Date().toISOString() });
  }
  writeFileSync(MANIFEST_FILE, `${JSON.stringify(entries, null, 2)}\n`);
  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const failed = entries.filter((entry) => entry.status === 'failed');
  console.log(`\n${entries.length - failed.length}/${entries.length} events bundled, ${(totalBytes / 1048576).toFixed(2)} MB → ${OUTPUT_DIR}`);
  if (failed.length > 0) {
    console.error(`Failed: ${failed.map((entry) => entry.event).join(', ')}`);
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error('SFX bundling failed:', error);
  process.exit(1);
});

