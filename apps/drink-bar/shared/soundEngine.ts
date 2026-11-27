import { GAMEPLAY_LIMITS } from './config';
import type { DanceStyle, GiftTier, SfxKind } from './types';

const MIC_DUCK_FACTOR = 0.25;
const CHAT_THROTTLE_MS = 140;
const LIKE_THROTTLE_MS = 180;
const AMBIENT_THROTTLE_MS = 650;
const SHAKER_THROTTLE_MS = 460;

type UnlockListener = (unlocked: boolean) => void;

// Noel Theme — Style 1: Jingle Bells Pop/Cute (C major, 118 BPM)
const DANCE_POP_MELODY: readonly number[] = [
  659.25, 659.25, 659.25, 0, 659.25, 659.25, 659.25, 0,
  659.25, 783.99, 523.25, 587.33, 659.25, 0, 0, 0,
  698.46, 698.46, 698.46, 698.46, 698.46, 659.25, 659.25, 659.25,
  659.25, 587.33, 587.33, 659.25, 587.33, 0, 783.99, 0,
];
const DANCE_POP_BASS: readonly number[] = [130.81, 130.81, 174.61, 196.0];
const DANCE_POP_SPARKLES: readonly number[] = [2093.0, 2637.02, 2349.32, 2637.02];

// Noel Theme — Style 2: We Wish You a Merry Christmas Groove/Chill (105 BPM)
const DANCE_GROOVE_CHORDS: readonly (readonly number[])[] = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [349.23, 440.0, 523.25, 659.25], // Fmaj7
  [293.66, 349.23, 440.0, 523.25], // Dm7
  [392.0, 493.88, 587.33, 698.46], // G7
];
const DANCE_GROOVE_BASS: readonly number[] = [
  130.81, 130.81, 174.61, 146.83, 196.0, 196.0, 164.81, 130.81,
];
const DANCE_GROOVE_LEAD: readonly number[] = [
  392.0, 523.25, 523.25, 587.33, 523.25, 493.88, 440.0, 440.0,
  440.0, 587.33, 587.33, 659.25, 587.33, 523.25, 493.88, 392.0,
];

// Noel Theme — Style 3: Carol of the Bells EDM / Phonk Remix (130 BPM)
const DANCE_PHONK_COWBELL: readonly number[] = [
  987.77, 880.0, 987.77, 783.99, 987.77, 880.0, 987.77, 783.99,
  659.25, 739.99, 783.99, 880.0, 987.77, 880.0, 783.99, 739.99,
];
const DANCE_PHONK_BASS: readonly number[] = [82.41, 82.41, 73.42, 65.41, 61.74, 61.74, 65.41, 73.42];

const DANCE_BPM_MAP: Readonly<Record<DanceStyle, number>> = {
  heart_sway: 126,
  groove_wave: 114,
  party_hype: 138,
};

