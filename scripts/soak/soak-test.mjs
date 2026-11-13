// Soak test: runs the overlay with the viewer bot at high speed for a long time and logs
// heap / FPS / draw calls / champion count every minute to a CSV, to catch leaks and slow decay.
//
// Usage (from repo root, with `pnpm dev:client` running and NO file edits during the run,
// because Vite HMR would split the store module the script talks to):
//   node scripts/soak/soak-test.mjs [--minutes 120] [--url http://127.0.0.1:8000/] [--bot-ms 150]
// Env: CHROME_PATH to override the Chrome executable.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const DEFAULTS = { minutes: 120, url: 'http://127.0.0.1:8000/', botMs: 150 };
const DEBUG_PORT = 9444;
const VIEWPORT = { width: 480, height: 860 };
const BOOT_WAIT_MS = 8000;
const SAMPLE_INTERVAL_MS = 60_000;
const FPS_WINDOW_MS = 5000;
const MS_PER_MINUTE = 60_000;
const BYTES_PER_MB = 1048576;
const CHROME_DEFAULT = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CSV_HEADER = 'minute,heapMb,fps,drawCallsPerFrame,champions,queued,storeNotifyPerMin\n';

const parseArgs = () => {
  const args = { ...DEFAULTS };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    if (key === 'minutes') args.minutes = Number(value);
    if (key === 'url') args.url = value;
    if (key === 'bot-ms') args.botMs = Number(value);
  }
  return args;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GL_DRAW_PATCH = `(() => {
  window.__gl = { draws: 0 };
  const names = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'];
  for (const Ctor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Ctor) continue;
    for (const name of names) {
      const original = Ctor.prototype[name];
      if (!original) continue;
      Ctor.prototype[name] = function (...a) { window.__gl.draws += 1; return original.apply(this, a); };
    }
  }
})();`;

async function connectPage() {
  const target = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.result?.exceptionDetails) throw new Error(JSON.stringify(response.result.exceptionDetails).slice(0, 300));
    return response.result?.result?.value;
  };
  return { send, evaluate };
}

async function waitForChrome() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error('Chrome DevTools endpoint did not come up');
}

async function main() {
  const args = parseArgs();
  const profileDir = mkdtempSync(path.join(tmpdir(), 'lol-soak-'));
  const chrome = spawn(process.env.CHROME_PATH || CHROME_DEFAULT, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profileDir}`,
    '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required', '--no-first-run', 'about:blank',
  ], { stdio: 'ignore' });

  const csvPath = path.resolve(`soak-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
  writeFileSync(csvPath, CSV_HEADER);
  try {
    await waitForChrome();
    const page = await connectPage();
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: GL_DRAW_PATCH });
    await page.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: args.url });
    await sleep(BOOT_WAIT_MS);

    await page.evaluate(`import('/src/store/gameStore.ts').then((m) => {
      window.__store = m.useGameStore;
      window.__notify = 0;
      m.useGameStore.subscribe(() => { window.__notify += 1; });
      m.useGameStore.getState().toggleSimulation(true, ${args.botMs});
    })`);
    console.log(`Soak running ${args.minutes} min, bot every ${args.botMs} ms -> ${csvPath}`);

    for (let minute = 1; minute <= args.minutes; minute += 1) {
      await sleep(SAMPLE_INTERVAL_MS - FPS_WINDOW_MS);
      const sample = await page.evaluate(`new Promise((resolve) => {
        let frames = 0; const drawsStart = window.__gl.draws; const started = performance.now();
        const tick = () => { frames += 1; if (performance.now() - started < ${FPS_WINDOW_MS}) requestAnimationFrame(tick); else finish(); };
        const finish = () => {
          const s = window.__store.getState();
          const queued = (s.summonQueue?.BLG?.length ?? 0) + (s.summonQueue?.GENG?.length ?? 0);
          resolve({ frames, draws: window.__gl.draws - drawsStart, heap: performance.memory ? performance.memory.usedJSHeapSize : 0,
            champions: s.minions.length, queued, notify: window.__notify });
          window.__notify = 0;
        };
        requestAnimationFrame(tick);
      })`);
      const fps = sample.frames / (FPS_WINDOW_MS / 1000);
      const drawsPerFrame = Math.round(sample.draws / Math.max(1, sample.frames));
      const row = [minute, (sample.heap / BYTES_PER_MB).toFixed(1), fps.toFixed(1), drawsPerFrame, sample.champions, sample.queued, sample.notify];
      appendFileSync(csvPath, `${row.join(',')}\n`);
      console.log(`min ${minute}: heap ${row[1]} MB, fps ${row[2]}, draws ${drawsPerFrame}, champions ${sample.champions}`);
    }
  } finally {
    chrome.kill();
  }
  console.log(`Done. Elapsed ${args.minutes} min (${(args.minutes * MS_PER_MINUTE) / 1000}s). CSV: ${csvPath}`);
}

main().catch((error) => {
  console.error('Soak test failed:', error);
  process.exit(1);
});
