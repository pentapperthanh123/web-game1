import { GAMEPLAY_LIMITS } from './config';
import { sharedSoundEngine } from './soundEngine';
import type { Language } from './types';

export interface TtsSpeakRequest {
  text: string;
  language: Language;
  rate?: number;
  pitch?: number;
  volume?: number;
  allowIframeRelay?: boolean;
  onStart?: () => void;
  onFinish: () => void;
  onBlockedRelay?: () => boolean;
}

const MAX_CACHE_ENTRIES = 40;
const FETCH_TIMEOUT_MS = 5000;
const TTS_ROUTE = '/api/tts';

export function selectPreferredSpeechVoice(
  voices: readonly SpeechSynthesisVoice[],
  language: Language
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const targetPrefix = language === 'EN' ? 'en' : 'vi';
  const langMatches = voices.filter((v) => v.lang.toLowerCase().startsWith(targetPrefix));
  if (!langMatches.length) return null;

  const googleMatch = langMatches.find((v) => v.name.toLowerCase().includes('google'));
  if (googleMatch) return googleMatch;

  const femaleMatch = langMatches.find((v) => {
    const lower = v.name.toLowerCase();
    return lower.includes('hoaimy') || lower.includes('linh') || lower.includes('female');
  });
  if (femaleMatch) return femaleMatch;

  const exactLocale = language === 'EN' ? 'en-us' : 'vi-vn';
  const exactMatch = langMatches.find(
    (v) => v.lang.toLowerCase().replace('_', '-') === exactLocale
  );
  return exactMatch ?? langMatches[0];
}

class SharedGoogleTtsPlayer {
  private readonly bufferCache = new Map<string, ArrayBuffer>();
  private activeSeq = 0;
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private activeBlobUrl: string | null = null;
  private activeWatchdog: ReturnType<typeof setTimeout> | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private voicesBound = false;
  private pendingSpeakOnUnlock: TtsSpeakRequest | null = null;

  constructor() {
    this.bindVoices();
    sharedSoundEngine.subscribeUnlocked((unlocked) => {
      if (!unlocked || !this.pendingSpeakOnUnlock) return;
      const pending = this.pendingSpeakOnUnlock;
      this.pendingSpeakOnUnlock = null;
      void this.speak(pending);
    });
  }

