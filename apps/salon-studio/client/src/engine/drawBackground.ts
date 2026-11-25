import { SALON_PALETTE, STAGE_METRICS } from '@shared/constants/salonConfig';
import type { SalonServiceMode } from '@shared/types/salon';

export const HAIR_MIRROR_RECT = {
  X: 268,
  Y: 256,
  W: 356,
  H: 334,
} as const;

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

  // 1. Unified seamless vertical gradient (NO horizontal bar cutting the stage in half!)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  if (service === 'HAIR') {
    bgGrad.addColorStop(0, '#FFF6EE');
    bgGrad.addColorStop(0.45, '#FFECF1');
    bgGrad.addColorStop(0.68, '#F9E3D4');
    bgGrad.addColorStop(1, '#EED0B9');
  } else {
    bgGrad.addColorStop(0, '#F4FCF9');
    bgGrad.addColorStop(0.45, '#FFF1F6');
    bgGrad.addColorStop(0.68, '#F9E4D8');
    bgGrad.addColorStop(1, '#EED1BC');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Soft vertical pastel wallpaper stripes that fade out smoothly into the floor zone
  ctx.save();
  const stripeGrad = ctx.createLinearGradient(0, 0, 0, 740);
  if (service === 'HAIR') {
    stripeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.36)');
    stripeGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0.22)');
    stripeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  } else {
    stripeGrad.addColorStop(0, 'rgba(204, 242, 229, 0.32)');
    stripeGrad.addColorStop(0.75, 'rgba(204, 242, 229, 0.18)');
    stripeGrad.addColorStop(1, 'rgba(204, 242, 229, 0)');
  }
  ctx.fillStyle = stripeGrad;
  for (let x = 0; x < WIDTH; x += 64) {
    ctx.fillRect(x, 0, 30, 740);
  }
  ctx.restore();

  // 3. Cozy oval pastel salon rug grounding the workstation naturally
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(476, 766, 208, 42, 0, 0, Math.PI * 2);
  ctx.fillStyle = service === 'HAIR' ? 'rgba(255, 212, 226, 0.45)' : 'rgba(201, 242, 227, 0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(58, 40, 37, 0.14)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // 4. Vanity mirror frame & glass base for HAIR mode
  if (service === 'HAIR') {
    drawHairMirrorBackdrop(ctx, timeSec);
  }
}

function drawHairMirrorBackdrop(ctx: CanvasRenderingContext2D, timeSec: number): void {
  const { X: mx, Y: my, W: mw, H: mh } = HAIR_MIRROR_RECT;

  ctx.save();
  // Mirror outer wooden frame
  drawRoundedRect(ctx, mx - 14, my - 14, mw + 28, mh + 28, 38);
  ctx.fillStyle = SALON_PALETTE.PEACH_SOFT;
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Mirror glass base
  drawRoundedRect(ctx, mx, my, mw, mh, 28);
  const mirrorGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
  mirrorGrad.addColorStop(0, '#E8F8FF');
  mirrorGrad.addColorStop(0.5, '#F8FDFF');
  mirrorGrad.addColorStop(1, '#DCF2FB');
  ctx.fillStyle = mirrorGrad;
  ctx.fill();
  ctx.stroke();

  // Warm vanity light bulbs along top & sides of mirror
  const pulse = 0.85 + Math.sin(timeSec * 3.5) * 0.15;
  const bulbPositions: Array<[number, number]> = [
    [mx + 46, my - 7],
    [mx + 116, my - 7],
    [mx + 178, my - 7],
    [mx + 240, my - 7],
    [mx + 310, my - 7],
    [mx - 7, my + 75],
    [mx - 7, my + 172],
    [mx - 7, my + 268],
    [mx + mw + 7, my + 75],
    [mx + mw + 7, my + 172],
    [mx + mw + 7, my + 268],
  ];

  for (const [bx, by] of bulbPositions) {
    ctx.beginPath();
    ctx.arc(bx, by, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 236, 165, ${pulse})`;
    ctx.fill();
    ctx.strokeStyle = SALON_PALETTE.OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Vanity counter shelf below mirror
  drawRoundedRect(ctx, mx - 16, my + mh + 10, mw + 32, 20, 10);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  const bottles = [
    { x: mx + 14, color: '#FFACC2', h: 28 },
    { x: mx + 40, color: '#A5E8D5', h: 22 },
    { x: mx + mw - 38, color: '#FFD97D', h: 26 },
  ];
  for (const b of bottles) {
    drawRoundedRect(ctx, b.x, my + mh + 10 - b.h, 18, b.h, 5);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
