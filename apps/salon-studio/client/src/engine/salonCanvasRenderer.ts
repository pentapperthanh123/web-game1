import { SALON_I18N } from '@shared/constants/i18n';
import { SALON_PALETTE, STAGE_METRICS } from '@shared/constants/salonConfig';
import type { ActiveCustomerSession } from '@shared/types/salon';
import { useSalonStore } from '../store/salonStore';
import { drawRoundedRect, drawSalonBackground } from './drawBackground';
import { drawHairStation } from './drawHairLayers';
import { drawNailStation } from './drawNailLayers';
import { salonParticles } from './particlePool';

export class SalonCanvasLoop {
  private rafId: number | null = null;
  private lastRenderMs = 0;
  private elapsedTimeSec = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    // Enforce devicePixelRatio = 1 at exact 720x1280 for 30fps livestream stability
    this.canvas.width = STAGE_METRICS.WIDTH * STAGE_METRICS.DEVICE_PIXEL_RATIO;
    this.canvas.height = STAGE_METRICS.HEIGHT * STAGE_METRICS.DEVICE_PIXEL_RATIO;
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastRenderMs = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private frame = (nowMs: number): void => {
    this.rafId = requestAnimationFrame(this.frame);

    const deltaMs = nowMs - this.lastRenderMs;
    if (deltaMs < STAGE_METRICS.FRAME_INTERVAL_MS) return;

    this.lastRenderMs = nowMs - (deltaMs % STAGE_METRICS.FRAME_INTERVAL_MS);
    const dtSec = Math.min(0.1, deltaMs / 1000);
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

    if (state.activeCustomer) {
      this.drawCustomerProgressCard(ctx, state.activeCustomer, state.config.language);
    }

    salonParticles.draw(ctx);
  }

  private drawCustomerProgressCard(
    ctx: CanvasRenderingContext2D,
    customer: ActiveCustomerSession,
    language: 'VI' | 'EN'
  ): void {
    const strings = SALON_I18N[language];
    const cardX = 285;
    const cardY = 852;
    const cardW = 398;
    const cardH = 82;

    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fillStyle = customer.isRoyal ? '#FFF7D6' : '#FFFDF9';
    ctx.fill();
    ctx.strokeStyle = SALON_PALETTE.OUTLINE;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Customer avatar badge circle
    const badgeX = cardX + 36;
    const badgeY = cardY + 41;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 24, 0, Math.PI * 2);
    ctx.fillStyle = customer.isRoyal ? SALON_PALETTE.HONEY_GOLD : SALON_PALETTE.BLUSH_PINK;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SALON_PALETTE.TEXT_DARK;
    ctx.font = '800 20px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (customer.user.nickname.trim()[0] || 'S').toUpperCase();
    ctx.fillText(initial, badgeX, badgeY + 1);

    // Name + tier pill
    const nameX = cardX + 74;
    ctx.textAlign = 'left';
    ctx.font = '800 18px "Nunito", sans-serif';
    ctx.fillStyle = SALON_PALETTE.TEXT_DARK;
    const displayName =
      customer.user.nickname.length > 18
        ? `${customer.user.nickname.slice(0, 17)}…`
        : customer.user.nickname;
    ctx.fillText(displayName, nameX, cardY + 28);

    // Percent label on right
    const pct = Math.round(customer.progress);
    ctx.textAlign = 'right';
    ctx.font = '800 17px "Fredoka", sans-serif';
    ctx.fillStyle = customer.trollEffect ? '#D94B4B' : SALON_PALETTE.MINT_DEEP;
    const rightLabel = pct >= 100 ? strings.progressDone : `${pct}%`;
    ctx.fillText(rightLabel, cardX + cardW - 18, cardY + 28);

    // Progress bar track
    const barX = nameX;
    const barY = cardY + 46;
    const barW = cardW - 92;
    const barH = 20;
    drawRoundedRect(ctx, barX, barY, barW, barH, 10);
    ctx.fillStyle = '#F5E6DD';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();

    // Progress bar fill
    const fillW = Math.max(16, (barW * Math.min(100, customer.progress)) / 100);
    drawRoundedRect(ctx, barX, barY, fillW, barH, 10);
    ctx.fillStyle = customer.isRoyal
      ? SALON_PALETTE.HONEY_GOLD
      : customer.trollEffect
        ? '#FF8C7A'
        : SALON_PALETTE.MINT_DEEP;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
