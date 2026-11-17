import { CASTER_SPEECH } from '../../constants/caster';
import { useCasterStore } from '../../store/casterStore';
import { audioService } from '../audioService';
import { soundManager } from '../soundManager';
import { toVoiceText } from './casterVoiceText';

/** How a spoken line ended; only FAILED counts toward the suspend threshold. */
export const SPEECH_OUTCOME = {
  SPOKEN: 'SPOKEN',
  /** Browser refused autoplay (needs one click); the queue keeps the line until then. OBS never does this. */
  AUTOPLAY_BLOCKED: 'AUTOPLAY_BLOCKED',
  /** Voice switched off on the server or text rejected by the filter. */
  REJECTED: 'REJECTED',
  /** Cut by a higher-priority line. */
  INTERRUPTED: 'INTERRUPTED',
  /** Network/provider error or watchdog timeout. */
  FAILED: 'FAILED',
  /** Engine suspended after repeated failures; caller shows the subtitle only. */
  SUSPENDED: 'SUSPENDED',
  /** The voice service had no clip in time for this line (flaky provider): caption only, engine stays on. */
  UNAVAILABLE: 'UNAVAILABLE',
  /** The clip arrived after the line's deadline (slow voice server): skipped so later lines stay on time. */
  EXPIRED: 'EXPIRED',
} as const;
export type SpeechOutcome = (typeof SPEECH_OUTCOME)[keyof typeof SPEECH_OUTCOME];

class ClipRejectedError extends Error {}
class ClipUnavailableError extends Error {}

const waitForClip = (clip: Promise<string>): Promise<string> =>
  Promise.race([
    clip,
    new Promise<string>((_, reject) => {
      setTimeout(() => reject(new ClipUnavailableError('clip not ready in time')), CASTER_SPEECH.CLIP_WAIT_MS);
    }),
  ]);

const LOG_PREFIX = '[CasterVoice]';
const AUTOPLAY_ERROR_NAME = 'NotAllowedError';
const GESTURE_EVENTS = ['pointerdown', 'keydown'] as const;

/** Media events after which the clip length may (newly) be known; some MP3s report it late. */
const FIT_RATE_EVENTS = ['loadedmetadata', 'durationchange', 'playing'] as const;

/** Playback rate that makes the rest of the clip end by the deadline (1 when it already fits, capped). */
const fitToDeadline = (audio: HTMLAudioElement, deadlineAt: number): void => {
  const remainingMs = (audio.duration - audio.currentTime) * 1000;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return;
  const availableMs = deadlineAt - Date.now();
  const neededRate = availableMs > 0 ? remainingMs / availableMs : CASTER_SPEECH.MAX_FIT_RATE;
  audio.playbackRate = Math.min(CASTER_SPEECH.MAX_FIT_RATE, Math.max(CASTER_SPEECH.NORMAL_RATE, neededRate));
};

/** The voice gets the spoken form of the caption (scores, abbreviations); see casterVoiceText. */
const buildClipUrl = (text: string, lang: string, role?: string, intensity?: string): string => {
  const params: Record<string, string> = {
    text: toVoiceText(text),
    lang,
  };
  if (role) params.role = role;
  if (intensity) params.intensity = intensity;
  return `${CASTER_SPEECH.ROUTE}?${new URLSearchParams(params).toString()}`;
};

/**
 * Plays caster lines from the server TTS route (works in OBS without any installed voice).
 * One line at a time; the presentation queue decides what plays next.
 */
class CasterSpeechEngine {
  private readonly clipUrls = new Map<string, Promise<string>>();
  private currentAudio: HTMLAudioElement | null = null;
  private finishCurrent: ((outcome: SpeechOutcome) => void) | null = null;
  private currentDonateAudio: HTMLAudioElement | null = null;
  private finishCurrentDonate: ((outcome: SpeechOutcome) => void) | null = null;
  private consecutiveFailures = 0;
  private suspendedUntil = 0;
  private isWaitingForGesture = false;
  private unlockWaiters: Array<() => void> = [];

  /** True until the page gets its first click in a browser tab that refused autoplay. */
  public isLocked(): boolean {
    return this.isWaitingForGesture;
  }

  /** Resolves once audio may play (immediately when it already can). */
  public whenUnlocked(): Promise<void> {
    if (!this.isWaitingForGesture) return Promise.resolve();
    return new Promise<void>((resolve) => this.unlockWaiters.push(resolve));
  }

