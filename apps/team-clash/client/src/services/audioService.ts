import { DEFAULT_SOUND_CONFIG } from '../../../shared/constants/clashConfig';
import type { SoundConfig, TeamId } from '../../../shared/types/clash';

class AudioService {
  private audioCtx: AudioContext | null = null;
  private config: SoundConfig = { ...DEFAULT_SOUND_CONFIG };
  private isUnlocked = false;
  private noiseBuffer: AudioBuffer | null = null;

  // Background Battle Groove (BGM & Sizzle)
  private beatTimer: number | null = null;
  private beatStep = 0;
  private plasmaGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private unlockListeners: Array<(unlocked: boolean) => void> = [];

  public getIsUnlocked(): boolean {
    return this.isUnlocked && this.audioCtx?.state === 'running';
  }

  public onUnlockChange(cb: (unlocked: boolean) => void): () => void {
    this.unlockListeners.push(cb);
    cb(this.getIsUnlocked());
    return () => {
      this.unlockListeners = this.unlockListeners.filter((listener) => listener !== cb);
    };
  }

  private notifyUnlock(status: boolean): void {
    this.isUnlocked = status;
    this.unlockListeners.forEach((cb) => cb(status));
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.noiseBuffer = this.generateNoiseBuffer(this.audioCtx, 1.0);
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.notifyUnlock(true);
    }

