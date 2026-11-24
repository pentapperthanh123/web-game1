import { SOUND_CONFIG, type SoundFxType } from '@shared/constants/audioConfig';

class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private micMode = false;
  private masterGainNode: GainNode | null = null;
  private currentVolume = SOUND_CONFIG.defaultVolume;

  private initContext(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.value = this.getEffectiveVolume();
      this.masterGainNode.connect(this.ctx.destination);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getEffectiveVolume(): number {
    if (this.isMuted) return 0;
    const base = this.currentVolume;
    return this.micMode ? base * SOUND_CONFIG.micModeDuckingVolume : base;
  }

  public setMicMode(enabled: boolean): void {
    this.micMode = enabled;
    this.updateGain();
  }

  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.updateGain();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.updateGain();
  }

  private updateGain(): void {
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setValueAtTime(this.getEffectiveVolume(), this.ctx.currentTime);
    }
  }

  public play(sfx: SoundFxType): void {
    this.initContext();
    if (!this.ctx || !this.masterGainNode || this.isMuted) return;

    const now = this.ctx.currentTime;

    switch (sfx) {
      case 'KEY_CLICK': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 + Math.random() * 800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        osc.connect(gain);
        gain.connect(this.masterGainNode);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case 'COIN_DROP': {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now); // B5
        osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc1.connect(gain);
        gain.connect(this.masterGainNode);
        osc1.start(now);
        osc1.stop(now + 0.35);
        break;
      }

      case 'MOM_ALARM': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.15);
        osc.frequency.linearRampToValueAtTime(750, now + 0.3);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGainNode);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      case 'MOM_BUST': {
        // Heavy broom smack + pitch dive
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.45);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(this.masterGainNode);
        osc.start(now);
        osc.stop(now + 0.45);
        break;
      }

      case 'SUCCESS_SAFE': {
        // Retro C-E-G chime
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          if (!this.ctx || !this.masterGainNode) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = now + idx * 0.08;
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
          osc.connect(gain);
          gain.connect(this.masterGainNode);
          osc.start(startTime);
          osc.stop(startTime + 0.2);
        });
        break;
      }

      case 'POWER_CUT': {
        // Deep breaker thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGainNode);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case 'BSOD_EXPLODE': {
        // Electronic glitch zap
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.05);
        osc.frequency.linearRampToValueAtTime(110, now + 0.35);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGainNode);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      case 'DRINK_SLURP': {
        // Sting slurping sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.linearRampToValueAtTime(700, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGainNode);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case 'NEW_PLAYER': {
        // Welcome jingle
        [440, 554.37, 659.25].forEach((freq, idx) => {
          if (!this.ctx || !this.masterGainNode) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + idx * 0.09;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGainNode);
          osc.start(t);
          osc.stop(t + 0.25);
        });
        break;
      }
    }
  }
}

export const audioManager = new AudioManager();
