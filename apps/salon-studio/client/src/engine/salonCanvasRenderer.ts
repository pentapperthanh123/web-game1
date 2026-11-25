import { STAGE_METRICS } from '@shared/constants/salonConfig';
import { useSalonStore } from '../store/salonStore';
import { drawSalonBackground } from './drawBackground';
import { drawHairStation } from './drawHairLayers';
import { drawNailStation } from './drawNailLayers';
import { salonParticles } from './particlePool';

export class SalonCanvasLoop {
  private canvas: HTMLCanvasElement;
  private rafId: number | null = null;
  private lastTickTime = 0;
  private elapsedTimeSec = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = STAGE_METRICS.WIDTH;
    this.canvas.height = STAGE_METRICS.HEIGHT;
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTickTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (nowMs: number): void => {
    this.rafId = requestAnimationFrame(this.loop);

    const deltaMs = nowMs - this.lastTickTime;
    // Strict 30 FPS lock (FRAME_INTERVAL_MS = 33.33ms)
    if (deltaMs < STAGE_METRICS.FRAME_INTERVAL_MS) {
      return;
    }

    const dtSec = Math.min(0.1, deltaMs / 1000);
    this.lastTickTime = nowMs - (deltaMs % STAGE_METRICS.FRAME_INTERVAL_MS);
    this.elapsedTimeSec += dtSec;

    const store = useSalonStore.getState();
    store.tick(dtSec);
    salonParticles.update(dtSec);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    this.renderScene(ctx);
  };

  private renderScene(ctx: CanvasRenderingContext2D): void {
    const state = useSalonStore.getState();
    const isFast = Date.now() < state.stylistSpeedBoostUntil;

    drawSalonBackground(ctx, state.activeService, this.elapsedTimeSec);

    if (state.activeService === 'HAIR') {
      drawHairStation(
        ctx,
        state.activeCustomer,
        state.stylistMood,
        state.stylistSpeech,
        isFast,
        this.elapsedTimeSec
      );
    } else {
      drawNailStation(
        ctx,
        state.activeCustomer,
        state.stylistMood,
        state.stylistSpeech,
        isFast,
        this.elapsedTimeSec
      );
    }

    salonParticles.draw(ctx);
  }
}
