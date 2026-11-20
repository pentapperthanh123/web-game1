import { BACKGROUND_PERF_CONSTANTS, GAME_CONSTANTS } from '../constants/game';

export type CancelTimer = () => void;

export interface AdaptiveFrameLoop {
  start: () => void;
  stop: () => void;
}

interface ScheduledTask {
  id: number;
  callback: () => void;
  dueAt: number;
  intervalMs: number | null;
  isCancelled: boolean;
}

const CLOCK_WORKER_CMD = {
  START: 'START',
  TICK: 'TICK',
} as const;

const tasks = new Map<number, ScheduledTask>();
const pendingImmediate = new Map<number, () => void>();
const renderTickListeners = new Set<(perfNow: number) => void>();

let nextTaskId = 1;
let isInitialized = false;
let isKeepaliveRequested = false;
let clockWorker: Worker | null = null;
let fallbackIntervalId: ReturnType<typeof setInterval> | null = null;
let immediateChannel: MessageChannel | null = null;
let lastNativeRafAt = typeof performance !== 'undefined' ? performance.now() : 0;

const runDueTasks = (now: number): void => {
  if (tasks.size === 0) return;

  const dueTasks: ScheduledTask[] = [];
  for (const task of tasks.values()) {
    if (!task.isCancelled && now >= task.dueAt) {
      dueTasks.push(task);
    }
  }

  for (let i = 0; i < dueTasks.length; i += 1) {
    const task = dueTasks[i];
    if (task.isCancelled) continue;

    if (task.intervalMs !== null) {
      // Advance schedule ahead of execution so slow callbacks do not pile up synchronously
      task.dueAt = now + task.intervalMs;
    } else {
      tasks.delete(task.id);
    }

    try {
      task.callback();
    } catch (error) {
      console.error('[workerScheduler] Scheduled callback failed:', error);
    }
  }
};

const emitRenderTicks = (now: number): void => {
  if (renderTickListeners.size === 0) return;
  const listeners = Array.from(renderTickListeners);
  for (let i = 0; i < listeners.length; i += 1) {
    try {
      listeners[i](now);
    } catch (error) {
      console.error('[workerScheduler] Render tick listener failed:', error);
    }
  }
};

const handleClockHeartbeat = (): void => {
  const now = performance.now();
  runDueTasks(now);
  emitRenderTicks(now);
};

const acquireKeepaliveLock = (): void => {
  if (isKeepaliveRequested) return;
  isKeepaliveRequested = true;

  if (typeof navigator === 'undefined' || !navigator.locks?.request) return;
  try {
    void navigator.locks
      .request(
        BACKGROUND_PERF_CONSTANTS.KEEPALIVE_LOCK_NAME,
        () => new Promise<void>(() => undefined)
      )
      .catch(() => undefined);
  } catch {
    // Web Locks unsupported or denied in restricted context
  }
};

const ensureImmediateChannel = (): MessageChannel | null => {
  if (immediateChannel) return immediateChannel;
  if (typeof MessageChannel === 'undefined') return null;

  immediateChannel = new MessageChannel();
  immediateChannel.port1.onmessage = (event: MessageEvent<number>) => {
    const taskId = event.data;
    const callback = pendingImmediate.get(taskId);
    if (!callback) return;
    pendingImmediate.delete(taskId);
    try {
      callback();
    } catch (error) {
      console.error('[workerScheduler] Immediate task failed:', error);
    }
  };
  return immediateChannel;
};

const ensureSchedulerInitialized = (): void => {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  acquireKeepaliveLock();
  ensureImmediateChannel();

  if (typeof Worker !== 'undefined') {
    try {
      clockWorker = new Worker(new URL('../workers/clockWorker.ts', import.meta.url), {
        type: 'module',
      });
      clockWorker.onmessage = (event: MessageEvent<string>) => {
        if (event.data === CLOCK_WORKER_CMD.TICK) {
          handleClockHeartbeat();
        }
      };
      clockWorker.postMessage({
        type: CLOCK_WORKER_CMD.START,
        intervalMs: BACKGROUND_PERF_CONSTANTS.WORKER_TICK_MS,
      });
      return;
    } catch (error) {
      console.warn('[workerScheduler] Falling back to window.setInterval:', error);
      clockWorker = null;
    }
  }

  fallbackIntervalId = window.setInterval(
    handleClockHeartbeat,
    BACKGROUND_PERF_CONSTANTS.WORKER_TICK_MS
  );
};

export const notifyNativeRafTick = (perfNow = performance.now()): void => {
  lastNativeRafAt = perfNow;
};

export const isPageHidden = (): boolean =>
  typeof document !== 'undefined' && document.hidden;

export const isRenderThrottled = (perfNow = performance.now()): boolean =>
  isPageHidden() ||
  perfNow - lastNativeRafAt >= BACKGROUND_PERF_CONSTANTS.RAF_STALL_THRESHOLD_MS;

