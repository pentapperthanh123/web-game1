import { Howl } from 'howler';
import { useGameStore } from '../store/gameStore';
import { audioService } from './audioService';

const AMBIENCE_CONSTANTS = {
  STORAGE_KEY: 'lol_ambience_enabled',
  DEFAULT_VOLUME: 0.45,
  FADE_MS: 1200,
  SYNC_INTERVAL_MS: 1000,
} as const;

let ambienceHowl: Howl | null = null;
let isPlaying = false;
let syncTimerId: number | null = null;

const readStoredPreference = (): boolean => {
  try {
    return localStorage.getItem(AMBIENCE_CONSTANTS.STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

let isAmbienceEnabled = readStoredPreference();

export const getIsAmbienceEnabled = (): boolean => isAmbienceEnabled;

export const setIsAmbienceEnabled = (isEnabled: boolean): void => {
  isAmbienceEnabled = isEnabled;
  try {
    localStorage.setItem(AMBIENCE_CONSTANTS.STORAGE_KEY, String(isEnabled));
  } catch (error) {
    console.warn('[ArenaAmbience] cannot persist preference:', error);
  }
  syncAmbience();
};

const getAmbienceHowl = (): Howl => {
  if (!ambienceHowl) {
    ambienceHowl = new Howl({
      src: ['/sfx/ARENA_AMBIENCE.mp3'],
      loop: true,
      html5: false, // Use Web Audio API for seamless loop and reliable autoplay
      volume: AMBIENCE_CONSTANTS.DEFAULT_VOLUME * audioService.volume,
      preload: true,
      onload: () => {
        if (isPlaying && ambienceHowl) {
          const targetVol = AMBIENCE_CONSTANTS.DEFAULT_VOLUME * audioService.volume;
          ambienceHowl.volume(targetVol);
        }
      },
      onloaderror: (_id, err) => {
        console.warn('[ArenaAmbience] Failed to load /sfx/ARENA_AMBIENCE.mp3:', err);
      },
    });
  }
  return ambienceHowl;
};

const startBed = (): void => {
  if (isPlaying) return;
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    void Howler.ctx.resume();
  }
  const howl = getAmbienceHowl();
  const targetVol = AMBIENCE_CONSTANTS.DEFAULT_VOLUME * audioService.volume;
  isPlaying = true;
  if (howl.state() === 'loaded') {
    howl.volume(0);
    const soundId = howl.play();
    howl.fade(0, targetVol, AMBIENCE_CONSTANTS.FADE_MS, soundId);
  } else {
    howl.volume(targetVol);
    howl.play();
  }
};

const stopBed = (): void => {
  if (!isPlaying || !ambienceHowl) return;
  const howl = ambienceHowl;
  isPlaying = false;
  howl.fade(howl.volume(), 0, AMBIENCE_CONSTANTS.FADE_MS);
  setTimeout(() => {
    if (!isPlaying) {
      howl.stop();
    }
  }, AMBIENCE_CONSTANTS.FADE_MS);
};

export const syncAmbience = (): void => {
  const isSilverScrapes = useGameStore.getState().silverScrapesState.isActive;
  // Ambience bed plays in queue/holding and active rounds, but pauses during 1v1 Silver Scrapes duel
  const shouldPlay = isAmbienceEnabled && audioService.isAudioEnabled && !isSilverScrapes;

  if (!shouldPlay) {
    if (isPlaying) stopBed();
    return;
  }

  if (!isPlaying) {
    startBed();
  } else if (ambienceHowl) {
    const targetVol = AMBIENCE_CONSTANTS.DEFAULT_VOLUME * audioService.volume;
    ambienceHowl.volume(targetVol);
  }
};

/** Mount once at startup (main.tsx). */
export const startArenaAmbience = (): void => {
  if (syncTimerId !== null || typeof window === 'undefined') return;
  syncTimerId = window.setInterval(syncAmbience, AMBIENCE_CONSTANTS.SYNC_INTERVAL_MS);

  // Resume or start on first user interaction in case the browser blocked autoplay
  const handleInteraction = (): void => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      void Howler.ctx.resume();
    }
    syncAmbience();
  };
  window.addEventListener('pointerdown', handleInteraction, { once: true });
  window.addEventListener('keydown', handleInteraction, { once: true });

  // Initial synchronization check
  syncAmbience();
};
