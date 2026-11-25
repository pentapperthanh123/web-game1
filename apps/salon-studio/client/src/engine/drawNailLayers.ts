import { COLOR_SWATCHES } from '@shared/constants/presets';
import { SALON_PALETTE } from '@shared/constants/salonConfig';
import type {
  ActiveCustomerSession,
  NailArtStyleKey,
  NailShapeKey,
  StylistMood,
} from '@shared/types/salon';
import { drawRoundedRect } from './drawBackground';
import {
  drawCustomerSpeechBubble,
  drawStylistBubble,
  drawStylistFaceExpression,
} from './drawHairLayers';

interface FingerDef {
  id: number;
  name: string;
  tipX: number;
  tipY: number;
  baseX: number;
  baseY: number;
  baseW: number;
  tipW: number;
  fileThreshold: number;
  paintThreshold: number;
}

// Proportioned 5 Fingers resting naturally on the pink velvet cushion (harmonious with character head r=46, still clearly readable!)
const FINGERS: readonly FingerDef[] = [
  { id: 0, name: 'thumb', tipX: 462, tipY: 593, baseX: 456, baseY: 615, baseW: 11, tipW: 9, fileThreshold: 5, paintThreshold: 33 },
  { id: 1, name: 'index', tipX: 480, tipY: 581, baseX: 466, baseY: 611, baseW: 10.5, tipW: 8.8, fileThreshold: 10, paintThreshold: 41 },
  { id: 2, name: 'middle', tipX: 497, tipY: 583, baseX: 477, baseY: 614, baseW: 11, tipW: 9, fileThreshold: 15, paintThreshold: 49 },
  { id: 3, name: 'ring', tipX: 511, tipY: 594, baseX: 487, baseY: 620, baseW: 10, tipW: 8.4, fileThreshold: 20, paintThreshold: 57 },
  { id: 4, name: 'pinky', tipX: 520, tipY: 609, baseX: 493, baseY: 627, baseW: 9.2, tipW: 7.6, fileThreshold: 25, paintThreshold: 65 },
];

const NAIL_STATION_COORDS = {
  CUSTOMER_X: 392,
  CUSTOMER_Y: 486,
  STYLIST_X: 598,
  STYLIST_Y: 488,
  PILLOW_X: 492,
  PILLOW_Y: 622,
  ARCH_X: 494,
  ARCH_TOP_Y: 250,
} as const;

function getActiveFingerIndex(customer: ActiveCustomerSession | null, timeSec: number): number {
  if (!customer) return 2;
  const { progress } = customer;
  if (progress < 25) {
    return Math.min(4, Math.floor((progress / 25) * 5));
  }
  if (progress < 65) {
    const ratio = (progress - 25) / 40;
    return Math.min(4, Math.floor(ratio * 5));
  }
  return Math.floor(timeSec * 1.8) % 2 === 0 ? 2 : 3;
}

