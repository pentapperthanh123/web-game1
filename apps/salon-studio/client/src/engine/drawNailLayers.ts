import { COLOR_SWATCHES } from '@shared/constants/presets';
import { SALON_PALETTE } from '@shared/constants/salonConfig';
import type { ActiveCustomerSession, NailShapeKey, StylistMood } from '@shared/types/salon';
import { drawRoundedRect } from './drawBackground';
import { drawCustomerSpeechBubble, drawStylistBubble } from './drawHairLayers';

interface FingerTipPos {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
}

const FINGERS: readonly FingerTipPos[] = [
  { x: 344, y: 635, w: 32, h: 86, angle: -0.32 }, // Thumb
  { x: 398, y: 558, w: 30, h: 120, angle: -0.1 }, // Index
  { x: 452, y: 540, w: 32, h: 132, angle: 0.0 }, // Middle
  { x: 506, y: 556, w: 30, h: 122, angle: 0.1 }, // Ring
  { x: 554, y: 586, w: 26, h: 100, angle: 0.22 }, // Pinky
];

export function drawNailStation(
  ctx: CanvasRenderingContext2D,
  customer: ActiveCustomerSession | null,
  stylistMood: StylistMood,
  stylistSpeech: string,
  isFast: boolean,
  timeSec: number
): void {
  // 1. Draw Nail Stylist seated across the table (standardized head radius = 50!)
  drawNailStylistCharacter(ctx, 580, 420, stylistMood, timeSec);

  // 2. Velvet pillow for client's hand
  drawVelvetPillow(ctx, 468, 700);

  if (customer) {
    if (customer.isRoyal) {
      drawNailRoyalGlow(ctx, 460, 610, timeSec);
    }
    drawCustomerHandAndNails(ctx, customer, timeSec);
    drawNailStylistBrushHand(ctx, customer, isFast, timeSec);
    drawCustomerSpeechBubble(ctx, 390, 600, customer, isFast);
  } else {
    ctx.save();
    ctx.fillStyle = 'rgba(58, 40, 37, 0.35)';
    ctx.font = '700 22px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT NAIL GUEST...', 468, 695);
    ctx.restore();
  }

  // 3. Stylist bubble at top right (clear of hands and nail work)
  if (stylistSpeech) {
    drawStylistBubble(ctx, 580, 245, stylistSpeech, stylistMood);
  }
}

