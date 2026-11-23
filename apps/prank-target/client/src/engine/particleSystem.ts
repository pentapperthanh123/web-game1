import { PERFORMANCE_LIMITS } from '@shared/constants/prankConfig';

export type ParticleKind =
  | 'EGG_YOLK'
  | 'EGG_SHELL'
  | 'MILK_DROP'
  | 'CAKE_CREAM'
  | 'WIND_LINE'
  | 'BALL_DEBRIS'
  | 'SMOKE_PUFF';

export interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  rotation: number;
  vRot: number;
}

export class ParticleSystem {
  private readonly pool: Particle[] = [];
  private readonly maxCount = PERFORMANCE_LIMITS.MAX_PARTICLES;

  constructor() {
    for (let i = 0; i < this.maxCount; i++) {
      this.pool.push({
        active: false,
        kind: 'EGG_YOLK',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        color: '#ffc107',
        alpha: 1,
        decay: 0.02,
        gravity: 0.3,
        rotation: 0,
        vRot: 0,
      });
    }
  }

  public spawn(
    kind: ParticleKind,
    originX: number,
    originY: number,
    count: number,
    baseColor?: string
  ): void {
    let spawned = 0;
    for (let i = 0; i < this.maxCount && spawned < count; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.kind = kind;
        p.x = originX + (Math.random() * 20 - 10);
        p.y = originY + (Math.random() * 20 - 10);
        p.alpha = 1.0;
        p.rotation = Math.random() * Math.PI * 2;
        p.vRot = (Math.random() - 0.5) * 0.2;

        switch (kind) {
          case 'EGG_YOLK':
            p.vx = (Math.random() - 0.5) * 9;
            p.vy = -Math.random() * 6 - 2;
            p.size = Math.random() * 8 + 4;
            p.color = baseColor || (Math.random() > 0.4 ? '#ffb300' : '#ffa000');
            p.gravity = 0.35;
            p.decay = 0.022;
            break;

          case 'EGG_SHELL':
            p.vx = (Math.random() - 0.5) * 12;
            p.vy = -Math.random() * 8 - 3;
            p.size = Math.random() * 6 + 3;
            p.color = baseColor || '#f5e6d3';
            p.gravity = 0.45;
            p.decay = 0.025;
            break;

          case 'MILK_DROP':
            p.vx = (Math.random() - 0.5) * 11;
            p.vy = -Math.random() * 7 - 1;
            p.size = Math.random() * 7 + 3;
            p.color = baseColor || '#ffffff';
            p.gravity = 0.38;
            p.decay = 0.028;
            break;

          case 'CAKE_CREAM':
            p.vx = (Math.random() - 0.5) * 7;
            p.vy = -Math.random() * 5 - 1;
            p.size = Math.random() * 10 + 5;
            p.color = baseColor || (Math.random() > 0.5 ? '#fff5eb' : '#ff80ab');
            p.gravity = 0.25;
            p.decay = 0.018;
            break;

          case 'WIND_LINE':
            p.vx = Math.random() * 16 + 10;
            p.vy = (Math.random() - 0.5) * 3;
            p.size = Math.random() * 30 + 15;
            p.color = baseColor || 'rgba(255, 255, 255, 0.7)';
            p.gravity = 0.02;
            p.decay = 0.035;
            break;

          case 'BALL_DEBRIS':
            p.vx = (Math.random() - 0.5) * 14;
            p.vy = -Math.random() * 10 - 2;
            p.size = Math.random() * 6 + 4;
            p.color = baseColor || '#ff5722';
            p.gravity = 0.5;
            p.decay = 0.03;
            break;

          case 'SMOKE_PUFF':
            p.vx = (Math.random() - 0.5) * 3;
            p.vy = -Math.random() * 4 - 2;
            p.size = Math.random() * 16 + 8;
            p.color = baseColor || 'rgba(240, 240, 240, 0.8)';
            p.gravity = -0.05; // floats up
            p.decay = 0.015;
            break;
        }

        spawned++;
      }
    }
  }

  public update(): void {
    for (let i = 0; i < this.maxCount; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > PERFORMANCE_LIMITS.STAGE_HEIGHT + 50) {
        p.active = false;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.maxCount; i++) {
      const p = this.pool[i];
      if (!p.active || p.alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

      if (p.kind === 'WIND_LINE') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.size, p.y + p.vy * 2);
        ctx.stroke();
      } else if (p.kind === 'EGG_SHELL' || p.kind === 'BALL_DEBRIS') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.7);
        ctx.lineTo(p.size, -p.size * 0.3);
        ctx.lineTo(p.size * 0.5, p.size);
        ctx.closePath();
        ctx.fill();
      } else {
        // Blob / droplet / puff
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  public clear(): void {
    for (let i = 0; i < this.maxCount; i++) {
      this.pool[i].active = false;
    }
  }
}
