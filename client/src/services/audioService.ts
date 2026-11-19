import { Howler } from 'howler';
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
import { AudioDensityGate } from './audioDensityGate';
import { QUAKE_SFX } from '../constants/bossUltimateFeedback';
import { isCurrentRoundIntroActive } from '../store/roundIntroStore';

export const AUDIO_BUS = {
  /** Stingers, fanfares, boss voice: never ducked. */
  MASTER: 'MASTER',
  /** Hits, whooshes, chimes, ambience: density-limited and ducked under stingers. */
  COMBAT: 'COMBAT',
} as const;
export type AudioBus = (typeof AUDIO_BUS)[keyof typeof AUDIO_BUS];

/** Synth firework for big gifts: a noise crack, then a few falling sparkle pings. */
const FIREWORK_SFX = {
  CRACK_GAIN: 0.22,
  CRACK_DURATION_S: 0.32,
  CRACK_FILTER_START_HZ: 5200,
  CRACK_FILTER_END_HZ: 900,
  SPARKLE_COUNT: 4,
  SPARKLE_GAIN: 0.07,
  SPARKLE_BASE_HZ: 2400,
  SPARKLE_SPREAD_HZ: 1800,
  SPARKLE_FIRST_DELAY_S: 0.08,
  SPARKLE_STEP_S: 0.07,
  SPARKLE_DURATION_S: 0.18,
  PAN_SPREAD: 0.7,
  SILENCE_GAIN: 0.001,
} as const;

const resolveTeamPan = (team: TeamType | undefined, width: number): number => {
  if (team === TEAM_KEY.BLG) return -width;
  if (team === TEAM_KEY.GENG) return width;
  return 0;
};

/** Silver Scrapes duel loop: D minor riff, one note per step. */
const BGM_SEQUENCE = {
  NOTES: [146.83, 146.83, 174.61, 196.0, 220.0, 196.0, 174.61, 146.83],
  STEP_MS: 280,
  BEATS_PER_BAR: 4,
  NOTE_S: 0.24,
  ATTACK_S: 0.02,
  LEAD_GAIN: 0.12,
  LEAD_FILTER_HZ: 900,
  LEAD_FILTER_FLOOR_HZ: 320,
  LEAD_FILTER_Q: 1.2,
  SUB_GAIN: 0.2,
  SUB_S: 0.2,
} as const;

export interface SpeakOptions {
  rate?: number;
}

export interface TtsQueueItem {
  text: string;
  rate: number;
}

export const TTS_CONSTANTS = {
  MAX_QUEUE: 3,
  DEFAULT_RATE: 1.08,
} as const;

/**
 * Keeps names readable: "Viewer_830" → "Viewer", "Gamer_Pro_99_358" → "Gamer Pro",
 * long numbers dropped, underscores spoken as spaces. The old version removed the whole token,
 * so such names were read as nothing.
 */
/** Digit runs of 4+ are IDs or raw amounts nobody wants read aloud. */
const LONG_NUMBER_PATTERN = /\d{4,}/g;

export const sanitizeSpeechText = (text: string): string =>
  text
    .replace(/(_\d+)+/g, '')
    .replace(LONG_NUMBER_PATTERN, '')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

