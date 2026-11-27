export interface BackgroundTickerHandle {
  stop: () => void;
}

/**
 * Starts a timer backed by a Blob Web Worker (with main-thread `setInterval` fallback)
 * so intervals are not paused or heavily throttled when browser tabs are inactive.
 */
export function startBackgroundTicker(
  intervalMs: number,
  onTick: () => void
): BackgroundTickerHandle {
  const safeIntervalMs = Math.max(16, Math.round(intervalMs));

  if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
    let blobUrl: string | null = null;
    try {
      const workerCode = `setInterval(function(){postMessage(0);},${safeIntervalMs});`;
      blobUrl = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
      const worker = new Worker(blobUrl);
      worker.onmessage = () => onTick();

      return {
        stop: () => {
          worker.terminate();
          if (blobUrl) {
            try {
              URL.revokeObjectURL(blobUrl);
            } catch {
              // Ignore revoke errors
            }
            blobUrl = null;
          }
        },
      };
    } catch {
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          // Ignore revoke errors
        }
      }
    }
  }

  const timer = setInterval(onTick, safeIntervalMs);
  return {
    stop: () => clearInterval(timer),
  };
}
