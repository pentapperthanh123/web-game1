// Orchestrates end-to-end Viet-TTS Docker setup + static audio pre-generation:
//   1. Builds and starts the CPU-patched `dangvansam/viet-tts` Docker container (`pnpm run viet-tts:docker`)
//   2. Waits until `http://localhost:8298/health` is ready (streaming model download progress from container logs)
//   3. Runs `pnpm run pregenerate:viet-tts` to convert all static caster lines into `server/data/viet-tts-audio/` and `server/data/tts-cache/`
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HEALTH_URL = 'http://localhost:8298/health';
const POLL_INTERVAL_MS = 8_000;
const MAX_WAIT_MS = 45 * 60_000;

const runInherit = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });

const checkHealth = async () => {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(3_500) });
    return res.ok;
  } catch {
    return false;
  }
};

const getContainerTailLog = () => {
  try {
    return execFileSync('docker', ['logs', '--tail', '2', 'viet-tts-service'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  console.log('===============================================================');
  console.log('[Viet-TTS Sync] Step 1/3: Building & starting Docker container');
  console.log('===============================================================');
  await runInherit('docker', ['compose', '-f', 'scripts/viet-tts/docker-compose.yml', 'up', '-d', '--build']);

  console.log('\n===============================================================');
  console.log('[Viet-TTS Sync] Step 2/3: Waiting for Viet-TTS API at :8298...');
  console.log('  (First startup downloads ~2.5GB model from HuggingFace)');
  console.log('===============================================================');

  const startedWaitAt = Date.now();
  while (!(await checkHealth())) {
    if (Date.now() - startedWaitAt > MAX_WAIT_MS) {
      throw new Error('Timed out waiting for Viet-TTS container to become healthy.');
    }
    const tail = getContainerTailLog();
    if (tail) {
      const lastLine = tail.split(/\r?\n/).pop();
      console.log(`  [Container] ${lastLine}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  console.log('\n===============================================================');
  console.log('[Viet-TTS Sync] Step 3/3: Viet-TTS API is READY! Running pregenerate:viet-tts');
  console.log('===============================================================');
  await runInherit('node', ['scripts/sfx/pregenerate-caster-tts.mjs', '--provider=VIET_TTS']);
};

main().catch((error) => {
  console.error('[Viet-TTS Sync] Error:', error.message);
  process.exit(1);
});
