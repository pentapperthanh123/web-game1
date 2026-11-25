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
    ctx.fillRect(x, 0, 30, 770);
  }
  ctx.restore();

  // 3. Seamless room transition & warm salon parquet floor (no harsh cutting dividers)
  // Subtle baseboard molding connecting wall to floor smoothly
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 764, WIDTH, 12);
  ctx.fillStyle = 'rgba(58, 40, 37, 0.08)';
  ctx.fillRect(0, 775, WIDTH, 3);

  // Warm salon wooden floor (continuous, cozy pastel wood tone)
  const floorGrad = ctx.createLinearGradient(0, 778, 0, HEIGHT);
  floorGrad.addColorStop(0, '#F5DFCB');
  floorGrad.addColorStop(0.4, '#F0D4BE');
  floorGrad.addColorStop(1, '#E8C5AC');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, 778, WIDTH, HEIGHT - 778);

  // Soft cartoon plank lines (gentle & subtle, keeping bottom 980-1280 clean for TikTok live chat)
  ctx.save();
  ctx.strokeStyle = 'rgba(125, 82, 55, 0.12)';
  ctx.lineWidth = 2;
  for (let y = 840; y < HEIGHT; y += 68) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Service-specific backdrop prop on the right/center stage
  if (service === 'HAIR') {
    drawHairMirrorBackdrop(ctx, timeSec);
  } else {
    drawNailTableBackdrop(ctx, timeSec);
  }
}

function drawHairMirrorBackdrop(ctx: CanvasRenderingContext2D, timeSec: number): void {
  // Center mirror perfectly with customer chair at cx = 450
  const mw = 350;
  const mh = 390;
  const mx = 275;
  const my = 248;

  ctx.save();
  // Mirror outer wooden frame
  drawRoundedRect(ctx, mx - 14, my - 14, mw + 28, mh + 28, 38);
  ctx.fillStyle = SALON_PALETTE.PEACH_SOFT;
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Mirror glass (ample width so hair never spills over mirror frame)
  drawRoundedRect(ctx, mx, my, mw, mh, 28);
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
  ctx.moveTo(mx + 36, my);
  ctx.lineTo(mx + 118, my);
  ctx.lineTo(mx + 18, my + 190);
  ctx.lineTo(mx - 24, my + 190);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Warm vanity light bulbs along top & sides of mirror
  const pulse = 0.85 + Math.sin(timeSec * 3.5) * 0.15;
  const bulbPositions: Array<[number, number]> = [
    [mx + 45, my - 7],
    [mx + 118, my - 7],
    [mx + 175, my - 7],
    [mx + 232, my - 7],
    [mx + 305, my - 7],
    [mx - 7, my + 80],
    [mx - 7, my + 180],
    [mx - 7, my + 280],
    [mx + mw + 7, my + 80],
    [mx + mw + 7, my + 180],
    [mx + mw + 7, my + 280],
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

  // Small salon shelf with cute pastel bottles below mirror
  drawRoundedRect(ctx, mx - 18, my + mh + 14, mw + 36, 22, 10);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  const bottles = [
    { x: mx + 16, color: '#FFACC2', h: 32 },
    { x: mx + 46, color: '#A5E8D5', h: 26 },
    { x: mx + mw - 46, color: '#FFD97D', h: 30 },
  ];
  for (const b of bottles) {
    drawRoundedRect(ctx, b.x, my + mh + 14 - b.h, 20, b.h, 6);
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
