import { CasterRole } from '../../constants/caster';

export interface CasterWarmPayload {
  lang: string;
  texts: string[];
  /** Voice to generate the lines with (each caster has its own); the server defaults to the male voice. */
  role?: CasterRole;
}

type WarmSender = (eventName: string, payload: CasterWarmPayload) => void;

/**
 * Decouples the caster from the socket module (socket.ts already imports the caster director):
 * the socket registers how to send, the director only asks for lines to be warmed.
 */
export const setCasterWarmSender = (_sender: WarmSender): void => {
  return;
};

/** In static audio mode, background TTS synthesis is disabled to avoid unnecessary socket traffic. */
export const requestCasterWarm = (_payload: CasterWarmPayload): void => {
  return;
};
