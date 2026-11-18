import { useEffect } from 'react';
import { Howler } from 'howler';
import { AUDIO_STORE_CONSTANTS } from '../constants/audioStore';
import { useAudioStore, type AudioStoreState } from '../store/audioStore';

export type UseAudioManagerReturn = Pick<
  AudioStoreState,
  | 'playStatic'
  | 'stopStatic'
  | 'pushTTS'
  | 'processQueue'
  | 'skipCurrentTTS'
  | 'clearTTSQueue'
  | 'ttsQueue'
  | 'isTTSPlaying'
  | 'isStaticReady'
>;

/**
 * Primary hook for triggering static SFX (0ms latency) and dynamic sequential TTS audio.
 */
export const useAudioManager = (): UseAudioManagerReturn => {
  const playStatic = useAudioStore((state) => state.playStatic);
  const stopStatic = useAudioStore((state) => state.stopStatic);
  const pushTTS = useAudioStore((state) => state.pushTTS);
  const processQueue = useAudioStore((state) => state.processQueue);
  const skipCurrentTTS = useAudioStore((state) => state.skipCurrentTTS);
  const clearTTSQueue = useAudioStore((state) => state.clearTTSQueue);
  const ttsQueue = useAudioStore((state) => state.ttsQueue);
  const isTTSPlaying = useAudioStore((state) => state.isTTSPlaying);
  const isStaticReady = useAudioStore((state) => state.isStaticReady);

  return {
    playStatic,
    stopStatic,
    pushTTS,
    processQueue,
    skipCurrentTTS,
    clearTTSQueue,
    ttsQueue,
    isTTSPlaying,
    isStaticReady,
  };
};

/**
 * Mount-once lifecycle hook (used inside `<AudioController />`) that:
 * 1. Preloads all static `.mp3` sounds (`preload: true`) for 0ms latency.
 * 2. Unlocks Howler's WebAudio context on the first user gesture and resumes queued TTS.
 * 3. Cleans up any active TTS stream on unmount.
 */
export const useAudioManagerInit = (): void => {
  const initStaticSounds = useAudioStore((state) => state.initStaticSounds);
  const processQueue = useAudioStore((state) => state.processQueue);
  const clearTTSQueue = useAudioStore((state) => state.clearTTSQueue);

  useEffect(() => {
    initStaticSounds();

    if (typeof window === 'undefined') return undefined;

    const unlockHowlerAudio = (): void => {
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        void Howler.ctx.resume();
      }
      processQueue();
      AUDIO_STORE_CONSTANTS.UNLOCK_GESTURE_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, unlockHowlerAudio);
      });
    };

    AUDIO_STORE_CONSTANTS.UNLOCK_GESTURE_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, unlockHowlerAudio, { once: true });
    });

    return () => {
      AUDIO_STORE_CONSTANTS.UNLOCK_GESTURE_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, unlockHowlerAudio);
      });
      clearTTSQueue();
    };
  }, [initStaticSounds, processQueue, clearTTSQueue]);
};
