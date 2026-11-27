import { DRINK_BAR_PALETTE, STAGE_METRICS } from '@shared/config';
import {
  CUP1_CX,
  CUP2_CX,
  CUP_BOTTOM_HALF_W,
  CUP_BOTTOM_Y,
  CUP_TOP_HALF_W,
  CUP_TOP_Y,
} from './brewEffects';

export type ParticleKind =
  | 'bubble'
  | 'droplet'
  | 'sparkle'
  | 'confetti'
  | 'heart'
  | 'star'
  | 'wave_trail';
export type ParticleTag = 'brew' | 'dance';
export type CupStationId = 1 | 2;

interface PooledParticle {
  active: boolean;
  tag: ParticleTag;
  cupId: CupStationId;
  boundedToCup: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  rotation: number;
  vRot: number;
}

const DANCE_STAGE_BOUNDS = {
  MIN_X: 110,
  MAX_X: 610,
  MIN_Y: 196,
  MAX_Y: STAGE_METRICS.COUNTER_TOP_Y + 8,
} as const;

const CONFETTI_COLORS: readonly string[] = [
  '#F7C95B',
  '#F49E60',
  '#A7D397',
  '#F0788C',
  '#7FC8D9',
];

function getCupCenterX(cupId: CupStationId): number {
  return cupId === 2 ? CUP2_CX : CUP1_CX;
}

export class DrinkBarParticlePool {
  private readonly pool: PooledParticle[];
  private cursor = 0;

  constructor(capacity: number = STAGE_METRICS.MAX_PARTICLES) {
    this.pool = [];
    for (let i = 0; i < capacity; i += 1) {
      this.pool.push({
        active: false,
        tag: 'brew',
        cupId: 1,
        boundedToCup: true,
        minX: CUP1_CX - CUP_BOTTOM_HALF_W,
        maxX: CUP1_CX + CUP_BOTTOM_HALF_W,
        minY: CUP_TOP_Y,
        maxY: CUP_BOTTOM_Y,
        kind: 'bubble',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        life: 0,
        maxLife: 1,
        color: '#FFFFFF',
        rotation: 0,
        vRot: 0,
      });
    }
  }

  private acquireSlot(): PooledParticle {
    const len = this.pool.length;
    for (let i = 0; i < len; i += 1) {
      const idx = (this.cursor + i) % len;
      if (!this.pool[idx].active) {
        this.cursor = (idx + 1) % len;
        return this.pool[idx];
      }
    }
    const recycled = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % len;
    return recycled;
  }

  public spawn(
    kind: ParticleKind,
    cupId: CupStationId,
    boundedToCup: boolean,
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    maxLife: number,
    color: string
  ): void {
    const cupCx = getCupCenterX(cupId);
    const halfSpan = boundedToCup ? CUP_BOTTOM_HALF_W - 4 : CUP_TOP_HALF_W + 24;
    const minX = cupCx - halfSpan;
    const maxX = cupCx + halfSpan;
    const minY = boundedToCup ? CUP_TOP_Y + 6 : CUP_TOP_Y - 70;
    const maxY = CUP_BOTTOM_Y - 6;

    const p = this.acquireSlot();
    p.active = true;
    p.tag = 'brew';
    p.cupId = cupId;
    p.boundedToCup = boundedToCup;
    p.minX = minX;
    p.maxX = maxX;
    p.minY = minY;
    p.maxY = maxY;
    p.kind = kind;
    p.x = Math.max(minX, Math.min(maxX, x));
    p.y = Math.max(minY, Math.min(maxY, y));
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.color = color;
    p.rotation = Math.random() * Math.PI * 2;
    p.vRot = (Math.random() - 0.5) * 4;
  }

