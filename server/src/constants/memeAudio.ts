export const MEME_AUDIO_EVENT = {
  ADMIN_TRIGGER: 'admin:trigger_meme',
  CLIENT_PLAY: 'client:play_meme',
} as const;

export interface MemeTriggerPayload {
  soundId: string;
}
