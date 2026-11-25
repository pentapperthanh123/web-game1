import { DRINK_BAR_PALETTE, STAGE_METRICS } from '@shared/config';

const { WIDTH, HEIGHT, COUNTER_TOP_Y, COUNTER_END_Y } = STAGE_METRICS;
const COUNTER_SURFACE_HEIGHT = 48;
const OUTLINE_THICK = 3.2;
const OUTLINE_MEDIUM = 2.6;

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.min(radius, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawBarBackdrop(
  ctx: CanvasRenderingContext2D,
  elapsedSec: number
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Soft pinkish-cream wall gradient (#FFF5F7 -> #FCE7EE -> #F7D5E0)
  const wallGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  wallGrad.addColorStop(0, DRINK_BAR_PALETTE.WALL_TOP);
  wallGrad.addColorStop(0.74, DRINK_BAR_PALETTE.WALL_BOTTOM);
  wallGrad.addColorStop(1, '#F7D5E0');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Soft pastel cafe arch window behind bar (centered at x=476 behind both stations)
  ctx.save();
  ctx.fillStyle = '#FDEBF1';
  ctx.strokeStyle = '#E8C0CE';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(476, 425, 192, Math.PI, 0, false);
  ctx.lineTo(668, COUNTER_TOP_Y);
  ctx.lineTo(284, COUNTER_TOP_Y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Soft window mullion lines inside arch
  ctx.strokeStyle = 'rgba(212, 146, 157, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(476, 236);
  ctx.lineTo(476, COUNTER_TOP_Y);
  ctx.moveTo(288, 425);
  ctx.lineTo(664, 425);
  ctx.stroke();

  // Subtle back wooden shelf silhouette centered behind both cups
  roundedRectPath(ctx, 400, 356, 152, 13, 6.5);
  ctx.fillStyle = '#E8B8C2';
  ctx.fill();
  ctx.strokeStyle = '#D4929D';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Soft decorative syrup bottles on back shelf (muted depth silhouettes)
  drawSoftBackBottle(ctx, 416, 314, 20, 42, '#E8F5D8');
  drawSoftBackBottle(ctx, 446, 320, 19, 36, '#FDE5D2');
  drawSoftBackBottle(ctx, 475, 310, 21, 46, '#F8CAD5');
  drawSoftBackBottle(ctx, 506, 322, 22, 34, '#D6EDF5');

  // Two balanced warm pastel pendant lamps hanging cleanly from top edge of wall area
  const glowPulse = 0.92 + Math.sin(elapsedSec * 1.8) * 0.08;
  drawPendantLamp(ctx, 336, 224, 38, glowPulse);
  drawPendantLamp(ctx, 616, 224, 38, glowPulse);

  // Subtle wainscot wall molding behind left panel
  ctx.fillStyle = 'rgba(217, 155, 156, 0.16)';
  ctx.fillRect(0, 560, WIDTH, COUNTER_TOP_Y - 560);
  ctx.restore();
}

function drawSoftBackBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string
): void {
  roundedRectPath(ctx, x, y + 10, w, h - 10, 6);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#C99EAA';
  ctx.lineWidth = 2;
  ctx.stroke();

  roundedRectPath(ctx, x + w * 0.3, y, w * 0.4, 11, 3);
  ctx.fillStyle = '#FCE3EB';
  ctx.fill();
  ctx.stroke();
}

function drawPendantLamp(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  cordLen: number,
  glowPulse: number
): void {
  const lampX = anchorX;
  const domeTopY = anchorY + cordLen;
  const domeRadiusX = 23;
  const domeHeight = 20;
  const rimY = domeTopY + domeHeight;
  const bulbCenterY = rimY + 6;

  // 1. Soft eye-friendly warm cream radial glow around bulb & lampshade
  const haloRadius = 78 * glowPulse;
  const glow = ctx.createRadialGradient(lampX, bulbCenterY, 5, lampX, bulbCenterY, haloRadius);
  glow.addColorStop(0, 'rgba(255, 245, 206, 0.36)');
  glow.addColorStop(0.45, 'rgba(255, 232, 188, 0.14)');
  glow.addColorStop(1, 'rgba(255, 232, 188, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(lampX, bulbCenterY, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  // Gentle downward warm cream light wash without obscuring background bottles
  const coneGrad = ctx.createLinearGradient(lampX, rimY + 2, lampX, rimY + 205);
  coneGrad.addColorStop(0, 'rgba(255, 245, 212, 0.13)');
  coneGrad.addColorStop(1, 'rgba(255, 245, 212, 0)');
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(lampX - 18, rimY + 2);
  ctx.lineTo(lampX + 18, rimY + 2);
  ctx.lineTo(lampX + 80, rimY + 205);
  ctx.lineTo(lampX - 80, rimY + 205);
  ctx.closePath();
  ctx.fill();

  // 2. Crisp straight vertical hanging cord connected seamlessly to top apex of cap
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(lampX, anchorY);
  ctx.lineTo(lampX, domeTopY - 4);
  ctx.stroke();

  // 3. Round/plump warm glowing bulb clearly protruding below lampshade rim
  const bulbGrad = ctx.createRadialGradient(
    lampX - 2,
    bulbCenterY - 1,
    1.5,
    lampX,
    bulbCenterY,
    8.5
  );
  bulbGrad.addColorStop(0, '#FFFDF5');
  bulbGrad.addColorStop(0.65, '#FFF2B2');
  bulbGrad.addColorStop(1, '#FCD97D');
  ctx.beginPath();
  ctx.ellipse(lampX, bulbCenterY, 7.6, 8.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = bulbGrad;
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Subtle specular sparkle on bulb
  ctx.beginPath();
  ctx.arc(lampX - 2.4, bulbCenterY + 1.5, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fill();

  // 4. Pastel strawberry-pink lampshade dome with #3B2820 2.5px outline
  ctx.beginPath();
  ctx.ellipse(lampX, rimY - 2, domeRadiusX, domeHeight, 0, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#F4A6BE';
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Gentle glossy curved highlight on upper-left of shade
  ctx.beginPath();
  ctx.ellipse(lampX, rimY - 2, domeRadiusX - 5.5, domeHeight - 5, 0, Math.PI * 1.12, Math.PI * 1.48, false);
  ctx.strokeStyle = 'rgba(255, 251, 253, 0.72)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Soft cream decorative rim trim band
  roundedRectPath(ctx, lampX - domeRadiusX - 0.5, rimY - 4.5, domeRadiusX * 2 + 1, 5.5, 2.75);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Top cord socket cap anchored seamlessly to cord & dome apex
  roundedRectPath(ctx, lampX - 5.5, domeTopY - 5, 11, 6, 2.5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.3;
  ctx.stroke();
}

export function drawBarCounter(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const bodyY = COUNTER_TOP_Y + COUNTER_SURFACE_HEIGHT;
  const bodyHeight = COUNTER_END_Y - bodyY;

  // 1. Main counter body (#C48285) running seamlessly across full stage
  ctx.fillStyle = DRINK_BAR_PALETTE.COUNTER_BODY;
  ctx.fillRect(0, bodyY, WIDTH, bodyHeight);

  // Soft warm LED downlight wash cascading down counter face
  const downlight = ctx.createLinearGradient(0, bodyY, 0, bodyY + 76);
  downlight.addColorStop(0, 'rgba(255, 240, 245, 0.45)');
  downlight.addColorStop(1, 'rgba(255, 240, 245, 0)');
  ctx.fillStyle = downlight;
  ctx.fillRect(0, bodyY, WIDTH, 76);

  // Sophisticated vertical fluted/slat wood paneling along counter front
  const slatSpacing = 16;
  const slatStartX = 24;
  const slatEndX = WIDTH - 24;
  ctx.lineWidth = 1.4;

  for (let sx = slatStartX; sx <= slatEndX; sx += slatSpacing) {
    // Slat groove shadow
    ctx.strokeStyle = 'rgba(59, 40, 32, 0.22)';
    ctx.beginPath();
    ctx.moveTo(sx, bodyY + 8);
    ctx.lineTo(sx, COUNTER_END_Y - 24);
    ctx.stroke();

    // Slat highlight rib
    ctx.strokeStyle = 'rgba(255, 242, 246, 0.38)';
    ctx.beginPath();
    ctx.moveTo(sx + 2.5, bodyY + 9);
    ctx.lineTo(sx + 2.5, COUNTER_END_Y - 25);
    ctx.stroke();
  }

  // Mid-level horizontal decorative trim rail (dải viền trang trí quầy liền mạch)
  const trimY = bodyY + 42;
  roundedRectPath(ctx, 18, trimY, WIDTH - 36, 10, 4.5);
  ctx.fillStyle = DRINK_BAR_PALETTE.COUNTER_PANEL;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Top highlight on trim rail
  ctx.beginPath();
  ctx.moveTo(24, trimY + 2.5);
  ctx.lineTo(WIDTH - 24, trimY + 2.5);
  ctx.strokeStyle = 'rgba(255, 244, 248, 0.65)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Bottom kickplate baseboard along counter foot (y: 810 -> 828)
  const kickY = COUNTER_END_Y - 18;
  ctx.fillStyle = '#8C5156';
  ctx.fillRect(0, kickY, WIDTH, 18);
  ctx.beginPath();
  ctx.moveTo(0, kickY);
  ctx.lineTo(WIDTH, kickY);
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, kickY + 2);
  ctx.lineTo(WIDTH, kickY + 2);
  ctx.strokeStyle = 'rgba(236, 196, 203, 0.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Under-counter drop shadow cast by counter lip
  ctx.fillStyle = 'rgba(59, 40, 32, 0.16)';
  ctx.fillRect(0, bodyY, WIDTH, 12);

  // 2. Wooden counter top surface (#D99B9C) with top highlight (#ECC4CB)
  ctx.fillStyle = DRINK_BAR_PALETTE.COUNTER_TOP;
  ctx.fillRect(0, COUNTER_TOP_Y, WIDTH, COUNTER_SURFACE_HEIGHT);

  // Top bevel highlight strip (#ECC4CB)
  ctx.fillStyle = DRINK_BAR_PALETTE.COUNTER_HIGHLIGHT;
  ctx.fillRect(0, COUNTER_TOP_Y + 2, WIDTH, 11);

  // Subtle counter wood-grain lines for depth
  ctx.strokeStyle = 'rgba(181, 115, 120, 0.25)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(28, COUNTER_TOP_Y + 28);
  ctx.lineTo(230, COUNTER_TOP_Y + 28);
  ctx.moveTo(320, COUNTER_TOP_Y + 42);
  ctx.lineTo(630, COUNTER_TOP_Y + 42);
  ctx.moveTo(590, COUNTER_TOP_Y + 24);
  ctx.lineTo(690, COUNTER_TOP_Y + 24);
  ctx.stroke();

  // Centered subtle barista mat behind both coasters (keeps center cozy even when idle)
  roundedRectPath(ctx, 344, COUNTER_TOP_Y + 6, 264, 18, 7);
  ctx.fillStyle = 'rgba(217, 155, 156, 0.38)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 40, 32, 0.22)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Compact center espresso/water brass tap accent cleanly seated behind coasters
  roundedRectPath(ctx, 469, COUNTER_TOP_Y - 14, 14, 18, 4);
  ctx.fillStyle = '#E6B97A';
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  roundedRectPath(ctx, 462, COUNTER_TOP_Y + 2, 28, 7, 3);
  ctx.fillStyle = '#C48285';
  ctx.fill();
  ctx.stroke();

  // Crisp #3B2820 outlines on counter top & bottom edge
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_THICK;
  ctx.beginPath();
  ctx.moveTo(0, COUNTER_TOP_Y);
  ctx.lineTo(WIDTH, COUNTER_TOP_Y);
  ctx.moveTo(0, bodyY);
  ctx.lineTo(WIDTH, bodyY);
  ctx.moveTo(0, COUNTER_END_Y);
  ctx.lineTo(WIDTH, COUNTER_END_Y);
  ctx.stroke();

  // 3. Neat ingredient trays & jars on the bar counter (non-cluttering edges)
  drawCounterIngredientJars(ctx);

  // 4. Clean floor shadow below y: 900 (safe zone stays quiet & clear)
  const floorShadow = ctx.createLinearGradient(0, COUNTER_END_Y, 0, COUNTER_END_Y + 34);
  floorShadow.addColorStop(0, 'rgba(59, 40, 32, 0.14)');
  floorShadow.addColorStop(1, 'rgba(59, 40, 32, 0)');
  ctx.fillStyle = floorShadow;
  ctx.fillRect(0, COUNTER_END_Y + 1, WIDTH, 34);

  ctx.restore();
}

function drawCounterIngredientJars(ctx: CanvasRenderingContext2D): void {
  // Left edge: Barista ingredient station (syrup pump bottles + matcha tin + topping organizer)
  roundedRectPath(ctx, 252, COUNTER_TOP_Y + 22, 86, 17, 7);
  ctx.fillStyle = '#C48285';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // 1. Tall syrup pump bottle (sweet syrup dispenser with pump head)
  roundedRectPath(ctx, 255, COUNTER_TOP_Y - 14, 16, 38, 4.5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.stroke();
  // Syrup fill inside
  roundedRectPath(ctx, 257, COUNTER_TOP_Y + 2, 12, 20, 2.5);
  ctx.fillStyle = '#D47896';
  ctx.fill();
  // Pump head nozzle
  ctx.fillStyle = '#E8E1D9';
  ctx.fillRect(261.5, COUNTER_TOP_Y - 21, 3, 7);
  roundedRectPath(ctx, 258, COUNTER_TOP_Y - 24, 10, 4, 1.5);
  ctx.fill();
  ctx.stroke();

  // 2. Matcha / Powder ceramic canister with golden seal
  roundedRectPath(ctx, 275, COUNTER_TOP_Y - 8, 17, 32, 5);
  ctx.fillStyle = '#A7D397';
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, 277, COUNTER_TOP_Y + 6, 13, 12, 2.5);
  ctx.fillStyle = '#4D8042';
  ctx.fill();

  // 3. Clear 2-section topping tray: Glass compartment for Black Boba & Fruit Jelly
  roundedRectPath(ctx, 296, COUNTER_TOP_Y + 8, 38, 15, 4.5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.stroke();

  // Compartment 1: Glossy Boba Pearls
  roundedRectPath(ctx, 298, COUNTER_TOP_Y + 10, 16, 11, 3);
  ctx.fillStyle = '#3B2820';
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.arc(303, COUNTER_TOP_Y + 14, 1.5, 0, Math.PI * 2);
  ctx.arc(309, COUNTER_TOP_Y + 15, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Compartment 2: Mango/Peach Fruit Jelly Cubes
  roundedRectPath(ctx, 316, COUNTER_TOP_Y + 10, 16, 11, 3);
  ctx.fillStyle = '#F7C95B';
  ctx.fill();
  ctx.fillStyle = '#E89824';
  ctx.fillRect(318, COUNTER_TOP_Y + 12, 5, 5);
  ctx.fillRect(325, COUNTER_TOP_Y + 13, 5, 5);

  // Right edge: Inox cocktail shaker in resting stand + cup lid stack + fresh mint pot (x: 642..696)
  roundedRectPath(ctx, 642, COUNTER_TOP_Y + 22, 54, 17, 7);
  ctx.fillStyle = '#C48285';
  ctx.fill();
  ctx.stroke();

  // Stainless shaker resting on counter holder
  roundedRectPath(ctx, 646, COUNTER_TOP_Y - 14, 17, 38, 4);
  ctx.fillStyle = '#E4E7EB';
  ctx.fill();
  ctx.stroke();
  // Shaker metal highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillRect(648, COUNTER_TOP_Y - 12, 3, 34);
  // Shaker cap
  roundedRectPath(ctx, 649, COUNTER_TOP_Y - 20, 11, 6, 2);
  ctx.fillStyle = '#C8D0D8';
  ctx.fill();
  ctx.stroke();

  // Neat dome lid dispenser caddy (zero straws)
  roundedRectPath(ctx, 667, COUNTER_TOP_Y + 2, 12, 22, 3.5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(212, 120, 150, 0.5)';
  ctx.lineWidth = 1.4;
  for (let ly = COUNTER_TOP_Y + 6; ly <= COUNTER_TOP_Y + 18; ly += 4) {
    ctx.beginPath();
    ctx.moveTo(669, ly);
    ctx.lineTo(677, ly);
    ctx.stroke();
  }
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Small terracotta pot with fresh mint sprigs
  roundedRectPath(ctx, 682, COUNTER_TOP_Y + 4, 14, 20, 4);
  ctx.fillStyle = '#E5956B';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#7FB66E';
  ctx.beginPath();
  ctx.ellipse(686, COUNTER_TOP_Y, 5, 3.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(692, COUNTER_TOP_Y - 1, 5, 3.5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