    return this.audioCtx;
  }

  private generateNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public async unlockAudio(): Promise<boolean> {
    const ctx = this.ensureAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }

    if (ctx.state === 'running') {
      this.notifyUnlock(true);
      this.startBattleGroove();
      this.playChime(784, 0.2); // G5 activation chime
      return true;
    }

    return false;
  }

  public setConfig(nextConfig: Partial<SoundConfig>): void {
    this.config = { ...this.config, ...nextConfig };
    this.updateBgmVolumes();
  }

  private getEffectiveVolume(isBgm = false): number {
    if (this.config.isMuted) return 0;
    const base = this.config.masterVolume * this.config.sfxVolume;
    if (isBgm) {
      return base * (this.config.micModeEnabled ? 0.15 : 0.65);
    }
    return base * (this.config.micModeEnabled ? 0.4 : 1.0);
  }

  private updateBgmVolumes(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const vol = this.getEffectiveVolume(true);
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(vol * 0.45, now, 0.1);
    }
    if (this.plasmaGain) {
      this.plasmaGain.gain.setTargetAtTime(vol * 0.25, now, 0.1);
    }
  }

  /**
   * Continuous high-energy 128 BPM electronic battle rhythm + plasma clash sizzle
   */
  public startBattleGroove(): void {
    if (this.beatTimer !== null || !this.audioCtx || this.audioCtx.state !== 'running') {
      return;
    }

    const ctx = this.audioCtx;

    // Master BGM Gain
    this.bgmGain = ctx.createGain();
    this.bgmGain.connect(ctx.destination);
    this.updateBgmVolumes();

    // Plasma Clash Sizzle Node
    if (this.noiseBuffer && !this.plasmaGain) {
      try {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        noiseSource.loop = true;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1200, ctx.currentTime);
        bandpass.Q.setValueAtTime(3.0, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(4.0, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(500, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(bandpass.frequency);

        this.plasmaGain = ctx.createGain();
        this.plasmaGain.gain.setValueAtTime(this.getEffectiveVolume(true) * 0.25, ctx.currentTime);

        noiseSource.connect(bandpass);
        bandpass.connect(this.plasmaGain);
        this.plasmaGain.connect(ctx.destination);

        noiseSource.start();
        lfo.start();
      } catch {
        // Plasma sizzle setup catch
      }
    }

    // 128 BPM Step Sequencer (16th note = ~117ms)
    const stepIntervalMs = (60 / 128 / 4) * 1000;
    this.beatStep = 0;

    this.beatTimer = window.setInterval(() => {
      this.tickSequencerStep();
    }, stepIntervalMs);
  }

  public stopBattleGroove(): void {
    if (this.beatTimer !== null) {
      clearInterval(this.beatTimer);
      this.beatTimer = null;
    }
  }

  private tickSequencerStep(): void {
    if (!this.audioCtx || this.audioCtx.state !== 'running' || !this.bgmGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const step = this.beatStep % 16;
    this.beatStep++;

    const bgmVol = this.getEffectiveVolume(true);
    if (bgmVol <= 0.001) return;

    // 1. Kick on beats 0, 4, 8, 12 (4-on-the-floor driving punch)
    if (step % 4 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

      gain.gain.setValueAtTime(bgmVol * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    // 2. Hi-Hat / Energy Spark on off-beats (step 2, 6, 10, 14)
    if (step % 4 === 2 && this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(bgmVol * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      noise.start(now);
      noise.stop(now + 0.05);
    }

    // 3. Rhythmic Synth Bass (A minor driving riff: A1 -> C2 -> D2 -> G1)
    if (step % 2 === 0) {
      const bassNotes = [55, 65.41, 73.42, 49]; // A1, C2, D2, G1
      const noteFreq = bassNotes[Math.floor(step / 4)] || 55;

      const bass = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(noteFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.1);

      gain.gain.setValueAtTime(bgmVol * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      bass.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      bass.start(now);
      bass.stop(now + 0.11);
    }
  }

  private playChime(freq: number, duration: number): void {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Action SFX with Stereo Panning & Punchy Multi-layer synthesis
   */
  public playPushSound(
    type: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ROUND_END',
    team?: TeamId
  ): void {
    if (this.config.isMuted) return;

    const ctx = this.ensureAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const effectiveVolume = this.getEffectiveVolume(false);
    if (effectiveVolume <= 0.001) return;

    const now = ctx.currentTime;

    // Stereo Panning (Left = -0.4, Right = +0.4)
    let panner: StereoPannerNode | null = null;
    try {
      if (ctx.createStereoPanner && team) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(team === 'LEFT' ? -0.4 : 0.4, now);
        panner.connect(ctx.destination);
      }
    } catch {
      // StereoPanner fallback
    }

    const outputNode: AudioNode = panner || ctx.destination;

    if (type === 'SMALL') {
      // 1. Anime Ki-Blast Laser Snap (Dual: Sawtooth sweep + Noise transient)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);

      gain.gain.setValueAtTime(effectiveVolume * 0.75, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(outputNode);
      osc.start(now);
      osc.stop(now + 0.22);

      // Noise Transient Click
      if (this.noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(2200, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(effectiveVolume * 0.4, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(outputNode);
        noise.start(now);
        noise.stop(now + 0.06);
      }
    } else if (type === 'MEDIUM') {
      // 2. Super Beam Plasma Cannon (Riser Whoosh + Sub-Bass Impact)
      const riser = ctx.createOscillator();
      const riserGain = ctx.createGain();
      riser.type = 'sine';
      riser.frequency.setValueAtTime(160, now);
      riser.frequency.exponentialRampToValueAtTime(750, now + 0.2);

      riserGain.gain.setValueAtTime(effectiveVolume * 0.5, now);
      riserGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      riser.connect(riserGain);
      riserGain.connect(outputNode);
      riser.start(now);
      riser.stop(now + 0.2);

      // Deep Sub-Bass Shockwave at now + 0.15s
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(320, now + 0.15);
      sub.frequency.exponentialRampToValueAtTime(45, now + 0.55);

      subGain.gain.setValueAtTime(effectiveVolume * 1.0, now + 0.15);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      sub.connect(subGain);
      subGain.connect(outputNode);
      sub.start(now + 0.15);
      sub.stop(now + 0.55);
    } else if (type === 'LARGE') {
      // 3. Ultimate Clash Cinematic Detonation (Earthquake Sub-Drop + Noise Explosion)
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'square';
      sub.frequency.setValueAtTime(180, now);
      sub.frequency.exponentialRampToValueAtTime(30, now + 0.9);

      subGain.gain.setValueAtTime(effectiveVolume * 1.2, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 0.9);

      if (this.noiseBuffer) {
        const explosion = ctx.createBufferSource();
        explosion.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.7);

        const expGain = ctx.createGain();
        expGain.gain.setValueAtTime(effectiveVolume * 0.9, now);
        expGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        explosion.connect(filter);
        filter.connect(expGain);
        expGain.connect(ctx.destination);
        explosion.start(now);
        explosion.stop(now + 0.7);
      }
    } else if (type === 'ROUND_END') {
      // 4. Round Victory Fanfare (Heavy Gong Impact + Triad Brass Chimes)
      this.stopBattleGroove();

      // Heavy Metal Gong
      const gong = ctx.createOscillator();
      const gongGain = ctx.createGain();
      gong.type = 'sawtooth';
      gong.frequency.setValueAtTime(120, now);
      gong.frequency.exponentialRampToValueAtTime(60, now + 0.8);
      gongGain.gain.setValueAtTime(effectiveVolume * 1.0, now);
      gongGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      gong.connect(gongGain);
      gongGain.connect(ctx.destination);
      gong.start(now);
      gong.stop(now + 0.8);

      // Brass Victory Chimes (C5 - E5 - G5 - C6)
      const fanfareNotes = [523.25, 659.25, 783.99, 1046.5];
      fanfareNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + 0.2 + idx * 0.12);
        gain.gain.setValueAtTime(effectiveVolume * 0.8, now + 0.2 + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + idx * 0.12 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.2 + idx * 0.12);
        osc.stop(now + 0.2 + idx * 0.12 + 0.7);
      });
    }
  }
}

export const audioService = new AudioService();
