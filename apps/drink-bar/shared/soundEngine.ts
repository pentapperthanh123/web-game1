import { GAMEPLAY_LIMITS } from './config';
import type { DanceStyle, GiftTier, SfxKind } from './types';

const MIC_DUCK_FACTOR = 0.25;
const CHAT_THROTTLE_MS = 140;
const LIKE_THROTTLE_MS = 180;
const AMBIENT_THROTTLE_MS = 650;
const SHAKER_THROTTLE_MS = 460;

type UnlockListener = (unlocked: boolean) => void;

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

  private playIceClink(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Pure, crystalline ice cubes falling and clinking inside glass
    const freqs = [2820, 3450, 3080];

    freqs.forEach((baseFreq, idx) => {
      const t = now + idx * 0.055;
      const jitter = 0.96 + Math.random() * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * jitter, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.26, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.12);
      this.activeSfxNodes.push(osc);
    });
  }

  private playChasen(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // Rhythmic bamboo chasen whisking against ceramic chawan (W/M strokes)
    this.playFilteredNoiseBurst(ctx, now, 0.18, 2100, 1.8, 0.28);
    this.playFilteredNoiseBurst(ctx, now + 0.11, 0.16, 2450, 2.0, 0.24);
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
    const now = ctx.currentTime;
    // Crisp metallic shaker rattle with ice & milk tea sloshing inside
    this.playFilteredNoiseBurst(ctx, now, 0.11, 3100, 2.6, 0.32);
    this.playFilteredNoiseBurst(ctx, now + 0.12, 0.11, 3450, 2.8, 0.28);
  }

  private playCafeDrip(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // Rich espresso machine extraction pressure + warm rhythmic drops
    this.playFilteredNoiseBurst(ctx, now, 0.24, 980, 1.2, 0.18);

    [0.08, 0.20].forEach((offset, idx) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startF = idx === 0 ? 520 : 610;
      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(startF * 1.35, t + 0.06);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.09);
      this.activeSfxNodes.push(osc);
    });
  }

  private playSodaFizz(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // Crisp carbonated effervescence and sparkling bubbles
    this.playFilteredNoiseBurst(ctx, now, 0.36, 4400, 1.1, 0.28);
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

    // Smooth fluid stream resonance with subtle pitch rise as liquid fills cup
    const safePitch = Math.max(0.7, Math.min(1.5, pitchScale));
    this.playFilteredNoiseBurst(ctx, now, 0.28, 1400 * safePitch, 1.4, 0.26);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340 * safePitch, now);
    osc.frequency.exponentialRampToValueAtTime(620 * safePitch, now + 0.24);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
    this.activeSfxNodes.push(osc);
  }

  private playToppingPlop(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    [587.33, 783.99].forEach((freq, idx) => {
      const start = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.24, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.13);
      this.activeSfxNodes.push(osc);
    });
  }

  private playLidSnap(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // Crisp satisfying mechanical lid snap closure
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.055);

    gain.gain.setValueAtTime(0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.075);
    this.activeSfxNodes.push(osc);
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

    this.stopActiveDanceMusic();

    const durationMap: Record<GiftTier, number> = {
      SMALL: GAMEPLAY_LIMITS.DANCE_SMALL_DURATION_MS / 1000,
      MEDIUM: GAMEPLAY_LIMITS.DANCE_MEDIUM_DURATION_MS / 1000,
      LARGE: GAMEPLAY_LIMITS.DANCE_LARGE_DURATION_MS / 1000,
    };
    const totalSec = durationMap[tier];
    const now = ctx.currentTime;

    if (style === 'heart_sway') {
      // Gentle cute idol pop melody + soft bass + upbeat sparkle chimes (~3.5s)
      const stepSec = 0.24;
      const totalSteps = Math.max(8, Math.floor(totalSec / stepSec));
      const melody = [523.25, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25];
      const bass = [130.81, 130.81, 164.81, 174.61, 196.0, 146.83];
      for (let i = 0; i < totalSteps; i += 1) {
        const t = now + i * stepSec;
        this.scheduleMusicTone(ctx, t, melody[i % melody.length], 'sine', 0.19, stepSec * 0.85);
        if (i % 2 === 0) {
          this.scheduleMusicTone(ctx, t, bass[(i / 2) % bass.length], 'sine', 0.20, stepSec * 1.6);
        } else {
          // Cute sparkle / pop accent on upbeat
          this.scheduleMusicTone(ctx, t + stepSec * 0.45, 1760.0, 'triangle', 0.08, 0.06);
        }
      }
      return true;
    }

    if (style === 'groove_wave') {
      // Trendy rhythmic groove with crisp off-beat clap/hi-hat + bouncy bass (~5s)
      const stepSec = 0.20;
      const totalSteps = Math.max(12, Math.floor(totalSec / stepSec));
      const melody = [587.33, 698.46, 880.0, 783.99, 698.46, 587.33, 659.25, 783.99];
      const bass = [146.83, 146.83, 174.61, 196.0, 164.81, 146.83];
      for (let i = 0; i < totalSteps; i += 1) {
        const t = now + i * stepSec;
        this.scheduleMusicTone(ctx, t, melody[i % melody.length], 'triangle', 0.21, stepSec * 0.78);
        if (i % 2 === 0) {
          this.scheduleMusicTone(ctx, t, bass[(i / 2) % bass.length], 'sine', 0.26, stepSec * 1.5);
        } else {
          this.scheduleMusicPercussion(ctx, t, 3100, 0.14);
        }
      }
      return true;
    }

    // Style 3 ('party_hype'): Opening confetti pop + fast energetic synth + punchy kick/clap (~7s)
    this.scheduleMusicPercussion(ctx, now, 1800, 0.24);
    const stepSec = 0.16;
    const totalSteps = Math.max(16, Math.floor(totalSec / stepSec));
    const melody = [659.25, 783.99, 1046.5, 987.77, 880.0, 783.99, 880.0, 1046.5];
    const bass = [130.81, 164.81, 196.0, 220.0, 196.0, 164.81];
    for (let i = 0; i < totalSteps; i += 1) {
      const t = now + i * stepSec;
      this.scheduleMusicTone(ctx, t, melody[i % melody.length], 'triangle', 0.23, stepSec * 0.78);
      if (i % 2 === 0) {
        this.scheduleMusicTone(ctx, t, bass[(i / 2) % bass.length], 'triangle', 0.27, stepSec * 1.4);
      } else {
        this.scheduleMusicPercussion(ctx, t, 3600, 0.17);
      }
    }
    return true;
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
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
    this.activeMusicNodes.push(osc);
  }

  private scheduleMusicPercussion(
    ctx: AudioContext,
    startTime: number,
    centerFreq: number,
    peakGain: number
  ): void {
    if (!this.masterGain) return;
    const dur = 0.065;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
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
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(startTime);
    this.activeMusicNodes.push(src);
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
