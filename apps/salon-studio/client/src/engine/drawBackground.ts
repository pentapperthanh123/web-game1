import { SALON_PALETTE, STAGE_METRICS } from '@shared/constants/salonConfig';
import type { SalonServiceMode } from '@shared/types/salon';

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawSalonBackground(
  ctx: CanvasRenderingContext2D,
  service: SalonServiceMode,
  timeSec: number
): void {
  const { WIDTH, HEIGHT } = STAGE_METRICS;

  // 1. Warm pastel wallpaper base
  const wallGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  if (service === 'HAIR') {
    wallGrad.addColorStop(0, '#FFF5EC');
    wallGrad.addColorStop(0.58, '#FFE9EF');
    wallGrad.addColorStop(1, '#FCE0D8');
  } else {
    wallGrad.addColorStop(0, '#F3FCF8');
    wallGrad.addColorStop(0.58, '#FFF0F5');
    wallGrad.addColorStop(1, '#FDE3EC');
  }
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Soft pastel vertical wallpaper stripes (subtle cozy salon feel)
  ctx.save();
  ctx.fillStyle = service === 'HAIR' ? 'rgba(255, 255, 255, 0.34)' : 'rgba(204, 242, 229, 0.28)';
  for (let x = 0; x < WIDTH; x += 64) {
    ctx.fillRect(x, 0, 30, 860);
  }
  ctx.restore();

  // 3. Wainscoting wall trim & warm wooden floor (bottom section)
  ctx.fillStyle = '#F7DFC7';
  ctx.fillRect(0, 835, WIDTH, 445);

  ctx.fillStyle = '#EAC7A4';
  ctx.fillRect(0, 885, WIDTH, 395);

  // Horizontal wainscoting divider with dark cartoon outline
  ctx.fillStyle = '#FFFDF9';
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.fillRect(-4, 825, WIDTH + 8, 22);
  ctx.strokeRect(-4, 825, WIDTH + 8, 22);

  // Floor planks lines
  ctx.strokeStyle = 'rgba(130, 85, 58, 0.22)';
  ctx.lineWidth = 2.5;
  for (let y = 930; y < HEIGHT; y += 56) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  // 4. Service-specific backdrop prop on the right/center stage
  if (service === 'HAIR') {
    drawHairMirrorBackdrop(ctx, timeSec);
  } else {
    drawNailTableBackdrop(ctx, timeSec);
  }
}

function drawHairMirrorBackdrop(ctx: CanvasRenderingContext2D, timeSec: number): void {
  const mx = 318;
  const my = 258;
  const mw = 285;
  const mh = 370;

  ctx.save();
  // Mirror outer wooden frame
  drawRoundedRect(ctx, mx - 14, my - 14, mw + 28, mh + 28, 36);
  ctx.fillStyle = SALON_PALETTE.PEACH_SOFT;
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Mirror glass
  drawRoundedRect(ctx, mx, my, mw, mh, 26);
  const mirrorGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
  mirrorGrad.addColorStop(0, '#E8F9FF');
  mirrorGrad.addColorStop(0.5, '#FFFFFF');
  mirrorGrad.addColorStop(1, '#DFF4FB');
  ctx.fillStyle = mirrorGrad;
  ctx.fill();
  ctx.stroke();

  // Diagonal cartoon mirror shine
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.moveTo(mx + 28, my);
  ctx.lineTo(mx + 92, my);
  ctx.lineTo(mx + 14, my + 160);
  ctx.lineTo(mx - 20, my + 160);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Warm vanity light bulbs along top & sides of mirror
  const pulse = 0.85 + Math.sin(timeSec * 3.5) * 0.15;
  const bulbPositions: Array<[number, number]> = [
    [mx + 35, my - 7],
    [mx + 100, my - 7],
    [mx + 165, my - 7],
    [mx + 230, my - 7],
    [mx - 7, my + 85],
    [mx - 7, my + 185],
    [mx - 7, my + 285],
    [mx + mw + 7, my + 85],
    [mx + mw + 7, my + 185],
    [mx + mw + 7, my + 285],
  ];

  for (const [bx, by] of bulbPositions) {
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 236, 165, ${pulse})`;
    ctx.fill();
    ctx.strokeStyle = SALON_PALETTE.OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Small salon shelf with cute pastel bottles
  drawRoundedRect(ctx, mx - 24, my + mh + 18, mw + 48, 22, 10);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  const bottles = [
    { x: mx + 12, color: '#FFACC2', h: 34 },
    { x: mx + 44, color: '#A5E8D5', h: 28 },
    { x: mx + 236, color: '#FFD97D', h: 32 },
  ];
  for (const b of bottles) {
    drawRoundedRect(ctx, b.x, my + mh + 18 - b.h, 22, b.h, 7);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawNailTableBackdrop(ctx: CanvasRenderingContext2D, timeSec: number): void {
  ctx.save();
  // Pastel manicure desk surface
  drawRoundedRect(ctx, 255, 455, 445, 370, 38);
  ctx.fillStyle = '#FFFBF6';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner soft blush mat
  drawRoundedRect(ctx, 278, 480, 398, 320, 28);
  ctx.fillStyle = '#FFEAF1';
  ctx.fill();
  ctx.strokeStyle = 'rgba(58, 40, 37, 0.25)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Decorative polish bottles lined up on top edge of table
  const polishes = [
    { x: 300, color: '#FF9EB8' },
    { x: 342, color: '#92E6CB' },
    { x: 384, color: '#FFD06B' },
    { x: 426, color: '#8CD5F7' },
  ];
  for (const p of polishes) {
    // Cap
    drawRoundedRect(ctx, p.x + 7, 412, 14, 20, 4);
    ctx.fillStyle = '#3A2825';
    ctx.fill();
    // Bottle body
    drawRoundedRect(ctx, p.x, 430, 28, 34, 8);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = SALON_PALETTE.OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Cute UV Nail Lamp on top-right corner
  const glow = 0.25 + Math.sin(timeSec * 4) * 0.1;
  ctx.beginPath();
  ctx.arc(620, 466, 38, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(620, 466, 26, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(140, 213, 247, ${0.45 + glow})`;
  ctx.fill();
  ctx.restore();
}
