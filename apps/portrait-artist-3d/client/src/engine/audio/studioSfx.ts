import type { StudioLocale } from '../../../../shared/types/studio';

export const TTS_VOICE_CONFIG = {
  RATE_VI: 1.35, // Fast snappy livestream pace for "chị Google"
  RATE_EN: 1.25,
  PITCH: 1.05, // Natural bright tone
  VOLUME: 0.95,
} as const;

/**
 * Strips emoji symbols and special unicode ornaments so only the clean,
 * natural Vietnamese spoken dialogue is delivered to the speech synthesizer.
 */
function sanitizeSpeechText(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[✨🎨🌹👑🎉❤️🔥💨🖼️✦•★]/g, '')
    .trim();
}

/**
 * Generates the authentic, canonical Google Translate TTS audio URL
 * that gives the iconic "Chị Google" voice loved across live streams.
 */
function getGoogleTtsUrl(text: string, locale: StudioLocale): string {
  const clean = sanitizeSpeechText(text);
  const lang = locale === 'vi' ? 'vi' : 'en';
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(clean)}`;
}

/**
 * Resilient Web Audio procedural SFX & Dual-Engine Speech Synthesis ("Chị Google").
 * 1. Primary Engine: Authentic Google Translate TTS stream (plays genuine "chị Google" voice at 1.35x).
 * 2. Secondary Engine: Browser Web Speech API fallback with automatic gesture unlock & voice caching.
 */
class StudioSfxEngine {
  private audioCtx: AudioContext | null = null;
  private lastBrushSoundAt = 0;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private isUnlocked = false;
  private pendingLine: { text: string; locale: StudioLocale } | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.refreshVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this.refreshVoices();
        };
      }
    }
  }

  public unlockAudio(): void {
    this.isUnlocked = true;
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }

    if (this.pendingLine) {
      const line = this.pendingLine;
      this.pendingLine = null;
      this.speakLine(line.text, line.locale, false);
    }
  }

  private refreshVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.cachedVoices = window.speechSynthesis.getVoices() || [];
  }

  private findBestVoice(locale: StudioLocale): SpeechSynthesisVoice | null {
    if (this.cachedVoices.length === 0) {
      this.refreshVoices();
    }
    const voices = this.cachedVoices;
    if (voices.length === 0) return null;

    if (locale === 'vi') {
      // 1. Prioritize Google Vietnamese voice ("chị Google")
      const googleVi = voices.find(
        (v) =>
          v.name.toLowerCase().includes('google') &&
          (v.lang.toLowerCase().startsWith('vi') || v.lang.toLowerCase().includes('vn'))
      );
      if (googleVi) return googleVi;

      // 2. Any native/natural Vietnamese voice
      const viVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('vi') ||
          v.name.toLowerCase().includes('vietnam')
      );
      if (viVoice) return viVoice;
    } else {
      const googleEn = voices.find(
        (v) =>
          v.name.toLowerCase().includes('google') &&
          v.lang.toLowerCase().startsWith('en')
      );
      if (googleEn) return googleEn;

      const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      if (enVoice) return enVoice;
    }

    return voices[0] ?? null;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      this.audioCtx = new AudioCtor();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public playBrushSwish(speedMultiplier: number): void {
    const now = performance.now();
    const minIntervalMs = Math.max(260, 620 / speedMultiplier);
    if (now - this.lastBrushSoundAt < minIntervalMs) return;
    this.lastBrushSoundAt = now;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const duration = 0.085;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.sin((i / data.length) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.045;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1600 + Math.random() * 500;
    filter.Q.value = 1.4;

    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
  }

  public playCompleteTing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [880, 1174.66, 1567.98];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.09, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.48);
    });
  }

  public playCameraShutter(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.055);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playVipChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [659.25, 987.77, 1318.51];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.075, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.38);
    });
  }

  public playTrollBoing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.26);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public speakLine(text: string, locale: StudioLocale, micMode: boolean): void {
    if (micMode || typeof window === 'undefined') return;
    const cleanText = sanitizeSpeechText(text);
    if (!cleanText) return;

    // Halt any previous audio playback
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }

    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    // Try Primary Engine: Authentic Google Translate TTS stream (real "Chị Google" voice)
    try {
      const url = getGoogleTtsUrl(cleanText, locale);
      const audio = new Audio(url);
      audio.playbackRate = locale === 'vi' ? TTS_VOICE_CONFIG.RATE_VI : TTS_VOICE_CONFIG.RATE_EN;
      audio.volume = TTS_VOICE_CONFIG.VOLUME;
      this.currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // If browser blocked audio before the user touched the screen, queue it
          if (err && (err as Error).name === 'NotAllowedError' && !this.isUnlocked) {
            this.pendingLine = { text: cleanText, locale };
          }
          // Fallback to Web Speech API
          this.speakViaWebSpeech(cleanText, locale);
        });
      }
    } catch {
      this.speakViaWebSpeech(cleanText, locale);
    }
  }

  private speakViaWebSpeech(text: string, locale: StudioLocale): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.activeUtterance = utterance;

      const voice = this.findBestVoice(locale);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = locale === 'vi' ? 'vi-VN' : 'en-US';
      }

      utterance.rate = locale === 'vi' ? TTS_VOICE_CONFIG.RATE_VI : TTS_VOICE_CONFIG.RATE_EN;
      utterance.pitch = TTS_VOICE_CONFIG.PITCH;
      utterance.volume = TTS_VOICE_CONFIG.VOLUME;

      utterance.onend = () => {
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
      };

      utterance.onerror = () => {
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
      };

      window.setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 40);
    } catch {
      // Speech synthesis fallback unavailable
    }
  }
}

export const studioSfx = new StudioSfxEngine();
