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
  const cx = 458;
  const cy = 590;

  drawBarberChairBack(ctx, cx, cy);

  if (customer) {
    if (customer.isRoyal) {
      drawRoyalHalo(ctx, cx, cy - 95, timeSec);
    }
    drawCustomerHairBody(ctx, cx, cy, customer, timeSec);
  } else {
    drawEmptyChairHint(ctx, cx, cy - 25);
  }

  drawStylistCharacter(ctx, 622, 575, customer, stylistMood, stylistSpeech, isFast, timeSec);
}

function drawBarberChairBack(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';

  // Metal swivel pedestal
  ctx.fillStyle = '#D9D3D0';
  ctx.fillRect(cx - 16, cy + 128, 32, 72);
  ctx.strokeRect(cx - 16, cy + 128, 32, 72);

  // Round metallic base
  ctx.beginPath();
  ctx.ellipse(cx, cy + 206, 74, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#E6E1DE';
  ctx.fill();
  ctx.stroke();

  // Chair backrest cushion
  drawRoundedRect(ctx, cx - 86, cy - 68, 172, 185, 36);
  ctx.fillStyle = SALON_PALETTE.CHAIR_LEATHER;
  ctx.fill();
  ctx.stroke();

  // Cushion inner stitch highlight
  drawRoundedRect(ctx, cx - 70, cy - 52, 140, 148, 26);
  ctx.fillStyle = '#FFC2D3';
  ctx.fill();

  // Armrests
  drawRoundedRect(ctx, cx - 106, cy + 52, 30, 82, 14);
  ctx.fillStyle = SALON_PALETTE.CHAIR_SHADOW;
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, cx + 76, cy + 52, 30, 82, 14);
  ctx.fill();
  ctx.stroke();

  // Seat bottom
  drawRoundedRect(ctx, cx - 92, cy + 104, 184, 38, 18);
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
  const bob = Math.sin(timeSec * 3.2) * 3;
  const headY = cy - 72 + bob;
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
  ctx.moveTo(cx - 32, headY + 62);
  ctx.quadraticCurveTo(cx - 88, headY + 110, cx - 76, cy + 124);
  ctx.lineTo(cx + 76, cy + 124);
  ctx.quadraticCurveTo(cx + 88, headY + 110, cx + 32, headY + 62);
  ctx.closePath();
  ctx.fillStyle = customer.isRoyal ? '#FFE599' : customer.shirtColor;
  ctx.fill();
  ctx.stroke();

  // Cape collar bow
  drawRoundedRect(ctx, cx - 28, headY + 56, 56, 18, 9);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // Neck
  drawRoundedRect(ctx, cx - 15, headY + 42, 30, 26, 10);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Ears
  ctx.beginPath();
  ctx.arc(cx - 58, headY + 6, 13, 0, Math.PI * 2);
  ctx.arc(cx + 58, headY + 6, 13, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Head circle
  ctx.beginPath();
  ctx.arc(cx, headY, 58, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Rosy cheeks
  ctx.fillStyle = 'rgba(255, 135, 165, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - 34, headY + 14, 11, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 34, headY + 14, 11, 7, 0, 0, Math.PI * 2);
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
  const armReachX = customer ? sx - 118 + snipPhase * 16 : sx - 55;
  const armReachY = customer ? sy - 92 + Math.cos(timeSec * freq * 0.8) * 14 : sy - 20;

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Stylist body + pastel mint salon apron
  drawRoundedRect(ctx, sx - 42, sy - 10, 84, 138, 28);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx - 32, sy + 20, 64, 102, 18);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();

  // Stylist head
  const headY = sy - 58 + Math.sin(timeSec * 4) * 2.5;
  ctx.beginPath();
  ctx.arc(sx, headY, 44, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.stroke();

  // Cute top bun hair for stylist
  ctx.fillStyle = '#6B443A';
  ctx.beginPath();
  ctx.arc(sx + 6, headY - 46, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sx, headY - 8, 45, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stylist expression
  ctx.fillStyle = SALON_PALETTE.OUTLINE;
  if (mood === 'OOPS') {
    // Shocked O eyes + sweat drop
    ctx.beginPath();
    ctx.arc(sx - 16, headY + 2, 5, 0, Math.PI * 2);
    ctx.arc(sx + 8, headY + 2, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx - 4, headY + 18, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#FF8FA8';
    ctx.fill();
    ctx.stroke();

    // Giant anime sweat drop
    ctx.fillStyle = '#8CD5F7';
    ctx.beginPath();
    ctx.moveTo(sx + 32, headY - 20);
    ctx.quadraticCurveTo(sx + 44, headY - 4, sx + 32, headY + 4);
    ctx.quadraticCurveTo(sx + 20, headY - 4, sx + 32, headY - 20);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(sx - 15, headY + 2, 4.5, 0, Math.PI * 2);
    ctx.arc(sx + 9, headY + 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx - 3, headY + 13, 9, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  // Articulated working arm reaching toward customer hair
  ctx.beginPath();
  ctx.moveTo(sx - 28, sy + 16);
  ctx.quadraticCurveTo(sx - 78, sy - 10, armReachX, armReachY);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = '#FFE4CE';
  ctx.lineWidth = 11;
  ctx.stroke();

  // Tool in hand: Clipper when Troll, Scissors normally
  if (mood === 'OOPS') {
    drawClipperTool(ctx, armReachX, armReachY, snipPhase);
  } else {
    drawScissorsTool(ctx, armReachX, armReachY, Math.abs(snipPhase));
  }

  // Stylist speech bubble above head (kept inside canvas bounds)
  if (speech) {
    drawStylistBubble(ctx, Math.min(545, sx - 55), headY - 94, speech, mood);
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
  const maxWidth = 235;
  const trimmed = text.length > 34 ? `${text.slice(0, 33)}…` : text;
  const textWidth = Math.min(maxWidth, ctx.measureText(trimmed).width + 26);
  const bx = Math.max(255, Math.min(706 - textWidth, centerX - textWidth / 2));
  const by = Math.max(244, topY);
  const bh = 38;

  drawRoundedRect(ctx, bx, by, textWidth, bh, 18);
  ctx.fillStyle = mood === 'OOPS' ? '#FFE1DE' : mood === 'ROYAL' ? '#FFF4CC' : '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = SALON_PALETTE.TEXT_DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(trimmed, bx + textWidth / 2, by + bh / 2 + 1, textWidth - 16);
  ctx.restore();
}
