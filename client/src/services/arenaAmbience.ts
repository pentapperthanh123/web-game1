import { Howl } from 'howler';
import { useGameStore } from '../store/gameStore';
import { audioService } from './audioService';

const AMBIENCE_CONSTANTS = {
  STORAGE_KEY: 'lol_ambience_enabled',
  DEFAULT_VOLUME: 0.35,
  FADE_MS: 1500,
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
      html5: true,
      volume: AMBIENCE_CONSTANTS.DEFAULT_VOLUME * audioService.volume,
      preload: true,
      onloaderror: (_id, err) => {
        console.warn('[ArenaAmbience] Failed to load /sfx/ARENA_AMBIENCE.mp3:', err);
      },
    });
  }
  return ambienceHowl;
};

const startBed = (): void => {
  if (isPlaying) return;
  const howl = getAmbienceHowl();
  const targetVol = AMBIENCE_CONSTANTS.DEFAULT_VOLUME * audioService.volume;
  howl.volume(0);
  howl.play();
  howl.fade(0, targetVol, AMBIENCE_CONSTANTS.FADE_MS);
  isPlaying = true;
};

const stopBed = (): void => {
  if (!isPlaying || !ambienceHowl) return;
  const howl = ambienceHowl;
  howl.fade(howl.volume(), 0, AMBIENCE_CONSTANTS.FADE_MS);
  setTimeout(() => {
    if (!isPlaying) {
      howl.stop();
    }
  }, AMBIENCE_CONSTANTS.FADE_MS);
  isPlaying = false;
};

export const syncAmbience = (): void => {
  const isSilverScrapes = useGameStore.getState().silverScrapesState.isActive;
  const shouldPlay =
    isAmbienceEnabled &&
    audioService.isAudioEnabled &&
    !audioService.isCombatMuted &&
    !isSilverScrapes;

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
};
