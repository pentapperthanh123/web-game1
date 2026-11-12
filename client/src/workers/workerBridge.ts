import {
  CombatTickMsg,
  CombatResultMsg,
  WORKER_MSG,
} from './workerProtocol';

type CombatResultHandler = (result: CombatResultMsg) => void;

class WorkerBridge {
  private combatWorker: Worker | null = null;
  private onCombatResult: CombatResultHandler | null = null;

  initCombatWorker(handler: CombatResultHandler): void {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    if (!this.combatWorker) {
      try {
        this.combatWorker = new Worker(new URL('./combatWorker.ts', import.meta.url), {
          type: 'module',
        });

        this.combatWorker.onmessage = (e: MessageEvent<CombatResultMsg>) => {
          if (e.data.type === WORKER_MSG.COMBAT_RESULT) {
            this.onCombatResult?.(e.data);
          }
        };
      } catch (err) {
        console.warn('[WorkerBridge] Web Worker init skipped or unsupported:', err);
      }
    }

    this.onCombatResult = handler;
  }

  dispatchCombatTick(msg: CombatTickMsg): void {
    if (!this.combatWorker) return;
    try {
      this.combatWorker.postMessage(msg, [msg.minionStats]);
    } catch (err) {
      console.error('[WorkerBridge] Failed to post message to combat worker:', err);
    }
  }

  terminate(): void {
    this.combatWorker?.terminate();
    this.combatWorker = null;
    this.onCombatResult = null;
  }
}

export const workerBridge = new WorkerBridge();