export const workerSetTimeout = (callback: () => void, delayMs: number): CancelTimer => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  ensureSchedulerInitialized();

  const id = nextTaskId;
  nextTaskId += 1;

  if (delayMs <= 0) {
    const channel = ensureImmediateChannel();
    if (channel) {
      pendingImmediate.set(id, callback);
      channel.port2.postMessage(id);
      return () => {
        pendingImmediate.delete(id);
      };
    }
    const timer = window.setTimeout(callback, 0);
    return () => window.clearTimeout(timer);
  }

  const task: ScheduledTask = {
    id,
    callback,
    dueAt: performance.now() + delayMs,
    intervalMs: null,
    isCancelled: false,
  };
  tasks.set(id, task);

  return () => {
    task.isCancelled = true;
    tasks.delete(id);
  };
};

export const workerSetInterval = (callback: () => void, intervalMs: number): CancelTimer => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  ensureSchedulerInitialized();

  const id = nextTaskId;
  nextTaskId += 1;
  const safeInterval = Math.max(1, intervalMs);
  const task: ScheduledTask = {
    id,
    callback,
    dueAt: performance.now() + safeInterval,
    intervalMs: safeInterval,
    isCancelled: false,
  };
  tasks.set(id, task);

  return () => {
    task.isCancelled = true;
    tasks.delete(id);
  };
};

export const subscribeWorkerRenderTick = (
  callback: (perfNow: number) => void
): CancelTimer => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  ensureSchedulerInitialized();
  renderTickListeners.add(callback);
  return () => {
    renderTickListeners.delete(callback);
  };
};

/**
 * Runs a render loop locked to TARGET_FPS (30 FPS) via requestAnimationFrame when
 * foregrounded, seamlessly continuing via the Web Worker clock when hidden or occluded.
 */
export const createAdaptiveFrameLoop = (
  onFrame: (nowMs: number, perfNow: number) => boolean
): AdaptiveFrameLoop => {
  let isRunning = false;
  let rafId: number | null = null;
  let unsubWorker: CancelTimer | null = null;
  let lastFrameAt = 0;
  let hasRenderedFirstFrame = false;

  const minFrameStepMs =
    1000 / GAME_CONSTANTS.RENDER.TARGET_FPS - BACKGROUND_PERF_CONSTANTS.FRAME_GAP_TOLERANCE_MS;

  const stop = (): void => {
    isRunning = false;
    hasRenderedFirstFrame = false;
    if (rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
    }
    rafId = null;
    if (unsubWorker) {
      unsubWorker();
      unsubWorker = null;
    }
  };

  const executeFrame = (perfNow: number): boolean => {
    lastFrameAt = perfNow;
    hasRenderedFirstFrame = true;
    const shouldContinue = onFrame(Date.now(), perfNow);
    if (!shouldContinue) {
      stop();
    }
    return shouldContinue;
  };

  const handleRaf = (rafPerfNow: number): void => {
    rafId = null;
    if (!isRunning) return;
    notifyNativeRafTick(rafPerfNow);

    const isDue = !hasRenderedFirstFrame || rafPerfNow - lastFrameAt >= minFrameStepMs;
    if (isDue && !executeFrame(rafPerfNow)) return;

    if (!isPageHidden() && typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(handleRaf);
    }
  };

  const handleWorkerTick = (perfNow: number): void => {
    if (!isRunning) return;

    // Foreground recovered: re-arm native rAF if it had paused while hidden
    if (!isPageHidden() && rafId === null && typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(handleRaf);
    }

    const elapsedSinceFrame = hasRenderedFirstFrame
      ? perfNow - lastFrameAt
      : Number.POSITIVE_INFINITY;
    const stallBase = hasRenderedFirstFrame ? lastFrameAt : lastNativeRafAt;
    const isStalled =
      isPageHidden() ||
      perfNow - stallBase >= BACKGROUND_PERF_CONSTANTS.RAF_STALL_THRESHOLD_MS;
    if (!isStalled || elapsedSinceFrame < minFrameStepMs) return;

    executeFrame(perfNow);
  };

  const start = (): void => {
    if (isRunning) return;
    isRunning = true;
    hasRenderedFirstFrame = false;
    lastFrameAt = 0;

    if (!unsubWorker) {
      unsubWorker = subscribeWorkerRenderTick(handleWorkerTick);
    }
    if (!isPageHidden() && rafId === null && typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(handleRaf);
    }
  };

  return { start, stop };
};

export const disposeWorkerScheduler = (): void => {
  tasks.clear();
  pendingImmediate.clear();
  renderTickListeners.clear();
  if (clockWorker) {
    clockWorker.terminate();
    clockWorker = null;
  }
  if (fallbackIntervalId !== null) {
    clearInterval(fallbackIntervalId);
    fallbackIntervalId = null;
  }
  if (immediateChannel) {
    immediateChannel.port1.close();
    immediateChannel.port2.close();
    immediateChannel = null;
  }
  isInitialized = false;
};
