import { PERFORMANCE_LIMITS } from '@shared/constants/cafeConfig';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'SPARK' | 'STEAM' | 'ELECTRIC';
}

export class ParticlePool {
  private particles: Particle[] = [];
  private readonly maxParticles = PERFORMANCE_LIMITS.MAX_PARTICLES;

  constructor() {
    // Pre-allocate fixed pool to prevent GC pauses
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#ffcc00',
        type: 'SPARK',
      });
    }
  }

  public spawnSparks(originX: number, originY: number, count = 5, color = '#ffea00'): void {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = originX + (Math.random() - 0.5) * 20;
        p.y = originY + (Math.random() - 0.5) * 10;
        p.vx = (Math.random() - 0.5) * 80;
        p.vy = -Math.random() * 90 - 30;
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.25;
        p.size = 2 + Math.random() * 3;
        p.color = color;
        p.type = 'SPARK';
        spawned++;
      }
    }
  }

  public spawnSteam(originX: number, originY: number, count = 2): void {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = originX + (Math.random() - 0.5) * 10;
        p.y = originY;
        p.vx = (Math.random() - 0.5) * 15;
        p.vy = -Math.random() * 35 - 15;
        p.life = 0;
        p.maxLife = 0.8 + Math.random() * 0.4;
        p.size = 3 + Math.random() * 4;
        p.color = 'rgba(255, 255, 255, 0.4)';
        p.type = 'STEAM';
        spawned++;
      }
    }
  }

  public spawnElectric(originX: number, originY: number, count = 6): void {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = originX + (Math.random() - 0.5) * 40;
        p.y = originY + (Math.random() - 0.5) * 30;
        p.vx = (Math.random() - 0.5) * 120;
        p.vy = (Math.random() - 0.5) * 120;
        p.life = 0;
        p.maxLife = 0.2 + Math.random() * 0.15;
        p.size = 3 + Math.random() * 3;
        p.color = '#38bdf8';
        p.type = 'ELECTRIC';
        spawned++;
      }
    }
  }

  public update(dtSec: number): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dtSec;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;

      if (p.type === 'SPARK') {
        p.vy += 120 * dtSec; // gravity
      } else if (p.type === 'STEAM') {
        p.size += dtSec * 4; // expand
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - progress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'SPARK') {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      } else if (p.type === 'STEAM') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // ELECTRIC bolt
        ctx.fillRect(p.x, p.y, p.size * 1.5, p.size * 1.5);
      }

      ctx.restore();
    }
  }
}
