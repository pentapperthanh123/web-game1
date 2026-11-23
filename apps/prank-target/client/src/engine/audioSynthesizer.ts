/**
 * Web Audio API procedural sound synthesizer for Prank Target.
 * Zero external audio files required — immune to missing assets and network latency.
 */
class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;
  private micMode: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setMicMode(enabled: boolean): void {
    this.micMode = enabled;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  private getEffectiveGain(): number {
    if (this.isMuted) return 0;
    // When micMode is on, lower volume to 30% so host mic speech cuts through cleanly
    return this.micMode ? this.volume * 0.3 : this.volume;
  }

  /** Egg Splat: quick burst of shaped noise + squelchy pitch drop */
  public playEggSplat(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const gainVal = this.getEffectiveGain();
    if (gainVal <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);

    gain.gain.setValueAtTime(gainVal * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Add wet squish noise
    this.playNoise(now, 0.12, 600, gainVal * 0.5);
  }

  /** Wind Whoosh: filtered wind gust */
  public playWindWhoosh(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const gainVal = this.getEffectiveGain();
    if (gainVal <= 0) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.45;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.45);
    filter.Q.setValueAtTime(3.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(gainVal * 0.7, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.45);
  }

  /** Ball Bonk: cartoon boing / bonk impact */
  public playBallBonk(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const gainVal = this.getEffectiveGain();
    if (gainVal <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);

    gain.gain.setValueAtTime(gainVal * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** Cake Sploosh: heavy wet thud */
  public playCakeSploosh(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const gainVal = this.getEffectiveGain();
    if (gainVal <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

    gain.gain.setValueAtTime(gainVal * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);

    this.playNoise(now, 0.2, 450, gainVal * 0.6);
  }

  /** Milk Splash: rapid splashing droplet sounds */
  public playMilkSplash(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const gainVal = this.getEffectiveGain();
    if (gainVal <= 0) return;

    const now = ctx.currentTime;
    this.playNoise(now, 0.28, 1100, gainVal * 0.7);

    // Two small water bloops
    [0, 0.08, 0.14].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500 + idx * 120, now + offset);
      osc.frequency.exponentialRampToValueAtTime(250, now + offset + 0.08);

      gain.gain.setValueAtTime(gainVal * 0.4, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  /** Taunt / Horn / Haha sound */
  public playTaunt(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const gainVal = this.getEffectiveGain();
    if (gainVal <= 0) return;

    const now = ctx.currentTime;
    [0, 0.12].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(idx === 0 ? 320 : 420, now + offset);
      gain.gain.setValueAtTime(gainVal * 0.4, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.11);
    });
  }

  /** Meltdown Alarm & Siren */
  public playMeltdownAlarm(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const gainVal = this.getEffectiveGain();
    if (gainVal <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.4);
    osc.frequency.linearRampToValueAtTime(500, now + 0.8);
    osc.frequency.linearRampToValueAtTime(900, now + 1.2);
    osc.frequency.linearRampToValueAtTime(400, now + 1.8);

    gain.gain.setValueAtTime(gainVal * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.0);
  }

  private playNoise(time: number, duration: number, cutoff: number, peakGain: number): void {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peakGain, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(time);
    source.stop(time + duration);
  }
}

export const audioSynthesizer = new AudioSynthesizer();