export function drawNailStation(
  ctx: CanvasRenderingContext2D,
  customer: ActiveCustomerSession | null,
  stylistMood: StylistMood,
  stylistSpeech: string,
  isFast: boolean,
  timeSec: number
): void {
  const activeIdx = getActiveFingerIndex(customer, timeSec);
  const activeFinger = FINGERS[activeIdx];

  // Nail Stylist sits across/right of the manicure desk at the same natural seated eye-level as the customer
  const stylistX = NAIL_STATION_COORDS.STYLIST_X + (activeFinger.tipX - 500) * 0.1;
  const stylistY = NAIL_STATION_COORDS.STYLIST_Y;

  // 1. Cozy Pastel Salon Wall Arch & Warm Pendant Accent
  drawNailStudioWallArch(ctx, NAIL_STATION_COORDS.ARCH_X, NAIL_STATION_COORDS.ARCH_TOP_Y, timeSec);

  // 2. Floor Rug & Under-Table Legs + Customer's Seated Lower Body (tucked naturally under the tabletop!)
  drawUnderTableFloorAndChairs(
    ctx,
    NAIL_STATION_COORDS.CUSTOMER_X,
    NAIL_STATION_COORDS.CUSTOMER_Y,
    customer
  );

  // 3. Both Characters' Upper Bodies Seated Behind/Beside the Back Edge of the Manicure Table (Eye-to-Eye Height!)
  if (customer) {
    drawSeatedCustomerUpperBody(
      ctx,
      NAIL_STATION_COORDS.CUSTOMER_X,
      NAIL_STATION_COORDS.CUSTOMER_Y,
      customer,
      timeSec
    );
  }
  drawNailStylistUpperBody(ctx, stylistX, stylistY, stylistMood, isFast, timeSec);

  // 4. Rounded Capsule Manicure Tabletop overlapping the lower waist of both seated characters naturally
  drawManicureTabletopAndProps(ctx, timeSec);

  // 5. Plush Pink Velvet Cushion in the center of the tabletop
  drawVelvetPillow(ctx, NAIL_STATION_COORDS.PILLOW_X, NAIL_STATION_COORDS.PILLOW_Y);

  if (customer) {
    if (customer.isRoyal) {
      drawNailRoyalGlow(ctx, NAIL_STATION_COORDS.PILLOW_X, NAIL_STATION_COORDS.PILLOW_Y - 14, timeSec);
    }

    // 6. Customer's Natural Short Bent Arm & Proportioned 5-Finger Hand resting on the Pink Velvet Pillow
    drawCustomerArmAndHandOnPillow(
      ctx,
      NAIL_STATION_COORDS.CUSTOMER_X,
      NAIL_STATION_COORDS.CUSTOMER_Y,
      customer,
      timeSec
    );

    // 7. Stylist's Two Naturally Bent Arms over the tabletop (left hand steadies wrist, right hand paints active nail!)
    drawNailStylistArmsOverDesk(ctx, stylistX, stylistY, customer, activeIdx, isFast, timeSec);

    // 8. Customer reaction bubble (when fast / royal / almost done)
    drawCustomerSpeechBubble(
      ctx,
      NAIL_STATION_COORDS.CUSTOMER_X + 16,
      NAIL_STATION_COORDS.CUSTOMER_Y - 125,
      customer,
      isFast
    );
  } else {
    ctx.save();
    ctx.fillStyle = 'rgba(58, 40, 37, 0.42)';
    ctx.font = '700 15.5px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SẴN SÀNG ĐÓN KHÁCH NAIL...', NAIL_STATION_COORDS.PILLOW_X, NAIL_STATION_COORDS.PILLOW_Y + 4);
    ctx.restore();
  }

  // 9. Compact Stylist Speech Bubble neatly above the Stylist's head (<= 22 chars)
  if (stylistSpeech) {
    drawStylistBubble(ctx, stylistX - 8, 286, stylistSpeech, stylistMood);
  }
}

