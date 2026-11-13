import { Howl, Howler } from 'howler';
import {
  SFX_CATEGORY_LEVEL,
  SFX_DEFINITIONS,
  SFX_EVENT,
  SfxDefinition,
  SfxEventName,
  SOUND_MANAGER_CONSTANTS,
} from '../constants/sfx';
import { audioService } from './audioService';
import { SFX_FALLBACKS } from './sfxFallbacks';

export interface PlaySoundOptions {
  /** Per-call multiplier on top of the definition volume (0..1). */
  volumeScale?: number;
  /** Per-call playback-rate multiplier (pitch/speed). */
  rateScale?: number;
}

interface SoundChannel {
  definition: SfxDefinition;
  howl: Howl | null;
  sourceIndex: number;
  activeVoiceIds: number[];
  lastPlayedAt: number;
  hasPendingPlay: boolean;
  isExhausted: boolean;
}

const LOG_PREFIX = '[SoundManager]';
const ALL_SFX_EVENTS = Object.values(SFX_EVENT);
const NEVER_PLAYED_AT = Number.NEGATIVE_INFINITY;

const clampVolume = (value: number): number =>
  Math.min(SOUND_MANAGER_CONSTANTS.MAX_VOLUME, Math.max(SOUND_MANAGER_CONSTANTS.MIN_VOLUME, value));

const describeAudioError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const isCrossOriginUrl = (url: string): boolean => {
  if (typeof window === 'undefined') return false;
  return new URL(url, window.location.href).origin !== window.location.origin;
};

const resolveMixedVolume = (definition: SfxDefinition, volumeScale = 1): number =>
  clampVolume(definition.volume * SFX_CATEGORY_LEVEL[definition.category] * volumeScale);

const pickJitteredRate = (rateJitter: number, rateScale: number): number => {
  const jitter = (Math.random() * 2 - 1) * rateJitter;
  return (SOUND_MANAGER_CONSTANTS.DEFAULT_RATE + jitter) * rateScale;
};

const createChannel = (definition: SfxDefinition): SoundChannel => ({
  definition: { ...definition, src: [...definition.src] },
  howl: null,
  sourceIndex: 0,
  activeVoiceIds: [],
  lastPlayedAt: NEVER_PLAYED_AT,
  hasPendingPlay: false,
  isExhausted: definition.src.length === 0,
});

class SoundManager {
  private readonly channels = new Map<SfxEventName, SoundChannel>();
  private appliedMasterVolume: number | null = null;

  constructor() {
    Howler.html5PoolSize = SOUND_MANAGER_CONSTANTS.HTML5_POOL_SIZE;
  }

  /** Fire-and-forget. Safe to call many times per second; overlapping voices are pooled. */
  public playSound(eventName: SfxEventName, options: PlaySoundOptions = {}): void {
    if (!audioService.isAudioEnabled) return;
    if (
      audioService.isCombatMuted &&
      eventName !== SFX_EVENT.VICTORY &&
      eventName !== SFX_EVENT.ROUND_START
    ) {
      return;
    }

    const channel = this.getChannel(eventName);
    if (channel.isExhausted) {
      SFX_FALLBACKS[eventName]();
      return;
    }

    const now = performance.now();
    if (now - channel.lastPlayedAt < channel.definition.throttleMs) return;
    channel.lastPlayedAt = now;

    this.syncMasterVolume();
    const howl = this.ensureHowl(eventName, channel);
    if (howl.state() !== 'loaded') channel.hasPendingPlay = true;

    this.trimVoices(channel, howl);
    const voiceId = howl.play();
    channel.activeVoiceIds.push(voiceId);
    this.applyVoiceSettings(channel.definition, howl, voiceId, options);
    if (channel.definition.duckCombatMs) audioService.duckCombat(channel.definition.duckCombatMs);
  }

  /** Starts downloading sounds ahead of time so the first trigger has no delay. */
  public preload(eventNames: readonly SfxEventName[] = ALL_SFX_EVENTS): void {
    for (const eventName of eventNames) {
      const channel = this.getChannel(eventName);
      if (!channel.isExhausted) this.ensureHowl(eventName, channel);
    }
  }

  /** Points a sound at new file(s) at runtime, e.g. a Myinstants link pasted by an admin. */
  public setSoundSource(eventName: SfxEventName, src: string | readonly string[]): void {
    const sources = typeof src === 'string' ? [src] : [...src];
    this.configureSound(eventName, { src: sources });
  }

  /** Overrides any part of a sound definition (volume, throttle, voices...). */
  public configureSound(eventName: SfxEventName, patch: Partial<SfxDefinition>): void {
    const previous = this.channels.get(eventName);
    previous?.howl?.unload();
    const baseDefinition = previous?.definition ?? SFX_DEFINITIONS[eventName];
    this.channels.set(eventName, createChannel({ ...baseDefinition, ...patch }));
  }

