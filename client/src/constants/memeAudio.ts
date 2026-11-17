export const MEME_AUDIO_EVENT = {
  CLIENT_PLAY: 'client:play_meme',
  ADMIN_TRIGGER: 'admin:trigger_meme',
} as const;

export interface MemePlayPayload {
  soundId: string;
}

export const MEME_AUDIO_CONFIG = {
  BASE_DIR: '/sounds/memes/',
  DEFAULT_EXTENSION: '.mp3',
  CLIMAX_SOUND_ID: 'nhac-cang-thang',
  CLIMAX_HP_THRESHOLD: 0.1, // <= 10%
  CLIMAX_RESET_HP_THRESHOLD: 0.99, // >= 99% or 100%
  DEFAULT_MEME_VOLUME: 0.85,
  CLIMAX_MUSIC_VOLUME: 0.75,
} as const;
