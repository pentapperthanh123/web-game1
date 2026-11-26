import { GAMEPLAY_LIMITS } from './config';
import type { DanceStyle, GiftTier, SfxKind } from './types';

const MIC_DUCK_FACTOR = 0.25;
const CHAT_THROTTLE_MS = 140;
const LIKE_THROTTLE_MS = 180;
const AMBIENT_THROTTLE_MS = 650;
const SHAKER_THROTTLE_MS = 460;

type UnlockListener = (unlocked: boolean) => void;

const DANCE_POP_MELODY: readonly number[] = [
  523.25, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 659.25,
  698.46, 880.0, 783.99, 659.25, 587.33, 523.25, 587.33, 783.99,
];
const DANCE_POP_BASS: readonly number[] = [130.81, 164.81, 174.61, 196.0];
const DANCE_POP_SPARKLES: readonly number[] = [1567.98, 1760.0, 2093.0, 1760.0];

const DANCE_GROOVE_CHORDS: readonly (readonly number[])[] = [
  [293.66, 349.23, 440.0, 523.25], // Dm7
  [392.0, 493.88, 587.33, 698.46], // G7
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0],  // Am7
];
const DANCE_GROOVE_BASS: readonly number[] = [
  146.83, 146.83, 174.61, 196.0, 196.0, 164.81, 130.81, 110.0,
];
const DANCE_GROOVE_LEAD: readonly number[] = [
  587.33, 0, 659.25, 698.46, 783.99, 0, 659.25, 523.25,
];

// Classic TikTok EDM / Phonk cowbell hook intervals in F# minor / E minor vibe (130 BPM)
const DANCE_PHONK_COWBELL: readonly number[] = [
  659.25, 659.25, 783.99, 659.25, 880.0, 783.99, 739.99, 659.25,
  659.25, 987.77, 880.0, 783.99, 659.25, 587.33, 659.25, 0,
];
const DANCE_PHONK_BASS: readonly number[] = [82.41, 82.41, 98.0, 110.0, 98.0, 73.42, 82.41, 65.41];

const DANCE_BPM_MAP: Readonly<Record<DanceStyle, number>> = {
  heart_sway: 118,
  groove_wave: 105,
  party_hype: 130,
};