function drawNailStudioWallArch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  timeSec: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 156, 560);
  ctx.lineTo(cx - 156, topY + 135);
  ctx.arc(cx, topY + 135, 156, Math.PI, 0);
  ctx.lineTo(cx + 156, 560);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 253, 249, 0.56)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(229, 198, 178, 0.65)';
  ctx.lineWidth = 3;
  ctx.stroke();

  const sway = Math.sin(timeSec * 2) * 3;
  ctx.strokeStyle = 'rgba(224, 154, 31, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 94, topY + 42);
  ctx.lineTo(cx - 94 + sway, topY + 78);
  ctx.moveTo(cx + 96, topY + 46);
  ctx.lineTo(cx + 96 - sway, topY + 84);
  ctx.stroke();

  ctx.fillStyle = '#FFE394';
  ctx.beginPath();
  ctx.arc(cx - 94 + sway, topY + 82, 5.5, 0, Math.PI * 2);
  ctx.arc(cx + 96 - sway, topY + 88, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawUnderTableFloorAndChairs(
  ctx: CanvasRenderingContext2D,
  custX: number,
  custY: number,
  _customer: ActiveCustomerSession | null
): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Soft pastel mint oval floor rug beneath the Manicure Table
  ctx.beginPath();
  ctx.ellipse(498, 796, 186, 28, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(201, 242, 227, 0.44)';
  ctx.fill();

  // 2. Plush Pastel Salon Chair Backrest behind Customer (matching the Stylist's chair proportion!)
  const torsoY = custY - 16;
  drawRoundedRect(ctx, custX - 52, torsoY - 4, 104, 108, 28);
  ctx.fillStyle = SALON_PALETTE.CHAIR_LEATHER;
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, custX - 42, torsoY + 6, 84, 86, 20);
  ctx.fillStyle = '#FFC2D3';
  ctx.fill();

  // 3. Manicure Table Central Pedestal Column & Base (y = 690 -> 802)
  drawRoundedRect(ctx, 476, 690, 42, 98, 10);
  ctx.fillStyle = '#DFC3A8';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(497, 792, 72, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawSeatedCustomerUpperBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  customer: ActiveCustomerSession,
  timeSec: number
): void {
  const swatch = COLOR_SWATCHES[customer.colorKey];
  const bob = Math.sin(timeSec * 3.0 + 0.8) * 1.5;
  const headY = cy - 72 + bob; // headY = 440 (eye-to-eye with Stylist headY = 412!)
  const torsoY = cy - 16 + bob * 0.5;
  const shirtFill = customer.isRoyal ? '#FFE599' : customer.shirtColor;

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Dynamic Customer Back Hair (uses customer's hairStyle & color!)
  const hairFill = customer.service === 'HAIR' ? swatch.hex : '#6B443A';
  ctx.fillStyle = hairFill;
  if (customer.hairStyle === 'long') {
    drawRoundedRect(ctx, cx - 50, headY - 12, 86, 112, 34);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx - 8, headY + 2, 47, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Cute side-back ponytail bun
    ctx.beginPath();
    ctx.arc(cx - 46, headY - 10, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 2. Customer Upper Torso sitting behind the manicure table (matching Stylist torso height = 114px, cleanly tucked behind tabletop y = 556!)
  drawRoundedRect(ctx, cx - 40, torsoY, 82, 114, 26);
  ctx.fillStyle = shirtFill;
  ctx.fill();
  ctx.stroke();

  // Cute cream blouse collar & pastel ribbon detail on customer's top
  ctx.beginPath();
  ctx.moveTo(cx - 14, torsoY + 2);
  ctx.quadraticCurveTo(cx + 3, torsoY + 22, cx + 20, torsoY + 2);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // Decorative pastel heart emblem on customer's sweater
  drawRoundedRect(ctx, cx - 12, torsoY + 42, 28, 18, 6);
  ctx.fillStyle = 'rgba(255, 253, 249, 0.75)';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // 3. Neck connecting head and shirt collar (exact same proportion as Stylist!)
  ctx.lineWidth = 3.6;
  drawRoundedRect(ctx, cx - 10, headY + 35, 21, 23, 7);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // 4. Customer Left Ear (drawn BEFORE head circle so there is no internal circle line!)
  ctx.beginPath();
  ctx.arc(cx - 43, headY + 4, 8.5, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // 5. Customer Head Circle (r = 45, matching Stylist r = 46!)
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.arc(cx, headY, 45, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // 6. Swept Front Bangs & Hair Bow/Crown
  ctx.fillStyle = hairFill;
  ctx.beginPath();
  ctx.arc(cx, headY - 4, 45.5, Math.PI * 0.88, Math.PI * 1.98);
  ctx.quadraticCurveTo(cx + 28, headY - 12, cx + 10, headY - 16);
  ctx.quadraticCurveTo(cx - 12, headY - 8, cx - 44, headY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (customer.isRoyal) {
    const crownY = headY - 58;
    ctx.fillStyle = '#FFD56B';
    ctx.beginPath();
    ctx.moveTo(cx - 22, crownY + 14);
    ctx.lineTo(cx - 26, crownY - 10);
    ctx.lineTo(cx - 10, crownY);
    ctx.lineTo(cx, crownY - 18);
    ctx.lineTo(cx + 10, crownY);
    ctx.lineTo(cx + 26, crownY - 10);
    ctx.lineTo(cx + 22, crownY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#FF8FA8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx - 18, headY - 26, 7.5, 4.8, -0.25, 0, Math.PI * 2);
    ctx.ellipse(cx - 6, headY - 24, 7.5, 4.8, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 12, headY - 25, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE5B4';
    ctx.fill();
    ctx.stroke();
  }

  // 7. Expressive 3/4 Customer Face looking happily toward her manicure
  const faceX = cx + 9;
  ctx.fillStyle = 'rgba(255, 140, 160, 0.5)';
  ctx.beginPath();
  ctx.ellipse(faceX - 18, headY + 13, 6.5, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(faceX + 17, headY + 13, 6.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = SALON_PALETTE.OUTLINE;
  ctx.beginPath();
  ctx.arc(faceX - 11, headY + 2, 4.8, 0, Math.PI * 2);
  ctx.arc(faceX + 13, headY + 2, 4.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(faceX - 12.5, headY + 0.5, 1.8, 0, Math.PI * 2);
  ctx.arc(faceX + 11.5, headY + 0.5, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(faceX + 1, headY + 13, 8.5, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawNailStylistUpperBody(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  mood: StylistMood,
  isFast: boolean,
  timeSec: number
): void {
  const bob = Math.sin(timeSec * 3.2) * 1.6;
  const headY = sy - 74 + bob; // headY = 412 (harmonious seated height across from Customer headY = 440)
  const torsoY = sy - 16 + bob * 0.5;

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Plush pastel salon chair backrest behind stylist
  drawRoundedRect(ctx, sx - 52, torsoY - 4, 104, 108, 28);
  ctx.fillStyle = SALON_PALETTE.CHAIR_LEATHER;
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx - 42, torsoY + 6, 84, 86, 20);
  ctx.fillStyle = '#FFC2D3';
  ctx.fill();

  // 2. Neck connecting head and shirt collar
  drawRoundedRect(ctx, sx - 11, headY + 36, 22, 24, 7);
  ctx.fillStyle = '#F7D4B8';
  ctx.fill();
  ctx.stroke();

  // 3. Stylist uniform shirt + mint pastel salon apron (lower edge naturally tucked behind tabletop y = 556)
  drawRoundedRect(ctx, sx - 42, torsoY, 84, 118, 26);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx - 35, torsoY + 20, 70, 96, 18);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();

  // Apron chest pocket
  drawRoundedRect(ctx, sx - 15, torsoY + 42, 30, 20, 6);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Apron shoulder straps & buttons
  ctx.lineWidth = 3.5;
  drawRoundedRect(ctx, sx - 26, torsoY + 2, 10, 22, 5);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, sx + 16, torsoY + 2, 10, 22, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FF8FA8';
  ctx.beginPath();
  ctx.arc(sx - 21, torsoY + 20, 3, 0, Math.PI * 2);
  ctx.arc(sx + 21, torsoY + 20, 3, 0, Math.PI * 2);
  ctx.fill();

  // Cute pink collar bow at neck
  ctx.fillStyle = '#FF8FA8';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(sx, torsoY + 8);
  ctx.lineTo(sx - 10, torsoY + 2);
  ctx.lineTo(sx - 10, torsoY + 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, torsoY + 8);
  ctx.lineTo(sx + 10, torsoY + 2);
  ctx.lineTo(sx + 10, torsoY + 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, torsoY + 8, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE5B4';
  ctx.fill();
  ctx.stroke();

  // 4. Stylist Head, Ears, Chestnut Bangs & Top Bun (r = 46, matching Customer r = 45!)
  ctx.fillStyle = '#6B443A';
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.arc(sx + 6, headY - 46, 18.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx - 11, headY - 36, 31, 8, 4);
  ctx.fillStyle = SALON_PALETTE.MINT_DEEP;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.lineWidth = 3.5;
  ctx.fillStyle = '#FFE4CE';
  ctx.beginPath();
  ctx.arc(sx - 44, headY + 4, 8.5, 0, Math.PI * 2);
  ctx.arc(sx + 44, headY + 4, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.arc(sx, headY, 46, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6B443A';
  ctx.beginPath();
  ctx.arc(sx, headY - 4, 46.5, Math.PI * 0.96, Math.PI * 2.04);
  ctx.quadraticCurveTo(sx + 34, headY - 8, sx + 42, headY + 11);
  ctx.quadraticCurveTo(sx + 28, headY - 14, sx + 12, headY - 11);
  ctx.quadraticCurveTo(sx - 4, headY - 23, sx - 15, headY - 10);
  ctx.quadraticCurveTo(sx - 32, headY - 11, sx - 43, headY + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FF9EB8';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(sx + 23, headY - 21, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 5. Expressive Stylist Face looking warmly toward the customer's hand
  drawStylistFaceExpression(ctx, sx - 4, headY + 2, mood, isFast);

  ctx.restore();
}

function drawManicureTabletopAndProps(ctx: CanvasRenderingContext2D, timeSec: number): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Rounded Capsule Manicure Tabletop (x = 304 -> 690, y = 556 -> 702)
  // Spans cleanly across BOTH seated characters so neither character's torso or chair pokes out the side!
  drawRoundedRect(ctx, 304, 568, 386, 146, 70);
  ctx.fillStyle = '#E2C7AD';
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, 304, 556, 386, 144, 70);
  const deskGrad = ctx.createLinearGradient(0, 556, 0, 700);
  deskGrad.addColorStop(0, '#FFFDF9');
  deskGrad.addColorStop(0.65, '#FAF1E6');
  deskGrad.addColorStop(1, '#F2E3D3');
  ctx.fillStyle = deskGrad;
  ctx.fill();
  ctx.stroke();

  // Subtle pastel blush desk mat in center
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(498, 626, 108, 42, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 220, 232, 0.38)';
  ctx.fill();
  ctx.restore();

  // 2. Left Desk Zone: 4 Glossy Pastel Polish Bottles on a neat wooden tray
  const trayX = 334;
  const trayY = 636;
  const trayW = 78;
  const trayH = 15;

  drawRoundedRect(ctx, trayX, trayY, trayW, trayH, 7);
  ctx.fillStyle = '#F3DFCC';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.stroke();

  const polishes = [
    { x: trayX + 5, y: 623, color: '#FFD06B' },
    { x: trayX + 22, y: 621, color: '#92E6CB' },
    { x: trayX + 39, y: 622, color: '#C6A7F5' },
    { x: trayX + 56, y: 623, color: '#FF9EB8' },
  ];

  for (const p of polishes) {
    drawRoundedRect(ctx, p.x + 3.5, p.y - 7.5, 6.5, 8.5, 2);
    ctx.fillStyle = '#3A2825';
    ctx.fill();

    drawRoundedRect(ctx, p.x, p.y, 13.5, 18, 4);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = 2.1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fillRect(p.x + 2.6, p.y + 2.8, 2, 10.5);
  }

  // 3. Front-Right Desk Zone: Sleek UV LED Curing Lamp (below the Stylist's right hand!)
  const lampX = 626;
  const lampY = 656;
  const uvGlow = 0.3 + Math.sin(timeSec * 3.5) * 0.15;

  ctx.beginPath();
  ctx.ellipse(lampX, lampY + 3, 30, 7.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(58, 40, 37, 0.1)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(lampX, lampY, 28, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(lampX, lampY, 18, 5.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(165, 140, 247, ${0.48 + uvGlow})`;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawVelvetPillow(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.06);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.3;

  ctx.beginPath();
  ctx.ellipse(0, 18, 62, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(58, 40, 37, 0.11)';
  ctx.fill();

  drawRoundedRect(ctx, -58, -19, 116, 38, 19);
  ctx.fillStyle = SALON_PALETTE.VELVET_PILLOW;
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, -49, -12, 98, 24, 12);
  ctx.strokeStyle = SALON_PALETTE.VELVET_TRIM;
  ctx.lineWidth = 1.7;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawNailRoyalGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, timeSec: number): void {
  ctx.save();
  const radius = 76 + Math.sin(timeSec * 4) * 5;
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
  grad.addColorStop(0, 'rgba(255, 224, 120, 0.45)');
  grad.addColorStop(1, 'rgba(255, 224, 120, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCustomerArmAndHandOnPillow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  customer: ActiveCustomerSession,
  timeSec: number
): void {
  const swatch = COLOR_SWATCHES[customer.colorKey];
  const { progress } = customer;
  const bob = Math.sin(timeSec * 3.0 + 0.8) * 1.2;
  const torsoY = cy - 16 + bob * 0.5;
  const shirtFill = customer.isRoyal ? '#FFE599' : customer.shirtColor;

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Customer's Compact Puffed Sleeve & Short Bent Arm onto the Velvet Pillow (matches Stylist arm style & thickness!)
  const shX = cx + 36;
  const shY = torsoY + 22;
  const elbowX = shX + 12;
  const elbowY = 582;
  const wristX = 450;
  const wristY = 620;

  // Soft forearm shadow on tabletop
  ctx.beginPath();
  ctx.moveTo(elbowX, elbowY + 4);
  ctx.quadraticCurveTo(426, 610, wristX, wristY + 4);
  ctx.strokeStyle = 'rgba(58, 40, 37, 0.1)';
  ctx.lineWidth = 17;
  ctx.stroke();

  // Short bent arm from shoulder through elbow on table to wrist on pillow
  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.quadraticCurveTo(elbowX, elbowY, wristX, wristY);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 17.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.quadraticCurveTo(elbowX, elbowY, wristX, wristY);
  ctx.strokeStyle = customer.skinTone;
  ctx.lineWidth = 11.5;
  ctx.stroke();

  // Customer's cozy puffed salon sleeve with cream cuff (exact same clean style as Stylist!)
  ctx.save();
  ctx.translate(shX + 2, shY + 3);
  ctx.rotate(-0.26);
  drawRoundedRect(ctx, -11.5, -10.5, 23, 22, 9);
  ctx.fillStyle = shirtFill;
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  drawRoundedRect(ctx, -10.5, 6.5, 21, 5, 2.5);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Customer's other (left) resting arm tucked gently on the left side of the tabletop
  const lShX = cx - 36;
  const lShY = torsoY + 22;
  const lElbowX = lShX - 10;
  const lElbowY = lShY + 42;
  const lHandX = cx - 22;
  const lHandY = 568;

  ctx.beginPath();
  ctx.moveTo(lShX, lShY);
  ctx.quadraticCurveTo(lElbowX, lElbowY, lHandX, lHandY);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 17.5;
  ctx.stroke();
  ctx.strokeStyle = customer.skinTone;
  ctx.lineWidth = 11.5;
  ctx.stroke();

  ctx.save();
  ctx.translate(lShX - 2, lShY + 3);
  ctx.rotate(0.24);
  drawRoundedRect(ctx, -11.5, -10.5, 23, 22, 9);
  ctx.fillStyle = shirtFill;
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  drawRoundedRect(ctx, -10.5, 6.5, 21, 5, 2.5);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(lHandX, lHandY, 8.5, 6.5, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Delicate bracelet at right wrist on pillow
  ctx.save();
  ctx.translate(445, 619);
  ctx.rotate(0.2);
  drawRoundedRect(ctx, -4, -9, 8, 18, 4);
  ctx.fillStyle = customer.isRoyal ? '#FFD56B' : '#FFACC2';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();

  // 2. PROPORTIONED 5-FINGER HAND ON THE VELVET CUSHION (Matches character head scale, shows nail art clearly!)
  const traceFingerShape = (f: FingerDef) => {
    const dx = f.tipX - f.baseX;
    const dy = f.tipY - f.baseY;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const halfTip = f.tipW / 2;
    const halfBase = f.baseW / 2;

    ctx.save();
    ctx.translate(f.tipX, f.tipY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-halfBase, len + 2);
    ctx.quadraticCurveTo(-halfBase, len * 0.42, -halfTip, 4.5);
    ctx.arc(0, 4.5, halfTip, Math.PI, 0);
    ctx.quadraticCurveTo(halfBase, len * 0.42, halfBase, len + 2);
    ctx.closePath();
    ctx.restore();
  };

  // PASS 1: Outer Dark Silhouette Stroke for Palm + All 5 Fingers
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 5.4;

  ctx.save();
  ctx.translate(470, 619);
  ctx.rotate(0.26);
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 15.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  FINGERS.forEach((f) => {
    traceFingerShape(f);
    ctx.stroke();
  });
  ctx.restore();

  // PASS 2: Unified Smooth Skin Fill covering Palm + All 5 Fingers
  ctx.save();
  ctx.fillStyle = customer.skinTone;

  ctx.save();
  ctx.translate(470, 619);
  ctx.rotate(0.26);
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 15.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  FINGERS.forEach((f) => {
    traceFingerShape(f);
    ctx.fill();
  });

  // Delicate finger separation lines
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 2.1;
  const fingerWebs: Array<[number, number, number, number]> = [
    [459, 609, 463, 601],
    [470, 607, 474, 599],
    [481, 610, 486, 602],
    [489, 616, 495, 609],
  ];
  for (const [x1, y1, x2, y2] of fingerWebs) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  // PASS 3: Progressive 3-Phase Nails on all 5 fingertips
  FINGERS.forEach((f) => {
    const isBasePainted = progress >= f.paintThreshold;
    const isFiled = progress >= f.fileThreshold;

    const dx = f.tipX - f.baseX;
    const dy = f.tipY - f.baseY;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const halfTip = f.tipW / 2;

    ctx.save();
    ctx.translate(f.tipX, f.tipY);
    ctx.rotate(angle);

    ctx.strokeStyle = 'rgba(58, 40, 37, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-halfTip * 0.45, len * 0.45);
    ctx.lineTo(halfTip * 0.45, len * 0.45);
    ctx.stroke();

    drawProgressiveNail(
      ctx,
      customer.nailShape,
      f.tipW,
      isBasePainted,
      isFiled,
      swatch.hex,
      swatch.highlight,
      progress >= 65,
      Boolean(customer.hasPastelShimmer),
      customer.nailArtStyle ?? 'FRENCH_TIP',
      Boolean(customer.isRoyal),
      f.id,
      timeSec
    );

    ctx.restore();
  });

  ctx.restore();
}

function drawProgressiveNail(
  ctx: CanvasRenderingContext2D,
  shape: NailShapeKey,
  tipWidth: number,
  isBasePainted: boolean,
  isFiled: boolean,
  colorHex: string,
  highlightHex: string,
  isDetailArtPhase: boolean,
  hasShimmer: boolean,
  nailArtStyle: NailArtStyleKey,
  isRoyal: boolean,
  fingerId: number,
  timeSec: number
): void {
  const nw = tipWidth * 0.92;
  const nh = shape === 'long' ? 14 : shape === 'almond' ? 12.2 : 10.6;
  const ny = -nh + 7;

  ctx.save();
  ctx.fillStyle = isBasePainted ? colorHex : '#FFF3EC';
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 2;

  if (shape === 'square') {
    drawRoundedRect(ctx, -nw / 2, ny, nw, nh, isFiled ? 2.2 : 3.6);
  } else if (shape === 'almond') {
    ctx.beginPath();
    ctx.moveTo(-nw / 2, ny + nh);
    ctx.quadraticCurveTo(-nw / 2, ny + 2, 0, ny - (isFiled ? 2.6 : 0.9));
    ctx.quadraticCurveTo(nw / 2, ny + 2, nw / 2, ny + nh);
    ctx.closePath();
  } else {
    drawRoundedRect(ctx, -nw / 2, ny, nw, nh, nw * 0.48);
  }
  ctx.fill();
  ctx.stroke();

  if (!isBasePainted && isFiled) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-nw * 0.34, ny + 1.8);
    ctx.lineTo(nw * 0.34, ny + 1.8);
    ctx.stroke();
  }

  if (isBasePainted) {
    ctx.strokeStyle = highlightHex;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-nw * 0.22, ny + 2.8);
    ctx.lineTo(-nw * 0.22, ny + nh - 2.8);
    ctx.stroke();
  }

  if (isBasePainted && isDetailArtPhase) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-nw / 2 + 1, ny + 2.4);
    ctx.quadraticCurveTo(0, ny + 4.4, nw / 2 - 1, ny + 2.4);
    ctx.stroke();

    if (hasShimmer) {
      const alpha = 0.55 + Math.sin(timeSec * 8 + fingerId) * 0.45;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(nw * 0.15, ny + nh * 0.36, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    const isAccentFinger = fingerId === 2 || fingerId === 3;
    if (isAccentFinger && (nailArtStyle === 'FLORAL' || nailArtStyle === 'STARS')) {
      if (nailArtStyle === 'FLORAL') {
        drawMiniDaisy(ctx, 0, ny + nh * 0.52);
      } else {
        drawMiniStar(ctx, 0, ny + nh * 0.52);
      }
    }

    if (isRoyal && isAccentFinger) {
      drawRoyalGemstone(ctx, 0, ny + nh * 0.46, timeSec);
    }
  }

  ctx.restore();
}

function drawMiniDaisy(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 0.85;

  for (let i = 0; i < 5; i++) {
    const rad = (i * Math.PI * 2) / 5;
    const px = cx + Math.cos(rad) * 2.1;
    const py = cy + Math.sin(rad) * 2.1;
    ctx.beginPath();
    ctx.arc(px, py, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD06B';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMiniStar(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.fillStyle = '#FFF5B8';
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 0.9;

  ctx.beginPath();
  ctx.moveTo(cx, cy - 3);
  ctx.lineTo(cx + 1.1, cy - 1.1);
  ctx.lineTo(cx + 3, cy);
  ctx.lineTo(cx + 1.1, cy + 1.1);
  ctx.lineTo(cx, cy + 3);
  ctx.lineTo(cx - 1.1, cy + 1.1);
  ctx.lineTo(cx - 3, cy);
  ctx.lineTo(cx - 1.1, cy - 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRoyalGemstone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  timeSec: number
): void {
  ctx.save();
  const pulse = Math.sin(timeSec * 6) * 0.7;
  ctx.fillStyle = '#FFF3A8';
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo(cx, cy - 3.6 + pulse);
  ctx.lineTo(cx + 2.9, cy + pulse);
  ctx.lineTo(cx, cy + 3.6 + pulse);
  ctx.lineTo(cx - 2.9, cy + pulse);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - 0.7, cy - 1 + pulse, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawNailStylistArmsOverDesk(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  customer: ActiveCustomerSession,
  activeFingerIdx: number,
  isFast: boolean,
  timeSec: number
): void {
  const { progress } = customer;
  const swatch = COLOR_SWATCHES[customer.colorKey];
  const bob = Math.sin(timeSec * 3.2) * 1.4;

  let toolType: 'FILE' | 'BRUSH' | 'ART_PEN' = 'FILE';
  if (progress >= 65) {
    toolType = 'ART_PEN';
  } else if (progress >= 25) {
    toolType = 'BRUSH';
  }

  const target = FINGERS[activeFingerIdx];
  const speedMult = isFast ? 14 : 7;
  const strokeOsc = Math.sin(timeSec * speedMult) * (toolType === 'FILE' ? 3.2 : 2.2);

  // Exact contact point on the active fingernail tip
  const toolTipX = target.tipX + Math.sin(timeSec * 3) * 1.1;
  const toolTipY = target.tipY - 1.5 + strokeOsc;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // --- A. STYLIST'S LEFT STEADYING ARM (Viewer Left: gently rests on the back of the velvet pillow to steady customer's hand!) ---
  const lShX = sx - 38;
  const lShY = sy + 6 + bob;
  const lElbowX = lShX - 24;
  const lElbowY = lShY + 46;
  const lHandX = 534;
  const lHandY = 584 + bob * 0.4;

  ctx.beginPath();
  ctx.moveTo(lShX, lShY);
  ctx.quadraticCurveTo(lElbowX, lElbowY, lHandX, lHandY);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 17.5;
  ctx.stroke();
  ctx.strokeStyle = '#FFE4CE';
  ctx.lineWidth = 11.5;
  ctx.stroke();

  // Left cozy puffed salon sleeve with mint cuff
  ctx.save();
  ctx.translate(lShX - 2, lShY + 3);
  ctx.rotate(0.28);
  drawRoundedRect(ctx, -11.5, -10.5, 23, 22, 9);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  drawRoundedRect(ctx, -10.5, 6.5, 21, 5, 2.5);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Stylist left hand gently resting beside the pillow/fingers
  ctx.beginPath();
  ctx.ellipse(lHandX, lHandY, 9, 6.8, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- B. STYLIST'S RIGHT WORKING ARM (Viewer Right: naturally bent at elbow on the right, holding the Brush/File!) ---
  const rShX = sx + 38;
  const rShY = sy + 6 + bob;
  const wristX = Math.max(542, toolTipX + 42);
  const wristY = toolTipY + 6;
  const rElbowX = rShX + 18;
  const rElbowY = rShY + 62;

  ctx.beginPath();
  ctx.moveTo(rShX, rShY);
  ctx.quadraticCurveTo(rElbowX, rElbowY, wristX, wristY);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 17.5;
  ctx.stroke();
  ctx.strokeStyle = '#FFE4CE';
  ctx.lineWidth = 11.5;
  ctx.stroke();

  // Right cozy puffed salon sleeve with mint cuff
  ctx.save();
  ctx.translate(rShX + 2, rShY + 3);
  ctx.rotate(-0.24);
  drawRoundedRect(ctx, -11.5, -10.5, 23, 22, 9);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  drawRoundedRect(ctx, -10.5, 6.5, 21, 5, 2.5);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Active Tool aligned from active fingernail tip (toolTipX, toolTipY) to Stylist's right hand (wristX, wristY)
  const toolAngle = Math.atan2(wristY - toolTipY, wristX - toolTipX);
  const tipToWristDist = Math.hypot(wristX - toolTipX, wristY - toolTipY);

  ctx.save();
  ctx.translate(toolTipX, toolTipY);
  ctx.rotate(toolAngle);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 2.5;

  const handleLen = Math.max(22, tipToWristDist + 6);
  if (toolType === 'FILE') {
    drawRoundedRect(ctx, -4, -2.8, handleLen + 5, 5.6, 2.8);
    ctx.fillStyle = '#FFB8CB';
    ctx.fill();
    ctx.stroke();
  } else if (toolType === 'BRUSH') {
    ctx.fillStyle = swatch.hex;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8.5, -3.4);
    ctx.lineTo(8.5, 3.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawRoundedRect(ctx, 8.5, -2.8, handleLen - 5, 5.6, 2.8);
    ctx.fillStyle = '#FFACC2';
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#FFE599';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(7.5, -2.8);
    ctx.lineTo(7.5, 2.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawRoundedRect(ctx, 7.5, -2.6, handleLen - 4, 5.2, 2.6);
    ctx.fillStyle = '#A8E6CF';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Stylist right hand gripping the tool at (wristX, wristY)
  ctx.beginPath();
  ctx.arc(wristX, wristY, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.1;
  ctx.stroke();

  if (isFast) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(toolTipX - 6, toolTipY - 6, 2.1, 0, Math.PI * 2);
    ctx.arc(toolTipX + 6, toolTipY + 6, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
