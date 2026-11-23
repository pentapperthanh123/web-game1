import { PERFORMANCE_LIMITS } from '@shared/constants/prankConfig';
import type { DecalItem, DecalType } from '@shared/types/prank';

export class DecalManager {
  private decals: DecalItem[] = [];
  private readonly maxDecals = PERFORMANCE_LIMITS.MAX_DECALS;

  public addDecal(type: DecalType, x: number, y: number, size = 48): DecalItem {
    // If at or exceeding limit, evict oldest
    if (this.decals.length >= this.maxDecals) {
      this.decals.shift();
    }

    const decal: DecalItem = {
      id: `decal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      x,
      y,
      size,
      rotation: (Math.random() - 0.5) * 0.4,
      opacity: 1,
      createdAt: Date.now(),
      durationMs: PERFORMANCE_LIMITS.DEFAULT_DECAL_LIFETIME_MS,
    };

    this.decals.push(decal);
    return decal;
  }

  public update(now: number): void {
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      const age = now - d.createdAt;

      // Slow downward dripping effect
      if (d.type === 'EGG_SPLAT' || d.type === 'MILK_DRIP') {
        d.y += 0.18;
      }

      // Fade out near end of life
      if (age > d.durationMs) {
        this.decals.splice(i, 1);
      } else if (age > d.durationMs - 1200) {
        d.opacity = Math.max(0, (d.durationMs - age) / 1200);
      }
    }
  }

  public getDecals(): readonly DecalItem[] {
    return this.decals;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const now = Date.now();
    for (const d of this.decals) {
      if (d.opacity <= 0) continue;

      ctx.save();
      ctx.globalAlpha = d.opacity;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);

      switch (d.type) {
        case 'EGG_SPLAT':
          this.renderEggSplat(ctx, d.size, now - d.createdAt);
          break;
        case 'CAKE_SMEAR':
          this.renderCakeSmear(ctx, d.size);
          break;
        case 'MILK_DRIP':
          this.renderMilkDrip(ctx, d.size, now - d.createdAt);
          break;
        case 'BUMP_MARK':
          this.renderBumpMark(ctx, d.size);
          break;
        case 'STICKER_FUNNY':
          this.renderFunnySticker(ctx, d.size);
          break;
      }

      ctx.restore();
    }
  }

  private renderEggSplat(ctx: CanvasRenderingContext2D, size: number, age: number): void {
    // 1. Translucent egg white puddle
    ctx.fillStyle = 'rgba(255, 255, 240, 0.65)';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.2, size * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Thick bright yellow/orange yolk center
    const yolkGrad = ctx.createRadialGradient(-size * 0.1, -size * 0.1, size * 0.1, 0, 0, size * 0.75);
    yolkGrad.addColorStop(0, '#ffe082');
    yolkGrad.addColorStop(0.4, '#ffb300');
    yolkGrad.addColorStop(1, '#ff8f00');

    ctx.fillStyle = yolkGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.75, size * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Highlight gloss
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(-size * 0.25, -size * 0.22, size * 0.22, size * 0.14, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 4. Dripping yolk tendrils trailing down
    const dripLength = Math.min(size * 2.8, size * 0.6 + (age * 0.04));
    ctx.fillStyle = '#ffb300';

    ctx.beginPath();
    ctx.moveTo(-size * 0.35, size * 0.4);
    ctx.quadraticCurveTo(-size * 0.4, size * 0.4 + dripLength * 0.5, -size * 0.25, size * 0.4 + dripLength);
    ctx.arc(-size * 0.22, size * 0.4 + dripLength, size * 0.14, 0, Math.PI);
    ctx.quadraticCurveTo(-size * 0.1, size * 0.4 + dripLength * 0.5, -size * 0.05, size * 0.4);
    ctx.closePath();
    ctx.fill();

    // Second smaller drip
    const drip2 = dripLength * 0.65;
    ctx.beginPath();
    ctx.moveTo(size * 0.15, size * 0.35);
    ctx.quadraticCurveTo(size * 0.18, size * 0.35 + drip2 * 0.5, size * 0.26, size * 0.35 + drip2);
    ctx.arc(size * 0.28, size * 0.35 + drip2, size * 0.11, 0, Math.PI);
    ctx.quadraticCurveTo(size * 0.38, size * 0.35 + drip2 * 0.5, size * 0.42, size * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  private renderCakeSmear(ctx: CanvasRenderingContext2D, size: number): void {
    // Fluffy frosting blob
    ctx.fillStyle = '#fff0f5';
    ctx.beginPath();
    ctx.arc(-size * 0.3, -size * 0.2, size * 0.55, 0, Math.PI * 2);
    ctx.arc(size * 0.25, -size * 0.1, size * 0.6, 0, Math.PI * 2);
    ctx.arc(0, size * 0.3, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Pink strawberry syrup streak
    ctx.fillStyle = 'rgba(255, 64, 129, 0.75)';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.55, size * 0.25, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Sprinkles!
    const colors = ['#00e676', '#ffeb3b', '#2979ff'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect((i - 2) * size * 0.2, (i % 2 === 0 ? -1 : 1) * size * 0.18, 5, 2.5);
    }
  }

  private renderMilkDrip(ctx: CanvasRenderingContext2D, size: number, age: number): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dripping stream
    const len = Math.min(size * 2.2, size * 0.4 + age * 0.035);
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, size * 0.2);
    ctx.lineTo(-size * 0.05, size * 0.2 + len);
    ctx.arc(0, size * 0.2 + len, size * 0.12, 0, Math.PI);
    ctx.lineTo(size * 0.15, size * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  private renderBumpMark(ctx: CanvasRenderingContext2D, size: number): void {
    // Red bump on head / cartoon knot
    ctx.fillStyle = 'rgba(244, 67, 54, 0.85)';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.6, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Yellow cartoon sparkle
    ctx.fillStyle = '#ffeb3b';
    ctx.font = `bold ${Math.round(size * 0.6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💥', 0, -size * 0.3);
  }

  private renderFunnySticker(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = `${Math.round(size * 0.6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🤡', 0, 0);
  }

  public clearAll(): void {
    this.decals = [];
  }
}
