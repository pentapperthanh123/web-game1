import { DEFAULT_SOUND_CONFIG } from '../../../shared/constants/clashConfig';
import type { SoundConfig, TeamId } from '../../../shared/types/clash';
import { youtubeBgmService } from './youtubeBgmService';

const AUDIO_PARAMS = {
  SAMPLE_RATE_NOISE_DURATION: 1.0,
  COMPRESSOR_THRESHOLD_DB: -14,
  COMPRESSOR_KNEE: 8,
  COMPRESSOR_RATIO: 6,
  COMPRESSOR_ATTACK_SEC: 0.003,
  COMPRESSOR_RELEASE_SEC: 0.22,
  SMALL_COOLDOWN_MS: 35,
  DUCKING_BGM_FACTOR: 0.15,
  NORMAL_BGM_FACTOR: 0.65,
  STEREO_PAN_LEFT: -0.55,
  STEREO_PAN_RIGHT: 0.55,
} as const;

class AudioService {
  private audioCtx: AudioContext | null = null;
  private config: SoundConfig = { ...DEFAULT_SOUND_CONFIG };
  private isUnlocked = false;
  private noiseBuffer: AudioBuffer | null = null;

  // Master Dynamics Chain
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  // Background Battle Groove (Fallback Procedural Beat & Plasma Sizzle)
  private beatTimer: number | null = null;
  private beatStep = 0;
  private plasmaGain: GainNode | null = null;
  private unlockListeners: Array<(unlocked: boolean) => void> = [];

  // Cooldown / Throttle for Rapid Spam Clicks
  private lastSmallSoundTime: Record<TeamId, number> = {
    LEFT: 0,
    RIGHT: 0,
  };