  public isSuspended(now: number): boolean {
    return now < this.suspendedUntil;
  }

  /** Starts downloading a clip early so a high-priority line starts without delay. */
  public prefetch(text: string, lang: string, role?: string, intensity?: string): void {
    this.getClipUrl(text, lang, role, intensity).catch(() => undefined);
  }

  /** Resolves once the clip is downloaded (true) or could not be (false), so a caller can still cancel before it plays. */
  public prepare(text: string, lang: string, role?: string, intensity?: string): Promise<boolean> {
    return waitForClip(this.getClipUrl(text, lang, role, intensity)).then(
      () => true,
      () => false
    );
  }

  /** True when the clip is ready within `timeoutMs`: a reply in a two-caster exchange must not leave a hole. */
  public isClipReady(text: string, lang: string, role: string, intensity: string, timeoutMs: number): Promise<boolean> {
    const clip = this.getClipUrl(text, lang, role, intensity).then(
      () => true,
      () => false
    );
    const timeout = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    });
    return Promise.race([clip, timeout]);
  }

  /** `deadlineAt` (epoch ms): speed the clip up just enough to finish by then. */
  public speak(
    text: string,
    lang: string,
    onStart: () => void,
    deadlineAt?: number,
    role?: string,
    intensity?: string
  ): Promise<SpeechOutcome> {
    return this.speakMain(text, lang, onStart, deadlineAt, role, intensity);
  }

  /** Speaks general caster commentary lines (ducked if donate audio is currently playing). */
  public speakMain(
    text: string,
    lang: string,
    onStart: () => void,
    deadlineAt?: number,
    role?: string,
    intensity?: string
  ): Promise<SpeechOutcome> {
    if (this.isSuspended(Date.now())) return Promise.resolve(SPEECH_OUTCOME.SUSPENDED);
    return waitForClip(this.getClipUrl(text, lang, role, intensity))
      .then((url) => {
        const isTooLate = deadlineAt !== undefined && Date.now() >= deadlineAt;
        return isTooLate ? SPEECH_OUTCOME.EXPIRED : this.playMain(url, onStart, deadlineAt);
      })
      .catch((error: unknown) => this.handleClipError(text, lang, error));
  }

  /** Dedicated donate voice channel that plays in parallel at full volume, ducking ongoing commentary. */
  public speakDonate(
    text: string,
    lang: string,
    onStart: () => void,
    deadlineAt?: number,
    role?: string,
    intensity?: string
  ): Promise<SpeechOutcome> {
    if (this.isSuspended(Date.now())) return Promise.resolve(SPEECH_OUTCOME.SUSPENDED);
    return waitForClip(this.getClipUrl(text, lang, role, intensity))
      .then((url) => {
        const isTooLate = deadlineAt !== undefined && Date.now() >= deadlineAt;
        return isTooLate ? SPEECH_OUTCOME.EXPIRED : this.playDonate(url, onStart, deadlineAt);
      })
      .catch((error: unknown) => this.handleClipError(text, lang, error));
  }

  /** Cuts the main commentary line being spoken. */
  public interrupt(): void {
    this.finishCurrent?.(SPEECH_OUTCOME.INTERRUPTED);
  }

  /** Cuts the donate line being spoken. */
  public interruptDonate(): void {
    this.finishCurrentDonate?.(SPEECH_OUTCOME.INTERRUPTED);
  }

  /** Cuts both commentary and donate lines. */
  public interruptAll(): void {
    this.finishCurrent?.(SPEECH_OUTCOME.INTERRUPTED);
    this.finishCurrentDonate?.(SPEECH_OUTCOME.INTERRUPTED);
  }

  private getClipUrl(text: string, lang: string, role?: string, intensity?: string): Promise<string> {
    const key = `${lang}|${role ?? ''}|${intensity ?? ''}|${text}`;
    const cached = this.clipUrls.get(key);
    if (cached) return cached;
    if (this.clipUrls.size >= CASTER_SPEECH.MAX_CACHED_CLIPS) this.evictOldestClip();

    const request = fetch(buildClipUrl(text, lang, role, intensity)).then(async (response) => {
      if (response.status === CASTER_SPEECH.HTTP_DISABLED || response.status === CASTER_SPEECH.HTTP_BLOCKED) {
        throw new ClipRejectedError(`HTTP ${response.status}`);
      }
      if ((CASTER_SPEECH.HTTP_VOICE_UNAVAILABLE as readonly number[]).includes(response.status)) {
        throw new ClipUnavailableError(`HTTP ${response.status}`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (response.headers.get(CASTER_SPEECH.VOICE_HEADER) === CASTER_SPEECH.VOICE_HEADER_FALLBACK) {
        setTimeout(() => this.forgetClip(key), CASTER_SPEECH.FALLBACK_CLIP_KEEP_MS);
      }
      return URL.createObjectURL(await response.blob());
    });
    this.clipUrls.set(key, request);
    // A failed download must not stay cached, or the line could never be retried
    request.catch(() => this.clipUrls.delete(key));
    return request;
  }

  /** Drops one cached clip (and frees its object URL) so it is fetched again next time. */
  private forgetClip(key: string): void {
    const clip = this.clipUrls.get(key);
    this.clipUrls.delete(key);
    clip?.then((url) => URL.revokeObjectURL(url)).catch(() => undefined);
  }

  private evictOldestClip(): void {
    const oldestKey = this.clipUrls.keys().next().value;
    if (oldestKey === undefined) return;
    const oldest = this.clipUrls.get(oldestKey);
    this.clipUrls.delete(oldestKey);
    oldest?.then((url) => URL.revokeObjectURL(url)).catch(() => undefined);
  }

  private updateSfxDuck(): void {
    const isAnySpeaking = this.currentAudio !== null || this.currentDonateAudio !== null;
    soundManager.setVoiceDuck(isAnySpeaking ? CASTER_SPEECH.SFX_DUCK_FACTOR : 1);
  }

  private playMain(url: string, onStart: () => void, deadlineAt?: number): Promise<SpeechOutcome> {
    return new Promise<SpeechOutcome>((resolve) => {
      const audio = new Audio(url);
      const isDonateActive = this.currentDonateAudio !== null;
      const duckFactor = isDonateActive ? CASTER_SPEECH.COMMENTARY_DUCK_WHILE_DONATE : 1;
      audio.volume = Math.min(1, audioService.volume * CASTER_SPEECH.VOICE_VOLUME * duckFactor);
      audio.defaultPlaybackRate = CASTER_SPEECH.NORMAL_RATE;
      audio.playbackRate = CASTER_SPEECH.NORMAL_RATE;
      if (deadlineAt) {
        FIT_RATE_EVENTS.forEach((eventName) => audio.addEventListener(eventName, () => fitToDeadline(audio, deadlineAt)));
      }
      this.currentAudio = audio;

      let watchdog: ReturnType<typeof setTimeout> | null = null;
      const finish = (outcome: SpeechOutcome): void => {
        if (this.currentAudio !== audio) return;
        if (watchdog) clearTimeout(watchdog);
        audio.pause();
        this.currentAudio = null;
        this.finishCurrent = null;
        this.updateSfxDuck();
        this.trackOutcome(outcome);
        resolve(outcome);
      };
      this.finishCurrent = finish;

      audio.addEventListener('ended', () => finish(SPEECH_OUTCOME.SPOKEN), { once: true });
      audio.addEventListener('error', () => finish(SPEECH_OUTCOME.FAILED), { once: true });
      watchdog = setTimeout(() => finish(SPEECH_OUTCOME.FAILED), CASTER_SPEECH.WATCHDOG_MS);

      audio
        .play()
        .then(() => {
          audio.playbackRate = CASTER_SPEECH.NORMAL_RATE;
          this.updateSfxDuck();
          onStart();
        })
        .catch((error: unknown) => {
          const isAutoplayBlock = error instanceof DOMException && error.name === AUTOPLAY_ERROR_NAME;
          if (isAutoplayBlock) this.waitForGesture();
          finish(isAutoplayBlock ? SPEECH_OUTCOME.AUTOPLAY_BLOCKED : SPEECH_OUTCOME.FAILED);
        });
    });
  }

  private playDonate(url: string, onStart: () => void, deadlineAt?: number): Promise<SpeechOutcome> {
    return new Promise<SpeechOutcome>((resolve) => {
      const audio = new Audio(url);
      audio.volume = Math.min(1, audioService.volume * CASTER_SPEECH.DONATE_VOICE_VOLUME);
      audio.defaultPlaybackRate = CASTER_SPEECH.NORMAL_RATE;
      audio.playbackRate = CASTER_SPEECH.NORMAL_RATE;
      if (deadlineAt) {
        FIT_RATE_EVENTS.forEach((eventName) => audio.addEventListener(eventName, () => fitToDeadline(audio, deadlineAt)));
      }
      this.currentDonateAudio = audio;

      // Duck commentary voice while donate voice is reading in parallel
      if (this.currentAudio) {
        this.currentAudio.volume = Math.min(
          1,
          audioService.volume * CASTER_SPEECH.VOICE_VOLUME * CASTER_SPEECH.COMMENTARY_DUCK_WHILE_DONATE
        );
      }

      let watchdog: ReturnType<typeof setTimeout> | null = null;
      const finish = (outcome: SpeechOutcome): void => {
        if (this.currentDonateAudio !== audio) return;
        if (watchdog) clearTimeout(watchdog);
        audio.pause();
        this.currentDonateAudio = null;
        this.finishCurrentDonate = null;

        // Restore commentary voice volume when donate voice finishes
        if (this.currentAudio) {
          this.currentAudio.volume = Math.min(1, audioService.volume * CASTER_SPEECH.VOICE_VOLUME);
        }
        this.updateSfxDuck();
        this.trackOutcome(outcome);
        resolve(outcome);
      };
      this.finishCurrentDonate = finish;

      audio.addEventListener('ended', () => finish(SPEECH_OUTCOME.SPOKEN), { once: true });
      audio.addEventListener('error', () => finish(SPEECH_OUTCOME.FAILED), { once: true });
      watchdog = setTimeout(() => finish(SPEECH_OUTCOME.FAILED), CASTER_SPEECH.WATCHDOG_MS);

      audio
        .play()
        .then(() => {
          audio.playbackRate = CASTER_SPEECH.NORMAL_RATE;
          this.updateSfxDuck();
          onStart();
        })
        .catch((error: unknown) => {
          const isAutoplayBlock = error instanceof DOMException && error.name === AUTOPLAY_ERROR_NAME;
          if (isAutoplayBlock) this.waitForGesture();
          finish(isAutoplayBlock ? SPEECH_OUTCOME.AUTOPLAY_BLOCKED : SPEECH_OUTCOME.FAILED);
        });
    });
  }

  private handleClipError(text: string, lang: string, error: unknown): SpeechOutcome {
    if (error instanceof ClipRejectedError) return SPEECH_OUTCOME.REJECTED;
    if (error instanceof ClipUnavailableError) return SPEECH_OUTCOME.UNAVAILABLE;
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG_PREFIX} clip failed (${lang}, ${text.length} chars): ${reason}`);
    this.trackOutcome(SPEECH_OUTCOME.FAILED);
    return SPEECH_OUTCOME.FAILED;
  }

  private trackOutcome(outcome: SpeechOutcome): void {
    if (outcome === SPEECH_OUTCOME.SPOKEN) {
      this.consecutiveFailures = 0;
      return;
    }
    if (outcome !== SPEECH_OUTCOME.FAILED) return;
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures < CASTER_SPEECH.MAX_CONSECUTIVE_FAILURES) return;
    this.consecutiveFailures = 0;
    this.suspendedUntil = Date.now() + CASTER_SPEECH.SUSPEND_MS;
    console.warn(`${LOG_PREFIX} voice suspended for ${CASTER_SPEECH.SUSPEND_MS / 1000}s after repeated failures`);
  }

  /** In a normal browser tab audio needs one user gesture; OBS browser sources play freely. */
  private waitForGesture(): void {
    if (this.isWaitingForGesture || typeof window === 'undefined') return;
    this.isWaitingForGesture = true;
    useCasterStore.setState({ isVoiceLocked: true });
    console.info(`${LOG_PREFIX} autoplay blocked: click the page once to enable the caster voice`);
    const release = (): void => {
      this.isWaitingForGesture = false;
      GESTURE_EVENTS.forEach((eventName) => window.removeEventListener(eventName, release));
      useCasterStore.setState({ isVoiceLocked: false });
      this.unlockWaiters.splice(0).forEach((resolve) => resolve());
    };
    GESTURE_EVENTS.forEach((eventName) => window.addEventListener(eventName, release, { once: true }));
  }
}

export const casterSpeechEngine = new CasterSpeechEngine();
