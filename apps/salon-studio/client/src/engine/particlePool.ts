import { SALON_PALETTE, STAGE_METRICS } from '@shared/constants/salonConfig';

export type ParticleKind = 'HAIR_SNIP' | 'SPARKLE' | 'HEART' | 'CONFETTI' | 'SMOKE' | 'SWEAT';

interface ParticleSlot {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  size: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  color: string;
}

const CONFETTI_COLORS = ['#FF8FA8', '#FFD56B', '#7FD8BE', '#8CD5F7', '#FFA97A'];

export class SalonParticlePool {
  private readonly pool: ParticleSlot[];

  constructor(capacity: number = STAGE_METRICS.MAX_PARTICLES) {
    this.pool = Array.from({ length: capacity }, () => ({
      active: false,
      kind: 'SPARKLE',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gravity: 0,
      size: 8,
      rotation: 0,
      vRot: 0,
      life: 0,
      maxLife: 1,
      color: SALON_PALETTE.HONEY_GOLD,
    }));
  }

  public spawn(
    kind: ParticleKind,
    x: number,
    y: number,
    count: number,
    customColor?: string
  ): void {
    let spawned = 0;
    for (let i = 0; i < this.pool.length && spawned < count; i += 1) {
      const p = this.pool[i];
      if (p.active) continue;

      p.active = true;
      p.kind = kind;
      p.x = x + (Math.random() - 0.5) * 44;
      p.y = y + (Math.random() - 0.5) * 32;
      p.rotation = Math.random() * Math.PI * 2;
      p.vRot = (Math.random() - 0.5) * 5;
      p.life = 0;

      this.configureParticleMotion(p, kind, customColor);
      spawned += 1;
    }
  }

  private configureParticleMotion(
    p: ParticleSlot,
    kind: ParticleKind,
    customColor?: string
  ): void {
    switch (kind) {
      case 'HAIR_SNIP':
        p.vx = (Math.random() - 0.5) * 110;
        p.vy = -30 - Math.random() * 50;
        p.gravity = 240;
        p.size = 7 + Math.random() * 5;
        p.maxLife = 0.85 + Math.random() * 0.4;
        p.color = customColor || '#463A3E';
        break;
      case 'SPARKLE':
        p.vx = (Math.random() - 0.5) * 85;
        p.vy = -55 - Math.random() * 65;
        p.gravity = -12;
        p.size = 8 + Math.random() * 6;
        p.maxLife = 0.9 + Math.random() * 0.45;
        p.color = customColor || SALON_PALETTE.HONEY_GOLD;
        break;
      case 'HEART':
        p.vx = (Math.random() - 0.5) * 65;
        p.vy = -85 - Math.random() * 55;
        p.gravity = -18;
        p.size = 11 + Math.random() * 5;
        p.maxLife = 1.15 + Math.random() * 0.35;
        p.color = customColor || SALON_PALETTE.CORAL_ROSE;
        break;
      case 'CONFETTI':
        p.vx = (Math.random() - 0.5) * 210;
        p.vy = -170 - Math.random() * 140;
        p.gravity = 260;
        p.size = 9 + Math.random() * 4;
        p.maxLife = 1.6 + Math.random() * 0.5;
        p.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        break;
      case 'SMOKE':
        p.vx = (Math.random() - 0.5) * 55;
        p.vy = -48 - Math.random() * 35;
        p.gravity = -15;
        p.size = 14 + Math.random() * 10;
        p.maxLife = 1.1 + Math.random() * 0.45;
        p.color = '#6D6266';
        break;
      case 'SWEAT':
        p.vx = 45 + Math.random() * 50;
        p.vy = -60 - Math.random() * 40;
        p.gravity = 260;
        p.size = 7 + Math.random() * 3;
        p.maxLife = 0.75 + Math.random() * 0.25;
        p.color = '#8CD5F7';
        break;
    }
  }

  public update(dtSec: number): void {
    for (let i = 0; i < this.pool.length; i += 1) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life += dtSec;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      p.vy += p.gravity * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.rotation += p.vRot * dtSec;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.pool.length; i += 1) {
      const p = this.pool[i];
      if (!p.active) continue;

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      this.drawParticleShape(ctx, p);
      ctx.restore();
    }
  }

  private drawParticleShape(ctx: CanvasRenderingContext2D, p: ParticleSlot): void {
    ctx.strokeStyle = SALON_PALETTE.OUTLINE;
    ctx.lineWidth = 2;

    switch (p.kind) {
      case 'HAIR_SNIP': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'SPARKLE': {
        const s = p.size;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s, 0);
        ctx.quadraticCurveTo(s * 0.2, s * 0.2, 0, s);
        ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s, 0);
        ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'HEART': {
        const s = p.size * 0.55;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.9);
        ctx.bezierCurveTo(-s * 1.4, -s * 0.2, -s * 0.9, -s * 1.3, 0, -s * 0.4);
        ctx.bezierCurveTo(s * 0.9, -s * 1.3, s * 1.4, -s * 0.2, 0, s * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'CONFETTI': {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.5, -p.size * 0.32, p.size, p.size * 0.64);
        ctx.strokeRect(-p.size * 0.5, -p.size * 0.32, p.size, p.size * 0.64);
        break;
      }
      case 'SMOKE': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'SWEAT': {
        const s = p.size;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.75, s * 0.2, 0, s * 0.8);
        ctx.quadraticCurveTo(-s * 0.75, s * 0.2, 0, -s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
    }
  }
}

export const salonParticles = new SalonParticlePool(STAGE_METRICS.MAX_PARTICLES);
