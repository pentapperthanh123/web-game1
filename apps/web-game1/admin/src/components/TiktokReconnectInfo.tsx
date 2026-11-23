import { useEffect, useState } from 'react';
import { COUNTDOWN_TICK_MS, MS_PER_SECOND, TIKTOK_RECONNECT_TEXT } from '../constants/adminAuth';

interface TiktokReconnectInfoProps {
  attempt?: number;
  nextRetryAt?: number;
}

function getSecondsLeft(nextRetryAt: number): number {
  return Math.max(0, Math.ceil((nextRetryAt - Date.now()) / MS_PER_SECOND));
}

function buildReconnectLabel(attempt?: number, nextRetryAt?: number): string {
  const parts: string[] = [];
  if (typeof attempt === 'number') parts.push(`${TIKTOK_RECONNECT_TEXT.ATTEMPT} ${attempt}`);
  if (typeof nextRetryAt === 'number') {
    parts.push(
      `${TIKTOK_RECONNECT_TEXT.RETRY_IN} ${getSecondsLeft(nextRetryAt)}${TIKTOK_RECONNECT_TEXT.SECONDS_SUFFIX}`
    );
  }
  return parts.length > 0 ? `(${parts.join(TIKTOK_RECONNECT_TEXT.SEPARATOR)})` : '';
}

/** Shows "attempt N · retry in Xs" while the server auto-reconnects TikTok. */
export function TiktokReconnectInfo({ attempt, nextRetryAt }: TiktokReconnectInfoProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (typeof nextRetryAt !== 'number') return undefined;
    const timer = setInterval(() => setTick((value) => value + 1), COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, [nextRetryAt]);

  return (
    <span className="text-amber-300 text-[10px] normal-case">{buildReconnectLabel(attempt, nextRetryAt)}</span>
  );
}
