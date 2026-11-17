import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../services/socket';
import { MEME_AUDIO_CONFIG, MEME_AUDIO_EVENT, MemePlayPayload } from '../../constants/memeAudio';

/**
 * Headless controller for Semi-automated Meme Audio & Boss Climax Music.
 * - Manual: Listens for socket event `client:play_meme` and plays audio via Howler.
 * - Automatic: Tracks Boss HP ratio; when <= 10%, triggers tense climax music once per round.
 */
export function AudioController(): null {
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);

  // Cached Howl instances for meme sound effects
  const soundCacheRef = useRef<Map<string, Howl>>(new Map());

  // Climax background music state and instance
  const hasPlayedClimaxRef = useRef<boolean>(false);
  const climaxHowlRef = useRef<Howl | null>(null);

  // Helper to play or instantiate a meme Howl
  const playMemeSound = (soundId: string) => {
    const cleanId = soundId.trim();
    if (!cleanId) return;

    let sound = soundCacheRef.current.get(cleanId);
    if (!sound) {
      sound = new Howl({
        src: [`${MEME_AUDIO_CONFIG.BASE_DIR}${cleanId}${MEME_AUDIO_CONFIG.DEFAULT_EXTENSION}`],
        volume: MEME_AUDIO_CONFIG.DEFAULT_MEME_VOLUME,
        html5: false,
        onloaderror: (_id, err) => {
          console.warn(`[AudioController] Failed to load meme sound "${cleanId}":`, err);
        },
      });
      soundCacheRef.current.set(cleanId, sound);
    }

    // Restart and play sound immediately
    sound.stop();
    sound.play();
  };

  // 1. Manual Socket Listener for Meme triggers from Admin Portal
  useEffect(() => {
    const handlePlayMeme = (payload: unknown) => {
      if (
        payload &&
        typeof payload === 'object' &&
        'soundId' in payload &&
        typeof (payload as MemePlayPayload).soundId === 'string'
      ) {
        playMemeSound((payload as MemePlayPayload).soundId);
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

    // Sang ván mới hoặc Boss hồi đầy máu (>= 99% / 100%): reset cờ để chuẩn bị cho ván tiếp theo
    if (healthRatio >= MEME_AUDIO_CONFIG.CLIMAX_RESET_HP_THRESHOLD) {
      hasPlayedClimaxRef.current = false;
      if (climaxHowlRef.current?.playing()) {
        climaxHowlRef.current.fade(climaxHowlRef.current.volume(), 0, 600);
        setTimeout(() => {
          climaxHowlRef.current?.stop();
        }, 600);
      }
    }

    // Boss bị hạ gục (hp <= 0): dừng nhạc kịch tính
    if (bossHp <= 0 && climaxHowlRef.current?.playing()) {
      climaxHowlRef.current.fade(climaxHowlRef.current.volume(), 0, 400);
      setTimeout(() => {
        climaxHowlRef.current?.stop();
      }, 400);
    }

    // Boss còn <= 10% HP và cờ hasPlayedClimax đang là false: tự động phát nhạc kịch tính
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
          html5: true, // Non-blocking streaming for soundtrack
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
      // Stop and unload climax music
      if (climaxHowlRef.current) {
        climaxHowlRef.current.stop();
        climaxHowlRef.current.unload();
      }

      // Stop and unload all cached meme SFX
      soundCacheRef.current.forEach((howl) => {
        howl.stop();
        howl.unload();
      });
      soundCacheRef.current.clear();
    };
  }, []);

  return null;
}
