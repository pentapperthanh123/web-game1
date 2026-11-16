import { OPS_ALERT_KIND, OPS_ALERT_TIMING } from '../constants/liveOps.js';
import { appendConnectionGap } from '../storage/connectionGapStore.js';
import { OpsAlertService } from './opsAlertService.js';

/**
 * Tracks one TikTok outage at a time: alerts the operator when it lasts too long,
 * logs the gap and sends a recovery note when the connection comes back.
 */

export interface ConnectionDowntimeTracker {
  /** First call of an outage starts the clock; later calls while down are ignored. */
  markDown(reason: string): void;
  /** Connection restored: log the gap, send recovery note if an outage alert went out. */
  markUp(): void;
  /** Intentional disconnect: forget the outage without logging or alerting. */
  cancel(): void;
}

interface DowntimeTrackerDeps {
  opsAlerts: OpsAlertService;
  getUsername: () => string;
  alertAfterMs?: number;
}

interface OutageState {
  since: number;
  reason: string;
  alertTimer: NodeJS.Timeout;
  hasAlerted: boolean;
}

const MS_PER_SECOND = 1000;
const DETAIL_LABEL = {
  CHANNEL: 'Kênh',
  REASON: 'Lý do',
  DURATION_SECONDS: 'Thời gian gián đoạn (giây)',
} as const;

export function createConnectionDowntimeTracker(deps: DowntimeTrackerDeps): ConnectionDowntimeTracker {
  const alertAfterMs = deps.alertAfterMs ?? OPS_ALERT_TIMING.TIKTOK_DOWN_ALERT_MS;
  let outage: OutageState | null = null;

  const describeChannel = (): string => `${DETAIL_LABEL.CHANNEL}: @${deps.getUsername()}`;

  const markDown = (reason: string): void => {
    if (outage) return;
    const startedOutage: OutageState = {
      since: Date.now(),
      reason,
      hasAlerted: false,
      alertTimer: setTimeout(() => {
        startedOutage.hasAlerted = true;
        void deps.opsAlerts.sendOpsAlert(
          OPS_ALERT_KIND.TIKTOK_DOWN_LONG,
          `${describeChannel()}\n${DETAIL_LABEL.REASON}: ${reason}`
        );
      }, alertAfterMs),
    };
    outage = startedOutage;
  };

  const markUp = (): void => {
    if (!outage) return;
    const endedOutage = outage;
    outage = null;
    clearTimeout(endedOutage.alertTimer);

    const now = Date.now();
    const durationMs = now - endedOutage.since;
    appendConnectionGap({
      from: endedOutage.since,
      to: now,
      durationMs,
      reason: endedOutage.reason,
      username: deps.getUsername(),
    });
    if (!endedOutage.hasAlerted) return;
    const durationSeconds = Math.round(durationMs / MS_PER_SECOND);
    void deps.opsAlerts.sendOpsAlert(
      OPS_ALERT_KIND.TIKTOK_RECOVERED,
      `${describeChannel()}\n${DETAIL_LABEL.DURATION_SECONDS}: ${durationSeconds}`
    );
  };

  const cancel = (): void => {
    if (!outage) return;
    clearTimeout(outage.alertTimer);
    outage = null;
  };

  return { markDown, markUp, cancel };
}
