import { GAME_CONSTANTS } from '../constants/game';

class AudioSynthesizerService {
  private ctx: AudioContext | null = null;
  public isAudioEnabled: boolean = GAME_CONSTANTS.AUDIO.DEFAULT_ENABLED;
  public isTtsEnabled: boolean = GAME_CONSTANTS.AUDIO.DEFAULT_TTS_ENABLED;
  public volume: number = GAME_CONSTANTS.AUDIO.DEFAULT_VOLUME;

  private isSpeaking = false;
  private ttsQueue: string[] = [];

  constructor() {
    // User interaction will resume audio context if suspended
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.getAudioContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. Procedural Hit Sound (Crunchy attack strike)
  public playHitSound(): void {
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  // 2. Procedural Laser Sound (Minion attack blast)
  public playLaserSound(): void {
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15 * this.volume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  // 3. Procedural Gift / Fanfare Sound (Glorious ascending chime chord)
  public playGiftFanfare(): void {
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 chord
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.25 * this.volume, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.5);
    });
  }

  // 4. Procedural Victory Sound
  public playVictoryFanfare(): void {
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const melody = [
      { f: 440.0, d: 0.15 },
      { f: 554.37, d: 0.15 },
      { f: 659.25, d: 0.2 },
      { f: 880.0, d: 0.6 },
    ];

    let start = ctx.currentTime;
    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, start);

      gain.gain.setValueAtTime(0.4 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + note.d);
      start += note.d * 0.85;
    });
  }

  // 5. Procedural Heart Sparkle Chime
  public playHeartChime(): void {
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100 + Math.random() * 300, ctx.currentTime);

    gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  // 6. Web Speech API (Vietnamese TTS)
  public speak(text: string): void {
    if (!this.isTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Queue management: limit queue to max 4 to avoid speech congestion
    if (this.ttsQueue.length >= 4) {
      this.ttsQueue.shift();
    }
    this.ttsQueue.push(text);
    this.processTtsQueue();
  }

  private processTtsQueue(): void {
    if (this.isSpeaking || this.ttsQueue.length === 0) return;

    const text = this.ttsQueue.shift();
    if (!text) return;

    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.15; // slightly faster for live stream pace
    utterance.volume = this.volume;

    utterance.onend = () => {
      this.isSpeaking = false;
      setTimeout(() => this.processTtsQueue(), 250);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.processTtsQueue();
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const audioService = new AudioSynthesizerService();