export class WebAudioSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private activeTrackGain: GainNode | null = null;
  private activeVoiceSource: AudioBufferSourceNode | null = null;
  private bgmAudioEl: HTMLAudioElement | null = null;
  private bgmMediaSource: MediaElementAudioSourceNode | null = null;
  private bgmConsecutiveFailures = 0;
  private bgmTrackIndex = 0;
  private bgmSessionSeq = 0;
  private bgmDesired = false;
  private bgmLoading = false;
  private isDanceMusicPlaying = false;
  private danceDuckEndTimer: ReturnType<typeof setTimeout> | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxEnabled = true;
  private musicEnabled = true;
  private bgmEnabled = true;
  private masterVolume = 0.85;
  private isMicMode = false;
  private isTtsDucking = false;
  private lastPlayedAt: Partial<Record<SfxKind, number>> = {};
  private activeMusicNodes: AudioNode[] = [];
  private activeSfxNodes: AudioNode[] = [];
  private unlockBound = false;
  private hasGestureActivation = false;
  private lastAutoResumeAttemptMs = 0;
  private readonly unlockListeners = new Set<UnlockListener>();
  private pendingPlayAfterUnlock: {
    kind: SfxKind;
    tier: GiftTier;
    danceStyle?: DanceStyle;
    pitchScale: number;
  } | null = null;

  constructor() {
    this.bindUserUnlock();
  }

  private bindUserUnlock(): void {
    if (typeof window === 'undefined' || this.unlockBound) return;
    this.unlockBound = true;
    const handleGesture = () => {
      this.hasGestureActivation = true;
      void this.unlock(false);
    };
    const handleResumeCheck = () => {
      if (this.hasGestureActivation && this.ctx && this.ctx.state !== 'running') {
        void this.unlock(false);
      }
    };
    window.addEventListener('pointerdown', handleGesture, { passive: true, capture: true });
    window.addEventListener('mousedown', handleGesture, { passive: true, capture: true });
    window.addEventListener('touchstart', handleGesture, { passive: true, capture: true });
    window.addEventListener('click', handleGesture, { passive: true, capture: true });
    window.addEventListener('keydown', handleGesture, { passive: true, capture: true });
    window.addEventListener('focus', handleResumeCheck, { passive: true });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleResumeCheck, { passive: true });
    }
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
    if (ok) {
      this.hasGestureActivation = true;
      this.flushPendingPlay();
      this.ensureCafeBgmStarted();
      if (playConfirmTone) {
        this.play('chime');
      }
    }
    return ok;
  }

  private flushPendingPlay(): void {
    const pending = this.pendingPlayAfterUnlock;
    if (!pending) return;
    this.pendingPlayAfterUnlock = null;
    this.play(pending.kind, pending.tier, pending.danceStyle, pending.pitchScale);
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

  public setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    if (!enabled) {
      this.stopCafeBgm();
      return;
    }
    this.bgmConsecutiveFailures = 0;
    if (this.bgmDesired && this.isUnlocked()) {
      this.ensureCafeBgmStarted();
    }
  }

  public enableAutoCafeBgm(desired = true): void {
    this.bgmDesired = desired;
    if (!desired) {
      this.stopCafeBgm();
      return;
    }
    this.bgmConsecutiveFailures = 0;
    if (this.bgmEnabled && this.isUnlocked()) {
      this.ensureCafeBgmStarted();
    }
  }

  private syncBgmGain(): void {
    if (!this.ctx || !this.bgmGain) return;
    const target = this.isDanceMusicPlaying
      ? GAMEPLAY_LIMITS.CAFE_BGM_DANCE_DUCK_GAIN
      : GAMEPLAY_LIMITS.CAFE_BGM_BASE_GAIN;
    const tau = this.isDanceMusicPlaying ? 0.08 : 0.35;
    this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, tau);
  }

  private ensureCafeBgmStarted(): void {
    if (!this.bgmDesired || !this.bgmEnabled || this.bgmAudioEl || this.bgmLoading) {
      return;
    }
    const ctx = this.ensureRunningContext();
    if (!ctx || !this.bgmGain || typeof Audio === 'undefined') return;

    const playlist = GAMEPLAY_LIMITS.CAFE_BGM_PLAYLIST;
    if (!playlist.length || this.bgmConsecutiveFailures >= playlist.length) return;

    const trackUrl = playlist[this.bgmTrackIndex % playlist.length];
    const sessionSeq = ++this.bgmSessionSeq;
    const audio = new Audio(trackUrl);
    audio.preload = 'auto';
    audio.loop = false;

    let mediaSource: MediaElementAudioSourceNode | null = null;
    try {
      mediaSource = ctx.createMediaElementSource(audio);
      mediaSource.connect(this.bgmGain);
    } catch {
      audio.src = '';
      return;
    }

    this.bgmAudioEl = audio;
    this.bgmMediaSource = mediaSource;
    this.bgmLoading = true;
    this.syncBgmGain();

    const cleanupAudioRef = () => {
      if (this.bgmAudioEl === audio) {
        this.bgmAudioEl = null;
      }
      if (this.bgmMediaSource === mediaSource) {
        try {
          mediaSource?.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.bgmMediaSource = null;
      }
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;
      audio.src = '';
    };

    audio.onplaying = () => {
      this.bgmLoading = false;
      this.bgmConsecutiveFailures = 0;
    };

    audio.onended = () => {
      this.bgmLoading = false;
      cleanupAudioRef();
      if (sessionSeq === this.bgmSessionSeq && this.bgmDesired && this.bgmEnabled) {
        this.advanceToNextBgmTrack(playlist.length);
      }
    };

    audio.onerror = () => {
      this.bgmLoading = false;
      cleanupAudioRef();
      this.bgmConsecutiveFailures += 1;
      if (
        sessionSeq === this.bgmSessionSeq &&
        this.bgmDesired &&
        this.bgmEnabled &&
        this.bgmConsecutiveFailures < playlist.length
      ) {
        this.advanceToNextBgmTrack(playlist.length);
      }
    };

    void audio.play().catch(() => {
      this.bgmLoading = false;
      if (sessionSeq !== this.bgmSessionSeq) return;
      cleanupAudioRef();
      this.bgmConsecutiveFailures += 1;
      if (this.bgmDesired && this.bgmEnabled && this.bgmConsecutiveFailures < playlist.length) {
        this.advanceToNextBgmTrack(playlist.length);
      }
    });
  }

  private advanceToNextBgmTrack(playlistLength: number): void {
    if (playlistLength <= 0 || this.bgmConsecutiveFailures >= playlistLength) return;
    this.bgmTrackIndex = (this.bgmTrackIndex + 1) % playlistLength;
    this.ensureCafeBgmStarted();
  }

  private stopCafeBgm(): void {
    this.bgmSessionSeq += 1;
    this.bgmLoading = false;
    const audio = this.bgmAudioEl;
    const mediaSource = this.bgmMediaSource;
    this.bgmAudioEl = null;
    this.bgmMediaSource = null;
    if (audio) {
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
        audio.src = '';
      } catch {
        // Ignore already stopped bgm audio element
      }
    }
    if (mediaSource) {
      try {
        mediaSource.disconnect();
      } catch {
        // Ignore disconnect errors
      }
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

  public setTtsDucking(ducking: boolean): void {
    if (this.isTtsDucking === ducking) return;
    this.isTtsDucking = ducking;
    this.syncMasterGain();
    if (!this.ctx || !this.musicGain) return;
    const targetMusicDuck = ducking
      ? Math.min(1, GAMEPLAY_LIMITS.TTS_DUCK_FACTOR / GAMEPLAY_LIMITS.TTS_SFX_DUCK_FACTOR)
      : 1;
    const tau = ducking ? 0.06 : 0.2;
    this.musicGain.gain.setTargetAtTime(targetMusicDuck, this.ctx.currentTime, tau);
  }

  private computeTargetGain(): number {
    const micDuck = this.isMicMode ? MIC_DUCK_FACTOR : 1;
    const ttsDuck = this.isTtsDucking ? GAMEPLAY_LIMITS.TTS_SFX_DUCK_FACTOR : 1;
    return Math.max(0, Math.min(1, this.masterVolume * micDuck * ttsDuck));
  }

  private computeVoiceGain(): number {
    const micDuck = this.isMicMode ? MIC_DUCK_FACTOR : 1;
    return Math.max(0, Math.min(1, this.masterVolume * micDuck));
  }

  private syncMasterGain(): void {
    if (!this.ctx || !this.masterGain) return;
    const tau = this.isTtsDucking ? 0.05 : 0.14;
    this.masterGain.gain.setTargetAtTime(
      this.computeTargetGain(),
      this.ctx.currentTime,
      tau
    );
    if (this.voiceGain) {
      this.voiceGain.gain.setTargetAtTime(
        this.computeVoiceGain(),
        this.ctx.currentTime,
        0.04
      );
    }
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
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(
          this.isTtsDucking
            ? Math.min(1, GAMEPLAY_LIMITS.TTS_DUCK_FACTOR / GAMEPLAY_LIMITS.TTS_SFX_DUCK_FACTOR)
            : 1,
          this.ctx.currentTime
        );
        this.musicGain.connect(this.masterGain);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(
          this.isDanceMusicPlaying
            ? GAMEPLAY_LIMITS.CAFE_BGM_DANCE_DUCK_GAIN
            : GAMEPLAY_LIMITS.CAFE_BGM_BASE_GAIN,
          this.ctx.currentTime
        );
        this.bgmGain.connect(this.musicGain);

        this.voiceGain = this.ctx.createGain();
        this.voiceGain.gain.setValueAtTime(
          this.computeVoiceGain(),
          this.ctx.currentTime
        );

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.masterGain.connect(this.compressor);
        this.voiceGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
        this.ctx.onstatechange = () => {
          this.notifyUnlockListeners();
          if (this.ctx?.state === 'running') {
            this.flushPendingPlay();
            this.ensureCafeBgmStarted();
          } else if (this.ctx?.state === 'suspended' && this.hasGestureActivation) {
            const nowMs = Date.now();
            if (nowMs - this.lastAutoResumeAttemptMs >= 1000) {
              this.lastAutoResumeAttemptMs = nowMs;
              void this.unlock(false);
            }
          }
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
      void ctx
        .resume()
        .then(() => {
          this.notifyUnlockListeners();
          if (ctx.state === 'running') {
            this.flushPendingPlay();
            this.ensureCafeBgmStarted();
          }
        })
        .catch(() => {});
      return null;
    }
    return ctx.state === 'running' ? ctx : null;
  }

  public stopVoiceAudio(): void {
    if (!this.activeVoiceSource) return;
    try {
      this.activeVoiceSource.onended = null;
      this.activeVoiceSource.stop();
      this.activeVoiceSource.disconnect();
    } catch {
      // Ignore already stopped voice source
    }
    this.activeVoiceSource = null;
  }

  private async ensureRunningContextAsync(): Promise<AudioContext | null> {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return null;
    if (ctx.state === 'running') return ctx;
    if (!this.hasGestureActivation) return null;
    try {
      await ctx.resume();
    } catch {
      return null;
    }
    this.notifyUnlockListeners();
    return ctx.state === 'running' ? ctx : null;
  }

  public async playVoiceAudioBuffer(
    arrayBuffer: ArrayBuffer,
    playbackRate = 1.18,
    onEnded?: () => void
  ): Promise<boolean> {
    const ctx = await this.ensureRunningContextAsync();
    if (!ctx || !this.voiceGain) return false;
    try {
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      if (ctx.state !== 'running' || !this.voiceGain) return false;
      this.stopVoiceAudio();
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.playbackRate.value = playbackRate;
      source.connect(this.voiceGain);
      this.activeVoiceSource = source;
      source.onended = () => {
        if (this.activeVoiceSource === source) {
          this.activeVoiceSource = null;
        }
        try {
          source.disconnect();
        } catch {
          // Ignore disconnect error
        }
        onEnded?.();
      };
      source.start(0);
      return true;
    } catch {
      return false;
    }
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
      const resolvedStyle = danceStyle ?? styleMap[tier];
      const played = this.playDanceJingle(tier, resolvedStyle);
      if (!played) {
        this.pendingPlayAfterUnlock = { kind, tier, danceStyle: resolvedStyle, pitchScale };
      }
      return played;
    }
    if (!this.sfxEnabled) return true;

    const ctx = this.ensureRunningContext();
    if (!ctx) {
      this.pendingPlayAfterUnlock = { kind, tier, danceStyle, pitchScale };
      return false;
    }

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
      case 'wake_pop':
        this.playWakePop(ctx);
        break;
    }
    return true;
  }

  private playCupPlace(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Crisp hollow takeaway cup tap on wooden coaster + subtle rim click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(125, now + 0.06);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.36, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
    this.trackSfxNode(osc);
    this.playFilteredNoiseBurst(ctx, now, 0.025, 2200, 2.0, 0.14);
  }

  private playSugarClick(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Tactile dispenser button click + delicate sugar granule scoop shimmer
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1040, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.036);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.34, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
    this.trackSfxNode(osc);

    // Subtle sugar granules rustle
    this.playFilteredNoiseBurst(ctx, now + 0.02, 0.09, 3800, 2.1, 0.22);
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
      gain.gain.linearRampToValueAtTime(0.32, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.13);
      this.trackSfxNode(osc);

      // Glass harmonic shimmer overtone
      const overtone = ctx.createOscillator();
      const overGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(baseFreq * jitter * 1.52, t);
      overGain.gain.setValueAtTime(0.001, t);
      overGain.gain.linearRampToValueAtTime(0.13, t + 0.003);
      overGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      overtone.connect(overGain);
      overGain.connect(this.masterGain!);
      overtone.start(t);
      overtone.stop(t + 0.08);
      this.trackSfxNode(overtone);
    });
  }

  private playMatchaScoop(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // 1. Delicate bamboo chashaku scoop rustling through fine dry matcha powder
    this.playFilteredNoiseBurst(ctx, now, 0.09, 3100, 1.9, 0.26);

    // 2. Crisp gentle tap of bamboo spoon against ceramic chawan rim
    const tap = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tap.type = 'sine';
    tap.frequency.setValueAtTime(1420, now + 0.06);
    tap.frequency.exponentialRampToValueAtTime(920, now + 0.11);

    tapGain.gain.setValueAtTime(0.001, now + 0.06);
    tapGain.gain.linearRampToValueAtTime(0.22, now + 0.065);
    tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);

    tap.connect(tapGain);
    tapGain.connect(this.masterGain);
    tap.start(now + 0.06);
    tap.stop(now + 0.135);
    this.trackSfxNode(tap);
  }

  private playChasen(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Authentic brisk bamboo Chasen W/M strokes whisking matcha inside ceramic chawan
    this.playFilteredNoiseBurst(ctx, now, 0.12, 2050, 1.9, 0.34);
    this.playFilteredNoiseBurst(ctx, now + 0.095, 0.12, 2480, 2.1, 0.31);
    this.playFilteredNoiseBurst(ctx, now + 0.19, 0.11, 2220, 2.0, 0.27);

    // Subtle warm ceramic chawan resonance tap from bamboo bristles
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.14);
    gain.gain.setValueAtTime(0.001, now + 0.04);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.055);
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
    // Realistic handheld electric milk-frother motor buzz + creamy foam whirr
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, now);
    filter.Q.setValueAtTime(1.4, now);

    const motorGain = ctx.createGain();
    motorGain.gain.setValueAtTime(0.001, now);
    motorGain.gain.linearRampToValueAtTime(0.24, now + 0.03);
    motorGain.gain.setValueAtTime(0.22, now + 0.24);
    motorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    const oscFundamental = ctx.createOscillator();
    oscFundamental.type = 'sawtooth';
    oscFundamental.frequency.setValueAtTime(192, now);
    oscFundamental.frequency.linearRampToValueAtTime(226, now + 0.14);
    oscFundamental.frequency.linearRampToValueAtTime(208, now + 0.32);

    const oscHarmonic = ctx.createOscillator();
    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(384, now);
    oscHarmonic.frequency.linearRampToValueAtTime(452, now + 0.14);
    oscHarmonic.frequency.linearRampToValueAtTime(416, now + 0.32);

    oscFundamental.connect(filter);
    oscHarmonic.connect(filter);
    filter.connect(motorGain);
    motorGain.connect(this.masterGain);

    oscFundamental.start(now);
    oscHarmonic.start(now);
    oscFundamental.stop(now + 0.35);
    oscHarmonic.stop(now + 0.35);
    this.trackSfxNode(oscFundamental);
    this.trackSfxNode(oscHarmonic);

    // Creamy foam aeration hiss
    this.playFilteredNoiseBurst(ctx, now + 0.01, 0.30, 2400, 1.7, 0.28);
  }

  private playShaker(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Crisp metallic cocktail-shaker ice rattle (forward + back slosh + tin ice ping)
    this.playFilteredNoiseBurst(ctx, now, 0.10, 3150, 2.7, 0.36);
    this.playFilteredNoiseBurst(ctx, now + 0.115, 0.10, 3580, 2.9, 0.33);

    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(3780 + Math.random() * 260, now + 0.015);
    pingGain.gain.setValueAtTime(0.001, now + 0.015);
    pingGain.gain.linearRampToValueAtTime(0.11, now + 0.02);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    ping.connect(pingGain);
    pingGain.connect(this.masterGain);
    ping.start(now + 0.015);
    ping.stop(now + 0.08);
    this.trackSfxNode(ping);
  }

  private playCafeDrip(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // Warm espresso extraction pressure hiss + rich rhythmic coffee drops
    this.playFilteredNoiseBurst(ctx, now, 0.28, 960, 1.15, 0.26);

    [0.06, 0.18].forEach((offset, idx) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startF = idx === 0 ? 520 : 620;
      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(startF * 1.45, t + 0.06);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.007);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.09);
      this.trackSfxNode(osc);
    });
  }

  private playSodaFizz(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Crisp carbonated effervescence + delicate sparkling micro-bubble pops
    this.playFilteredNoiseBurst(ctx, now, 0.36, 4850, 1.05, 0.32);

    for (let i = 0; i < 4; i += 1) {
      const t = now + 0.03 + i * 0.072 + Math.random() * 0.025;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3400 + Math.random() * 1900, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.026);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.032);
      this.trackSfxNode(osc);
    }
  }

  private playJuicer(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    // Crisp citrus rotary reamer hum + juicy fresh orange squeeze splash
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(280, now + 0.14);
    osc.frequency.linearRampToValueAtTime(240, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
    this.trackSfxNode(osc);

    // Fresh juice squeeze hiss + juicy splash droplet
    this.playFilteredNoiseBurst(ctx, now + 0.02, 0.24, 1950, 1.4, 0.24);
    const drop = ctx.createOscillator();
    const dropGain = ctx.createGain();
    drop.type = 'sine';
    drop.frequency.setValueAtTime(480, now + 0.1);
    drop.frequency.exponentialRampToValueAtTime(860, now + 0.17);
    dropGain.gain.setValueAtTime(0.001, now + 0.1);
    dropGain.gain.linearRampToValueAtTime(0.18, now + 0.11);
    dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.185);
    drop.connect(dropGain);
    dropGain.connect(this.masterGain);
    drop.start(now + 0.1);
    drop.stop(now + 0.195);
    this.trackSfxNode(drop);
  }

  private playPour(ctx: AudioContext, pitchScale = 1): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // ASMR fluid stream resonance with rising cavity pitch synced to actual cup liquid level
    const safePitch = Math.max(0.75, Math.min(1.55, pitchScale));
    this.playFilteredNoiseBurst(ctx, now, 0.28, 1340 * safePitch, 1.45, 0.31);

    // Dual organic water-glug resonance blips
    [0, 0.12].forEach((offset, idx) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseF = (idx === 0 ? 350 : 430) * safePitch;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseF, t);
      osc.frequency.exponentialRampToValueAtTime(baseF * 1.72, t + 0.12);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.25 : 0.2, t + 0.018);
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
      gain.gain.linearRampToValueAtTime(0.30, start + 0.008);
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
    this.playFilteredNoiseBurst(ctx, now, 0.032, 2900, 2.2, 0.34);

    // Stage 2: Warm hollow cup seal pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(410, now + 0.012);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.072);

    gain.gain.setValueAtTime(0.001, now + 0.012);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.088);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now + 0.012);
    osc.stop(now + 0.095);
    this.trackSfxNode(osc);
  }

  private playStrawInsert(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // Stage 1: Light straw puncture/click into dome aperture
    this.playFilteredNoiseBurst(ctx, now, 0.022, 3800, 3.0, 0.28);

    // Stage 2: Smooth fluid slide pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(940, now + 0.006);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.06);

    gain.gain.setValueAtTime(0.001, now + 0.006);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now + 0.006);
    osc.stop(now + 0.082);
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

  private playWakePop(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    // Crisp bubble pop + bouncy cartoon boing
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.16);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(now);
    osc.stop(now + 0.19);
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
    if (!ctx || !this.masterGain || !this.musicGain) return false;

    // Immediately silence any running dance track so switching styles never overlaps
    this.stopActiveDanceMusic();

    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(1, ctx.currentTime);
    trackGain.connect(this.musicGain);
    this.activeTrackGain = trackGain;

    const durationMap: Record<GiftTier, number> = {
      SMALL: GAMEPLAY_LIMITS.DANCE_SMALL_DURATION_MS / 1000,
      MEDIUM: GAMEPLAY_LIMITS.DANCE_MEDIUM_DURATION_MS / 1000,
      LARGE: GAMEPLAY_LIMITS.DANCE_LARGE_DURATION_MS / 1000,
    };
    const totalSec = durationMap[tier];
    const now = ctx.currentTime + 0.015;
    const beatSec = 60 / DANCE_BPM_MAP[style];

    this.isDanceMusicPlaying = true;
    this.syncBgmGain();
    if (this.danceDuckEndTimer) {
      clearTimeout(this.danceDuckEndTimer);
    }
    this.danceDuckEndTimer = setTimeout(() => {
      this.danceDuckEndTimer = null;
      this.isDanceMusicPlaying = false;
      this.syncBgmGain();
    }, Math.ceil((totalSec + 0.1) * 1000));

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

  private getMusicDestination(): AudioNode | null {
    return this.activeTrackGain ?? this.musicGain ?? this.masterGain;
  }

  /**
   * Style 1 ("Nhảy 1: Bắn Tim") — Bright Pop / Cute (~118 BPM)
   * Bouncy kawaii melody, bubbly pop-chirp accents, warm sine bass, light pop-clap, and upbeat sparkle chimes.
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
      if (melFreq > 0) {
        this.scheduleMusicTone(ctx, t, melFreq, 'triangle', 0.17, eighthSec * 0.85);
        // Festive high sleigh-bell shimmer doubling the Jingle Bells melody
        this.scheduleMusicTone(ctx, t, melFreq * 2, 'sine', 0.08, eighthSec * 0.45);
      }

      // Bouncy upbeat Noel pop bass & crisp kick on beats
      if (i % 2 === 0) {
        const beatIdx = Math.floor(i / 2);
        const bassFreq = DANCE_POP_BASS[Math.floor(beatIdx / 2) % DANCE_POP_BASS.length];
        this.scheduleMusicTone(ctx, t, bassFreq, 'sine', 0.23, beatSec * 0.82);
        this.scheduleKickDrum(ctx, t, 128, 48, 0.2, 0.11);
        // Crisp sleigh-bell jingle shake on every beat
        this.scheduleMusicPercussion(ctx, t, 5800, 0.075, 0.045);
        if (beatIdx % 2 === 1) {
          // Cute crisp hand-clap + bubbly pop accent on beats 2 & 4
          this.scheduleMusicPercussion(ctx, t, 2400, 0.16, 0.06);
          this.schedulePopChirp(ctx, t, 520, 1080, 0.11, 0.065);
        }
      } else {
        // Upbeat sleigh-bell chime & offbeat hat
        const sparkle = DANCE_POP_SPARKLES[Math.floor(i / 2) % DANCE_POP_SPARKLES.length];
        this.scheduleMusicTone(ctx, t, sparkle, 'sine', 0.09, 0.085);
        this.scheduleMusicPercussion(ctx, t, 6600, 0.06, 0.035);
      }
    }
  }

  /**
   * Style 2 ("Nhảy 2: Sóng Tay") — Smooth Groove / Chill (~105 BPM)
   * Warm Rhodes-style electric piano chords, silky low-pass gliding bass, rimshot snare, and chill shuffle hats.
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
          this.scheduleMusicTone(ctx, t + n * 0.012, chord[n], 'sine', 0.065, beatSec * 1.85);
        }
      }

      // Smooth melodic Noel groove motif + bright bell shimmer
      const leadFreq = DANCE_GROOVE_LEAD[i % DANCE_GROOVE_LEAD.length];
      if (leadFreq > 0) {
        this.scheduleMusicTone(ctx, t, leadFreq, 'triangle', 0.14, eighthSec * 0.92);
        this.scheduleMusicTone(ctx, t, leadFreq * 2, 'sine', 0.045, eighthSec * 0.5);
      }

      // Silky low-pass filtered groove bass
      if (i % 2 === 0 || i % 8 === 5) {
        const bassFreq = DANCE_GROOVE_BASS[i % DANCE_GROOVE_BASS.length];
        this.scheduleWarmSubBass(ctx, t, bassFreq, 0.27, eighthSec * 1.45);
      }

      // Lively pocket drums: punchy kick on 1 & 3-and, crisp rimshot on 2 & 4, sleigh-shaker hats
      if (i % 8 === 0 || i % 8 === 4 || i % 8 === 5) {
        this.scheduleKickDrum(ctx, t, 115, 44, 0.23, 0.13);
      }
      if (i % 4 === 2) {
        this.scheduleMusicPercussion(ctx, t, 2150, 0.16, 0.065);
      }
      if (i % 2 === 1) {
        this.scheduleMusicPercussion(ctx, t + 0.015, 5900, 0.09, 0.042);
      }
    }
  }

  /**
   * Style 3 ("Nhảy 3: Quẩy Nhiệt") — High-Energy Dance / EDM / Phonk (~130 BPM)
   * Punchy 4-on-the-floor kick, driving 808 bass, balanced metallic Phonk cowbell hook, and crisp snare/hats.
   */
  private scheduleEdmPhonkTrack(
    ctx: AudioContext,
    now: number,
    totalSec: number,
    beatSec: number
  ): void {
    const eighthSec = beatSec * 0.5;
    const totalEighths = Math.max(12, Math.floor(totalSec / eighthSec));

    // Crisp opening drop crash + sub impact
    this.scheduleMusicPercussion(ctx, now, 3400, 0.16, 0.14);
    this.scheduleKickDrum(ctx, now, 165, 38, 0.28, 0.22);

    for (let i = 0; i < totalEighths; i += 1) {
      const t = now + i * eighthSec;

      // Iconic energetic Carol of the Bells Phonk cowbell + bright synth octave lead
      const hookFreq = DANCE_PHONK_COWBELL[i % DANCE_PHONK_COWBELL.length];
      if (hookFreq > 0) {
        this.schedulePhonkCowbell(ctx, t, hookFreq, 0.135, eighthSec * 0.72);
        this.scheduleMusicTone(ctx, t, hookFreq * 2, 'sine', 0.055, eighthSec * 0.45);
      }

      // Punchy 4-on-the-floor EDM kick + driving 808 sub-bass
      if (i % 2 === 0) {
        const beatIdx = Math.floor(i / 2);
        this.scheduleKickDrum(ctx, t, 155, 40, 0.29, 0.13);
        const bassFreq = DANCE_PHONK_BASS[beatIdx % DANCE_PHONK_BASS.length];
        this.scheduleWarmSubBass(ctx, t + 0.018, bassFreq, 0.26, beatSec * 0.85);
        if (beatIdx % 2 === 1) {
          // Snappy EDM clap/snare on beats 2 & 4
          this.scheduleMusicPercussion(ctx, t, 2950, 0.2, 0.08);
        }
      } else {
        // Fast driving offbeat EDM sleigh hi-hat
        this.scheduleMusicPercussion(ctx, t, 6600, 0.11, 0.045);
      }
    }
  }

  private schedulePopChirp(
    ctx: AudioContext,
    startTime: number,
    startFreq: number,
    endFreq: number,
    peakGain: number,
    durationSec: number
  ): void {
    const dest = this.getMusicDestination();
    if (!dest) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + durationSec * 0.75);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.015);
    this.trackMusicNode(osc);
  }

  private scheduleWarmSubBass(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    peakGain: number,
    durationSec: number
  ): void {
    const dest = this.getMusicDestination();
    if (!dest) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, startTime);
    filter.Q.setValueAtTime(1.1, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
    this.trackMusicNode(osc);
  }

  private scheduleKickDrum(
    ctx: AudioContext,
    startTime: number,
    startFreq: number,
    endFreq: number,
    peakGain: number,
    durationSec: number
  ): void {
    const dest = this.getMusicDestination();
    if (!dest) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + durationSec * 0.65);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(dest);
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
    const dest = this.getMusicDestination();
    if (!dest) return;
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
    filter.Q.setValueAtTime(2.0, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

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
    const dest = this.getMusicDestination();
    if (!dest) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(dest);
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
    const dest = this.getMusicDestination();
    if (!dest) return;
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
    gain.connect(dest);
    src.start(startTime);
    this.trackMusicNode(src);
  }

  private stopActiveDanceMusic(): void {
    if (this.danceDuckEndTimer) {
      clearTimeout(this.danceDuckEndTimer);
      this.danceDuckEndTimer = null;
    }
    this.isDanceMusicPlaying = false;
    this.syncBgmGain();
    if (this.activeTrackGain && this.ctx) {
      try {
        this.activeTrackGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.activeTrackGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        this.activeTrackGain.disconnect();
      } catch {
        // Ignore already disconnected gain
      }
      this.activeTrackGain = null;
    }
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
