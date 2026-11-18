import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { MEME_AUDIO_CONFIG, MEME_AUDIO_EVENT, type MemePlayPayload } from '../../constants/memeAudio';
import { useAudioManagerInit } from '../../hooks/useAudioManager';
import { useSocketSoundEffects } from '../../hooks/useSoundEffects';
import { gameSocket } from '../../services/socket';
import { useGameStore } from '../../store/gameStore';

const isMemePlayPayload = (payload: unknown): payload is MemePlayPayload =>
  typeof payload === 'object' &&
  payload !== null &&
  'soundId' in payload &&
  typeof (payload as Record<string, unknown>).soundId === 'string';

/**
 * Headless Audio Controller mounted at the root of `<App />`:
 * 1. Initializes `useAudioStore` static SFX (`preload: true`, 0ms delay) and dynamic TTS queue lifecycle.
 * 2. Binds Socket.io SFX events (`useSocketSoundEffects`).
 * 3. Listens for manual meme soundboard triggers (`client:play_meme`) and automated Boss Climax Music.
 */
export function AudioController(): null {
  useAudioManagerInit();
  useSocketSoundEffects();

  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);

  // Cached Howl instances for meme sound effects
  const soundCacheRef = useRef<Map<string, Howl>>(new Map());

  // Climax background music state and instance
  const hasPlayedClimaxRef = useRef<boolean>(false);
  const climaxHowlRef = useRef<Howl | null>(null);

  // Helper to play or instantiate a meme Howl
  const playMemeSound = (soundId: string): void => {
    const cleanId = soundId.trim();
    if (!cleanId) return;

    let sound = soundCacheRef.current.get(cleanId);
    if (!sound) {
      sound = new Howl({
        src: [`${MEME_AUDIO_CONFIG.BASE_DIR}${cleanId}${MEME_AUDIO_CONFIG.DEFAULT_EXTENSION}`],
        volume: MEME_AUDIO_CONFIG.DEFAULT_MEME_VOLUME,
        preload: true,
        html5: false,
        onloaderror: (_id, err) => {
          console.warn(`[AudioController] Failed to load meme sound "${cleanId}":`, err);
        },
      });
      soundCacheRef.current.set(cleanId, sound);
    }

    sound.stop();
    sound.play();
  };

  // 1. Manual Socket Listener for Meme triggers from Admin Portal
  useEffect(() => {
    const handlePlayMeme = (payload: unknown): void => {
      if (isMemePlayPayload(payload)) {
        playMemeSound(payload.soundId);
      }
    };

    gameSocket.on(MEME_AUDIO_EVENT.CLIENT_PLAY, handlePlayMeme);

    return () => {
      gameSocket.off(MEME_AUDIO_EVENT.CLIENT_PLAY, handlePlayMeme);
    };
  }, []);

  // 2. Automated Boss Climax Music based on Boss HP ratio
  useEffect(() => {
    const healthRatio = bossMaxHp > 0 ? bossHp / bossMaxHp : 1;

    if (healthRatio >= MEME_AUDIO_CONFIG.CLIMAX_RESET_HP_THRESHOLD) {
      hasPlayedClimaxRef.current = false;
      if (climaxHowlRef.current?.playing()) {
        climaxHowlRef.current.fade(
          climaxHowlRef.current.volume(),
          0,
          MEME_AUDIO_CONFIG.CLIMAX_FADE_RESET_MS
        );
        setTimeout(() => {
          climaxHowlRef.current?.stop();
        }, MEME_AUDIO_CONFIG.CLIMAX_FADE_RESET_MS);
      }
    }

    if (bossHp <= 0 && climaxHowlRef.current?.playing()) {
      climaxHowlRef.current.fade(
        climaxHowlRef.current.volume(),
        0,
        MEME_AUDIO_CONFIG.CLIMAX_FADE_DEFEAT_MS
      );
      setTimeout(() => {
        climaxHowlRef.current?.stop();
      }, MEME_AUDIO_CONFIG.CLIMAX_FADE_DEFEAT_MS);
    }

    const isClimaxCondition =
      healthRatio <= MEME_AUDIO_CONFIG.CLIMAX_HP_THRESHOLD &&
      bossHp > 0 &&
      !hasPlayedClimaxRef.current;

    if (isClimaxCondition) {
      hasPlayedClimaxRef.current = true;

      if (!climaxHowlRef.current) {
        climaxHowlRef.current = new Howl({
          src: [
            `${MEME_AUDIO_CONFIG.BASE_DIR}${MEME_AUDIO_CONFIG.CLIMAX_SOUND_ID}${MEME_AUDIO_CONFIG.DEFAULT_EXTENSION}`,
          ],
          volume: MEME_AUDIO_CONFIG.CLIMAX_MUSIC_VOLUME,
          loop: true,
          html5: true,
          onloaderror: (_id, err) => {
            console.warn('[AudioController] Failed to load climax music:', err);
          },
        });
      }

      climaxHowlRef.current.stop();
      climaxHowlRef.current.volume(MEME_AUDIO_CONFIG.CLIMAX_MUSIC_VOLUME);
      climaxHowlRef.current.play();
    }
  }, [bossHp, bossMaxHp]);

  // 3. Cleanup on unmount to prevent any memory leak
  useEffect(() => {
    return () => {
      if (climaxHowlRef.current) {
        climaxHowlRef.current.stop();
        climaxHowlRef.current.unload();
      }

      soundCacheRef.current.forEach((howl) => {
        howl.stop();
        howl.unload();
      });
      soundCacheRef.current.clear();
    };
  }, []);

  return null;
}