  public spawnDanceParticle(
    kind: 'heart' | 'sparkle' | 'star' | 'wave_trail',
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    maxLife: number,
    color: string
  ): void {
    const p = this.acquireSlot();
    p.active = true;
    p.tag = 'dance';
    p.cupId = 1;
    p.boundedToCup = false;
    p.minX = DANCE_STAGE_BOUNDS.MIN_X;
    p.maxX = DANCE_STAGE_BOUNDS.MAX_X;
    p.minY = DANCE_STAGE_BOUNDS.MIN_Y;
    p.maxY = DANCE_STAGE_BOUNDS.MAX_Y;
    p.kind = kind;
    p.x = Math.max(p.minX, Math.min(p.maxX, x));
    p.y = Math.max(p.minY, Math.min(p.maxY, y));
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.color = color;
    p.rotation = kind === 'wave_trail' ? Math.atan2(vy, vx) : (Math.random() - 0.5) * 0.35;
    p.vRot = kind === 'wave_trail' ? 0 : (Math.random() - 0.5) * 2.4;
  }

  public clearDanceParticles(): void {
    const len = this.pool.length;
    for (let i = 0; i < len; i += 1) {
      if (this.pool[i].tag === 'dance') {
        this.pool[i].active = false;
      }
    }
  }

  public emitAmbientPour(
    cupId: CupStationId,
    liquidSurfaceY: number,
    accentColor: string,
    isFast: boolean,
    isSodaFizz: boolean
  ): void {
    const chance = isSodaFizz || isFast ? 0.65 : 0.3;
    if (Math.random() > chance) return;

    const cupCx = getCupCenterX(cupId);
    const liquidTop = Math.max(CUP_TOP_Y + 10, Math.min(CUP_BOTTOM_Y - 10, liquidSurfaceY));
    const liquidSpan = Math.max(10, CUP_BOTTOM_Y - 8 - liquidTop);
    const offsetX = (Math.random() - 0.5) * (CUP_BOTTOM_HALF_W * 1.4);

    // Only emit fizzy gas bubbles for sparkling Soda; other drinks emit subtle splash droplets only
    if (isSodaFizz) {
      this.spawn(
        'bubble',
        cupId,
        true,
        cupCx + offsetX,
        liquidTop + Math.random() * liquidSpan,
        (Math.random() - 0.5) * 8,
        -(26 + Math.random() * 28),
        2.4 + Math.random() * 2.0,
        0.65 + Math.random() * 0.35,
        '#E8F7FA'
      );
    }

    if (Math.random() < (isSodaFizz ? 0.5 : 0.35)) {
      this.spawn(
        'droplet',
        cupId,
        true,
        cupCx + (Math.random() - 0.5) * 20,
        liquidTop,
        (Math.random() - 0.5) * 18,
        -(16 + Math.random() * 16),
        2.2 + Math.random() * 1.4,
        0.38 + Math.random() * 0.18,
        isSodaFizz ? '#E8F7FA' : accentColor
      );
    }
  }

  public emitBurst(
    burstKind: 'topping' | 'complete' | 'signature' | 'like',
    accentColor: string,
    cupId: CupStationId = 1
  ): void {
    const cupCx = getCupCenterX(cupId);

    if (burstKind === 'like') {
      for (let i = 0; i < 4; i += 1) {
        this.spawn(
          'bubble',
          cupId,
          true,
          cupCx + (Math.random() - 0.5) * 28,
          CUP_BOTTOM_Y - 18 - Math.random() * 26,
          (Math.random() - 0.5) * 10,
          -(34 + Math.random() * 24),
          2.6 + Math.random() * 2.0,
          0.75,
          '#FFFDF9'
        );
      }
      return;
    }

    if (burstKind === 'topping') {
      for (let i = 0; i < 7; i += 1) {
        const angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.25;
        const speed = 24 + Math.random() * 26;
        this.spawn(
          'sparkle',
          cupId,
          false,
          cupCx + (Math.random() - 0.5) * 24,
          CUP_TOP_Y + 4,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 12,
          4.0 + Math.random() * 2.8,
          0.8,
          i % 2 === 0 ? DRINK_BAR_PALETTE.VIP_GOLD : accentColor
        );
      }
      return;
    }

    const sparkleCount = burstKind === 'signature' ? 12 : 8;
    for (let i = 0; i < sparkleCount; i += 1) {
      const angle = (Math.PI * 2 * i) / sparkleCount;
      const speed = 32 + Math.random() * 42;
      this.spawn(
        'sparkle',
        cupId,
        false,
        cupCx,
        CUP_TOP_Y + 34,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 18,
        4.8 + Math.random() * 2.8,
        1.1,
        DRINK_BAR_PALETTE.SIGNATURE_GOLD
      );
    }

    if (burstKind === 'signature') {
      for (let i = 0; i < 12; i += 1) {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        this.spawn(
          'confetti',
          cupId,
          false,
          cupCx + (Math.random() - 0.5) * 60,
          CUP_TOP_Y - 10,
          (Math.random() - 0.5) * 68,
          -(60 + Math.random() * 70),
          4.5 + Math.random() * 2.5,
          1.35,
          color
        );
      }
    }
  }

