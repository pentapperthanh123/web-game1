export type SalonSfxKey = 'SNIP' | 'CLIPPER' | 'BRUSH' | 'DONE' | 'OOPS' | 'ROYAL' | 'GIFT';

const MIC_MODE_GAIN_SCALE = 0.28;

class SalonAudioManager {
  private ctx: AudioContext | null = null;
  private masterVolume = 0.7;
  private micMode = false;
  private lastSnipAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public setMicMode(enabled: boolean): void {
    this.micMode = enabled;
  }

  private getEffectiveGain(base: number): number {
    const micScale = this.micMode ? MIC_MODE_GAIN_SCALE : 1;
    return base * this.masterVolume * micScale;
  }

  public play(sfx: SalonSfxKey): void {
    if (this.masterVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (sfx) {
      case 'SNIP': {
        if (Date.now() - this.lastSnipAt < 260) return;
        this.lastSnipAt = Date.now();
        this.playClickBurst(ctx, now, 1950, 0.04, 0.14);
        this.playClickBurst(ctx, now + 0.085, 2250, 0.045, 0.13);
        break;
      }
      case 'CLIPPER': {
        this.playBuzz(ctx, now, 118, 0.42, 0.18);
        break;
      }
      case 'BRUSH': {
        this.playTone(ctx, now, 'sine', 520, 680, 0.14, 0.08);
        break;
      }
      case 'DONE': {
        this.playTone(ctx, now, 'triangle', 784, 784, 0.14, 0.22);
        this.playTone(ctx, now + 0.1, 'triangle', 1046.5, 1046.5, 0.28, 0.24);
        break;
      }
      case 'OOPS': {
        this.playTone(ctx, now, 'sawtooth', 480, 175, 0.32, 0.2);
        this.playTone(ctx, now + 0.24, 'triangle', 230, 140, 0.18, 0.18);
        break;
      }
      case 'GIFT': {
        this.playTone(ctx, now, 'sine', 659.25, 659.25, 0.12, 0.18);
        this.playTone(ctx, now + 0.09, 'sine', 880, 880, 0.18, 0.2);
        break;
      }
      case 'ROYAL': {
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        notes.forEach((freq, idx) => {
          this.playTone(ctx, now + idx * 0.075, 'triangle', freq, freq, 0.24, 0.2);
        });
        break;
      }
    }
  }

  private playTone(
    ctx: AudioContext,
    startTime: number,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (startFreq !== endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + duration);
    }

    const peak = this.getEffectiveGain(volume);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playClickBurst(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, startTime + duration);

    const peak = this.getEffectiveGain(volume);
    gain.gain.setValueAtTime(peak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private playBuzz(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    lfo.frequency.setValueAtTime(28, startTime);
    lfoGain.gain.setValueAtTime(14, startTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const peak = this.getEffectiveGain(volume);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.04);
    gain.gain.setValueAtTime(peak * 0.85, startTime + duration - 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    lfo.start(startTime);
    osc.stop(startTime + duration + 0.02);
    lfo.stop(startTime + duration + 0.02);
  }
}

export const salonAudio = new SalonAudioManager();