  public stopAll(): void {
    Howler.stop();
  }

  public unloadAll(): void {
    for (const channel of this.channels.values()) {
      channel.howl?.unload();
    }
    this.channels.clear();
  }

  private getChannel(eventName: SfxEventName): SoundChannel {
    const existing = this.channels.get(eventName);
    if (existing) return existing;
    const channel = createChannel(SFX_DEFINITIONS[eventName]);
    this.channels.set(eventName, channel);
    return channel;
  }

  private ensureHowl(eventName: SfxEventName, channel: SoundChannel): Howl {
    if (channel.howl) return channel.howl;
    channel.howl = this.createHowl(eventName, channel);
    return channel.howl;
  }

  private createHowl(eventName: SfxEventName, channel: SoundChannel): Howl {
    const { definition } = channel;
    const sourceUrl = definition.src[channel.sourceIndex];
    const releaseVoice = (voiceId: number) => {
      channel.activeVoiceIds = channel.activeVoiceIds.filter((activeId) => activeId !== voiceId);
    };

    return new Howl({
      src: [sourceUrl],
      // Cross-origin hosts without CORS headers (Myinstants) must stream via HTML5 Audio.
      html5: isCrossOriginUrl(sourceUrl) && !definition.isCorsReady,
      preload: true,
      volume: resolveMixedVolume(definition),
      pool: definition.maxVoices,
      onload: () => {
        channel.hasPendingPlay = false;
      },
      onend: releaseVoice,
      onstop: releaseVoice,
      onloaderror: (_voiceId, error) => this.handleLoadError(eventName, channel, sourceUrl, error),
      onplayerror: (voiceId, error) => {
        releaseVoice(voiceId);
        console.warn(`${LOG_PREFIX} play failed for ${eventName}: ${describeAudioError(error)}`);
      },
    });
  }

  private handleLoadError(
    eventName: SfxEventName,
    channel: SoundChannel,
    failedUrl: string,
    error: unknown
  ): void {
    console.warn(`${LOG_PREFIX} cannot load ${failedUrl} (${eventName}): ${describeAudioError(error)}`);
    channel.howl?.unload();
    channel.howl = null;
    channel.activeVoiceIds = [];
    channel.sourceIndex += 1;

    const shouldReplay = channel.hasPendingPlay;
    channel.hasPendingPlay = false;

    if (channel.sourceIndex >= channel.definition.src.length) {
      channel.isExhausted = true;
      console.warn(`${LOG_PREFIX} all sources failed for ${eventName}; using synth fallback.`);
      if (shouldReplay) SFX_FALLBACKS[eventName]();
      return;
    }

    const nextHowl = this.ensureHowl(eventName, channel);
    if (!shouldReplay) return;
    channel.hasPendingPlay = true;
    channel.activeVoiceIds.push(nextHowl.play());
  }

  /** Caps polyphony per sound: cuts the oldest voice instead of stacking endlessly. */
  private trimVoices(channel: SoundChannel, howl: Howl): void {
    while (channel.activeVoiceIds.length >= channel.definition.maxVoices) {
      const oldestVoiceId = channel.activeVoiceIds.shift();
      if (oldestVoiceId !== undefined) howl.stop(oldestVoiceId);
    }
  }

  private applyVoiceSettings(
    definition: SfxDefinition,
    howl: Howl,
    voiceId: number,
    options: PlaySoundOptions
  ): void {
    const { volumeScale, rateScale = SOUND_MANAGER_CONSTANTS.DEFAULT_RATE } = options;
    if (volumeScale !== undefined) {
      howl.volume(resolveMixedVolume(definition, volumeScale), voiceId);
    }
    if (definition.rateJitter > 0 || rateScale !== SOUND_MANAGER_CONSTANTS.DEFAULT_RATE) {
      howl.rate(pickJitteredRate(definition.rateJitter, rateScale), voiceId);
    }
  }

  /** Follows the master volume of the existing audio settings (HUD). */
  private syncMasterVolume(): void {
    const masterVolume = clampVolume(audioService.volume);
    if (masterVolume === this.appliedMasterVolume) return;
    Howler.volume(masterVolume);
    this.appliedMasterVolume = masterVolume;
  }
}

export const soundManager = new SoundManager();

/**
 * One-liner for components and socket handlers:
 *   playSound(SFX_EVENT.CHAT_POP);
 *   playSound(SFX_EVENT.SKILL_SMITE, { volumeScale: 0.6 });
 */
export const playSound = (eventName: SfxEventName, options?: PlaySoundOptions): void => {
  soundManager.playSound(eventName, options);
};
