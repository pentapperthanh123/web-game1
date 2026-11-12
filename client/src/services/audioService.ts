import {
  GAME_CONSTANTS,
  DAMAGE_TYPE,
  DamageType,
  CHAMPION_SKILL_VFX_TYPE,
  ChampionSkillVFXType,
  TEAM_KEY,
  TeamType,
  AUDIO_SFX_CONSTANTS,
} from '../constants/game';

class AudioSynthesizerService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  public isAudioEnabled: boolean = GAME_CONSTANTS.AUDIO.DEFAULT_ENABLED;
  public isTtsEnabled: boolean = GAME_CONSTANTS.AUDIO.DEFAULT_TTS_ENABLED;
  public volume: number = GAME_CONSTANTS.AUDIO.DEFAULT_VOLUME;
  public isCombatMuted: boolean = false;

  public setCombatMuted(muted: boolean): void {
    this.isCombatMuted = muted;
    if (muted) {
      this.stopSilverScrapesBgm();
      this.cancelSpeech();
    }
  }

  private isSpeaking = false;
  private ttsQueue: string[] = [];
  private lastHitSoundTime = 0;
  private lastWhooshSoundTime = 0;
  private lastRoarSoundTime = 0;
  private lastSkillSoundTime = 0;
  private lastComboSoundTime = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      const unlockAudio = () => {
        this.getAudioContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('pointerdown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);
      window.addEventListener('pointerdown', unlockAudio);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // 1. Studio-grade Master Dynamics Compressor (prevents clipping, adds punch & glue)
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
        compressor.knee.setValueAtTime(6, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.1, this.ctx.currentTime);
        compressor.connect(this.ctx.destination);

        // 2. Master Gain Bus
        const master = this.ctx.createGain();
        master.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        master.connect(compressor);
        this.masterGain = master;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  // Get output node with optional stereo panning
  private getOutputNode(pan = 0): AudioNode {
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return ctx?.destination as AudioNode;

    // Use Web Audio StereoPannerNode when available
    if (typeof ctx.createStereoPanner === 'function' && Math.abs(pan) > 0.05) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);
      panner.connect(this.masterGain);
      return panner;
    }

    return this.masterGain;
  }

  // Procedural white noise buffer for wind, fire, electricity and whooshes
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      const bufferSize = Math.round(ctx.sampleRate * 1.1);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  // 1. Procedural Dragon Roar & Elemental Flame/Void Attack (Dynamic per Boss Theme)
  public playBossRoarSound(pitchRateOrElder: number | boolean = 1.0, isEnraged = false): void {
    const pitch = typeof pitchRateOrElder === 'number' ? pitchRateOrElder : (pitchRateOrElder ? 1.0 : 0.85);
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const now = performance.now();
    if (now - this.lastRoarSoundTime < 600) return;
    this.lastRoarSoundTime = now;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const vol = this.volume * (isEnraged ? 1.4 : 1.15);

    // Layer A: Primordial Earthquake Sub-Bass Drop
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime((isEnraged ? 105 : 85) * pitch, t);
    subOsc.frequency.exponentialRampToValueAtTime(24, t + 0.9);

    subGain.gain.setValueAtTime(0.62 * vol, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(t);
    subOsc.stop(t + 0.95);

    // Layer B: Guttural Monster Roar Scream (Dual detuned sawtooth + sub-octave growl)
    const roarOsc1 = ctx.createOscillator();
    const roarOsc2 = ctx.createOscillator();
    const growlSubOsc = ctx.createOscillator();
    const roarGain = ctx.createGain();
    const roarFilter = ctx.createBiquadFilter();

    roarOsc1.type = 'sawtooth';
    roarOsc2.type = 'sawtooth';
    growlSubOsc.type = 'sawtooth';

    const basePitch = (isEnraged ? 152 : 124) * pitch;
    roarOsc1.frequency.setValueAtTime(basePitch, t);
    roarOsc2.frequency.setValueAtTime(basePitch * 1.032, t);
    growlSubOsc.frequency.setValueAtTime(basePitch * 0.52, t);

    roarOsc1.frequency.linearRampToValueAtTime(basePitch * 1.12, t + 0.14);
    roarOsc2.frequency.linearRampToValueAtTime(basePitch * 1.15, t + 0.14);
    roarOsc1.frequency.exponentialRampToValueAtTime(basePitch * 0.42, t + 0.88);
    roarOsc2.frequency.exponentialRampToValueAtTime(basePitch * 0.42, t + 0.88);
    growlSubOsc.frequency.exponentialRampToValueAtTime(basePitch * 0.25, t + 0.9);

    roarFilter.type = 'lowpass';
    roarFilter.frequency.setValueAtTime(950 * pitch, t);
    roarFilter.frequency.exponentialRampToValueAtTime(220, t + 0.9);
    roarFilter.Q.value = 3.2;

    roarGain.gain.setValueAtTime(0.02, t);
    roarGain.gain.linearRampToValueAtTime(0.48 * vol, t + 0.12);
    roarGain.gain.exponentialRampToValueAtTime(0.001, t + 0.92);

    roarOsc1.connect(roarFilter);
    roarOsc2.connect(roarFilter);
    growlSubOsc.connect(roarFilter);
    roarFilter.connect(roarGain);
    roarGain.connect(out);

    roarOsc1.start(t);
    roarOsc2.start(t);
    growlSubOsc.start(t);
    roarOsc1.stop(t + 0.92);
    roarOsc2.stop(t + 0.92);
    growlSubOsc.stop(t + 0.92);

    // Layer C: Elemental Fire Torrent / Void Cavern Breath (Filtered Noise)
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(420 * pitch, t);
    noiseFilter.frequency.linearRampToValueAtTime(1180 * pitch, t + 0.22);
    noiseFilter.frequency.exponentialRampToValueAtTime(210, t + 0.92);
    noiseFilter.Q.value = 1.3;

    noiseGain.gain.setValueAtTime(0.38 * vol, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(out);

    noiseSource.start(t);
    noiseSource.stop(t + 0.95);
  }

  // 1b. Guttural Poke Flinch / Growl (Triggered when user clicks / taps on Boss)
  public playBossPokeSound(pitchRateOrElder: number | boolean = 1.0): void {
    const pitch = typeof pitchRateOrElder === 'number' ? pitchRateOrElder : (pitchRateOrElder ? 1.0 : 0.85);
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const vol = this.volume * 0.95;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.32);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 * pitch, t);
    filter.Q.value = 2.8;

    gain.gain.setValueAtTime(0.42 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // 1c. Subtle Ambient Breathing Whoosh (Periodic ambient idle sound)
  public playBossIdleBreath(pitchRateOrElder: number | boolean = 1.0): void {
    const pitch = typeof pitchRateOrElder === 'number' ? pitchRateOrElder : (pitchRateOrElder ? 1.0 : 0.85);
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const vol = this.volume * 0.42;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380 * pitch, t);
    filter.frequency.linearRampToValueAtTime(620 * pitch, t + 0.4);
    filter.frequency.exponentialRampToValueAtTime(280, t + 0.9);
    filter.Q.value = 1.6;

    gain.gain.setValueAtTime(0.01 * vol, t);
    gain.gain.linearRampToValueAtTime(0.26 * vol, t + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    noise.start(t);
    noise.stop(t + 0.95);
  }

  // 2. Heroic Champion Summon Arrival SFX ("Bay ra ngẫu nhiên & tiếp đất")
  public playSummonArrivalSound(team: TeamType = TEAM_KEY.BLG, isCrit = false): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const pan = team === TEAM_KEY.BLG ? -0.42 : 0.42;
    const out = this.getOutputNode(pan);
    const vol = this.volume * (isCrit ? 1.3 : 1.0);

    // Layer A: Heroic Landing Ground Thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(220, t);
    thudOsc.frequency.exponentialRampToValueAtTime(38, t + 0.22);

    thudGain.gain.setValueAtTime(0.48 * vol, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    thudOsc.connect(thudGain);
    thudGain.connect(out);
    thudOsc.start(t);
    thudOsc.stop(t + 0.24);

    // Layer B: Runic Warp Whoosh
    const whooshOsc = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whooshOsc.type = 'sine';
    whooshOsc.frequency.setValueAtTime(680, t);
    whooshOsc.frequency.exponentialRampToValueAtTime(140, t + 0.18);

    whooshGain.gain.setValueAtTime(0.25 * vol, t);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    whooshOsc.connect(whooshGain);
    whooshGain.connect(out);
    whooshOsc.start(t);
    whooshOsc.stop(t + 0.18);

    // Layer C: Radiant Team Fanfare Triad
    const freqs =
      team === TEAM_KEY.BLG
        ? [587.33, 880.0, 1174.66] // D5, A5, D6 cyan radiance
        : [659.25, 987.77, 1318.51]; // E5, B5, E6 gold victory

    freqs.forEach((freq, idx) => {
      const noteOsc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      noteOsc.type = 'sine';
      noteOsc.frequency.setValueAtTime(freq, t + idx * 0.04);

      noteGain.gain.setValueAtTime(0.22 * vol, t + idx * 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.35);

      noteOsc.connect(noteGain);
      noteGain.connect(out);
      noteOsc.start(t + idx * 0.04);
      noteOsc.stop(t + idx * 0.04 + 0.35);
    });
  }

  // 3. Multi-Layer Distinct Champion Skill SFX
  public playChampionSkillSound(
    vfxType: ChampionSkillVFXType = CHAMPION_SKILL_VFX_TYPE.ARROW,
    isCrit = false,
    team?: TeamType
  ): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const now = performance.now();
    if (!isCrit && now - this.lastSkillSoundTime < AUDIO_SFX_CONSTANTS.SKILL_THROTTLE_MS) {
      return;
    }
    this.lastSkillSoundTime = now;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const pan = team === TEAM_KEY.BLG ? -0.38 : team === TEAM_KEY.GENG ? 0.38 : 0;
    const out = this.getOutputNode(pan);
    const vol = this.volume * (isCrit ? 1.25 : 1.0);

    switch (vfxType) {
      case CHAMPION_SKILL_VFX_TYPE.SHURIKEN: {
        // High-speed spinning razor blade whirr with 42Hz tremolo (Zed, Akali)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(isCrit ? 1550 : 1250, t);
        osc.frequency.exponentialRampToValueAtTime(260, t + 0.11);

        // Fast tremolo modulation
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(42, t);
        lfoGain.gain.setValueAtTime(0.12 * vol, t);
        lfo.connect(lfoGain.gain);

        gain.gain.setValueAtTime(0.24 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        lfo.start(t);
        osc.stop(t + 0.11);
        lfo.stop(t + 0.11);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.LASER: {
        // Ionized prismatic laser beam with pre-charge chirp (Lux)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(480, t);
        osc1.frequency.exponentialRampToValueAtTime(2100, t + 0.07);
        osc2.frequency.setValueAtTime(240, t);
        osc2.frequency.exponentialRampToValueAtTime(1050, t + 0.07);

        gain.gain.setValueAtTime(0.26 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(out);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.14);
        osc2.stop(t + 0.14);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.TORNADO: {
        // Howling wind turbulence using filtered white noise + steel swing (Yasuo)
        const noise = ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(260, t);
        filter.frequency.linearRampToValueAtTime(1180, t + 0.09);
        filter.frequency.exponentialRampToValueAtTime(280, t + 0.2);
        filter.Q.value = 2.2;

        noiseGain.gain.setValueAtTime(0.32 * vol, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(out);
        noise.start(t);
        noise.stop(t + 0.2);

        // Steel sword whoosh undertone
        const swordOsc = ctx.createOscillator();
        const swordGain = ctx.createGain();
        swordOsc.type = 'sawtooth';
        swordOsc.frequency.setValueAtTime(460, t);
        swordOsc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
        swordGain.gain.setValueAtTime(0.18 * vol, t);
        swordGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        swordOsc.connect(swordGain);
        swordGain.connect(out);
        swordOsc.start(t);
        swordOsc.stop(t + 0.12);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB: {
        // Ethereal mystical Fox-Fire bell chord: C5 + G5 + D6 (Ahri)
        const notes = [523.25, 783.99, 1174.66];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.02);

          gain.gain.setValueAtTime(0.2 * vol, t + idx * 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.02 + 0.22);

          osc.connect(gain);
          gain.connect(out);
          osc.start(t + idx * 0.02);
          osc.stop(t + idx * 0.02 + 0.22);
        });
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE: {
        // Staggered salvo of 3 high-tech plasma dart pings (Kai'Sa)
        [0, 0.038, 0.076].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(isCrit ? 1040 : 860, t + delay);
          osc.frequency.exponentialRampToValueAtTime(280, t + delay + 0.06);

          gain.gain.setValueAtTime(0.15 * vol, t + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.06);

          osc.connect(gain);
          gain.connect(out);
          osc.start(t + delay);
          osc.stop(t + delay + 0.06);
        });
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.JAVELIN: {
        // Piercing aerodynamic spear throw + whistling air hiss (Nidalee)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(isCrit ? 1050 : 820, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.14);

        gain.gain.setValueAtTime(0.28 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.14);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.CRESCENT_ARC: {
        // Brilliant radiant energy arc wave chime (Ezreal)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, t);
        osc.frequency.linearRampToValueAtTime(1318.51, t + 0.09);

        gain.gain.setValueAtTime(0.26 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.16);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.SONIC_WAVE: {
        // Dragon Qi sonic resonant blast: sub punch + resonant ring (Lee Sin)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(360, t);
        osc.frequency.exponentialRampToValueAtTime(75, t + 0.16);

        gain.gain.setValueAtTime(0.32 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.16);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.MELEE_LEAP: {
        // Grandmaster's lantern heavy strike (Jax, Xin Zhao, K'Sante)
        this.playSlashSound(isCrit);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN: {
        // Jax: Metallic spinning hum with electric crackle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(isCrit ? 520 : 380, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.16);

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(isCrit ? 60 : 35, t);
        lfoGain.gain.setValueAtTime(60, t);
        lfo.connect(osc.frequency);

        gain.gain.setValueAtTime(0.28 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        lfo.start(t);
        osc.stop(t + 0.16);
        lfo.stop(t + 0.16);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR: {
        // Xin Zhao: High-velocity piercing wind thrust
        const noise = ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isCrit ? 2200 : 1600, t);
        filter.frequency.exponentialRampToValueAtTime(450, t + 0.14);
        filter.Q.value = 4.0;

        noiseGain.gain.setValueAtTime(0.32 * vol, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(out);
        noise.start(t);
        noise.stop(t + 0.14);

        const tipOsc = ctx.createOscillator();
        const tipGain = ctx.createGain();
        tipOsc.type = 'triangle';
        tipOsc.frequency.setValueAtTime(isCrit ? 1200 : 880, t);
        tipOsc.frequency.exponentialRampToValueAtTime(220, t + 0.09);
        tipGain.gain.setValueAtTime(0.22 * vol, t);
        tipGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        tipOsc.connect(tipGain);
        tipGain.connect(out);
        tipOsc.start(t);
        tipOsc.stop(t + 0.09);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM: {
        // K'Sante: Heavy blunt stone slam + earth rumble
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isCrit ? 180 : 130, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.22);

        gain.gain.setValueAtTime(0.42 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.22);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH: {
        // Nautilus: Heavy iron anchor clank + deep underwater metallic dredge
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(isCrit ? 220 : 160, t);
        osc1.frequency.exponentialRampToValueAtTime(45, t + 0.25);
        osc2.frequency.setValueAtTime(isCrit ? 110 : 80, t);
        osc2.frequency.exponentialRampToValueAtTime(25, t + 0.25);

        gain.gain.setValueAtTime(0.38 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(out);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.25);
        osc2.stop(t + 0.25);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.GOLDEN_FEATHER: {
        // Rakan: Shimmering golden plumage chime + celestial sweep
        [587.33, 880, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.025);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + idx * 0.025 + 0.12);

          gain.gain.setValueAtTime(0.18 * vol, t + idx * 0.025);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.025 + 0.12);

          osc.connect(gain);
          gain.connect(out);
          osc.start(t + idx * 0.025);
          osc.stop(t + idx * 0.025 + 0.12);
        });
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.SAND_SOLDIER: {
        // Azir: Shurima desert sand whoosh + imperial brass charge
        const noise = ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(2400, t + 0.12);
        filter.Q.value = 2.5;

        noiseGain.gain.setValueAtTime(0.24 * vol, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(out);
        noise.start(t);
        noise.stop(t + 0.12);

        const horn = ctx.createOscillator();
        const hornGain = ctx.createGain();
        horn.type = 'sawtooth';
        horn.frequency.setValueAtTime(isCrit ? 440 : 330, t);
        horn.frequency.exponentialRampToValueAtTime(isCrit ? 660 : 495, t + 0.1);
        hornGain.gain.setValueAtTime(0.2 * vol, t);
        hornGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        horn.connect(hornGain);
        hornGain.connect(out);
        horn.start(t);
        horn.stop(t + 0.1);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.DARKIN_BLADE: {
        // Aatrox: Heavy demonic broadsword cleave with dark undertone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(isCrit ? 260 : 190, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.2);

        gain.gain.setValueAtTime(0.38 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.2);
        this.playSlashSound(isCrit);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.BLADE_SLASH: {
        // Dual spirit katana cross-cut (Yone, Aatrox, Irelia)
        this.playSlashSound(isCrit);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.SPINNING_AXE: {
        // Draven: Heavy spinning axe whirr + metallic thrum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(isCrit ? 380 : 280, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.16);

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(32, t);
        lfoGain.gain.setValueAtTime(0.18 * vol, t);
        lfo.connect(lfoGain.gain);

        gain.gain.setValueAtTime(0.3 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        gain.connect(out);
        lfo.start(t);
        osc.start(t);
        lfo.stop(t + 0.16);
        osc.stop(t + 0.16);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.ROCKET_MISSILE: {
        // Jinx: Rocket launch propellant whoosh + punchy blast
        const noise = ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, t);
        filter.frequency.exponentialRampToValueAtTime(1200, t + 0.18);
        filter.Q.value = 2.0;

        noiseGain.gain.setValueAtTime(0.35 * vol, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(out);
        noise.start(t);
        noise.stop(t + 0.18);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.SHOCK_ORB: {
        // Jayce: High-voltage electric arc hum + ionization zap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(isCrit ? 920 : 680, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.14);

        gain.gain.setValueAtTime(0.24 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.14);
        break;
      }

      case CHAMPION_SKILL_VFX_TYPE.SPIRIT_SPEAR: {
        // Kalista: Ghostly ethereal soul whisper + piercing thrust
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isCrit ? 1100 : 840, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.15);

        gain.gain.setValueAtTime(0.26 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }

      default: {
        // High-tension bowstring snap & aerodynamic arrow whoosh
        this.playAttackWhoosh(isCrit, false);
        break;
      }
    }
  }

  // 4. Visceral Multi-Layer Damage Impact Sound (Hit feeling on Baron / Elder Dragon)
  public playDamageImpactSound(damageType: DamageType = DAMAGE_TYPE.NORMAL, isCrit = false): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const now = performance.now();
    if (now - this.lastHitSoundTime < 32) return;
    this.lastHitSoundTime = now;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const isUltimate = damageType === DAMAGE_TYPE.ULTIMATE;
    const isCritical = isCrit || damageType === DAMAGE_TYPE.CRIT;
    const vol = this.volume;

    // Layer A: Punchy Low-End Sub Kick Thump
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    const startBass = isUltimate ? 240 : isCritical ? 210 : 165;
    const endBass = isUltimate ? 24 : isCritical ? 34 : 40;
    const duration = isUltimate ? 0.35 : isCritical ? 0.22 : 0.12;

    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(startBass * (0.96 + Math.random() * 0.08), t);
    bassOsc.frequency.exponentialRampToValueAtTime(endBass, t + duration);

    bassGain.gain.setValueAtTime((isUltimate ? 0.52 : isCritical ? 0.42 : 0.28) * vol, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    bassOsc.connect(bassGain);
    bassGain.connect(out);
    bassOsc.start(t);
    bassOsc.stop(t + duration);

    // Layer B: Crunchy Flesh/Armor Impact Bite
    const midOsc = ctx.createOscillator();
    const midGain = ctx.createGain();
    midOsc.type = 'sawtooth';
    midOsc.frequency.setValueAtTime(340 * (0.92 + Math.random() * 0.16), t);
    midOsc.frequency.exponentialRampToValueAtTime(55, t + 0.08);

    midGain.gain.setValueAtTime(0.14 * vol, t);
    midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    midOsc.connect(midGain);
    midGain.connect(out);
    midOsc.start(t);
    midOsc.stop(t + 0.08);

    // Layer C & D: Visceral Crit Armor-Crack Snap + Crisp Dual-Harmonic Strike (no beepy sine droop)
    if (isCritical || isUltimate) {
      const snapNoise = ctx.createBufferSource();
      snapNoise.buffer = this.getNoiseBuffer(ctx);
      const snapFilter = ctx.createBiquadFilter();
      const snapGain = ctx.createGain();

      snapFilter.type = 'bandpass';
      snapFilter.frequency.setValueAtTime(isUltimate ? 2800 : 2200, t);
      snapFilter.frequency.exponentialRampToValueAtTime(650, t + 0.085);
      snapFilter.Q.value = 1.7;

      snapGain.gain.setValueAtTime((isUltimate ? 0.55 : 0.42) * vol, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      snapNoise.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(out);
      snapNoise.start(t);
      snapNoise.stop(t + 0.095);

      const strikeFreqs = isUltimate ? [523.25, 783.99, 1046.5] : [440, 659.25];
      strikeFreqs.forEach((freq, idx) => {
        const critOsc = ctx.createOscillator();
        const critGain = ctx.createGain();
        critOsc.type = idx === 0 ? 'triangle' : 'sine';
        critOsc.frequency.setValueAtTime(freq * 0.96, t);
        critOsc.frequency.exponentialRampToValueAtTime(freq * 1.04, t + 0.04);

        const peakGain = (idx === 0 ? 0.24 : 0.16) * (isUltimate ? 1.25 : 1.0) * vol;
        critGain.gain.setValueAtTime(peakGain, t);
        critGain.gain.exponentialRampToValueAtTime(0.001, t + (isUltimate ? 0.22 : 0.14));

        critOsc.connect(critGain);
        critGain.connect(out);
        critOsc.start(t);
        critOsc.stop(t + 0.24);
      });
    }
  }

  // 5. Procedural Blade Slash Strike (Jax, Xin Zhao, Yone, K'Sante)
  public playSlashSound(isCrit = false): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    const pitch = (isCrit ? 720 : 540) * (0.94 + Math.random() * 0.12);
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, t);
    filter.frequency.exponentialRampToValueAtTime(380, t + 0.12);
    filter.Q.value = 1.9;

    gain.gain.setValueAtTime((isCrit ? 0.32 : 0.2) * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // 6. Combo Milestone Hype Fanfare (Combo x10, x25, x50, x100)
  public playComboMilestoneSound(comboCount: number): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const now = performance.now();
    if (now - this.lastComboSoundTime < AUDIO_SFX_CONSTANTS.COMBO_MILESTONE_THROTTLE_MS) {
      return;
    }
    this.lastComboSoundTime = now;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const chord =
      comboCount >= 50
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51] // C Major 9 epic glory
        : [587.33, 739.99, 880.0, 1174.66]; // D Major fanfare

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.24 * this.volume, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.45);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.45);
    });
  }

  // 7. Procedural Attack Whoosh
  public playAttackWhoosh(isCrit = false, isMelee = false): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const now = performance.now();
    if (now - this.lastWhooshSoundTime < 40) return;
    this.lastWhooshSoundTime = now;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (isMelee) {
      this.playSlashSound(isCrit);
      return;
    }

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const baseFreq = (isCrit ? 1180 : 880) * (0.92 + Math.random() * 0.16);

    osc.type = isCrit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(170, t + 0.1);

    gain.gain.setValueAtTime((isCrit ? 0.24 : 0.15) * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Backward-compatible alias for existing callers
  public playHitSound(): void {
    this.playDamageImpactSound(DAMAGE_TYPE.NORMAL, false);
  }

  // Backward-compatible alias for laser callers
  public playLaserSound(): void {
    this.playAttackWhoosh(false, false);
  }

  // 8. Procedural Gift / Fanfare Sound
  public playGiftFanfare(): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 chord
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.28 * this.volume, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.55);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.55);
    });
  }

  // 9. Procedural Victory Sound
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
    const out = this.getOutputNode(0);
    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, start);

      gain.gain.setValueAtTime(0.42 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.d);

      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + note.d);
      start += note.d * 0.85;
    });
  }

  // 10. Procedural Champion Defeat / Death Sound
  public playChampionDeathSound(): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);

    // Dramatic defeat resonance gong with exponential pitch decay
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.65);

    gain.gain.setValueAtTime(0.24 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  // 10b. Cinematic Boss Execution / Shatter Explosion Sound
  public playBossDefeatSound(pitchRateOrElder: number | boolean = 1.0): void {
    const pitch = typeof pitchRateOrElder === 'number' ? pitchRateOrElder : (pitchRateOrElder ? 1.0 : 0.85);
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const vol = Math.min(1.5, this.volume * 1.35);

    // Layer 1: Deep Tectonic Implosion Sub-Boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(22, t + 1.25);
    subGain.gain.setValueAtTime(0.65 * vol, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(t);
    subOsc.stop(t + 1.35);

    // Layer 2: Shattering Energy Blast Noise Sweep
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500 * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(140, t + 0.9);
    filter.Q.value = 1.4;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.42 * vol, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(t);
    noise.stop(t + 0.95);

    // Layer 3: Crystal Rupture High Resonance Chime
    const chimeNotes = [440 * pitch, 660 * pitch, 990 * pitch];
    chimeNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = t + 0.08 + idx * 0.09;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + 0.75);
      gain.gain.setValueAtTime(0.22 * vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
      osc.connect(gain);
      gain.connect(out);
      osc.start(startTime);
      osc.stop(startTime + 0.85);
    });
  }

  // 11. Procedural Heart Sparkle Chime
  public playHeartChime(): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100 + Math.random() * 320, t);

    gain.gain.setValueAtTime(0.1 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // 11b. Global Divine Healing Angelic Chime & Chord (Toàn Bản Đồ Hồi Phục)
  public playGlobalDivineHealSound(): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5 - E5 - G5 - C6 - E6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = t + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      const maxGain = 0.18 * this.volume;
      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.exponentialRampToValueAtTime(maxGain, noteTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.9);

      osc.connect(gain);
      gain.connect(out);

      osc.start(noteTime);
      osc.stop(noteTime + 0.95);
    });
  }

  // 11c. Boss Enrage Phase Warning Siren (<= 35% HP)
  public playBossEnrageSound(pitchRateOrElder: number | boolean = 1.0): void {
    const pitch = typeof pitchRateOrElder === 'number' ? pitchRateOrElder : (pitchRateOrElder ? 1.0 : 0.85);
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);

    const sirenOsc = ctx.createOscillator();
    const sirenGain = ctx.createGain();
    sirenOsc.type = 'sawtooth';
    sirenOsc.frequency.setValueAtTime(115 * pitch, t);
    sirenOsc.frequency.exponentialRampToValueAtTime(350 * pitch, t + 0.35);
    sirenOsc.frequency.exponentialRampToValueAtTime(65, t + 0.72);

    sirenGain.gain.setValueAtTime(0.32 * this.volume, t);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    sirenOsc.connect(sirenGain);
    sirenGain.connect(out);
    sirenOsc.start(t);
    sirenOsc.stop(t + 0.75);

    this.playBossRoarSound(pitch, true);
  }

  // 11d. Esports Match / Round Start Horn Triad
  public playRoundStartSound(): void {
    this.setCombatMuted(false);
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const notes = [293.66, 440.0, 587.33]; // D4 - A4 - D5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = t + idx * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.24 * this.volume, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.42);

      osc.connect(gain);
      gain.connect(out);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  // 11e. Subtle Tactile UI Toggle Click
  public playUiToggleSound(isEnabled = true): void {
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const startFreq = isEnabled
      ? AUDIO_SFX_CONSTANTS.UI_CLICK_FREQ_ON
      : AUDIO_SFX_CONSTANTS.UI_CLICK_FREQ_OFF;
    const endFreq = isEnabled ? startFreq * 1.25 : startFreq * 0.72;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.07);

    gain.gain.setValueAtTime(0.14 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.085);
  }

  // 12. Silver Scrapes Duel Audio
  private silverScrapesBgmTimer: number | null = null;

  public startSilverScrapesBgm(): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    this.stopSilverScrapesBgm();

    const ctx = this.getAudioContext();
    if (!ctx) return;

    let step = 0;
    const notes = [146.83, 146.83, 174.61, 196.0, 220.0, 196.0, 174.61, 146.83];
    const intervalMs = 280;

    const tick = () => {
      if (!this.isAudioEnabled || this.isCombatMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const out = this.getOutputNode(0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = notes[step % notes.length];
      step++;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 0.22);

      gain.gain.setValueAtTime(0.18 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.25);
    };

    tick();
    this.silverScrapesBgmTimer = window.setInterval(tick, intervalMs);
  }

  public stopSilverScrapesBgm(): void {
    if (this.silverScrapesBgmTimer !== null) {
      clearInterval(this.silverScrapesBgmTimer);
      this.silverScrapesBgmTimer = null;
    }
  }

  public playBeamBurstSound(isUltimate = false): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isUltimate ? 'sawtooth' : 'triangle';
    const startFreq = isUltimate ? 580 : 380;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + (isUltimate ? 0.35 : 0.18));

    gain.gain.setValueAtTime((isUltimate ? 0.35 : 0.2) * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isUltimate ? 0.38 : 0.2));

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + (isUltimate ? 0.4 : 0.22));
  }

  // 13. Web Speech API (Vietnamese TTS)
  public cancelSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.ttsQueue = [];
    this.isSpeaking = false;
  }

  public speak(text: string): void {
    if (!this.isTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Sanitize: strip out numeric IDs and raw numbers (e.g. Viewer_830, Gamer_Pro_99_358, 120000)
    const sanitized = text
      .replace(/[A-Za-z0-9_]*_\d+[A-Za-z0-9_]*/g, '')
      .replace(/\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!sanitized) return;

    if (this.ttsQueue.length >= 4) {
      this.ttsQueue.shift();
    }
    this.ttsQueue.push(sanitized);
    this.processTtsQueue();
  }

  private processTtsQueue(): void {
    if (this.isSpeaking || this.ttsQueue.length === 0) return;

    const text = this.ttsQueue.shift();
    if (!text) return;

    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.15;
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