function drawNailStylistCharacter(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  mood: StylistMood,
  timeSec: number
): void {
  const headY = sy - 88 + Math.sin(timeSec * 3) * 2;

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Stylist torso + mint salon apron behind desk
  drawRoundedRect(ctx, sx - 42, sy - 38, 84, 98, 22);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx - 34, sy - 14, 68, 74, 16);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();

  // Stylist head: standard radius 50 (same scale system!)
  ctx.beginPath();
  ctx.arc(sx, headY, 50, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.stroke();

  // Top bun hair & cute salon hair cap
  ctx.fillStyle = '#6B443A';
  ctx.beginPath();
  ctx.arc(sx + 8, headY - 48, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sx, headY - 6, 51, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stylist facial expression
  ctx.fillStyle = SALON_PALETTE.OUTLINE;
  if (mood === 'OOPS') {
    ctx.beginPath();
    ctx.arc(sx - 18, headY + 3, 5.5, 0, Math.PI * 2);
    ctx.arc(sx + 10, headY + 3, 5.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx - 4, headY + 20, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FF8FA8';
    ctx.fill();
    ctx.stroke();

    // Anime sweat drop
    ctx.fillStyle = '#8CD5F7';
    ctx.beginPath();
    ctx.moveTo(sx + 36, headY - 22);
    ctx.quadraticCurveTo(sx + 50, headY - 4, sx + 36, headY + 6);
    ctx.quadraticCurveTo(sx + 22, headY - 4, sx + 36, headY - 22);
    ctx.fill();
    ctx.stroke();
  } else {
    // Focused & smiling nail artist
    ctx.beginPath();
    ctx.arc(sx - 16, headY + 3, 5, 0, Math.PI * 2);
    ctx.arc(sx + 10, headY + 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 140, 160, 0.45)';
    ctx.beginPath();
    ctx.ellipse(sx - 24, headY + 14, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + 18, headY + 14, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx - 3, headY + 15, 10, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

function drawVelvetPillow(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;

  // Soft shadow under pillow
  ctx.beginPath();
  ctx.ellipse(cx, cy + 54, 178, 30, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(58, 40, 37, 0.12)';
  ctx.fill();

  // Plush cushion body
  drawRoundedRect(ctx, cx - 172, cy - 42, 344, 102, 48);
  ctx.fillStyle = SALON_PALETTE.VELVET_PILLOW;
  ctx.fill();
  ctx.stroke();

  // Golden stitched trim line
  drawRoundedRect(ctx, cx - 156, cy - 28, 312, 74, 36);
  ctx.strokeStyle = SALON_PALETTE.VELVET_TRIM;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawNailRoyalGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, timeSec: number): void {
  ctx.save();
  const radius = 148 + Math.sin(timeSec * 4) * 10;
  const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, radius);
  grad.addColorStop(0, 'rgba(255, 224, 120, 0.45)');
  grad.addColorStop(1, 'rgba(255, 224, 120, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCustomerHandAndNails(
  ctx: CanvasRenderingContext2D,
  customer: ActiveCustomerSession,
  timeSec: number
): void {
  const swatch = COLOR_SWATCHES[customer.colorKey];

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Sleeve cuff at bottom
  drawRoundedRect(ctx, 400, 744, 132, 66, 22);
  ctx.fillStyle = customer.isRoyal ? '#FFE599' : customer.shirtColor;
  ctx.fill();
  ctx.stroke();

  // Customer Name Pill on sleeve (unmistakable source of truth)
  ctx.save();
  ctx.font = '800 12px "Fredoka", sans-serif';
  const rawW = ctx.measureText(customer.user.nickname).width;
  const namePillW = Math.max(76, Math.min(124, rawW + 24));
  drawRoundedRect(ctx, 466 - namePillW / 2, 755, namePillW, 22, 11);
  ctx.fillStyle = customer.isRoyal ? '#FFF4CC' : '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = SALON_PALETTE.TEXT_DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tagNick =
    customer.user.nickname.length > 13
      ? `${customer.user.nickname.slice(0, 12)}…`
      : customer.user.nickname;
  ctx.fillText(tagNick, 466, 766);
  ctx.restore();

  // Palm resting on pillow
  ctx.beginPath();
  ctx.ellipse(466, 682, 92, 76, 0, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Draw all 5 fingers + progressive painted nails
  FINGERS.forEach((f, idx) => {
    const fingerDoneThreshold = idx * 20;
    const isPainted = customer.progress > fingerDoneThreshold + 5;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);

    // Finger base
    drawRoundedRect(ctx, -f.w / 2, 0, f.w, f.h, f.w * 0.48);
    ctx.fillStyle = customer.skinTone;
    ctx.fill();
    ctx.strokeStyle = SALON_PALETTE.OUTLINE;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Knuckle line
    ctx.strokeStyle = 'rgba(58, 40, 37, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-f.w * 0.24, f.h * 0.44);
    ctx.lineTo(f.w * 0.24, f.h * 0.44);
    ctx.stroke();

    // Nail layer
    if (customer.trollEffect === 'SUPER_LONG_CURLED') {
      drawCurledTrollNail(ctx, swatch.hex, f.w, idx);
    } else {
      drawStandardNail(
        ctx,
        customer.nailShape,
        f.w,
        isPainted ? swatch.hex : '#FFF1EB',
        swatch.highlight,
        isPainted && customer.hasPastelShimmer,
        isPainted && customer.isRoyal,
        timeSec
      );
      if (customer.trollEffect === 'FUNNY_CHARMS') {
        drawFunnyNailCharm(ctx, idx, timeSec);
      }
    }

    ctx.restore();
  });

  ctx.restore();
}

function drawStandardNail(
  ctx: CanvasRenderingContext2D,
  shape: NailShapeKey,
  fingerWidth: number,
  fill: string,
  highlight: string,
  hasShimmer: boolean,
  isRoyal: boolean,
  timeSec: number
): void {
  const nw = fingerWidth * 0.78;
  const nh = shape === 'long' ? 38 : shape === 'almond' ? 32 : 24;
  const ny = -nh + 15;

  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3;

  if (shape === 'square') {
    drawRoundedRect(ctx, -nw / 2, ny, nw, nh, 5);
  } else if (shape === 'almond') {
    ctx.beginPath();
    ctx.moveTo(-nw / 2, ny + nh);
    ctx.quadraticCurveTo(-nw / 2, ny + 4, 0, ny - 5);
    ctx.quadraticCurveTo(nw / 2, ny + 4, nw / 2, ny + nh);
    ctx.closePath();
  } else {
    drawRoundedRect(ctx, -nw / 2, ny, nw, nh, nw * 0.5);
  }
  ctx.fill();
  ctx.stroke();

  // Gloss reflection streak
  ctx.strokeStyle = highlight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-nw * 0.2, ny + 6);
  ctx.lineTo(-nw * 0.2, ny + nh - 7);
  ctx.stroke();

  // Glitter dot if pastel shimmer unlocked
  if (hasShimmer) {
    const alpha = 0.55 + Math.sin(timeSec * 8) * 0.45;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(nw * 0.16, ny + nh * 0.35, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3D Royal gemstone diamond!
  if (isRoyal) {
    ctx.fillStyle = '#FFF5B8';
    ctx.strokeStyle = SALON_PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ny + nh * 0.22);
    ctx.lineTo(6, ny + nh * 0.46);
    ctx.lineTo(0, ny + nh * 0.7);
    ctx.lineTo(-6, ny + nh * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawCurledTrollNail(
  ctx: CanvasRenderingContext2D,
  fill: string,
  fingerWidth: number,
  idx: number
): void {
  const dir = idx % 2 === 0 ? 1 : -1;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.2;

  ctx.beginPath();
  ctx.moveTo(-fingerWidth * 0.34, 14);
  ctx.bezierCurveTo(
    -fingerWidth * 0.5,
    -58,
    dir * 42,
    -96,
    dir * 18,
    -112
  );
  ctx.bezierCurveTo(
    dir * 2,
    -82,
    fingerWidth * 0.34,
    -40,
    fingerWidth * 0.34,
    14
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFunnyNailCharm(
  ctx: CanvasRenderingContext2D,
  fingerIdx: number,
  timeSec: number
): void {
  const wobble = Math.sin(timeSec * 6 + fingerIdx) * 2;
  ctx.save();
  ctx.translate(0, -8 + wobble);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 2.5;

  const variant = fingerIdx % 3;
  if (variant === 0) {
    // Funny Onion Bulb
    ctx.fillStyle = '#F6D8B8';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#52B788';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-4, -22);
    ctx.moveTo(0, -12);
    ctx.lineTo(5, -21);
    ctx.stroke();
  } else if (variant === 1) {
    // Watermelon Slice
    ctx.fillStyle = '#52B788';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FF6B8B';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  } else {
    // Cute Ladybug / Beetle
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = SALON_PALETTE.OUTLINE;
    ctx.beginPath();
    ctx.arc(-4, -2, 2.2, 0, Math.PI * 2);
    ctx.arc(4, 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawNailStylistBrushHand(
  ctx: CanvasRenderingContext2D,
  customer: ActiveCustomerSession,
  isFast: boolean,
  timeSec: number
): void {
  const fingerIdx = Math.min(4, Math.floor((customer.progress / 100) * 5));
  const target = FINGERS[fingerIdx];
  const strokeOsc = Math.sin(timeSec * (isFast ? 14 : 7)) * 10;
  const brushTipX = target.x + Math.sin(timeSec * 3) * 4;
  const brushTipY = target.y - 4 + strokeOsc;
  const swatch = COLOR_SWATCHES[customer.colorKey];

  // Natural arm with shoulder & elbow connecting stylist to brush hand
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 16;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const shX = 548;
  const shY = 412;
  const handBaseX = brushTipX + 55;
  const handBaseY = brushTipY - 30;
  const elX = 580;
  const elY = 495;

  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.lineTo(elX, elY);
  ctx.lineTo(handBaseX, handBaseY);
  ctx.stroke();

  ctx.strokeStyle = '#FFE4CE';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.lineTo(elX, elY);
  ctx.lineTo(handBaseX, handBaseY);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(brushTipX, brushTipY);
  ctx.rotate(-0.55);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;

  // Polish bristle tip
  ctx.fillStyle = swatch.hex;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(14, -6);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Brush wand & pastel cap
  drawRoundedRect(ctx, 14, -4, 42, 8, 4);
  ctx.fillStyle = '#3A2825';
  ctx.fill();

  drawRoundedRect(ctx, 52, -14, 52, 28, 12);
  ctx.fillStyle = '#FFACC2';
  ctx.fill();
  ctx.stroke();

  // Stylist fingers gripping the brush
  ctx.beginPath();
  ctx.ellipse(84, -4, 24, 18, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.stroke();

  // Speed gloss sparkles when viewers like (Nóng tay tăng tốc)
  if (isFast) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-8, -6, 2.5, 0, Math.PI * 2);
    ctx.arc(6, 12, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