  public update(dtSec: number): void {
    const len = this.pool.length;
    for (let i = 0; i < len; i += 1) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dtSec;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.rotation += p.vRot * dtSec;

      if (p.kind === 'droplet') {
        p.vy += 170 * dtSec;
      } else if (p.kind === 'confetti') {
        p.vy += 155 * dtSec;
        p.vx *= 0.98;
      } else if (p.kind === 'bubble') {
        p.vx *= 0.94;
      } else if (p.kind === 'heart') {
        p.vx += Math.sin(p.life * 8 + i) * 14 * dtSec;
        p.vx *= 0.96;
      } else if (p.kind === 'wave_trail') {
        p.vx *= 0.92;
        p.vy *= 0.92;
      } else if (p.kind === 'star') {
        p.vx *= 0.95;
        p.vy *= 0.95;
      }

      if (p.boundedToCup) {
        // Strictly keep cup bubbles & droplets inside their assigned cup bounds
        if (p.x < p.minX || p.x > p.maxX || p.y < p.minY || p.y > p.maxY) {
          p.active = false;
        }
      } else {
        p.x = Math.max(p.minX, Math.min(p.maxX, p.x));
        if (p.y < p.minY || p.y > p.maxY) {
          p.active = false;
        }
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const len = this.pool.length;
    for (let i = 0; i < len; i += 1) {
      const p = this.pool[i];
      if (!p.active) continue;

      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.kind === 'bubble') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
        ctx.stroke();
      } else if (p.kind === 'droplet') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
        ctx.stroke();
      } else if (p.kind === 'sparkle' || p.kind === 'star') {
        drawFourPointStar(ctx, p.x, p.y, p.size, p.color);
      } else if (p.kind === 'heart') {
        drawPooledHeart(ctx, p.x, p.y, p.size, p.rotation, p.color);
      } else if (p.kind === 'wave_trail') {
        drawPastelWaveTrail(ctx, p.x, p.y, p.size, p.rotation, p.color, alpha);
      } else {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
        ctx.lineWidth = 1.5;
        ctx.fillRect(-p.size, -p.size * 0.55, p.size * 2, p.size * 1.1);
        ctx.strokeRect(-p.size, -p.size * 0.55, p.size * 2, p.size * 1.1);
      }

      ctx.restore();
    }
  }
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string
): void {
  const inner = radius * 0.34;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const r = i % 2 === 0 ? radius : inner;
    const angle = (Math.PI / 4) * i;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
}

function drawPooledHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rotation: number,
  color: string
): void {
  ctx.translate(cx, cy);
  ctx.rotate(rotation * 0.25);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.35);
  ctx.bezierCurveTo(-size, -size * 0.3, -size * 0.9, -size * 1.08, 0, -size * 0.42);
  ctx.bezierCurveTo(size * 0.9, -size * 1.08, size, -size * 0.3, 0, size * 0.35);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
}

function drawPastelWaveTrail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rotation: number,
  color: string,
  alpha: number
): void {
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha * 0.68;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 1.8, size * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export const drinkParticles = new DrinkBarParticlePool(STAGE_METRICS.MAX_PARTICLES);
