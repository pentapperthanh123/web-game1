import {
  OPS_ALERT_DEFAULT_INSTANCE_NAME,
  OPS_ALERT_ENV,
  OPS_ALERT_FAILURE,
  OPS_ALERT_MESSAGES,
  OPS_ALERT_TIMING,
  OpsAlertFailure,
  OpsAlertKind,
  TELEGRAM_API_BASE_URL,
  UNSUPPRESSED_OPS_ALERT_KINDS,
} from '../constants/liveOps.js';
import { getErrorMessage } from '../utils/payloadSanitizers.js';

/**
 * Operator alerts over Telegram (spec 6.2). With no bot token / chat id configured the service
 * only logs locally. Sending never throws; the bot token is never logged.
 */

export interface OpsAlertResult {
  isDelivered: boolean;
  failure?: OpsAlertFailure;
}

export interface OpsAlertService {
  readonly isConfigured: boolean;
  sendOpsAlert(kind: OpsAlertKind, detail?: string): Promise<OpsAlertResult>;
}

interface TelegramSettings {
  botToken: string;
  chatId: string;
  instanceName: string;
}

const ALERT_TIME_LOCALE = 'vi-VN';
const HTTP_METHOD_POST = 'POST';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const LINE_BREAKS = /\n/g;
const LOG_LINE_SEPARATOR = ' | ';

const readTelegramSettings = (env: NodeJS.ProcessEnv): TelegramSettings => ({
  botToken: (env[OPS_ALERT_ENV.BOT_TOKEN] ?? '').trim(),
  chatId: (env[OPS_ALERT_ENV.CHAT_ID] ?? '').trim(),
  instanceName: (env[OPS_ALERT_ENV.INSTANCE_NAME] ?? '').trim() || OPS_ALERT_DEFAULT_INSTANCE_NAME,
});

const buildAlertText = (settings: TelegramSettings, kind: OpsAlertKind, detail?: string): string => {
  const lines = [`[${settings.instanceName}] ${OPS_ALERT_MESSAGES[kind]}`];
  if (detail) lines.push(detail);
  lines.push(new Date().toLocaleString(ALERT_TIME_LOCALE, { hour12: false }));
  return lines.join('\n');
};

const postTelegramMessage = async (settings: TelegramSettings, text: string): Promise<boolean> => {
  const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${settings.botToken}/sendMessage`, {
    method: HTTP_METHOD_POST,
    headers: JSON_HEADERS,
    body: JSON.stringify({ chat_id: settings.chatId, text }),
    signal: AbortSignal.timeout(OPS_ALERT_TIMING.REQUEST_TIMEOUT_MS),
  });
  return response.ok;
};

export function createOpsAlertService(env: NodeJS.ProcessEnv = process.env): OpsAlertService {
  const settings = readTelegramSettings(env);
  const isConfigured = settings.botToken.length > 0 && settings.chatId.length > 0;
  const lastSentAtByKind = new Map<OpsAlertKind, number>();

  if (!isConfigured) {
    console.warn(
      `[OpsAlert] Telegram not configured (${OPS_ALERT_ENV.BOT_TOKEN} / ${OPS_ALERT_ENV.CHAT_ID}). Alerts are logged only.`
    );
  }

  const isSuppressed = (kind: OpsAlertKind, now: number): boolean => {
    if (UNSUPPRESSED_OPS_ALERT_KINDS.has(kind)) return false;
    const lastSentAt = lastSentAtByKind.get(kind);
    return lastSentAt !== undefined && now - lastSentAt < OPS_ALERT_TIMING.REPEAT_SUPPRESS_MS;
  };

  const sendOpsAlert = async (kind: OpsAlertKind, detail?: string): Promise<OpsAlertResult> => {
    const now = Date.now();
    if (isSuppressed(kind, now)) return { isDelivered: false, failure: OPS_ALERT_FAILURE.SUPPRESSED };
    lastSentAtByKind.set(kind, now);

    const text = buildAlertText(settings, kind, detail);
    console.warn(`[OpsAlert] ${kind}: ${text.replace(LINE_BREAKS, LOG_LINE_SEPARATOR)}`);
    if (!isConfigured) return { isDelivered: false, failure: OPS_ALERT_FAILURE.NOT_CONFIGURED };

    try {
      const isDelivered = await postTelegramMessage(settings, text);
      if (isDelivered) return { isDelivered: true };
      console.error(`[OpsAlert] Telegram rejected alert ${kind}.`);
    } catch (err: unknown) {
      console.error(`[OpsAlert] Could not send alert ${kind}:`, getErrorMessage(err, 'unknown error'));
    }
    return { isDelivered: false, failure: OPS_ALERT_FAILURE.REQUEST_FAILED };
  };

  return { isConfigured, sendOpsAlert };
}