  private bindVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || this.voicesBound) {
      return;
    }
    this.voicesBound = true;
    const refresh = () => {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices();
      } catch {
        this.cachedVoices = [];
      }
    };
    refresh();
    try {
      window.speechSynthesis.addEventListener('voiceschanged', refresh);
    } catch {
      // Ignore browsers without addEventListener on speechSynthesis
    }
  }

  public stopAll(): void {
    this.activeSeq += 1;
    this.pendingSpeakOnUnlock = null;
    this.clearWatchdog();
    sharedSoundEngine.stopVoiceAudio();
    this.cleanupHtmlAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    sharedSoundEngine.setTtsDucking(false);
  }

  public async speak(req: TtsSpeakRequest): Promise<void> {
    const seq = ++this.activeSeq;
    const text = req.text.trim();
    if (!text) {
      req.onFinish();
      return;
    }

    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      this.clearWatchdog();
      if (seq === this.activeSeq) {
        sharedSoundEngine.setTtsDucking(false);
      }
      req.onFinish();
    };

    this.armWatchdog(GAMEPLAY_LIMITS.TTS_WATCHDOG_MS, () => {
      if (seq === this.activeSeq) {
        sharedSoundEngine.stopVoiceAudio();
        this.cleanupHtmlAudio();
      }
      finishOnce();
    });

    const rate = req.rate ?? GAMEPLAY_LIMITS.TTS_RATE;
    const volume = Math.max(0.15, Math.min(1, req.volume ?? 0.85));

    // Try real Chị Google audio via `/api/tts?provider=google` first
    const audioBuf = await this.fetchGoogleTtsBuffer(text, req.language);
    if (seq !== this.activeSeq) {
      finishOnce();
      return;
    }

    if (audioBuf) {
      if (req.allowIframeRelay && !sharedSoundEngine.isUnlocked() && req.onBlockedRelay?.()) {
        return;
      }

      sharedSoundEngine.setTtsDucking(true);
      req.onStart?.();

      const playedViaWebAudio = await sharedSoundEngine.playVoiceAudioBuffer(
        audioBuf,
        rate,
        finishOnce
      );
      if (seq !== this.activeSeq) {
        finishOnce();
        return;
      }
      if (playedViaWebAudio) {
        return;
      }

      // If WebAudio failed inside Live Preview iframe, relay to Admin host cleanly
      if (req.allowIframeRelay && req.onBlockedRelay?.()) {
        sharedSoundEngine.setTtsDucking(false);
        return;
      }

      const playedViaHtmlAudio = await this.playViaHtmlAudio(audioBuf, rate, volume, finishOnce);
      if (seq !== this.activeSeq) {
        finishOnce();
        return;
      }
      if (playedViaHtmlAudio) {
        return;
      }

      // If browser autoplay policy blocked playback before first click, replay immediately once unlocked
      if (!sharedSoundEngine.isUnlocked()) {
        this.pendingSpeakOnUnlock = req;
        finishOnce();
        return;
      }
    }

    // Fallback: If iframe lacks gesture, relay to Admin parent first before browser speechSynthesis
    if (req.allowIframeRelay && !sharedSoundEngine.isUnlocked() && req.onBlockedRelay?.()) {
      return;
    }

    this.speakViaSpeechSynthesis(req, seq, finishOnce);
  }

  private async fetchGoogleTtsBuffer(
    text: string,
    language: Language
  ): Promise<ArrayBuffer | null> {
    if (typeof fetch === 'undefined') return null;
    const tl = language === 'EN' ? 'en' : 'vi';
    const key = `${tl}:${text}`;
    const cached = this.bufferCache.get(key);
    if (cached) {
      this.bufferCache.delete(key);
      this.bufferCache.set(key, cached);
      return cached.slice(0);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const url = `${TTS_ROUTE}?provider=google&tl=${tl}&text=${encodeURIComponent(text)}`;

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('audio') && !contentType.includes('octet-stream')) {
        return null;
      }
      const raw = await res.arrayBuffer();
      if (raw.byteLength < 128) return null;

      if (this.bufferCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = this.bufferCache.keys().next().value;
        if (oldestKey) {
          this.bufferCache.delete(oldestKey);
        }
      }
      this.bufferCache.set(key, raw.slice(0));
      return raw;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  private async playViaHtmlAudio(
    arrayBuffer: ArrayBuffer,
    rate: number,
    volume: number,
    onDone: () => void
  ): Promise<boolean> {
    if (typeof Audio === 'undefined' || typeof URL === 'undefined') return false;
    try {
      this.cleanupHtmlAudio();
      const blob = new Blob([arrayBuffer.slice(0)], { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);
      audio.playbackRate = rate;
      audio.volume = volume;
      this.activeHtmlAudio = audio;
      this.activeBlobUrl = blobUrl;

      audio.onended = () => {
        if (this.activeHtmlAudio === audio) {
          this.cleanupHtmlAudio();
        }
        onDone();
      };
      audio.onerror = () => {
        if (this.activeHtmlAudio === audio) {
          this.cleanupHtmlAudio();
        }
        onDone();
      };

      await audio.play();
      return true;
    } catch {
      this.cleanupHtmlAudio();
      return false;
    }
  }

  private speakViaSpeechSynthesis(
    req: TtsSpeakRequest,
    seq: number,
    finishOnce: () => void
  ): void {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      finishOnce();
      return;
    }

    try {
      this.bindVoices();
      const voice = selectPreferredSpeechVoice(this.cachedVoices, req.language);
      // Avoid jarring English-only Microsoft David reading Vietnamese text if no vi voice exists
      if (!voice && req.language === 'VI' && this.cachedVoices.length > 0) {
        finishOnce();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(req.text);
      utterance.lang = req.language === 'EN' ? 'en-US' : 'vi-VN';
      utterance.rate = req.rate ?? GAMEPLAY_LIMITS.TTS_RATE;
      utterance.pitch = req.pitch ?? GAMEPLAY_LIMITS.TTS_PITCH;
      utterance.volume = Math.max(0.15, Math.min(1, req.volume ?? 0.85));
      if (voice) {
        utterance.voice = voice;
      }

      sharedSoundEngine.setTtsDucking(true);
      req.onStart?.();

      utterance.onend = () => {
        if (seq === this.activeSeq) {
          finishOnce();
        }
      };
      utterance.onerror = (err) => {
        if (seq !== this.activeSeq) return;
        const reason = (err as SpeechSynthesisErrorEvent).error;
        if ((reason === 'not-allowed' || reason === 'audio-busy') && req.allowIframeRelay) {
          if (req.onBlockedRelay?.()) {
            return;
          }
        }
        finishOnce();
      };

      try {
        window.speechSynthesis.resume();
      } catch {
        // Ignore resume error
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      finishOnce();
    }
  }

  private cleanupHtmlAudio(): void {
    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.onended = null;
        this.activeHtmlAudio.onerror = null;
        this.activeHtmlAudio.pause();
      } catch {
        // Ignore cleanup errors
      }
      this.activeHtmlAudio = null;
    }
    if (this.activeBlobUrl) {
      try {
        URL.revokeObjectURL(this.activeBlobUrl);
      } catch {
        // Ignore revoke errors
      }
      this.activeBlobUrl = null;
    }
  }

  private armWatchdog(ms: number, cb: () => void): void {
    this.clearWatchdog();
    this.activeWatchdog = setTimeout(cb, ms);
  }

  private clearWatchdog(): void {
    if (this.activeWatchdog) {
      clearTimeout(this.activeWatchdog);
      this.activeWatchdog = null;
    }
  }
}

export const sharedTtsPlayer = new SharedGoogleTtsPlayer();