  constructor() {
    youtubeBgmService.onPlaySuccess(() => {
      // YouTube BGM is actively playing! Smoothly stop synth beat so they do not overlap
      this.stopBattleGroove();
    });

    youtubeBgmService.onFallback(() => {
      if (this.isUnlocked) {
        this.startBattleGroove();
      }
    });
  }

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
        const ctx = new AudioContextClass();
        this.audioCtx = ctx;
        this.noiseBuffer = this.generateNoiseBuffer(ctx, AUDIO_PARAMS.SAMPLE_RATE_NOISE_DURATION);
        this.setupAudioGraph(ctx);
        youtubeBgmService.init();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.notifyUnlock(true);
    }

    return this.audioCtx;
  }

  private setupAudioGraph(ctx: AudioContext): void {
    // 1. Broadcast Master Compressor (Prevents clipping on multi-chat spam)
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(AUDIO_PARAMS.COMPRESSOR_THRESHOLD_DB, ctx.currentTime);
    comp.knee.setValueAtTime(AUDIO_PARAMS.COMPRESSOR_KNEE, ctx.currentTime);
    comp.ratio.setValueAtTime(AUDIO_PARAMS.COMPRESSOR_RATIO, ctx.currentTime);
    comp.attack.setValueAtTime(AUDIO_PARAMS.COMPRESSOR_ATTACK_SEC, ctx.currentTime);
    comp.release.setValueAtTime(AUDIO_PARAMS.COMPRESSOR_RELEASE_SEC, ctx.currentTime);
    comp.connect(ctx.destination);
    this.compressor = comp;

    // 2. Master Gain
    const master = ctx.createGain();
    master.gain.setValueAtTime(this.config.masterVolume, ctx.currentTime);
    master.connect(comp);
    this.masterGain = master;

    // 3. SFX Bus
    const sfx = ctx.createGain();
    sfx.gain.setValueAtTime(this.config.sfxVolume, ctx.currentTime);
    sfx.connect(master);
    this.sfxGain = sfx;

    // 4. BGM Bus
    const bgm = ctx.createGain();
    bgm.connect(master);
    this.bgmGain = bgm;
    this.updateBgmVolumes();
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

      // 1. Unlock YouTube BGM immediately so it unmutes and plays smoothly
      youtubeBgmService.unlock();
      if (youtubeBgmService.hasValidSource()) {
        youtubeBgmService.play();
      }

      // 2. Start Synth Battle Groove immediately so user hears punchy music with 0ms latency!
      this.startBattleGroove();

      this.playChime(784, 0.2); // G5 activation chime
      return true;
    }

    return false;
  }

  public setConfig(nextConfig: Partial<SoundConfig>): void {
    this.config = { ...this.config, ...nextConfig };

    if (nextConfig.youtubeUrl !== undefined) {
      youtubeBgmService.setCustomUrl(nextConfig.youtubeUrl);
      if (this.isUnlocked && youtubeBgmService.hasValidSource()) {
        youtubeBgmService.play();
        this.stopBattleGroove();
      }
    }

    const effectiveBgm = this.getEffectiveVolume(true);
    youtubeBgmService.setVolume(effectiveBgm * 100);
    youtubeBgmService.setMuted(this.config.isMuted);

    this.updateBgmVolumes();
  }

  private getEffectiveVolume(isBgm = false): number {
    if (this.config.isMuted) return 0;
    const base = this.config.masterVolume * this.config.sfxVolume;
    if (isBgm) {
      const duckingFactor = this.config.micModeEnabled
        ? AUDIO_PARAMS.DUCKING_BGM_FACTOR
        : AUDIO_PARAMS.NORMAL_BGM_FACTOR;
      return base * duckingFactor;
    }
    const sfxFactor = this.config.micModeEnabled ? 0.5 : 1.0;
    return base * sfxFactor;
  }

  private updateBgmVolumes(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const vol = this.getEffectiveVolume(true);

    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(vol * 0.55, now, 0.08);
    }
    if (this.plasmaGain) {
      this.plasmaGain.gain.setTargetAtTime(vol * 0.28, now, 0.08);
    }
    if (this.sfxGain) {
      const sfxVol = this.config.isMuted ? 0 : this.config.sfxVolume;
      this.sfxGain.gain.setTargetAtTime(sfxVol, now, 0.05);
    }
    if (this.masterGain) {
      const masterVol = this.config.isMuted ? 0 : this.config.masterVolume;
      this.masterGain.gain.setTargetAtTime(masterVol, now, 0.05);
    }
  }

  public onRoundStart(): void {
    this.ensureAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    // Always start battle groove immediately so user hears instant high-energy music
    this.startBattleGroove();

    // Trigger YouTube / Local BGM in parallel; onPlaySuccess will smoothly stop the groove once stream begins
    if (youtubeBgmService.hasValidSource()) {
      youtubeBgmService.play();
    }
  }

  public onRoundEnd(): void {
    this.playPushSound('ROUND_END');
  }

  /**
   * Continuous high-energy 128 BPM electronic battle rhythm + plasma clash sizzle
   */
  public startBattleGroove(): void {
    if (this.beatTimer !== null || !this.audioCtx || this.audioCtx.state !== 'running') {
      return;
    }

    const ctx = this.audioCtx;
    if (!this.bgmGain) {
      this.setupAudioGraph(ctx);
    }
    this.updateBgmVolumes();

    // Plasma Clash Sizzle Node
    if (this.noiseBuffer && !this.plasmaGain) {
      try {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        noiseSource.loop = true;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1400, ctx.currentTime);
        bandpass.Q.setValueAtTime(3.2, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(4.5, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(550, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(bandpass.frequency);

        this.plasmaGain = ctx.createGain();
        this.plasmaGain.gain.setValueAtTime(this.getEffectiveVolume(true) * 0.28, ctx.currentTime);

        noiseSource.connect(bandpass);
        bandpass.connect(this.plasmaGain);
        if (this.bgmGain) {
          this.plasmaGain.connect(this.bgmGain);
        }

        noiseSource.start();
        lfo.start();
      } catch {
        // Plasma sizzle catch
      }
    }

    // 128 BPM Step Sequencer (16th note = ~117.18ms)
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

    // 1. Kick on beats 0, 4, 8, 12 (Punchy EDM/Cyberpunk 4-on-the-floor)
    if (step % 4 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      gain.gain.setValueAtTime(bgmVol * 0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    // 2. Crisp Hi-Hat / Energy Spark on off-beats (step 2, 6, 10, 14)
    if (step % 4 === 2 && this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(bgmVol * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      noise.start(now);
      noise.stop(now + 0.05);
    }

    // 3. Driving Cyberpunk Synth Bassline (A minor riff: A1 -> C2 -> D2 -> G1)
    if (step % 2 === 0) {
      const bassNotes = [55, 65.41, 73.42, 49]; // A1, C2, D2, G1
      const noteFreq = bassNotes[Math.floor(step / 4)] || 55;

      const bass = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(noteFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(130, now + 0.1);

      gain.gain.setValueAtTime(bgmVol * 0.5, now);
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
    gain.connect(this.sfxGain || this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Action SFX with Anime Cyberpunk multi-layer synthesis, stereo panning & dynamic compressor
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

    // Cooldown check for SMALL rapid spam clicks
    const nowMs = performance.now();
    if (type === 'SMALL' && team) {
      if (nowMs - this.lastSmallSoundTime[team] < AUDIO_PARAMS.SMALL_COOLDOWN_MS) {
        return;
      }
      this.lastSmallSoundTime[team] = nowMs;
    }

    const now = ctx.currentTime;
    const targetBus = this.sfxGain || ctx.destination;

    // Stereo Panning (-0.55 for Left team, +0.55 for Right team)
    let panner: StereoPannerNode | null = null;
    try {
      if (ctx.createStereoPanner && team) {
        panner = ctx.createStereoPanner();
        const panValue =
          team === 'LEFT' ? AUDIO_PARAMS.STEREO_PAN_LEFT : AUDIO_PARAMS.STEREO_PAN_RIGHT;
        panner.pan.setValueAtTime(panValue, now);
        panner.connect(targetBus);
      }
    } catch {
      // StereoPanner fallback
    }

    const outputNode: AudioNode = panner || targetBus;

    // Dispatch Sound Type
    if (type === 'SMALL') {
      this.playSmallSfx(ctx, outputNode, effectiveVolume, now, team);
      return;
    }

    if (type === 'MEDIUM') {
      this.playMediumSfx(ctx, outputNode, effectiveVolume, now);
      return;
    }

    if (type === 'LARGE') {
      this.playLargeSfx(ctx, targetBus, effectiveVolume, now);
      return;
    }

    if (type === 'ROUND_END') {
      this.playRoundEndSfx(ctx, targetBus, effectiveVolume, now);
    }
  }

  /**
   * 1. SMALL SFX: Laser Ki-Blast with distinctive personality per team & transient punch
   */
  private playSmallSfx(
    ctx: AudioContext,
    outputNode: AudioNode,
    volume: number,
    now: number,
    team?: TeamId
  ): void {
    // Pitch micro-variation (±4%) avoids robotic fatigue
    const pitchJitter = 0.96 + Math.random() * 0.08;

    if (team === 'LEFT') {
      // Team Left (Pink / Girl): Sharp Anime Ki-Laser blast (Sawtooth + Triangle)
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const gain = ctx.createGain();
      const subGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(940 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(170, now + 0.13);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

      gain.gain.setValueAtTime(volume * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      subGain.gain.setValueAtTime(volume * 0.5, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      subOsc.connect(subGain);
      gain.connect(outputNode);
      subGain.connect(outputNode);

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + 0.13);
      subOsc.stop(now + 0.08);
    } else {
      // Team Right (Cyan / Boy): Cyberpunk Electric Zap (FM Synthesis Modulation)
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(820 * pitchJitter, now);
      carrier.frequency.exponentialRampToValueAtTime(150, now + 0.12);

      modulator.type = 'sawtooth';
      modulator.frequency.setValueAtTime(120, now);
      modGain.gain.setValueAtTime(320, now);
      modGain.gain.exponentialRampToValueAtTime(10, now + 0.12);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      gain.gain.setValueAtTime(volume * 0.72, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      carrier.connect(gain);
      gain.connect(outputNode);

      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + 0.12);
      modulator.stop(now + 0.12);
    }

    // Spark Transient Pop
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(3200, now);
      nFilter.Q.setValueAtTime(3.5, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(volume * 0.45, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(outputNode);
      noise.start(now);
      noise.stop(now + 0.04);
    }
  }

  /**
   * 2. MEDIUM SFX: Super Beam Plasma Cannon (Charging Riser + Detuned Dual Saw Roar + Sub Slam)
   */
  private playMediumSfx(
    ctx: AudioContext,
    outputNode: AudioNode,
    volume: number,
    now: number
  ): void {
    // Phase 1: Energy Charge Riser (0.0s - 0.16s)
    const riser = ctx.createOscillator();
    const riserGain = ctx.createGain();
    riser.type = 'sine';
    riser.frequency.setValueAtTime(130, now);
    riser.frequency.exponentialRampToValueAtTime(880, now + 0.16);

    riserGain.gain.setValueAtTime(volume * 0.5, now);
    riserGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    riser.connect(riserGain);
    riserGain.connect(outputNode);
    riser.start(now);
    riser.stop(now + 0.16);

    // Phase 2: Dual Detuned Saw Plasma Roar (at now + 0.14s)
    const burstTime = now + 0.14;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const blastFilter = ctx.createBiquadFilter();
    const blastGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(370, burstTime);
    osc1.frequency.exponentialRampToValueAtTime(52, burstTime + 0.45);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(378, burstTime); // 8Hz detuned chorus
    osc2.frequency.exponentialRampToValueAtTime(54, burstTime + 0.45);

    blastFilter.type = 'lowpass';
    blastFilter.frequency.setValueAtTime(1800, burstTime);
    blastFilter.frequency.exponentialRampToValueAtTime(260, burstTime + 0.45);

    blastGain.gain.setValueAtTime(volume * 0.95, burstTime);
    blastGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.45);

    osc1.connect(blastFilter);
    osc2.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(outputNode);

    osc1.start(burstTime);
    osc2.start(burstTime);
    osc1.stop(burstTime + 0.45);
    osc2.stop(burstTime + 0.45);

    // Phase 3: Sub Kick Impact Slam
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150, burstTime);
    sub.frequency.exponentialRampToValueAtTime(38, burstTime + 0.4);

    subGain.gain.setValueAtTime(volume * 1.1, burstTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.4);

    sub.connect(subGain);
    subGain.connect(outputNode);
    sub.start(burstTime);
    sub.stop(burstTime + 0.4);
  }

  /**
   * 3. LARGE SFX: Ultimate Clash Detonation (Seismic Sub Drop + Resonant Thunder Blast + Shimmering Ring)
   */
  private playLargeSfx(
    ctx: AudioContext,
    targetBus: AudioNode,
    volume: number,
    now: number
  ): void {
    // 1. Earth-Shaking Seismic Sub-Drop (190Hz -> 26Hz over 1.0s)
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'square';
    sub.frequency.setValueAtTime(190, now);
    sub.frequency.exponentialRampToValueAtTime(26, now + 1.0);

    subGain.gain.setValueAtTime(volume * 1.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    sub.connect(subGain);
    subGain.connect(targetBus);
    sub.start(now);
    sub.stop(now + 1.0);

    // 2. High-Energy Thunder Shockwave Noise Explosion
    if (this.noiseBuffer) {
      const explosion = ctx.createBufferSource();
      explosion.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.85);
      filter.Q.setValueAtTime(3.8, now);

      const expGain = ctx.createGain();
      expGain.gain.setValueAtTime(volume * 1.05, now);
      expGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      explosion.connect(filter);
      filter.connect(expGain);
      expGain.connect(targetBus);
      explosion.start(now);
      explosion.stop(now + 0.85);
    }

    // 3. Cosmic Harmonic Energy Resonance Ring (1260Hz)
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(1260, now + 0.05);
    pingGain.gain.setValueAtTime(volume * 0.4, now + 0.05);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    ping.connect(pingGain);
    pingGain.connect(targetBus);
    ping.start(now + 0.05);
    ping.stop(now + 1.2);
  }

  /**
   * 4. ROUND_END SFX: Victory Fanfare (Heavy Gong Impact + Triumphant C Major Brass Arpeggio)
   */
  private playRoundEndSfx(
    ctx: AudioContext,
    targetBus: AudioNode,
    volume: number,
    now: number
  ): void {
    // Silence/pause BGM to spotlight victory ceremony
    youtubeBgmService.pause();
    this.stopBattleGroove();

    // 1. Heavy Metal Orchestral Gong
    const gong = ctx.createOscillator();
    const gongHarmonic = ctx.createOscillator();
    const gongGain = ctx.createGain();

    gong.type = 'sawtooth';
    gong.frequency.setValueAtTime(95, now);
    gong.frequency.exponentialRampToValueAtTime(45, now + 1.1);

    gongHarmonic.type = 'triangle';
    gongHarmonic.frequency.setValueAtTime(220, now);
    gongHarmonic.frequency.exponentialRampToValueAtTime(90, now + 1.1);

    gongGain.gain.setValueAtTime(volume * 1.15, now);
    gongGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    gong.connect(gongGain);
    gongHarmonic.connect(gongGain);
    gongGain.connect(targetBus);

    gong.start(now);
    gongHarmonic.start(now);
    gong.stop(now + 1.1);
    gongHarmonic.stop(now + 1.1);

    // 2. Triumphant Brass Fanfare (C5 -> E5 -> G5 -> C6 -> E6/G6 Harmonics)
    const fanfareNotes = [
      { freq: 523.25, timeOffset: 0.18, dur: 0.5 }, // C5
      { freq: 659.25, timeOffset: 0.32, dur: 0.5 }, // E5
      { freq: 783.99, timeOffset: 0.46, dur: 0.5 }, // G5
      { freq: 1046.5, timeOffset: 0.6, dur: 0.9 }, // C6
      { freq: 1318.51, timeOffset: 0.74, dur: 1.1 }, // E6
      { freq: 1567.98, timeOffset: 0.74, dur: 1.1 }, // G6 harmony
    ];

    fanfareNotes.forEach((note) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, now + note.timeOffset);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now + note.timeOffset);

      gain.gain.setValueAtTime(volume * 0.75, now + note.timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.timeOffset + note.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(targetBus);

      osc.start(now + note.timeOffset);
      osc.stop(now + note.timeOffset + note.dur);
    });

    // 3. Staggered Confetti Party Micro-Pops
    if (this.noiseBuffer) {
      [0.35, 0.55, 0.75].forEach((popOffset) => {
        const pop = ctx.createBufferSource();
        pop.buffer = this.noiseBuffer;
        const pFilter = ctx.createBiquadFilter();
        pFilter.type = 'bandpass';
        pFilter.frequency.setValueAtTime(2400, now + popOffset);
        const pGain = ctx.createGain();
        pGain.gain.setValueAtTime(volume * 0.4, now + popOffset);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + popOffset + 0.06);

        pop.connect(pFilter);
        pFilter.connect(pGain);
        pGain.connect(targetBus);
        pop.start(now + popOffset);
        pop.stop(now + popOffset + 0.06);
      });
    }
  }
}

export const audioService = new AudioService();
