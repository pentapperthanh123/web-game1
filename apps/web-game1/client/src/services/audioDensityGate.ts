import { AUDIO_SFX_CONSTANTS } from '../constants/game';

export interface DensityDecision {
  /** False when the sound should be skipped this time. */
  shouldPlay: boolean;
  /** 0..1 multiplier so dense combat gets quieter instead of louder. */
  gainScale: number;
}

const SILENT: DensityDecision = { shouldPlay: false, gainScale: 0 };

/**
 * Adaptive rate limiter for rapid-fire combat sounds.
 * With a few champions every hit is heard at full strength; with dozens the
 * gate widens the gap between sounds and lowers their gain, so the mix stays
 * punchy instead of turning into a wall of noise.
 */
export class AudioDensityGate {
  private readonly recentHits: number[] = [];
  private lastPlayedAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly baseGapMs: number) {}

  public request(now: number): DensityDecision {
    this.pruneOld(now);
    const overflowHits = Math.max(0, this.recentHits.length - AUDIO_SFX_CONSTANTS.DENSITY_REFERENCE_HITS);
    const requiredGapMs = Math.min(
      AUDIO_SFX_CONSTANTS.DENSITY_MAX_GAP_MS,
      this.baseGapMs + overflowHits * AUDIO_SFX_CONSTANTS.DENSITY_GAP_PER_HIT_MS
    );
    if (now - this.lastPlayedAt < requiredGapMs) return SILENT;

    this.lastPlayedAt = now;
    this.recentHits.push(now);
    const densityRatio = this.recentHits.length / AUDIO_SFX_CONSTANTS.DENSITY_REFERENCE_HITS;
    const gainScale = Math.max(AUDIO_SFX_CONSTANTS.DENSITY_MIN_GAIN, 1 / Math.sqrt(Math.max(1, densityRatio)));
    return { shouldPlay: true, gainScale };
  }

  private pruneOld(now: number): void {
    const windowStart = now - AUDIO_SFX_CONSTANTS.DENSITY_WINDOW_MS;
    while (this.recentHits.length > 0 && this.recentHits[0] < windowStart) {
      this.recentHits.shift();
    }
  }
}
