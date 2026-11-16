import { CASTER_WARM } from '../../constants/caster';

export interface CasterWarmPayload {
  lang: string;
  texts: string[];
}

type WarmSender = (eventName: string, payload: CasterWarmPayload) => void;

/**
 * Decouples the caster from the socket module (socket.ts already imports the caster director):
 * the socket registers how to send, the director only asks for lines to be warmed.
 */
let warmSender: WarmSender | null = null;
let pendingPayload: CasterWarmPayload | null = null;

export const setCasterWarmSender = (sender: WarmSender): void => {
  warmSender = sender;
  if (!pendingPayload) return;
  sender(CASTER_WARM.SOCKET_EVENT, pendingPayload);
  pendingPayload = null;
};

/** Asks the server to generate these lines in the background (sent once the socket is connected). */
export const requestCasterWarm = (payload: CasterWarmPayload): void => {
  const trimmed = { ...payload, texts: payload.texts.slice(0, CASTER_WARM.MAX_TEXTS) };
  if (!warmSender) {
    pendingPayload = trimmed;
    return;
  }
  warmSender(CASTER_WARM.SOCKET_EVENT, trimmed);
};
