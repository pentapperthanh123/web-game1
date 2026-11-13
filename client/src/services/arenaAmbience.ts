import { BossArchetype, GAME_THEME, THEME_CONFIGS } from '../constants/game';
import { useGameStore } from '../store/gameStore';
import { audioService } from './audioService';

/**
 * Low ambient bed under the fight, voiced per boss archetype: filtered noise (wind / cavern air)
 * plus two detuned low drones with a slow filter sweep. Synthesised, so there is no file to fail.
 * Sits on the COMBAT bus, so every stinger ducks it automatically.
 */
interface AmbienceVoice {
  droneHz: readonly [number, number];
  noiseBandHz: number;
  filterSweepHz: number;
}

const AMBIENCE_VOICES: Readonly<Record<BossArchetype, AmbienceVoice>> = {
  BARON: { droneHz: [55, 55.6], noiseBandHz: 320, filterSweepHz: 140 },
  DRAGON: { droneHz: [65.4, 66.1], noiseBandHz: 520, filterSweepHz: 260 },
  HERALD: { droneHz: [73.4, 74.2], noiseBandHz: 700, filterSweepHz: 220 },
};

const AMBIENCE_CONSTANTS = {
  /** About -24 dB relative to full scale before the master volume. */
  BED_GAIN: 0.063,
  NOISE_GAIN: 0.55,
  DRONE_GAIN: 0.35,
  DRONE_FILTER_HZ: 420,
  NOISE_Q: 0.8,
  LFO_HZ: 0.07,
  FADE_IN_S: 2.5,
  FADE_OUT_S: 1.2,
  SYNC_INTERVAL_MS: 1000,
  NOISE_SECONDS: 2,
  STORAGE_KEY: 'lol_ambience_enabled',
} as const;

interface PlayingBed {
  archetype: BossArchetype;
  masterGain: GainNode;
  sources: AudioScheduledSourceNode[];
}

let playingBed: PlayingBed | null = null;
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

const createNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  const length = Math.round(ctx.sampleRate * AMBIENCE_CONSTANTS.NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) channel[i] = Math.random() * 2 - 1;
  return buffer;
};

const startBed = (archetype: BossArchetype): void => {
  const output = audioService.getCombatOutput();
  if (!output) return;
  const { ctx, node } = output;
  const voice = AMBIENCE_VOICES[archetype];
  const now = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(AMBIENCE_CONSTANTS.BED_GAIN, now + AMBIENCE_CONSTANTS.FADE_IN_S);
  masterGain.connect(node);

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx);
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = voice.noiseBandHz;
  noiseFilter.Q.value = AMBIENCE_CONSTANTS.NOISE_Q;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = AMBIENCE_CONSTANTS.NOISE_GAIN;
  noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);

  const droneFilter = ctx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = AMBIENCE_CONSTANTS.DRONE_FILTER_HZ;
  const droneGain = ctx.createGain();
  droneGain.gain.value = AMBIENCE_CONSTANTS.DRONE_GAIN;
  droneFilter.connect(droneGain).connect(masterGain);
  const drones = voice.droneHz.map((frequency) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = frequency;
    oscillator.connect(droneFilter);
    return oscillator;
  });

  // Slow sweep of the noise band makes the bed breathe instead of hiss
  const lfo = ctx.createOscillator();
  lfo.frequency.value = AMBIENCE_CONSTANTS.LFO_HZ;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = voice.filterSweepHz;
  lfo.connect(lfoDepth).connect(noiseFilter.frequency);

  const sources: AudioScheduledSourceNode[] = [noise, lfo, ...drones];
  sources.forEach((source) => source.start(now));
  playingBed = { archetype, masterGain, sources };
};

const stopBed = (): void => {
  const bed = playingBed;
  if (!bed) return;
  playingBed = null;
  const ctx = bed.masterGain.context;
  const now = ctx.currentTime;
  bed.masterGain.gain.cancelScheduledValues(now);
  bed.masterGain.gain.setValueAtTime(bed.masterGain.gain.value, now);
  bed.masterGain.gain.linearRampToValueAtTime(0, now + AMBIENCE_CONSTANTS.FADE_OUT_S);
  bed.sources.forEach((source) => source.stop(now + AMBIENCE_CONSTANTS.FADE_OUT_S));
};

const resolveArchetype = (): BossArchetype => {
  const theme = useGameStore.getState().gameTheme;
  return (THEME_CONFIGS[theme] ?? THEME_CONFIGS[GAME_THEME.BARON]).archetype;
};

/** Starts, stops or re-voices the bed to match audio settings and the current boss. */
function syncAmbience(): void {
  const shouldPlay = isAmbienceEnabled && audioService.isAudioEnabled && !audioService.isCombatMuted;
  if (!shouldPlay) {
    stopBed();
    return;
  }
  const archetype = resolveArchetype();
  if (playingBed?.archetype === archetype) return;
  stopBed();
  startBed(archetype);
}

/** Mount once at startup (main.tsx). */
export const startArenaAmbience = (): void => {
  if (syncTimerId !== null || typeof window === 'undefined') return;
  syncTimerId = window.setInterval(syncAmbience, AMBIENCE_CONSTANTS.SYNC_INTERVAL_MS);
};
