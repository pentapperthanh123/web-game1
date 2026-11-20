import { Howl } from 'howler';
import { useGameStore } from '../store/gameStore';
import { audioService } from './audioService';
import { VoiceManager } from './caster/VoiceManager';

const AMBIENCE_CONSTANTS = {
  STORAGE_KEY: 'lol_ambience_enabled',
  DEFAULT_VOLUME: 0.20,
  DUCKED_VOLUME: 0.05,
  DUCK_FADE_MS: 150,
  RESTORE_FADE_MS: 350,
  FADE_MS: 1200,
  SYNC_INTERVAL_MS: 1000,
} as const;

let ambienceHowl: Howl | null = null;
let isPlaying = false;
let syncTimerId: number | null = null;
let isCasterSpeaking = false;

const resolveEffectiveVolume = (): number => {
  const baseVol = isCasterSpeaking ? AMBIENCE_CONSTANTS.DUCKED_VOLUME : AMBIENCE_CONSTANTS.DEFAULT_VOLUME;
  return baseVol * audioService.volume;
};

export const setCasterSpeaking = (speaking: boolean): void => {
  if (isCasterSpeaking === speaking) return;
  isCasterSpeaking = speaking;
  if (!ambienceHowl || !isPlaying) return;
  const targetVol = resolveEffectiveVolume();
  const duration = speaking ? AMBIENCE_CONSTANTS.DUCK_FADE_MS : AMBIENCE_CONSTANTS.RESTORE_FADE_MS;
  ambienceHowl.fade(ambienceHowl.volume(), targetVol, duration);
};

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
      volume: resolveEffectiveVolume(),
      preload: true,
      onload: () => {
        if (isPlaying && ambienceHowl) {
          const targetVol = resolveEffectiveVolume();
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
  const targetVol = resolveEffectiveVolume();
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
    const targetVol = resolveEffectiveVolume();
    // Only adjust if the volume is substantially off to avoid interrupting active fades
    if (Math.abs(ambienceHowl.volume() - targetVol) > 0.05) {
      ambienceHowl.volume(targetVol);
    }
  }
};

/** Mount once at startup (main.tsx). */
export const startArenaAmbience = (): void => {
  if (syncTimerId !== null || typeof window === 'undefined') return;
  syncTimerId = window.setInterval(syncAmbience, AMBIENCE_CONSTANTS.SYNC_INTERVAL_MS);

  // Hook voice speaking change for automatic esports-style BGM ducking
  VoiceManager.onSpeakingChange((speaking) => {
    setCasterSpeaking(speaking);
  });

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