class AudioSynthesizerService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private combatGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly impactGate = new AudioDensityGate(AUDIO_SFX_CONSTANTS.IMPACT_THROTTLE_MS);
  private readonly skillGate = new AudioDensityGate(AUDIO_SFX_CONSTANTS.SKILL_THROTTLE_MS);
  private readonly whooshGate = new AudioDensityGate(AUDIO_SFX_CONSTANTS.WHOOSH_THROTTLE_MS);

  public isAudioEnabled: boolean = GAME_CONSTANTS.AUDIO.DEFAULT_ENABLED;
  public isTtsEnabled: boolean = GAME_CONSTANTS.AUDIO.DEFAULT_TTS_ENABLED;
  public volume: number = GAME_CONSTANTS.AUDIO.DEFAULT_VOLUME;
  public isCombatMuted: boolean = false;
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (typeof window !== 'undefined') {
      Howler.volume(this.volume);
    }
  }

  public setCombatMuted(muted: boolean): void {
    this.isCombatMuted = muted;
    if (muted) {
      this.stopSilverScrapesBgm();
      this.cancelSpeech();
    }
  }

  private lastRoarSoundTime = 0;
  private lastComboSoundTime = 0;
  private lastHeartChimeTime = 0;

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

      // Auto-resume audio when browser window regains focus or visibility
      const resumeSuspendedAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };
      window.addEventListener('focus', resumeSuspendedAudio);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) resumeSuspendedAudio();
        });
      }
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

        // 3. Combat Bus: rapid gameplay sounds share one gain so stingers can duck them
        const combat = this.ctx.createGain();
        combat.gain.setValueAtTime(AUDIO_SFX_CONSTANTS.COMBAT_BUS_LEVEL, this.ctx.currentTime);
        combat.connect(master);
        this.combatGain = combat;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /** Output node with optional stereo panning, routed through the requested bus. */
  private getOutputNode(pan = 0, bus: AudioBus = AUDIO_BUS.COMBAT): AudioNode {
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return ctx?.destination as AudioNode;

    const busNode = bus === AUDIO_BUS.COMBAT && this.combatGain ? this.combatGain : this.masterGain;
    if (typeof ctx.createStereoPanner === 'function' && Math.abs(pan) > 0.05) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);
      panner.connect(busNode);
      return panner;
    }

    return busNode;
  }

  /** Context + combat-bus input for long-running layers (arena ambience); null when audio is off. */
  public getCombatOutput(): { ctx: AudioContext; node: AudioNode } | null {
    if (!this.isAudioEnabled) return null;
    const ctx = this.getAudioContext();
    if (!ctx) return null;
    return { ctx, node: this.getOutputNode(0, AUDIO_BUS.COMBAT) };
  }

  /** Briefly lowers the combat bus so a stinger (victory, boss ultimate...) stands out. */
  public duckCombat(durationMs: number): void {
    const ctx = this.getAudioContext();
    if (!ctx || !this.combatGain) return;
    const t = ctx.currentTime;
    const gain = this.combatGain.gain;
    const duckedLevel = AUDIO_SFX_CONSTANTS.COMBAT_BUS_LEVEL * AUDIO_SFX_CONSTANTS.DUCK_LEVEL;
    const releaseStart = t + durationMs / 1000;
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(gain.value, t);
    gain.linearRampToValueAtTime(duckedLevel, t + AUDIO_SFX_CONSTANTS.DUCK_ATTACK_S);
    gain.setValueAtTime(duckedLevel, releaseStart);
    gain.linearRampToValueAtTime(
      AUDIO_SFX_CONSTANTS.COMBAT_BUS_LEVEL,
      releaseStart + AUDIO_SFX_CONSTANTS.DUCK_RELEASE_S
    );
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
    if (!this.isAudioEnabled || this.isCombatMuted || isCurrentRoundIntroActive()) return;
    const now = performance.now();
    if (now - this.lastRoarSoundTime < 600) return;
    this.lastRoarSoundTime = now;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
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
  public playBossIdleBreath(_pitchRateOrElder: number | boolean = 1.0): void {
    // Disabled boss breathing sound per user request
    return;
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

    // Layer A: Heroic Landing Ground Thud (Sub-bass impact)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(160, t);
    thudOsc.frequency.exponentialRampToValueAtTime(32, t + 0.22);

    thudGain.gain.setValueAtTime(0.52 * vol, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    thudOsc.connect(thudGain);
    thudGain.connect(out);
    thudOsc.start(t);
    thudOsc.stop(t + 0.24);

    // Layer B: Teleport Arcane Touchdown Surge (In-game spatial vortex surge, zero whistle)
    const warpOsc = ctx.createOscillator();
    const warpGain = ctx.createGain();
    warpOsc.type = 'triangle';
    warpOsc.frequency.setValueAtTime(280, t);
    warpOsc.frequency.exponentialRampToValueAtTime(80, t + 0.18);

    warpGain.gain.setValueAtTime(0.38 * vol, t);
    warpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    warpOsc.connect(warpGain);
    warpGain.connect(out);
    warpOsc.start(t);
    warpOsc.stop(t + 0.2);

    // Layer C: Radiant Team Harmonic Resonance (Warm low-mid arcane tone, no high-pitch whistle)
    const freqs =
      team === TEAM_KEY.BLG
        ? [146.83, 220.0, 293.66] // D3, A3, D4 warm cyan radiance
        : [164.81, 246.94, 329.63]; // E3, B3, E4 warm gold mythic chime

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
    const gate = this.skillGate.request(performance.now());
    if (!gate.shouldPlay && !isCrit) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(resolveTeamPan(team, 0.38));
    const critBoost = isCrit ? 1.25 : 1.0;
    const vol = this.volume * critBoost * Math.max(gate.gainScale, AUDIO_SFX_CONSTANTS.DENSITY_MIN_GAIN);

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
    const gate = this.impactGate.request(performance.now());
    if (!gate.shouldPlay) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const isUltimate = damageType === DAMAGE_TYPE.ULTIMATE;
    const isCritical = isCrit || damageType === DAMAGE_TYPE.CRIT;
    const vol = this.volume * gate.gainScale;

    // Layer A: Punchy Low-End Sub Kick Thump
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    const cfg = AUDIO_SFX_CONSTANTS.CHAMPION_ATTACK_SFX;
    const startBass = isUltimate ? 240 : isCritical ? 210 : cfg.HIT_BASS_START;
    const endBass = isUltimate ? 24 : isCritical ? 34 : cfg.HIT_BASS_END;
    const duration = isUltimate ? 0.35 : isCritical ? 0.22 : 0.07;

    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(startBass * (0.96 + Math.random() * 0.08), t);
    bassOsc.frequency.exponentialRampToValueAtTime(endBass, t + duration);

    bassGain.gain.setValueAtTime((isUltimate ? 0.52 : isCritical ? 0.42 : 0.22) * vol, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    bassOsc.connect(bassGain);
    bassGain.connect(out);
    bassOsc.start(t);
    bassOsc.stop(t + duration);

    // Layer B: Crisp Physical Flesh/Armor Impact Bite (Replaced harsh sawtooth with filtered impact transient)
    const hitNoise = ctx.createBufferSource();
    hitNoise.buffer = this.getNoiseBuffer(ctx);
    const hitFilter = ctx.createBiquadFilter();
    const hitGain = ctx.createGain();

    hitFilter.type = 'bandpass';
    hitFilter.frequency.setValueAtTime(cfg.HIT_CRACK_FREQ * (0.94 + Math.random() * 0.12), t);
    hitFilter.frequency.exponentialRampToValueAtTime(320, t + 0.05);
    hitFilter.Q.value = 1.6;

    hitGain.gain.setValueAtTime(0.18 * vol, t);
    hitGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    hitNoise.connect(hitFilter);
    hitFilter.connect(hitGain);
    hitGain.connect(out);
    hitNoise.start(t);
    hitNoise.stop(t + 0.055);

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
    const vol = (isCrit ? 0.28 : 0.18) * this.volume;
    const cfg = AUDIO_SFX_CONSTANTS.CHAMPION_ATTACK_SFX;

    // Layer A: Fast blade air slicing whoosh
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cfg.MELEE_START_FREQ * (0.95 + Math.random() * 0.1), t);
    filter.frequency.exponentialRampToValueAtTime(cfg.MELEE_END_FREQ, t + cfg.MELEE_DUR_S);
    filter.Q.value = 2.2;

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, t + cfg.MELEE_DUR_S);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    noise.start(t);
    noise.stop(t + cfg.MELEE_DUR_S);

    // Layer B: Subtle metallic steel edge ring
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1150 * (0.96 + Math.random() * 0.08), t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.06);

    oscGain.gain.setValueAtTime(vol * 0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(oscGain);
    oscGain.connect(out);
    osc.start(t);
    osc.stop(t + 0.06);
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
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
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

  // 7. Procedural Attack Whoosh (Physical bowstring snap & aerodynamic projectile release)
  public playAttackWhoosh(isCrit = false, isMelee = false): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const gate = this.whooshGate.request(performance.now());
    if (!gate.shouldPlay) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (isMelee) {
      this.playSlashSound(isCrit);
      return;
    }

    const t = ctx.currentTime;
    const out = this.getOutputNode(0);
    const vol = (isCrit ? 0.22 : 0.14) * this.volume * gate.gainScale;
    const cfg = AUDIO_SFX_CONSTANTS.CHAMPION_ATTACK_SFX;

    // Layer A: Aerodynamic air displacement / projectile whoosh (filtered noise transient, zero laser chirp)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cfg.AERO_START_FREQ * (0.95 + Math.random() * 0.1), t);
    filter.frequency.exponentialRampToValueAtTime(cfg.AERO_END_FREQ, t + cfg.AERO_DUR_S);
    filter.Q.value = 2.0;

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.85, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + cfg.AERO_DUR_S);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    noise.start(t);
    noise.stop(t + cfg.AERO_DUR_S);

    // Layer B: Subtle acoustic bowstring snap / projectile release transient
    const pluckOsc = ctx.createOscillator();
    const pluckGain = ctx.createGain();
    pluckOsc.type = 'triangle';
    pluckOsc.frequency.setValueAtTime(cfg.PLUCK_START_FREQ * (0.96 + Math.random() * 0.08), t);
    pluckOsc.frequency.exponentialRampToValueAtTime(cfg.PLUCK_END_FREQ, t + cfg.PLUCK_DUR_S);

    pluckGain.gain.setValueAtTime(vol * 0.65, t);
    pluckGain.gain.exponentialRampToValueAtTime(0.001, t + cfg.PLUCK_DUR_S);

    pluckOsc.connect(pluckGain);
    pluckGain.connect(out);
    pluckOsc.start(t);
    pluckOsc.stop(t + cfg.PLUCK_DUR_S);
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
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
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

  /** Firework burst layered under BIG / MEGA gift shells (panned randomly so a volley feels wide). */
  public playFireworkBurst(): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const startAt = ctx.currentTime;
    const pan = (Math.random() * 2 - 1) * FIREWORK_SFX.PAN_SPREAD;
    const out = this.getOutputNode(pan, AUDIO_BUS.MASTER);

    const crack = ctx.createBufferSource();
    crack.buffer = this.getNoiseBuffer(ctx);
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(FIREWORK_SFX.CRACK_FILTER_START_HZ, startAt);
    crackFilter.frequency.exponentialRampToValueAtTime(FIREWORK_SFX.CRACK_FILTER_END_HZ, startAt + FIREWORK_SFX.CRACK_DURATION_S);
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(FIREWORK_SFX.CRACK_GAIN * this.volume, startAt);
    crackGain.gain.exponentialRampToValueAtTime(FIREWORK_SFX.SILENCE_GAIN, startAt + FIREWORK_SFX.CRACK_DURATION_S);
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(out);
    crack.start(startAt);
    crack.stop(startAt + FIREWORK_SFX.CRACK_DURATION_S);

    for (let index = 0; index < FIREWORK_SFX.SPARKLE_COUNT; index += 1) {
      const pingAt = startAt + FIREWORK_SFX.SPARKLE_FIRST_DELAY_S + index * FIREWORK_SFX.SPARKLE_STEP_S;
      const ping = ctx.createOscillator();
      const pingGain = ctx.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(FIREWORK_SFX.SPARKLE_BASE_HZ + Math.random() * FIREWORK_SFX.SPARKLE_SPREAD_HZ, pingAt);
      pingGain.gain.setValueAtTime(FIREWORK_SFX.SPARKLE_GAIN * this.volume, pingAt);
      pingGain.gain.exponentialRampToValueAtTime(FIREWORK_SFX.SILENCE_GAIN, pingAt + FIREWORK_SFX.SPARKLE_DURATION_S);
      ping.connect(pingGain);
      pingGain.connect(out);
      ping.start(pingAt);
      ping.stop(pingAt + FIREWORK_SFX.SPARKLE_DURATION_S);
    }
  }

  /**
   * Sustained earthquake under a boss ultimate: a shuddering low noise bed + drone that swells in,
   * holds for the whole skill and dies out, with rock cracks scattered on top.
   * `intensity` 0..1 = how hard the skill hits the ground; `pitchRate` = the boss's own pitch.
   */
  public playQuakeRumble(durationS: number, intensity = 1, pitchRate = 1, bypassCombatMute = false): void {
    if (!this.isAudioEnabled) return;
    if (this.isCombatMuted && !bypassCombatMute) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const lengthS = Math.max(QUAKE_SFX.MIN_DURATION_S, durationS);
    const startAt = ctx.currentTime;
    const endAt = startAt + lengthS;
    const releaseAt = startAt + lengthS * (1 - QUAKE_SFX.RELEASE_RATIO);
    const level = intensity * this.volume;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(QUAKE_SFX.SILENCE_GAIN, startAt);
    envelope.gain.linearRampToValueAtTime(1, startAt + QUAKE_SFX.ATTACK_S);
    envelope.gain.setValueAtTime(1, releaseAt);
    envelope.gain.exponentialRampToValueAtTime(QUAKE_SFX.SILENCE_GAIN, endAt);
    envelope.connect(this.getOutputNode(0, AUDIO_BUS.MASTER));

    // Tremolo: the bed shudders instead of sounding like steady wind
    const tremolo = ctx.createGain();
    tremolo.gain.setValueAtTime(1 - QUAKE_SFX.TREMOLO_DEPTH / 2, startAt);
    const tremoloLfo = ctx.createOscillator();
    const tremoloDepth = ctx.createGain();
    tremoloLfo.frequency.setValueAtTime(QUAKE_SFX.TREMOLO_HZ, startAt);
    tremoloDepth.gain.setValueAtTime(QUAKE_SFX.TREMOLO_DEPTH / 2, startAt);
    tremoloLfo.connect(tremoloDepth);
    tremoloDepth.connect(tremolo.gain);
    tremolo.connect(envelope);
    tremoloLfo.start(startAt);
    tremoloLfo.stop(endAt);

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(QUAKE_SFX.NOISE_CUTOFF_HZ * pitchRate, startAt);
    noiseFilter.frequency.exponentialRampToValueAtTime(QUAKE_SFX.NOISE_CUTOFF_END_HZ * pitchRate, endAt);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(QUAKE_SFX.NOISE_GAIN * level, startAt);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(tremolo);
    noise.start(startAt);
    noise.stop(endAt);

    this.startQuakeDrone(ctx, tremolo, 'sine', QUAKE_SFX.SUB_HZ * pitchRate, QUAKE_SFX.SUB_GAIN * level, startAt, endAt);
    this.startQuakeDrone(ctx, tremolo, 'triangle', QUAKE_SFX.HARMONIC_HZ * pitchRate, QUAKE_SFX.HARMONIC_GAIN * level, startAt, endAt);
    this.scheduleQuakeDebris(ctx, startAt, releaseAt - startAt, level);
  }

  private startQuakeDrone(
    ctx: AudioContext,
    destination: AudioNode,
    waveform: OscillatorType,
    frequencyHz: number,
    gainValue: number,
    startAt: number,
    endAt: number
  ): void {
    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    drone.type = waveform;
    drone.frequency.setValueAtTime(frequencyHz, startAt);
    droneGain.gain.setValueAtTime(gainValue, startAt);
    drone.connect(droneGain);
    droneGain.connect(destination);
    drone.start(startAt);
    drone.stop(endAt);
  }

  /** Short band-passed noise cracks at random moments and pan positions (rock breaking, debris). */
  private scheduleQuakeDebris(ctx: AudioContext, startAt: number, spanS: number, level: number): void {
    const debrisCount = Math.round(spanS * QUAKE_SFX.DEBRIS_PER_SECOND);
    for (let index = 0; index < debrisCount; index += 1) {
      const crackAt = startAt + Math.random() * spanS;
      const crack = ctx.createBufferSource();
      crack.buffer = this.getNoiseBuffer(ctx);
      const crackFilter = ctx.createBiquadFilter();
      crackFilter.type = 'bandpass';
      crackFilter.frequency.setValueAtTime(QUAKE_SFX.DEBRIS_MIN_HZ + Math.random() * QUAKE_SFX.DEBRIS_SPREAD_HZ, crackAt);
      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(QUAKE_SFX.DEBRIS_GAIN * level, crackAt);
      crackGain.gain.exponentialRampToValueAtTime(QUAKE_SFX.SILENCE_GAIN, crackAt + QUAKE_SFX.DEBRIS_DURATION_S);
      crack.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(this.getOutputNode((Math.random() * 2 - 1) * QUAKE_SFX.DEBRIS_PAN_SPREAD, AUDIO_BUS.MASTER));
      crack.start(crackAt, Math.random());
      crack.stop(crackAt + QUAKE_SFX.DEBRIS_DURATION_S);
    }
  }

  /** One heavy ground hit (a slam / nova / meteor layer landing, or the ultimate's damage). */
  public playQuakeImpact(intensity = 1, pitchRate = 1, bypassCombatMute = false): void {
    if (!this.isAudioEnabled) return;
    if (this.isCombatMuted && !bypassCombatMute) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const startAt = ctx.currentTime;
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
    const level = Math.min(1, intensity) * this.volume;

    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(QUAKE_SFX.IMPACT_START_HZ * pitchRate, startAt);
    thump.frequency.exponentialRampToValueAtTime(QUAKE_SFX.IMPACT_END_HZ * pitchRate, startAt + QUAKE_SFX.IMPACT_DURATION_S);
    thumpGain.gain.setValueAtTime(QUAKE_SFX.IMPACT_GAIN * level, startAt);
    thumpGain.gain.exponentialRampToValueAtTime(QUAKE_SFX.SILENCE_GAIN, startAt + QUAKE_SFX.IMPACT_DURATION_S);
    thump.connect(thumpGain);
    thumpGain.connect(out);
    thump.start(startAt);
    thump.stop(startAt + QUAKE_SFX.IMPACT_DURATION_S);

    const thud = ctx.createBufferSource();
    thud.buffer = this.getNoiseBuffer(ctx);
    const thudFilter = ctx.createBiquadFilter();
    thudFilter.type = 'lowpass';
    thudFilter.frequency.setValueAtTime(QUAKE_SFX.IMPACT_NOISE_START_HZ, startAt);
    thudFilter.frequency.exponentialRampToValueAtTime(QUAKE_SFX.IMPACT_NOISE_END_HZ, startAt + QUAKE_SFX.IMPACT_NOISE_DURATION_S);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(QUAKE_SFX.IMPACT_NOISE_GAIN * level, startAt);
    thudGain.gain.exponentialRampToValueAtTime(QUAKE_SFX.SILENCE_GAIN, startAt + QUAKE_SFX.IMPACT_NOISE_DURATION_S);
    thud.connect(thudFilter);
    thudFilter.connect(thudGain);
    thudGain.connect(out);
    thud.start(startAt);
    thud.stop(startAt + QUAKE_SFX.IMPACT_NOISE_DURATION_S);
  }

  /**
   * Visceral Shockwave Blast & Explosion for Rift Herald (Sứ Giả Khe Nứt) Charge and Ground Detonation.
   * Features:
   * 1. Sub-bass seismic frequency drop (175Hz -> 26Hz) for seismic ground displacement.
   * 2. Resonant ground-blast lowpass noise rupture with Q=3.2 over 0.7s.
   * 3. Void crackle sawtooth snap for high-energy spatial shockwave blast.
   */
  public playShockwaveExplosion(intensity = 1, pitchRate = 1, bypassCombatMute = false): void {
    if (!this.isAudioEnabled) return;
    if (this.isCombatMuted && !bypassCombatMute) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
    const vol = this.volume * Math.min(1.25, Math.max(0.2, intensity));

    // 1. Deep Sub Seismic Drop (thump & displacement)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    const subDuration = 0.65;
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(175 * pitchRate, t);
    subOsc.frequency.exponentialRampToValueAtTime(26 * pitchRate, t + subDuration);

    subGain.gain.setValueAtTime(0.75 * vol, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + subDuration);

    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(t);
    subOsc.stop(t + subDuration + 0.05);

    // 2. Heavy Ground Blast Noise Burst
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(3.2, t);
    filter.frequency.setValueAtTime(880 * pitchRate, t);
    filter.frequency.exponentialRampToValueAtTime(85 * pitchRate, t + 0.55);

    const noiseGain = ctx.createGain();
    const noiseDuration = 0.7;
    noiseGain.gain.setValueAtTime(0.65 * vol, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseDuration);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(out);
    noiseSource.start(t);
    noiseSource.stop(t + noiseDuration + 0.05);

    // 3. Crackling Void Shatter Snap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'sawtooth';
    snapOsc.frequency.setValueAtTime(420 * pitchRate, t);
    snapOsc.frequency.exponentialRampToValueAtTime(45 * pitchRate, t + 0.18);

    snapGain.gain.setValueAtTime(0.35 * vol, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    snapOsc.connect(snapGain);
    snapGain.connect(out);
    snapOsc.start(t);
    snapOsc.stop(t + 0.2);
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
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
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

  // 10b. Cinematic Boss Execution / Shatter Explosion Sound (5-layer)
  public playBossDefeatSound(pitchRateOrElder: number | boolean = 1.0): void {
    const pitch = typeof pitchRateOrElder === 'number' ? pitchRateOrElder : (pitchRateOrElder ? 1.0 : 0.85);
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
    const vol = Math.min(1.5, this.volume * 1.35);

    // Layer 1: Deep Tectonic Implosion Sub-Boom (sine 100→16Hz, 2.0s, louder)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(100 * pitch, t);
    subOsc.frequency.exponentialRampToValueAtTime(16, t + 2.0);
    subGain.gain.setValueAtTime(0.75 * vol, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(t);
    subOsc.stop(t + 2.1);

    // Layer 2: Wider Shattering Energy Blast Noise Sweep (bandpass 2200→80Hz, 1.4s)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200 * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 1.4);
    filter.Q.value = 1.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.48 * vol, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.45);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(t);
    noise.stop(t + 1.45);

    // Layer 3: Crystal Rupture Chime Cascade (5-note triangle, staggered 0.07s, 1.2s decay)
    const chimeNotes = [440 * pitch, 587 * pitch, 740 * pitch, 880 * pitch, 1175 * pitch];
    chimeNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = t + 0.06 + idx * 0.07;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, startTime + 1.2);
      gain.gain.setValueAtTime(0.2 * vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.25);
      osc.connect(gain);
      gain.connect(out);
      osc.start(startTime);
      osc.stop(startTime + 1.3);
    });

    // Layer 4: Metallic Resonance Ring (sawtooth 220→110Hz, filtered — "energy shatter" texture)
    const metalOsc = ctx.createOscillator();
    const metalFilter = ctx.createBiquadFilter();
    const metalGain = ctx.createGain();
    metalOsc.type = 'sawtooth';
    metalOsc.frequency.setValueAtTime(220 * pitch, t + 0.05);
    metalOsc.frequency.exponentialRampToValueAtTime(110, t + 1.0);
    metalFilter.type = 'bandpass';
    metalFilter.frequency.setValueAtTime(1800, t + 0.05);
    metalFilter.frequency.exponentialRampToValueAtTime(400, t + 1.0);
    metalFilter.Q.value = 3.0;
    metalGain.gain.setValueAtTime(0.15 * vol, t + 0.05);
    metalGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    metalOsc.connect(metalFilter);
    metalFilter.connect(metalGain);
    metalGain.connect(out);
    metalOsc.start(t + 0.05);
    metalOsc.stop(t + 1.15);

    // Layer 5: Reverberant Tail — Arena Rumble Aftershock (sine 55Hz, slow fade 2.5s)
    const rumbleOsc = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumbleOsc.type = 'sine';
    rumbleOsc.frequency.setValueAtTime(55 * pitch, t + 0.3);
    rumbleOsc.frequency.exponentialRampToValueAtTime(30, t + 2.8);
    rumbleGain.gain.setValueAtTime(0.3 * vol, t + 0.3);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 2.85);
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(out);
    rumbleOsc.start(t + 0.3);
    rumbleOsc.stop(t + 2.9);
  }

  // 11. Procedural Heart Sparkle Chime
  public playHeartChime(): void {
    if (!this.isAudioEnabled || this.isCombatMuted) return;
    const now = performance.now();
    if (now - this.lastHeartChimeTime < AUDIO_SFX_CONSTANTS.HEART_CHIME_THROTTLE_MS) return;
    this.lastHeartChimeTime = now;
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
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
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
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);

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

  // 11d. Epic Worlds Brass Fanfare & Taiko War Drums (Esports Opening Ceremony)
  public playRoundStartSound(): void {
    this.setCombatMuted(false);
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
    const vol = this.volume;

    // ── 1. Thunderous Double-Strike Taiko War Drum ─────────────────────────────
    const taikoHits = [
      { startOffset: 0, startFreq: 175, endFreq: 42, gainVal: 0.82, dur: 0.85 },
      { startOffset: 0.12, startFreq: 130, endFreq: 36, gainVal: 0.68, dur: 0.95 },
    ];

    taikoHits.forEach((hit) => {
      const hitTime = t + hit.startOffset;

      // Click transient (stick on drum skin)
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1350, hitTime);
      clickOsc.frequency.exponentialRampToValueAtTime(160, hitTime + 0.015);
      clickGain.gain.setValueAtTime(0.3 * vol, hitTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.018);
      clickOsc.connect(clickGain);
      clickGain.connect(out);
      clickOsc.start(hitTime);
      clickOsc.stop(hitTime + 0.02);

      // Resonant wooden drum shell body
      const drumOsc = ctx.createOscillator();
      const drumFilter = ctx.createBiquadFilter();
      const drumGain = ctx.createGain();

      drumOsc.type = 'sine';
      drumOsc.frequency.setValueAtTime(hit.startFreq, hitTime);
      drumOsc.frequency.exponentialRampToValueAtTime(hit.endFreq, hitTime + hit.dur);

      drumFilter.type = 'lowpass';
      drumFilter.frequency.setValueAtTime(240, hitTime);
      drumFilter.Q.setValueAtTime(3.2, hitTime);

      drumGain.gain.setValueAtTime(0.001, hitTime);
      drumGain.gain.linearRampToValueAtTime(hit.gainVal * vol, hitTime + 0.02);
      drumGain.gain.exponentialRampToValueAtTime(0.001, hitTime + hit.dur);

      drumOsc.connect(drumFilter);
      drumFilter.connect(drumGain);
      drumGain.connect(out);
      drumOsc.start(hitTime);
      drumOsc.stop(hitTime + hit.dur + 0.05);
    });

    // Deep seismic sub-bass rumble
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(45, t);
    subOsc.frequency.exponentialRampToValueAtTime(32, t + 1.4);
    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.55 * vol, t + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.45);
    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(t);
    subOsc.stop(t + 1.5);

    // ── 2. Steel Clash & High Shield Strike Accent ─────────────────────────────
    const clashOsc1 = ctx.createOscillator();
    const clashOsc2 = ctx.createOscillator();
    const clashGain = ctx.createGain();

    clashOsc1.type = 'sawtooth';
    clashOsc2.type = 'triangle';
    clashOsc1.frequency.setValueAtTime(1400, t + 0.02);
    clashOsc1.frequency.exponentialRampToValueAtTime(320, t + 0.28);
    clashOsc2.frequency.setValueAtTime(2200, t + 0.02);
    clashOsc2.frequency.exponentialRampToValueAtTime(540, t + 0.32);

    clashGain.gain.setValueAtTime(0.001, t);
    clashGain.gain.setValueAtTime(0.32 * vol, t + 0.02);
    clashGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    clashOsc1.connect(clashGain);
    clashOsc2.connect(clashGain);
    clashGain.connect(out);
    clashOsc1.start(t + 0.02);
    clashOsc2.start(t + 0.02);
    clashOsc1.stop(t + 0.38);
    clashOsc2.stop(t + 0.38);

    // ── 3. Epic Worlds Brass Horn Fanfare (Acoustic Chorus & Resonant Swell) ──
    const hornFanfare = [
      { freq: 146.83, delay: 0.06, dur: 0.9, level: 0.28 },  // D3 (low horn foundation)
      { freq: 220.00, delay: 0.16, dur: 0.85, level: 0.26 }, // A3 (herald call)
      { freq: 293.66, delay: 0.26, dur: 1.15, level: 0.35 }, // D4 (fanfare chord)
      { freq: 369.99, delay: 0.30, dur: 1.15, level: 0.33 }, // F#4 (triumphant major third)
      { freq: 440.00, delay: 0.34, dur: 1.25, level: 0.38 }, // A4 (soaring fifth)
      { freq: 587.33, delay: 0.38, dur: 1.35, level: 0.30 }, // D5 (crowning octave peak)
    ];

    hornFanfare.forEach((note) => {
      const startTime = t + note.delay;

      // Dual detuned oscillators for authentic stadium brass ensemble
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(note.freq, startTime);
      osc2.frequency.setValueAtTime(note.freq * 1.004, startTime);

      // Acoustic brass formant filter sweep
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, startTime);
      filter.frequency.exponentialRampToValueAtTime(2200, startTime + 0.08);
      filter.frequency.exponentialRampToValueAtTime(750, startTime + note.dur);
      filter.Q.setValueAtTime(2.4, startTime);

      // Heroic brass swell attack and warm acoustic sustain
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(note.level * vol, startTime + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + note.dur + 0.05);
      osc2.stop(startTime + note.dur + 0.05);
    });
  }

  /**
   * Heroic Esports War Drum & Ancient Battle Horn Fanfare when combat commences immediately.
   * Features a thunderous double-strike Taiko war drum, resonant brass battle horn swell,
   * high-impact steel clash, and cinematic shockwave rumble.
   */
  public playCombatDeployBlastSound(): void {
    this.setCombatMuted(false);
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
    const vol = this.volume;

    // 1. Double-Strike Cinematic War Drum (Taiko Impact)
    const drumHits = [
      { startOffset: 0, startFreq: 160, endFreq: 38, gainVal: 0.75, dur: 0.7 },
      { startOffset: 0.11, startFreq: 120, endFreq: 30, gainVal: 0.6, dur: 0.8 },
    ];
    drumHits.forEach((hit) => {
      const hitTime = t + hit.startOffset;
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(hit.startFreq, hitTime);
      subOsc.frequency.exponentialRampToValueAtTime(hit.endFreq, hitTime + hit.dur * 0.8);

      subGain.gain.setValueAtTime(hit.gainVal * vol, hitTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, hitTime + hit.dur);

      subOsc.connect(subGain);
      subGain.connect(out);
      subOsc.start(hitTime);
      subOsc.stop(hitTime + hit.dur + 0.05);
    });

    // 2. High-Impact Metallic Steel Clash & Anvil Resonance
    const clashOsc1 = ctx.createOscillator();
    const clashOsc2 = ctx.createOscillator();
    const clashGain = ctx.createGain();
    clashOsc1.type = 'sawtooth';
    clashOsc2.type = 'triangle';
    clashOsc1.frequency.setValueAtTime(960, t + 0.02);
    clashOsc1.frequency.exponentialRampToValueAtTime(240, t + 0.25);
    clashOsc2.frequency.setValueAtTime(1440, t + 0.02);
    clashOsc2.frequency.exponentialRampToValueAtTime(360, t + 0.32);

    clashGain.gain.setValueAtTime(0.001, t);
    clashGain.gain.setValueAtTime(0.38 * vol, t + 0.02);
    clashGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    clashOsc1.connect(clashGain);
    clashOsc2.connect(clashGain);
    clashGain.connect(out);
    clashOsc1.start(t + 0.02);
    clashOsc2.start(t + 0.02);
    clashOsc1.stop(t + 0.4);
    clashOsc2.stop(t + 0.4);

    // 3. Heroic Ancient Battle Horn Fanfare (Brass Timbre with Harmonics)
    // Horn notes: Low D3 foundation -> A3 call -> Soaring D4 - F#4 - A4 triumphant charge
    const hornNotes = [
      { freq: 146.83, delay: 0.04, dur: 0.85, level: 0.32 },
      { freq: 220.0, delay: 0.14, dur: 0.8, level: 0.3 },
      { freq: 293.66, delay: 0.24, dur: 0.75, level: 0.35 },
      { freq: 369.99, delay: 0.34, dur: 0.75, level: 0.35 },
      { freq: 440.0, delay: 0.44, dur: 0.85, level: 0.38 },
    ];

    hornNotes.forEach((note) => {
      const startTime = t + note.delay;

      // Dual detuned oscillators for authentic brass chorus body
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(note.freq, startTime);
      osc2.frequency.setValueAtTime(note.freq * 1.004, startTime);

      // Warm brass horn filter sweep
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, startTime);
      filter.frequency.exponentialRampToValueAtTime(650, startTime + note.dur);
      filter.Q.setValueAtTime(2.2, startTime);

      // Swelling heroic attack & resonant sustain
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(note.level * vol, startTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + note.dur + 0.05);
      osc2.stop(startTime + note.dur + 0.05);
    });
  }

  // 11e. Subtle Tactile UI Toggle Click
  public playUiToggleSound(isEnabled = true): void {
    if (!this.isAudioEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const out = this.getOutputNode(0, AUDIO_BUS.MASTER);
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
    const notes = BGM_SEQUENCE.NOTES;
    const intervalMs = BGM_SEQUENCE.STEP_MS;

    const tick = () => {
      if (!this.isAudioEnabled || this.isCombatMuted || !this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const out = this.getOutputNode(0);
      const freq = notes[step % notes.length];
      const isDownbeat = step % BGM_SEQUENCE.BEATS_PER_BAR === 0;
      step++;

      // Lead: lowpass-filtered sawtooth so it hums instead of buzzing
      const lead = ctx.createOscillator();
      const leadFilter = ctx.createBiquadFilter();
      const leadGain = ctx.createGain();
      lead.type = 'sawtooth';
      lead.frequency.setValueAtTime(freq, t);
      leadFilter.type = 'lowpass';
      leadFilter.frequency.setValueAtTime(BGM_SEQUENCE.LEAD_FILTER_HZ, t);
      leadFilter.frequency.exponentialRampToValueAtTime(BGM_SEQUENCE.LEAD_FILTER_FLOOR_HZ, t + BGM_SEQUENCE.NOTE_S);
      leadFilter.Q.value = BGM_SEQUENCE.LEAD_FILTER_Q;
      leadGain.gain.setValueAtTime(0.0001, t);
      leadGain.gain.exponentialRampToValueAtTime(BGM_SEQUENCE.LEAD_GAIN * this.volume, t + BGM_SEQUENCE.ATTACK_S);
      leadGain.gain.exponentialRampToValueAtTime(0.0001, t + BGM_SEQUENCE.NOTE_S);
      lead.connect(leadFilter);
      leadFilter.connect(leadGain);
      leadGain.connect(out);
      lead.start(t);
      lead.stop(t + BGM_SEQUENCE.NOTE_S);

      // Sub pulse one octave down on downbeats gives the loop a heartbeat
      if (!isDownbeat) return;
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(freq / 2, t);
      subGain.gain.setValueAtTime(BGM_SEQUENCE.SUB_GAIN * this.volume, t);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + BGM_SEQUENCE.SUB_S);
      sub.connect(subGain);
      subGain.connect(out);
      sub.start(t);
      sub.stop(t + BGM_SEQUENCE.SUB_S);
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
    if (!this.isAudioEnabled) return;
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
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  }

  public speakImmediate(text: string, options: SpeakOptions = {}): void {
    this.cancelSpeech();
    window.setTimeout(() => {
      this.speak(text, options);
    }, 30);
  }

  public speak(_text: string, _options: SpeakOptions = {}): void {
    // STRICT: Browser speechSynthesis is completely disabled to eliminate all "chị Google" voices.
    // Audio is strictly played via pregenerated static audio clips through useAudioStore / Howler.
    return;
  }
}

export const audioService = new AudioSynthesizerService();
