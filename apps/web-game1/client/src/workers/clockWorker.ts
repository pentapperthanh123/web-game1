/**
 * Dedicated background heartbeat worker.
 * Web Worker timers are exempt from Chromium's hidden-tab timer throttling (>=1000ms / 60s),
 * keeping combat events, sockets, clocks, and background rendering responsive.
 */
const CLOCK_WORKER_MSG = {
  START: 'START',
  STOP: 'STOP',
  TICK: 'TICK',
} as const;

const DEFAULT_TICK_MS = 33;
const MIN_TICK_MS = 1;

type ClockWorkerCommand =
  | { type: typeof CLOCK_WORKER_MSG.START; intervalMs?: number }
  | { type: typeof CLOCK_WORKER_MSG.STOP };

let timerId: ReturnType<typeof setInterval> | null = null;

const stopTicker = (): void => {
  if (timerId === null) return;
  clearInterval(timerId);
  timerId = null;
};

self.onmessage = (event: MessageEvent<ClockWorkerCommand>) => {
  const data = event.data;
  if (!data) return;

  if (data.type === CLOCK_WORKER_MSG.START) {
    stopTicker();
    const rawInterval = typeof data.intervalMs === 'number' ? data.intervalMs : DEFAULT_TICK_MS;
    const intervalMs = Math.max(MIN_TICK_MS, rawInterval);
    timerId = setInterval(() => {
      self.postMessage(CLOCK_WORKER_MSG.TICK);
    }, intervalMs);
    return;
  }

  if (data.type === CLOCK_WORKER_MSG.STOP) {
    stopTicker();
  }
};