export class WebAudioSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxEnabled = true;
  private musicEnabled = true;
  private masterVolume = 0.85;
  private isMicMode = false;
  private lastPlayedAt: Partial<Record<SfxKind, number>> = {};
  private activeMusicNodes: AudioNode[] = [];
  private activeSfxNodes: AudioNode[] = [];
  private unlockBound = false;
  private readonly unlockListeners = new Set<UnlockListener>();

  constructor() {
    this.bindUserUnlock();
  }

  private bindUserUnlock(): void {
    if (typeof window === 'undefined' || this.unlockBound) return;
    this.unlockBound = true;
    const handleGesture = () => {
      void this.unlock(false);
    };
    window.addEventListener('pointerdown', handleGesture, { passive: true, capture: true });
    window.addEventListener('mousedown', handleGesture, { passive: true, capture: true });
    window.addEventListener('touchstart', handleGesture, { passive: true, capture: true });
    window.addEventListener('click', handleGesture, { passive: true, capture: true });
    window.addEventListener('keydown', handleGesture, { passive: true, capture: true });
  }

  public subscribeUnlocked(listener: UnlockListener): () => void {
    this.unlockListeners.add(listener);
    listener(this.isUnlocked());
    return () => {
      this.unlockListeners.delete(listener);
    };
  }

  private notifyUnlockListeners(): void {
    const unlocked = this.isUnlocked();
    this.unlockListeners.forEach((cb) => cb(unlocked));
  }

  public isUnlocked(): boolean {
    return this.ctx?.state === 'running';
  }

  public async unlock(playConfirmTone = false): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Browser blocked resume outside user gesture
      }
    }
    this.notifyUnlockListeners();
    const ok = ctx.state === 'running';
    if (ok && playConfirmTone) {
      this.play('chime');
    }
    return ok;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopActiveDanceMusic();
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.syncMasterGain();
  }

  public setMicMode(micMode: boolean): void {
    this.isMicMode = micMode;
    this.syncMasterGain();
  }

  private computeTargetGain(): number {
    const duck = this.isMicMode ? MIC_DUCK_FACTOR : 1;
    return Math.max(0, Math.min(1, this.masterVolume * duck));
  }

  private syncMasterGain(): void {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(
      this.computeTargetGain(),
      this.ctx.currentTime,
      0.04
    );
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) return null;
      try {
        this.ctx = new AudioCtor();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this.computeTargetGain(),
          this.ctx.currentTime
        );
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
        this.ctx.onstatechange = () => {
          this.notifyUnlockListeners();
        };
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  private ensureRunningContext(): AudioContext | null {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return null;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => this.notifyUnlockListeners()).catch(() => {});
      return null;
    }
    return ctx.state === 'running' ? ctx : null;
  }

  private shouldThrottle(kind: SfxKind, minIntervalMs: number): boolean {
    const nowMs = performance.now();
    const prev = this.lastPlayedAt[kind] ?? 0;
    if (nowMs - prev < minIntervalMs) {
      return true;
    }
    this.lastPlayedAt[kind] = nowMs;
    return false;
  }

  /**
   * Returns true if AudioContext was running (played locally), false if blocked/suspended.
   */
  public play(
    kind: SfxKind,
    tier: GiftTier = 'MEDIUM',
    danceStyle?: DanceStyle,
    pitchScale = 1
  ): boolean {
    if (kind === 'dance_jingle') {
      this.stopBrewingSfx();
      if (!this.musicEnabled) return true;
      const styleMap: Record<GiftTier, DanceStyle> = {
        SMALL: 'heart_sway',
        MEDIUM: 'groove_wave',
        LARGE: 'party_hype',
      };
      return this.playDanceJingle(tier, danceStyle ?? styleMap[tier]);
    }
    if (!this.sfxEnabled) return true;

    const ctx = this.ensureRunningContext();
    if (!ctx) return false;

    switch (kind) {
      case 'cup_place':
        this.playCupPlace(ctx);
        break;
      case 'sugar_click':
        this.playSugarClick(ctx);
        break;
      case 'ice_clink':
        this.playIceClink(ctx);
        break;
      case 'matcha_scoop':
        if (!this.shouldThrottle(kind, 340)) this.playMatchaScoop(ctx);
        break;
      case 'chasen':
        if (!this.shouldThrottle(kind, AMBIENT_THROTTLE_MS)) this.playChasen(ctx);
        break;
      case 'whip_froth':
        if (!this.shouldThrottle(kind, AMBIENT_THROTTLE_MS)) this.playWhipFroth(ctx);
        break;
      case 'shaker':
        if (!this.shouldThrottle(kind, SHAKER_THROTTLE_MS)) this.playShaker(ctx);
        break;
      case 'cafe_drip':
        if (!this.shouldThrottle(kind, AMBIENT_THROTTLE_MS)) this.playCafeDrip(ctx);
        break;
      case 'soda_fizz':
        if (!this.shouldThrottle(kind, AMBIENT_THROTTLE_MS)) this.playSodaFizz(ctx);
        break;
      case 'juicer':
        if (!this.shouldThrottle(kind, AMBIENT_THROTTLE_MS)) this.playJuicer(ctx);
        break;
      case 'pour':
        this.playPour(ctx, pitchScale);
        break;
      case 'topping':
        this.playToppingPlop(ctx);
        break;
      case 'lid_snap':
        this.playLidSnap(ctx);
        break;
      case 'straw_insert':
        this.playStrawInsert(ctx);
        break;
      case 'chime':
        this.playCompletionChime(ctx);
        break;
      case 'signature':
        this.playSignatureFanfare(ctx);
        break;
      case 'chat_pop':
        if (!this.shouldThrottle(kind, CHAT_THROTTLE_MS)) this.playChatPop(ctx);
        break;
      case 'like_pop':
        if (!this.shouldThrottle(kind, LIKE_THROTTLE_MS)) this.playLikePop(ctx);
        break;
    }
    return true;
  }

  private playCupPlace(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Soft hollow takeaway cup tap on wooden coaster
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.055);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
    this.activeSfxNodes.push(osc);
  }

  private playSugarClick(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Tactile dispenser button click + delicate sugar granule scoop shimmer
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.032);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
    this.activeSfxNodes.push(osc);

    // Subtle sugar granules rustle
    this.playFilteredNoiseBurst(ctx, now + 0.025, 0.08, 3800, 2.2, 0.14);
  }

  private trackSfxNode(node: AudioScheduledSourceNode): void {
    this.activeSfxNodes.push(node);
    node.onended = () => {
      const idx = this.activeSfxNodes.indexOf(node);
      if (idx !== -1) {
        this.activeSfxNodes.splice(idx, 1);
      }
    };
  }

  private playIceClink(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // ASMR crystalline ice cubes tumbling & ringing inside chilled takeaway cup
    const cubePitches = [2780, 3420, 3040];

    cubePitches.forEach((baseFreq, idx) => {
      const t = now + idx * 0.052 + Math.random() * 0.012;
      const jitter = 0.96 + Math.random() * 0.08;

      // Primary crystalline ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * jitter, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.115);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.125);
      this.trackSfxNode(osc);

      // Glass harmonic shimmer overtone
      const overtone = ctx.createOscillator();
      const overGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(baseFreq * jitter * 1.52, t);
      overGain.gain.setValueAtTime(0.001, t);
      overGain.gain.linearRampToValueAtTime(0.09, t + 0.003);
      overGain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      overtone.connect(overGain);
      overGain.connect(this.masterGain!);
      overtone.start(t);
      overtone.stop(t + 0.075);
      this.trackSfxNode(overtone);
    });
  }

  private playMatchaScoop(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // 1. Delicate bamboo chashaku scoop rustling through fine dry matcha powder
    this.playFilteredNoiseBurst(ctx, now, 0.085, 3100, 1.9, 0.16);

    // 2. Crisp gentle tap of bamboo spoon against ceramic chawan rim
    const tap = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tap.type = 'sine';
    tap.frequency.setValueAtTime(1420, now + 0.065);
    tap.frequency.exponentialRampToValueAtTime(920, now + 0.11);

    tapGain.gain.setValueAtTime(0.001, now + 0.065);
    tapGain.gain.linearRampToValueAtTime(0.14, now + 0.07);
    tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);

    tap.connect(tapGain);
    tapGain.connect(this.masterGain);
    tap.start(now + 0.065);
    tap.stop(now + 0.135);
    this.trackSfxNode(tap);
  }

  private playChasen(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Authentic brisk bamboo Chasen W/M strokes whisking matcha inside ceramic chawan
    this.playFilteredNoiseBurst(ctx, now, 0.12, 2050, 1.9, 0.26);
    this.playFilteredNoiseBurst(ctx, now + 0.095, 0.12, 2480, 2.1, 0.24);
    this.playFilteredNoiseBurst(ctx, now + 0.19, 0.11, 2220, 2.0, 0.20);

    // Subtle warm ceramic chawan resonance tap from bamboo bristles
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.14);
    gain.gain.setValueAtTime(0.001, now + 0.04);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.055);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now + 0.04);
    osc.stop(now + 0.16);
    this.trackSfxNode(osc);
  }

  private playWhipFroth(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Smooth warm handheld milk-frother hum + airy creamy foam whip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.linearRampToValueAtTime(215, now + 0.14);
    osc.frequency.linearRampToValueAtTime(185, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.31);
    this.activeSfxNodes.push(osc);

    // Gentle creamy foam aeration hiss
    this.playFilteredNoiseBurst(ctx, now + 0.02, 0.24, 2600, 1.6, 0.16);
  }

  private playShaker(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Crisp metallic cocktail-shaker ice rattle (forward + back slosh + tin ice ping)
    this.playFilteredNoiseBurst(ctx, now, 0.10, 3150, 2.7, 0.30);
    this.playFilteredNoiseBurst(ctx, now + 0.115, 0.10, 3580, 2.9, 0.27);

    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(3780 + Math.random() * 260, now + 0.015);
    pingGain.gain.setValueAtTime(0.001, now + 0.015);
    pingGain.gain.linearRampToValueAtTime(0.075, now + 0.02);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    ping.connect(pingGain);
    pingGain.connect(this.masterGain);
    ping.start(now + 0.015);
    ping.stop(now + 0.075);
    this.trackSfxNode(ping);
  }

  private playCafeDrip(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // Warm espresso extraction pressure hiss + rich rhythmic coffee drops
    this.playFilteredNoiseBurst(ctx, now, 0.26, 880, 1.15, 0.17);

    [0.06, 0.18].forEach((offset, idx) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startF = idx === 0 ? 490 : 590;
      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(startF * 1.42, t + 0.055);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.20, t + 0.007);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.085);
      this.trackSfxNode(osc);
    });
  }

  private playSodaFizz(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Crisp carbonated effervescence + delicate sparkling micro-bubble pops
    this.playFilteredNoiseBurst(ctx, now, 0.36, 4850, 1.05, 0.25);

    for (let i = 0; i < 4; i += 1) {
      const t = now + 0.03 + i * 0.072 + Math.random() * 0.025;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3400 + Math.random() * 1900, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.065, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.024);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.03);
      this.trackSfxNode(osc);
    }
  }

  private playJuicer(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.linearRampToValueAtTime(185, now + 0.14);
    osc.frequency.linearRampToValueAtTime(160, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
    this.activeSfxNodes.push(osc);
  }

  private playPour(ctx: AudioContext, pitchScale = 1): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // ASMR fluid stream resonance with rising cavity pitch synced to actual cup liquid level
    const safePitch = Math.max(0.75, Math.min(1.55, pitchScale));
    this.playFilteredNoiseBurst(ctx, now, 0.28, 1280 * safePitch, 1.5, 0.24);

    // Dual organic water-glug resonance blips
    [0, 0.12].forEach((offset, idx) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseF = (idx === 0 ? 330 : 410) * safePitch;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseF, t);
      osc.frequency.exponentialRampToValueAtTime(baseF * 1.72, t + 0.12);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.18 : 0.14, t + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.15);
      this.trackSfxNode(osc);
    });
  }

  private playToppingPlop(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // Soft chewy boba / topping water-plop sweeps
    [320, 440].forEach((baseFreq, idx) => {
      const start = now + idx * 0.062;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, start);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.95, start + 0.065);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.095);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.105);
      this.trackSfxNode(osc);
    });
  }

  private playLidSnap(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // Stage 1: Crisp plastic dome-lid rim click
    this.playFilteredNoiseBurst(ctx, now, 0.028, 2900, 2.4, 0.26);

    // Stage 2: Warm hollow cup seal pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now + 0.012);
    osc.frequency.exponentialRampToValueAtTime(105, now + 0.068);

    gain.gain.setValueAtTime(0.001, now + 0.012);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.082);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now + 0.012);
    osc.stop(now + 0.09);
    this.trackSfxNode(osc);
  }

  private playStrawInsert(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // Stage 1: Light straw puncture/click into dome aperture
    this.playFilteredNoiseBurst(ctx, now, 0.018, 3800, 3.2, 0.18);

    // Stage 2: Smooth fluid slide pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now + 0.006);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.055);

    gain.gain.setValueAtTime(0.001, now + 0.006);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.068);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now + 0.006);
    osc.stop(now + 0.075);
    this.trackSfxNode(osc);
  }

  private playCompletionChime(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // Rewarding sparkling completion chime
    const notes = [659.25, 830.61, 987.77, 1318.5];
    this.playArpeggioNotes(ctx, now, notes, 0.065, 0.26, 0.45);
  }

  private playSignatureFanfare(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // Grand VIP Signature fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    this.playArpeggioNotes(ctx, now, notes, 0.065, 0.32, 0.52);
  }

  private playChatPop(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.065);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  private playLikePop(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(1120, now + 0.05);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public stopBrewingSfx(): void {
    this.stopNodeList(this.activeSfxNodes);
    this.activeSfxNodes = [];
  }

  public stopDanceMusic(): void {
    this.stopActiveDanceMusic();
  }

  private playDanceJingle(tier: GiftTier, style: DanceStyle): boolean {
    const ctx = this.ensureRunningContext();
    if (!ctx || !this.masterGain) return false;

    // Immediately silence any running dance track so switching styles never overlaps
    this.stopActiveDanceMusic();

    const durationMap: Record<GiftTier, number> = {
      SMALL: GAMEPLAY_LIMITS.DANCE_SMALL_DURATION_MS / 1000,
      MEDIUM: GAMEPLAY_LIMITS.DANCE_MEDIUM_DURATION_MS / 1000,
      LARGE: GAMEPLAY_LIMITS.DANCE_LARGE_DURATION_MS / 1000,
    };
    const totalSec = durationMap[tier];
    const now = ctx.currentTime + 0.015;
    const beatSec = 60 / DANCE_BPM_MAP[style];

    if (style === 'heart_sway') {
      this.schedulePopCuteTrack(ctx, now, totalSec, beatSec);
      return true;
    }

    if (style === 'groove_wave') {
      this.scheduleGrooveChillTrack(ctx, now, totalSec, beatSec);
      return true;
    }

    this.scheduleEdmPhonkTrack(ctx, now, totalSec, beatSec);
    return true;
  }

  /**
   * Style 1 ("Nhảy 1: Bắn Tim") — Bright Pop / Cute (~118 BPM)
   * Bouncy kawaii melody, warm sine bass, light pop-clap, and upbeat sparkle chimes.
   */
  private schedulePopCuteTrack(
    ctx: AudioContext,
    now: number,
    totalSec: number,
    beatSec: number
  ): void {
    const eighthSec = beatSec * 0.5;
    const totalEighths = Math.max(8, Math.floor(totalSec / eighthSec));

    for (let i = 0; i < totalEighths; i += 1) {
      const t = now + i * eighthSec;
      const melFreq = DANCE_POP_MELODY[i % DANCE_POP_MELODY.length];
      this.scheduleMusicTone(ctx, t, melFreq, 'sine', 0.17, eighthSec * 0.85);
      // Soft glossy bell harmonic doubling the pop melody
      this.scheduleMusicTone(ctx, t, melFreq * 2, 'triangle', 0.045, eighthSec * 0.42);

      // Warm bouncy pop bass & soft kick on beats
      if (i % 2 === 0) {
        const beatIdx = Math.floor(i / 2);
        const bassFreq = DANCE_POP_BASS[Math.floor(beatIdx / 2) % DANCE_POP_BASS.length];
        this.scheduleMusicTone(ctx, t, bassFreq, 'sine', 0.21, beatSec * 0.82);
        this.scheduleKickDrum(ctx, t, 115, 48, 0.16, 0.11);
        if (beatIdx % 2 === 1) {
          // Cute crisp hand-clap accent on beats 2 & 4
          this.scheduleMusicPercussion(ctx, t, 2400, 0.13, 0.055);
        }
      } else {
        // Upbeat kawaii sparkle / pop twinkle
        const sparkle = DANCE_POP_SPARKLES[Math.floor(i / 2) % DANCE_POP_SPARKLES.length];
        this.scheduleMusicTone(ctx, t, sparkle, 'sine', 0.075, 0.075);
      }
    }
  }

  /**
   * Style 2 ("Nhảy 2: Sóng Tay") — Smooth Groove / Chill (~105 BPM)
   * Warm Rhodes-style electric piano chords, silky gliding bass, rimshot snare, and chill shuffle hats.
   */
  private scheduleGrooveChillTrack(
    ctx: AudioContext,
    now: number,
    totalSec: number,
    beatSec: number
  ): void {
    const eighthSec = beatSec * 0.5;
    const totalEighths = Math.max(8, Math.floor(totalSec / eighthSec));

    for (let i = 0; i < totalEighths; i += 1) {
      const t = now + i * eighthSec;

      // Lush warm Rhodes chord pad every 2 beats (every 4 eighth notes)
      if (i % 4 === 0) {
        const chord = DANCE_GROOVE_CHORDS[Math.floor(i / 4) % DANCE_GROOVE_CHORDS.length];
        for (let n = 0; n < chord.length; n += 1) {
          this.scheduleMusicTone(ctx, t + n * 0.012, chord[n], 'sine', 0.068, beatSec * 1.85);
        }
      }

      // Smooth melodic chill motif
      const leadFreq = DANCE_GROOVE_LEAD[i % DANCE_GROOVE_LEAD.length];
      if (leadFreq > 0) {
        this.scheduleMusicTone(ctx, t, leadFreq, 'triangle', 0.125, eighthSec * 0.92);
      }

      // Silky syncopated groove bass
      if (i % 2 === 0 || i % 8 === 5) {
        const bassFreq = DANCE_GROOVE_BASS[i % DANCE_GROOVE_BASS.length];
        this.scheduleMusicTone(ctx, t, bassFreq, 'sine', 0.24, eighthSec * 1.45);
      }

      // Chill pocket drums: soft deep kick on 1 & 3-and, warm rimshot on 2 & 4, silky hats on offbeats
      if (i % 8 === 0 || i % 8 === 5) {
        this.scheduleKickDrum(ctx, t, 102, 42, 0.21, 0.14);
      }
      if (i % 4 === 2) {
        this.scheduleMusicPercussion(ctx, t, 1950, 0.14, 0.06);
      }
      if (i % 2 === 1) {
        this.scheduleMusicPercussion(ctx, t + 0.018, 5600, 0.065, 0.035);
      }
    }
  }

  /**
   * Style 3 ("Nhảy 3: Quẩy Nhiệt") — High-Energy Dance / EDM / Phonk (~130 BPM)
   * Punchy 4-on-the-floor kick, driving 808 bass, signature metallic Phonk cowbell hook, and crisp snare/hats.
   */
  private scheduleEdmPhonkTrack(
    ctx: AudioContext,
    now: number,
    totalSec: number,
    beatSec: number
  ): void {
    const eighthSec = beatSec * 0.5;
    const totalEighths = Math.max(12, Math.floor(totalSec / eighthSec));

    // Crisp opening drop crash
    this.scheduleMusicPercussion(ctx, now, 3400, 0.18, 0.12);

    for (let i = 0; i < totalEighths; i += 1) {
      const t = now + i * eighthSec;

      // Iconic energetic TikTok Phonk cowbell / EDM synth hook
      const hookFreq = DANCE_PHONK_COWBELL[i % DANCE_PHONK_COWBELL.length];
      if (hookFreq > 0) {
        this.schedulePhonkCowbell(ctx, t, hookFreq, 0.135, eighthSec * 0.72);
      }

      // Punchy 4-on-the-floor EDM kick + driving 808 sub-bass
      if (i % 2 === 0) {
        const beatIdx = Math.floor(i / 2);
        this.scheduleKickDrum(ctx, t, 145, 42, 0.27, 0.13);
        const bassFreq = DANCE_PHONK_BASS[beatIdx % DANCE_PHONK_BASS.length];
        this.scheduleMusicTone(ctx, t + 0.02, bassFreq, 'triangle', 0.22, beatSec * 0.85);
        if (beatIdx % 2 === 1) {
          // Snappy EDM clap/snare on beats 2 & 4
          this.scheduleMusicPercussion(ctx, t, 2850, 0.18, 0.075);
        }
      } else {
        // Fast driving offbeat EDM hi-hat
        this.scheduleMusicPercussion(ctx, t, 6400, 0.09, 0.04);
      }
    }
  }

  private scheduleKickDrum(
    ctx: AudioContext,
    startTime: number,
    startFreq: number,
    endFreq: number,
    peakGain: number,
    durationSec: number
  ): void {
    if (!this.masterGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + durationSec * 0.65);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.015);
    this.trackMusicNode(osc);
  }

  private schedulePhonkCowbell(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    peakGain: number,
    durationSec: number
  ): void {
    if (!this.masterGain) return;
    // Dual detuned metallic oscillators through a warm bandpass for classic live-friendly Phonk cowbell
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    oscA.type = 'square';
    oscB.type = 'triangle';
    oscA.frequency.setValueAtTime(freq, startTime);
    oscB.frequency.setValueAtTime(freq * 1.48, startTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.35, startTime);
    filter.Q.setValueAtTime(2.2, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    oscA.start(startTime);
    oscB.start(startTime);
    oscA.stop(startTime + durationSec + 0.015);
    oscB.stop(startTime + durationSec + 0.015);
    this.trackMusicNode(oscA);
    this.trackMusicNode(oscB);
  }

  private trackMusicNode(node: AudioScheduledSourceNode): void {
    this.activeMusicNodes.push(node);
    node.onended = () => {
      const idx = this.activeMusicNodes.indexOf(node);
      if (idx !== -1) {
        this.activeMusicNodes.splice(idx, 1);
      }
    };
  }

  private scheduleMusicTone(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    type: OscillatorType,
    peakGain: number,
    durationSec: number
  ): void {
    if (!this.masterGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
    this.trackMusicNode(osc);
  }

  private scheduleMusicPercussion(
    ctx: AudioContext,
    startTime: number,
    centerFreq: number,
    peakGain: number,
    durationSec = 0.065
  ): void {
    if (!this.masterGain) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      ch[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.7;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, startTime);
    filter.Q.setValueAtTime(1.4, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(startTime);
    this.trackMusicNode(src);
  }

  private stopActiveDanceMusic(): void {
    this.stopNodeList(this.activeMusicNodes);
    this.activeMusicNodes = [];
  }

  private stopNodeList(nodes: AudioNode[]): void {
    for (const node of nodes) {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }
  }

  private playArpeggioNotes(
    ctx: AudioContext,
    now: number,
    notes: readonly number[],
    stepSec: number,
    peakGain: number,
    tailSec: number
  ): void {
    if (!this.masterGain) return;
    notes.forEach((freq, idx) => {
      const start = now + idx * stepSec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(peakGain, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, start + tailSec);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + tailSec + 0.02);
    });
  }

  private playFilteredNoiseBurst(
    ctx: AudioContext,
    startTime: number,
    durationSec: number,
    centerFreq: number,
    qValue: number,
    peakGain: number
  ): void {
    if (!this.masterGain) return;
    const bufferLength = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i += 1) {
      const env = Math.sin((i / bufferLength) * Math.PI);
      channel[i] = (Math.random() * 2 - 1) * env * 0.55;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, startTime);
    filter.Q.setValueAtTime(qValue, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(startTime);
    if (this.activeSfxNodes.length > 32) {
      this.activeSfxNodes = this.activeSfxNodes.slice(-16);
    }
    this.activeSfxNodes.push(src);
  }
}

export const sharedSoundEngine = new WebAudioSoundEngine();
