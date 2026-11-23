import type { ActivePrankAnimation, PrankActionType } from '@shared/types/prank';
import { PERFORMANCE_LIMITS } from '@shared/constants/prankConfig';

export class ProjectileManager {
  private projectiles: ActivePrankAnimation[] = [];

  public spawn(
    action: PrankActionType,
    initiatorName: string,
    avatarUrl?: string
  ): ActivePrankAnimation {
    // Randomize entry side: left or right edge of stage
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -60 : PERFORMANCE_LIMITS.STAGE_WIDTH + 60;
    const startY = 180 + Math.random() * 320;

    // Target is on the character: head or chest area
    const targetX = 360 + (Math.random() - 0.5) * 70;
    const targetY = action === 'BALL' || action === 'WIND' ? 440 : 410 + (Math.random() - 0.5) * 80;

    const anim: ActivePrankAnimation = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      startX,
      startY,
      targetX,
      targetY,
      progress: 0,
      speed: action === 'BALL' ? 0.055 : action === 'WIND' ? 0.065 : 0.042,
      initiatorName,
      avatarUrl,
      isCompleted: false,
    };

    this.projectiles.push(anim);
    return anim;
  }

  public update(onImpact: (anim: ActivePrankAnimation) => void): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += p.speed;

      if (p.progress >= 1 && !p.isCompleted) {
        p.isCompleted = true;
        onImpact(p);
        this.projectiles.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.projectiles) {
      if (p.isCompleted) continue;

      const t = p.progress;
      // Parabolic flight arc
      const currentX = p.startX + (p.targetX - p.startX) * t;
      const arcHeight = -120 * Math.sin(t * Math.PI);
      const currentY = p.startY + (p.targetY - p.startY) * t + arcHeight;

      ctx.save();
      ctx.translate(currentX, currentY);

      // Rotation based on flight progress
      ctx.rotate(t * Math.PI * 4 * (p.startX < p.targetX ? 1 : -1));

      switch (p.action) {
        case 'EGG':
          this.renderFlyingEgg(ctx);
          break;
        case 'CAKE':
          this.renderFlyingCake(ctx);
          break;
        case 'BALL':
          this.renderFlyingBall(ctx);
          break;
        case 'MILK':
          this.renderFlyingMilk(ctx);
          break;
        case 'WIND':
          this.renderFlyingWind(ctx);
          break;
        case 'TAUNT':
        case 'SURPRISE':
          this.renderFlyingSurprise(ctx);
          break;
      }

      ctx.restore();
    }
  }

  private renderFlyingEgg(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#fae1c3';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e0b896';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Subtle sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-5, -7, 4, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderFlyingCake(ctx: CanvasRenderingContext2D): void {
    // Plate
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 8, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cake slice
    ctx.fillStyle = '#ff80ab';
    ctx.beginPath();
    ctx.moveTo(-18, 6);
    ctx.lineTo(0, -18);
    ctx.lineTo(18, 6);
    ctx.closePath();
    ctx.fill();

    // Cherry on top
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(0, -20, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderFlyingBall(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#ff6f00';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Basketball seam lines
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.stroke();
  }

  private renderFlyingMilk(ctx: CanvasRenderingContext2D): void {
    // Milk bottle
    ctx.fillStyle = 'rgba(240, 248, 255, 0.9)';
    ctx.fillRect(-10, -14, 20, 28);
    ctx.fillStyle = '#29b6f6';
    ctx.fillRect(-10, -3, 20, 8); // label
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.fillText('🥛', -8, -16);
  }

  private renderFlyingWind(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 1.3);
    ctx.stroke();
  }

  private renderFlyingSurprise(ctx: CanvasRenderingContext2D): void {
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎁', 0, 0);
  }

  public clear(): void {
    this.projectiles = [];
  }
}
