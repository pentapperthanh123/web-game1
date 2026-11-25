import { COLOR_SWATCHES } from '@shared/constants/presets';
import { SALON_PALETTE } from '@shared/constants/salonConfig';
import type { ActiveCustomerSession, StylistMood } from '@shared/types/salon';
import { drawRoundedRect } from './drawBackground';

export function drawHairStation(
  ctx: CanvasRenderingContext2D,
  customer: ActiveCustomerSession | null,
  stylistMood: StylistMood,
  stylistSpeech: string,
  isFast: boolean,
  timeSec: number
): void {
  const cx = 450;
  const cy = 600;

  drawBarberChairBack(ctx, cx, cy);

  if (customer) {
    if (customer.isRoyal) {
      drawRoyalHalo(ctx, cx, cy - 90, timeSec);
    }
    drawCustomerHairBody(ctx, cx, cy, customer, timeSec);
  } else {
    drawEmptyChairHint(ctx, cx, cy - 25);
  }

  drawStylistCharacter(ctx, 620, 560, customer, stylistMood, stylistSpeech, isFast, timeSec);
}

function drawBarberChairBack(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';

  // Metal swivel pedestal
  ctx.fillStyle = '#D9D3D0';
  ctx.fillRect(cx - 18, cy + 120, 36, 68);
  ctx.strokeRect(cx - 18, cy + 120, 36, 68);

  // Round metallic base (firm and wide on the floor)
  ctx.beginPath();
  ctx.ellipse(cx, cy + 192, 82, 22, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#E6E1DE';
  ctx.fill();
  ctx.stroke();

  // Chair backrest cushion (proportional to body and head)
  drawRoundedRect(ctx, cx - 94, cy - 76, 188, 192, 38);
  ctx.fillStyle = SALON_PALETTE.CHAIR_LEATHER;
  ctx.fill();
  ctx.stroke();

  // Cushion inner stitch highlight
  drawRoundedRect(ctx, cx - 76, cy - 58, 152, 154, 28);
  ctx.fillStyle = '#FFC2D3';
  ctx.fill();

  // Armrests
  drawRoundedRect(ctx, cx - 114, cy + 46, 32, 84, 15);
  ctx.fillStyle = SALON_PALETTE.CHAIR_SHADOW;
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, cx + 82, cy + 46, 32, 84, 15);
  ctx.fill();
  ctx.stroke();

  // Seat bottom
  drawRoundedRect(ctx, cx - 98, cy + 100, 196, 40, 18);
  ctx.fillStyle = SALON_PALETTE.CHAIR_LEATHER;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawEmptyChairHint(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(58, 40, 37, 0.35)';
  ctx.font = '700 22px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT GUEST...', cx, cy);
  ctx.restore();
}

function drawRoyalHalo(ctx: CanvasRenderingContext2D, cx: number, cy: number, timeSec: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(timeSec * 0.45);
  const rays = 12;
  for (let i = 0; i < rays; i += 1) {
    const angle = (i / rays) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 152, angle, angle + 0.22);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 213, 107, 0.34)' : 'rgba(255, 240, 180, 0.22)';
    ctx.fill();
  }
  ctx.restore();
}

function drawCustomerHairBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  customer: ActiveCustomerSession,
  timeSec: number
): void {
  const bob = Math.sin(timeSec * 3.2) * 2.5;
  const headY = cy - 82 + bob;
  const swatch = COLOR_SWATCHES[customer.colorKey];

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Back hair layer (for long / curly / bob)
  if (!customer.trollEffect) {
    drawBackHair(ctx, cx, headY, customer.hairStyle, swatch.hex, swatch.shadow);
  }

  // Salon cape draped over customer's shoulders
  ctx.beginPath();
  ctx.moveTo(cx - 26, headY + 52);
  ctx.quadraticCurveTo(cx - 86, headY + 98, cx - 78, cy + 118);
  ctx.lineTo(cx + 78, cy + 118);
  ctx.quadraticCurveTo(cx + 86, headY + 98, cx + 26, headY + 52);
  ctx.closePath();
  ctx.fillStyle = customer.isRoyal ? '#FFE599' : customer.shirtColor;
  ctx.fill();
  ctx.stroke();

  // Cape collar bow
  drawRoundedRect(ctx, cx - 25, headY + 46, 50, 16, 8);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // Neck
  drawRoundedRect(ctx, cx - 14, headY + 34, 28, 22, 8);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Ears (radius 11, snug to r = 50 head)
  ctx.beginPath();
  ctx.arc(cx - 50, headY + 5, 11, 0, Math.PI * 2);
  ctx.arc(cx + 50, headY + 5, 11, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Head circle: standardized headRadius = 50 (same scale system as stylist!)
  ctx.beginPath();
  ctx.arc(cx, headY, 50, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Rosy cheeks
  ctx.fillStyle = 'rgba(255, 135, 165, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - 28, headY + 12, 10, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 28, headY + 12, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Facial expression
  drawCustomerFace(ctx, cx, headY, customer.expression, timeSec);

  // Front hair OR Troll hair
  if (customer.trollEffect === 'BALD_STRIPE') {
    drawTrollBaldStripe(ctx, cx, headY, swatch.hex, customer.skinTone);
  } else if (customer.trollEffect === 'BURNT_AFRO') {
    drawTrollBurntAfro(ctx, cx, headY, timeSec);
  } else if (customer.trollEffect === 'BOWL_CUT') {
    drawTrollBowlCut(ctx, cx, headY, swatch.hex);
  } else {
    drawFrontHair(ctx, cx, headY, customer.hairStyle, swatch.hex, swatch.highlight, customer.hasPastelShimmer, timeSec);
  }

  // Accessories
  drawHairAccessory(ctx, cx, headY, customer.accessory, timeSec);

  // Customer Name Tag on cape (One single source of truth clearly labeled)
  ctx.save();
  ctx.font = '800 12px "Fredoka", sans-serif';
  const rawW = ctx.measureText(customer.user.nickname).width;
  const namePillW = Math.max(76, Math.min(128, rawW + 24));
  drawRoundedRect(ctx, cx - namePillW / 2, cy + 86, namePillW, 24, 12);
  ctx.fillStyle = customer.isRoyal ? '#FFF4CC' : '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = SALON_PALETTE.TEXT_DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tagNick =
    customer.user.nickname.length > 13
      ? `${customer.user.nickname.slice(0, 12)}…`
      : customer.user.nickname;
  ctx.fillText(tagNick, cx, cy + 98);
  ctx.restore();

  ctx.restore();
}

function drawBackHair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  style: ActiveCustomerSession['hairStyle'],
  fill: string,
  shadow: string
): void {
  ctx.save();
  ctx.fillStyle = shadow;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;

  if (style === 'long') {
    drawRoundedRect(ctx, cx - 72, headY - 12, 144, 142, 46);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  } else if (style === 'curly') {
    const puffs = [
      [-64, 12, 28],
      [64, 12, 28],
      [-68, 48, 26],
      [68, 48, 26],
      [-48, 74, 24],
      [48, 74, 24],
    ];
    ctx.fillStyle = fill;
    for (const [dx, dy, r] of puffs) {
      ctx.beginPath();
      ctx.arc(cx + dx, headY + dy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (style === 'bob') {
    ctx.beginPath();
    ctx.arc(cx, headY + 14, 72, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrontHair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  style: ActiveCustomerSession['hairStyle'],
  fill: string,
  highlight: string,
  hasShimmer: boolean,
  timeSec: number
): void {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;

  switch (style) {
    case 'cool': {
      // Spiky cool anime/idol quiff
      ctx.beginPath();
      ctx.moveTo(cx - 58, headY - 8);
      ctx.lineTo(cx - 66, headY - 52);
      ctx.lineTo(cx - 32, headY - 46);
      ctx.lineTo(cx - 18, headY - 86);
      ctx.lineTo(cx + 6, headY - 54);
      ctx.lineTo(cx + 34, headY - 82);
      ctx.lineTo(cx + 42, headY - 44);
      ctx.lineTo(cx + 66, headY - 42);
      ctx.lineTo(cx + 58, headY - 6);
      ctx.quadraticCurveTo(cx, headY - 30, cx - 58, headY - 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'curly': {
      const topPuffs = [
        [-42, -44, 26],
        [-14, -56, 28],
        [18, -56, 28],
        [44, -42, 26],
      ];
      for (const [dx, dy, r] of topPuffs) {
        ctx.beginPath();
        ctx.arc(cx + dx, headY + dy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'bob':
    case 'long': {
      ctx.beginPath();
      ctx.arc(cx, headY - 12, 62, Math.PI * 0.96, Math.PI * 2.04);
      ctx.quadraticCurveTo(cx + 28, headY - 14, cx + 6, headY - 22);
      ctx.quadraticCurveTo(cx - 24, headY - 10, cx - 60, headY - 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'short':
    default: {
      ctx.beginPath();
      ctx.arc(cx, headY - 14, 60, Math.PI, Math.PI * 2);
      ctx.lineTo(cx + 56, headY - 14);
      ctx.lineTo(cx + 32, headY - 28);
      ctx.lineTo(cx + 12, headY - 14);
      ctx.lineTo(cx - 10, headY - 30);
      ctx.lineTo(cx - 32, headY - 14);
      ctx.lineTo(cx - 58, headY - 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  // Glossy hair highlight arc
  ctx.beginPath();
  ctx.arc(cx - 14, headY - 38, 22, Math.PI * 1.15, Math.PI * 1.75);
  ctx.strokeStyle = highlight;
  ctx.lineWidth = 6;
  ctx.stroke();

  if (hasShimmer) {
    const twinkle = 0.6 + Math.sin(timeSec * 7) * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
    const dots: Array<[number, number, number]> = [
      [-28, -42, 4],
      [16, -48, 5],
      [34, -30, 3.5],
    ];
    for (const [dx, dy, r] of dots) {
      ctx.beginPath();
      ctx.arc(cx + dx, headY + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTrollBaldStripe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  hairColor: string,
  skinTone: string
): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.fillStyle = hairColor;

  // Left hair tuft
  ctx.beginPath();
  ctx.arc(cx - 46, headY - 24, 24, Math.PI * 0.6, Math.PI * 1.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right hair tuft
  ctx.beginPath();
  ctx.arc(cx + 46, headY - 24, 24, Math.PI * 1.1, Math.PI * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shaved shiny bald stripe down the center!
  drawRoundedRect(ctx, cx - 22, headY - 62, 44, 44, 16);
  ctx.fillStyle = skinTone;
  ctx.fill();
  ctx.stroke();

  // Cartoon gleam on bald scalp
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx - 6, headY - 44, 10, Math.PI * 1.1, Math.PI * 1.65);
  ctx.stroke();
  ctx.restore();
}

function drawTrollBurntAfro(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  timeSec: number
): void {
  ctx.save();
  ctx.fillStyle = '#332C30';
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  const wobble = Math.sin(timeSec * 12) * 2;
  const puffs = [
    [-54, -24, 30],
    [-34, -56, 34],
    [0, -68 + wobble, 38],
    [36, -54, 34],
    [54, -22, 30],
  ];
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath();
    ctx.arc(cx + dx, headY + dy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Tiny comic smoke curl on top
  ctx.strokeStyle = '#9D9398';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx, headY - 104);
  ctx.quadraticCurveTo(cx + 16, headY - 122, cx - 6, headY - 138);
  ctx.stroke();
  ctx.restore();
}

function drawTrollBowlCut(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  hairColor: string
): void {
  ctx.save();
  ctx.fillStyle = hairColor;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;

  // Hilariously crooked straight-edge mushroom bowl cut
  ctx.beginPath();
  ctx.arc(cx, headY - 14, 66, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + 66, headY - 4);
  ctx.lineTo(cx - 66, headY - 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCustomerFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  expression: ActiveCustomerSession['expression'],
  timeSec: number
): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.fillStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';

  if (expression === 'CRYING_TROLL') {
    // Streaming tears
    const tearOffset = (timeSec * 36) % 14;
    ctx.fillStyle = '#8CD5F7';
    drawRoundedRect(ctx, cx - 28, headY + 6, 12, 32 + tearOffset * 0.4, 6);
    ctx.fill();
    drawRoundedRect(ctx, cx + 16, headY + 6, 12, 32 + tearOffset * 0.4, 6);
    ctx.fill();

    // Squinting > < eyes
    ctx.beginPath();
    ctx.moveTo(cx - 30, headY - 4);
    ctx.lineTo(cx - 16, headY + 2);
    ctx.lineTo(cx - 30, headY + 8);
    ctx.moveTo(cx + 30, headY - 4);
    ctx.lineTo(cx + 16, headY + 2);
    ctx.lineTo(cx + 30, headY + 8);
    ctx.stroke();

    // Wavy wailing mouth
    ctx.fillStyle = '#FF8FA8';
    ctx.beginPath();
    ctx.ellipse(cx, headY + 27, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Happy / Excited / Royal eyes
  if (expression === 'EXCITED' || expression === 'ROYAL_PROUD') {
    ctx.beginPath();
    ctx.arc(cx - 22, headY + 2, 7.5, 0, Math.PI * 2);
    ctx.arc(cx + 22, headY + 2, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Big shiny eye sparkles
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 24, headY - 1, 3, 0, Math.PI * 2);
    ctx.arc(cx + 20, headY - 1, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx - 22, headY + 2, 5.5, 0, Math.PI * 2);
    ctx.arc(cx + 22, headY + 2, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm smile
  ctx.beginPath();
  ctx.arc(cx, headY + 18, 12, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawHairAccessory(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  accessory: ActiveCustomerSession['accessory'],
  timeSec: number
): void {
  if (accessory === 'NONE') return;

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.2;

  switch (accessory) {
    case 'BOW': {
      const bx = cx - 40;
      const by = headY - 56;
      ctx.fillStyle = '#FF7FA5';
      ctx.beginPath();
      ctx.ellipse(bx - 13, by, 14, 10, -0.3, 0, Math.PI * 2);
      ctx.ellipse(bx + 13, by, 14, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD56B';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'SUNGLASSES': {
      ctx.fillStyle = '#3A2825';
      drawRoundedRect(ctx, cx - 42, headY - 8, 34, 20, 8);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, cx + 8, headY - 8, 34, 20, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 8, headY);
      ctx.lineTo(cx + 8, headY);
      ctx.stroke();
      break;
    }
    case 'SPARKLE_CLIP': {
      const sx = cx + 38;
      const sy = headY - 46;
      ctx.fillStyle = '#FFD56B';
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'ROYAL_CROWN': {
      const floatY = Math.sin(timeSec * 4) * 3;
      const cy = headY - 78 + floatY;
      ctx.fillStyle = '#FFD56B';
      ctx.beginPath();
      ctx.moveTo(cx - 32, cy + 16);
      ctx.lineTo(cx - 38, cy - 16);
      ctx.lineTo(cx - 14, cy - 2);
      ctx.lineTo(cx, cy - 26);
      ctx.lineTo(cx + 14, cy - 2);
      ctx.lineTo(cx + 38, cy - 16);
      ctx.lineTo(cx + 32, cy + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crown jewels
      ctx.fillStyle = '#FF6F91';
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 5.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawStylistCharacter(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  customer: ActiveCustomerSession | null,
  mood: StylistMood,
  speech: string,
  isFast: boolean,
  timeSec: number
): void {
  const freq = isFast ? 11 : 5.5;
  const snipPhase = Math.sin(timeSec * freq);

  // Stylist stands upright: head center at sy - 130 = 430
  // (Customer head center is at ~518, so standing stylist head is ~85px taller, perfect 1.2x ratio!)
  const headY = sy - 130 + Math.sin(timeSec * 3) * 2;
  const cx = 450;
  const custHeadY = 518;

  // Arm reach target right at customer's hair / top of head
  const armReachX = customer ? cx + 32 + snipPhase * 12 : sx - 85;
  const armReachY = customer ? custHeadY - 42 + Math.cos(timeSec * freq * 0.8) * 10 : sy - 60;

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Stylist legs & shoes resting firmly on salon floor
  ctx.fillStyle = '#4A3E3D';
  drawRoundedRect(ctx, sx - 24, sy + 75, 20, 65, 8);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, sx + 4, sy + 75, 20, 65, 8);
  ctx.fill();
  ctx.stroke();

  // Shoes
  ctx.fillStyle = '#FFE5B4';
  drawRoundedRect(ctx, sx - 28, sy + 134, 24, 16, 7);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, sx + 4, sy + 134, 24, 16, 7);
  ctx.fill();
  ctx.stroke();

  // 2. Stylist body torso + mint apron (proportional to head radius 50)
  drawRoundedRect(ctx, sx - 44, sy - 75, 88, 155, 26);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx - 36, sy - 45, 72, 125, 18);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();

  // Small apron pocket
  drawRoundedRect(ctx, sx - 20, sy + 25, 40, 32, 8);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // 3. Stylist head: standard radius 50 (same scale system as customer!)
  ctx.beginPath();
  ctx.arc(sx, headY, 50, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.stroke();

  // Top bun hair & cute side bangs
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

  // Stylist face expression
  ctx.fillStyle = SALON_PALETTE.OUTLINE;
  if (mood === 'OOPS') {
    // Shocked O-eyes + sweat drop
    ctx.beginPath();
    ctx.arc(sx - 18, headY + 3, 5.5, 0, Math.PI * 2);
    ctx.arc(sx + 10, headY + 3, 5.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx - 4, headY + 20, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FF8FA8';
    ctx.fill();
    ctx.stroke();

    // Giant anime sweat drop
    ctx.fillStyle = '#8CD5F7';
    ctx.beginPath();
    ctx.moveTo(sx + 36, headY - 22);
    ctx.quadraticCurveTo(sx + 50, headY - 4, sx + 36, headY + 6);
    ctx.quadraticCurveTo(sx + 22, headY - 4, sx + 36, headY - 22);
    ctx.fill();
    ctx.stroke();
  } else {
    // Confident happy stylist
    ctx.beginPath();
    ctx.arc(sx - 16, headY + 3, 5, 0, Math.PI * 2);
    ctx.arc(sx + 10, headY + 3, 5, 0, Math.PI * 2);
    ctx.fill();
    // Rosy cheeks
    ctx.fillStyle = 'rgba(255, 140, 160, 0.45)';
    ctx.beginPath();
    ctx.ellipse(sx - 24, headY + 14, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + 18, headY + 14, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.beginPath();
    ctx.arc(sx - 3, headY + 15, 10, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  // 4. Natural articulated arm with shoulder & elbow joints!
  const shX = sx - 36;
  const shY = sy - 55;
  const elX = sx - 76;
  const elY = sy - 40 + Math.sin(timeSec * freq) * 4;

  // Upper arm (shoulder to elbow)
  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.lineTo(elX, elY);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = '#FFE4CE';
  ctx.lineWidth = 11;
  ctx.stroke();

  // Forearm (elbow to hand holding tool)
  ctx.beginPath();
  ctx.moveTo(elX, elY);
  ctx.lineTo(armReachX, armReachY);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = '#FFE4CE';
  ctx.lineWidth = 10;
  ctx.stroke();

  // Hand / Wrist
  ctx.beginPath();
  ctx.arc(armReachX, armReachY, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // 5. Tool in hand: Clipper when Troll, Scissors normally
  if (mood === 'OOPS') {
    drawClipperTool(ctx, armReachX, armReachY, snipPhase);
  } else {
    drawScissorsTool(ctx, armReachX, armReachY, Math.abs(snipPhase));
  }

  // 6. Stylist speech bubble placed in spacious top-right zone
  // (Completely clear of tool, hands, and changing hairstyles)
  if (speech) {
    drawStylistBubble(ctx, 580, 245, speech, mood);
  }
  ctx.restore();
}

function drawScissorsTool(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  openAmount: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;

  const spread = 0.15 + openAmount * 0.45;
  // Upper blade
  ctx.save();
  ctx.rotate(-spread);
  ctx.fillStyle = '#EAEFF2';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-34, -6);
  ctx.lineTo(-28, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Lower blade
  ctx.save();
  ctx.rotate(spread);
  ctx.fillStyle = '#D5DFE5';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-34, 6);
  ctx.lineTo(-28, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Pink finger rings
  ctx.fillStyle = '#FF8FA8';
  ctx.beginPath();
  ctx.arc(10, -8, 7, 0, Math.PI * 2);
  ctx.arc(10, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawClipperTool(ctx: CanvasRenderingContext2D, x: number, y: number, buzz: number): void {
  ctx.save();
  ctx.translate(x + buzz * 2.5, y);
  ctx.rotate(-0.4);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;

  drawRoundedRect(ctx, -18, -12, 34, 24, 8);
  ctx.fillStyle = '#FF7F6B';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C9D2D9';
  ctx.fillRect(-26, -10, 10, 20);
  ctx.strokeRect(-26, -10, 10, 20);
  ctx.restore();
}

export function drawStylistBubble(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  text: string,
  mood: StylistMood
): void {
  ctx.save();
  ctx.font = '700 15px "Nunito", sans-serif';
  const maxWidth = 245;
  const trimmed = text.length > 34 ? `${text.slice(0, 33)}…` : text;
  const textWidth = Math.min(maxWidth, ctx.measureText(trimmed).width + 28);
  const bx = Math.max(460, Math.min(708 - textWidth, centerX - textWidth / 2));
  const by = topY;
  const bh = 40;

  drawRoundedRect(ctx, bx, by, textWidth, bh, 20);
  ctx.fillStyle = mood === 'OOPS' ? '#FFE1DE' : mood === 'ROYAL' ? '#FFF4CC' : '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Little speech tail pointing down toward stylist head
  ctx.beginPath();
  ctx.moveTo(bx + textWidth / 2 - 6, by + bh);
  ctx.lineTo(bx + textWidth / 2 + 14, by + bh);
  ctx.lineTo(bx + textWidth / 2 + 4, by + bh + 9);
  ctx.closePath();
  ctx.fillStyle = mood === 'OOPS' ? '#FFE1DE' : mood === 'ROYAL' ? '#FFF4CC' : '#FFFFFF';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SALON_PALETTE.TEXT_DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(trimmed, bx + textWidth / 2, by + bh / 2 + 1, textWidth - 16);
  ctx.restore();
}
